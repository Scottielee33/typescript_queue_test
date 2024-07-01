import {writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import axios, { ResponseType } from 'axios'
import dotenv from 'dotenv'
import pino from 'pino'
import {Request as RequestZip} from '../zip/request'
import { conversionMethods } from './conversionMethods'
import { convertEml, convertMsg } from './emailConversion'
import {
  convertLocalDocument,
  convertLocalHTML,
  convertURL,
  signDocument,
  convertPDFConvertApi,
  convertPDF,
  convertXLSXConvertApi
} from './localConversion'
import { convertNativeDocument } from './nativeConversion'
import { Request} from './request'

dotenv.config()

const logger = pino()

const region = process.env.AWS_REGION || 'eu-central-1'
const bucket = process.env.AWS_BUCKET
const prefix = process.env.AWS_PREFIX || ''
const s3Client = new S3Client({ region })

/**
 * Verwerk een PDF verzoek
 * @async
 * @param request Het request
 */
export const handleRequest = async (request: Request) => {
  try {
    logger.info(`${request.id}: validated request ${JSON.stringify(request)}`)
    const pdf = await handleConvertion(request)
    if (
      request.input.url.includes("https://loket.bunnik.nl") ||                              // Bunnik
      request.input.url.includes("https://loket.dcmr.nl") ||                                // DCMR
      request.input.url.includes("https://formulieren.gooisemeren.nl") ||                   // Gooise Meren
      request.input.url.includes("https://eloket.heemstede.nl") ||                          // Heemstede
      request.input.url.includes("https://prtl.middendrenthe.nl") ||                        // Midden-Drenthe
      request.input.url.includes("https://portaal.ordenvanadvocaten.nl") ||                 // Orde van Advocaten
      request.input.url.includes("https://mozardloket.odnzkg.nl") ||                        // ODNZKG
      request.input.url.includes("https://overp.mozardsaas.nl") ||                          // OVER gemeenten
      request.input.url.includes("https://loket.rhenen.nl") ||                              // Rhenen
      request.input.url.includes("https://loket.texel.nl") ||                               // Texel
      request.input.url.includes("https://tynap.mozardsaas.nl") ||                          // Tynaarlo
      request.input.url.includes("https://www.uitvoeringarbeidsvoorwaardenwetgeving.nl") || // Uitvoering Arbeidsvoorwaardenwetgeving
      request.input.url.includes("https://loket.veenendaal.nl") ||                          // Veenendaal
      request.input.url.includes("https://loket.vr-rr.nl") ||                               // Veiligheidsregio Rotterdam-Rijnmond
      request.input.url.includes("https://wddnp.mozardsaas.nl") ||                          // WDDNP
      request.input.url.includes("https://mvthb.mozardsaas.nl")                             // MVTHB
      ){
      const pdfbuffer = Buffer.from(pdf)
      const document = pdfbuffer.toString('base64')
      let pdfa
      if(request.input.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        pdfa = pdf
      } else{
        pdfa = conversionMethods.images.includes(request.input.mimeType) ? await convertPDF(request.id, document) : await convertPDFConvertApi(request.id, document)
      }
      if(pdfa instanceof ArrayBuffer) {
        if(request.output.ondertekening === true){
          const pdfabuffer = Buffer.from(pdfa)
          const pdfadocument = pdfabuffer.toString('base64')
          const ondertekenddocument = await signDocument(request.id, pdfadocument)
          logger.info(`${request.id}: we gaan digitaal ondertekenen`)
          if(ondertekenddocument instanceof ArrayBuffer)
            await upload(request, ondertekenddocument)
        }
        else
          await upload(request, pdfa)
      }
      else
          throw new Error(pdfa)
    } else {
      upload(request, pdf)
    }
  } catch (err) {
    await catchHandleRequest(request, err)
  }
}

/**
 * Catch een error bij een PDF verzoek in de functie handleRequest
 * @async
 * @param request Het request
 * @param err Error object
 */
const catchHandleRequest = async (request: Request, err: unknown) => {
  logger.error(
    `${request.id}: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`
  )
  try {
    await sendCallback(request.callback.status, err)
    logger.info(`${request.id}: sent error callback`)
  } catch (err) {
    logger.error(
      `${request.id}: error sending callback error: ${JSON.stringify(err)}`
    )
  }
}

/**
 * Verstuur error callback als er een fout is opgelopen bij handleRequest
 * @async
 * @param url Callback url
 * @param err Error Object
 */
export const sendCallback = async (url: string, err: unknown) => {
  await axios.post(
    url,
    {
      result: 'FAIL',
      error: err,
    },
    {
      headers: {
        'User-Agent': '@mozardbv/conversion-gateway@1.0.0',
      },
    }
  )
}

/**
 * Stuur het request naar de juiste conversie
 * @async
 * @param request Het request
 * @returns Geconverteerde PDF
 * @throws Indien het gegeven MIME type invalide is of niet ondersteund wordt.
 */
const handleConvertion = async (request: Request) => {
  const mimeType = request.input.mimeType
  const { localAndNative, onlyLocal, onlyNative, msg, eml, html, pdf, uri, xlsx } =
    conversionMethods
  switch (true) {
    case localAndNative.includes(mimeType):
      return await handleLocalAndNativeConvertion(request)
    case onlyLocal.includes(mimeType):
      return await handleLocalConvertion(request)
    case onlyNative.includes(mimeType):
      return await handleNativeConvertion(request)
    case msg.includes(mimeType):
      return await handleMsgConversion(request)
    case eml.includes(mimeType):
      return await handleEmlConversion(request)
    case html.includes(mimeType):
      return await handleHtmlConversion(request)
    case pdf.includes(mimeType):
      return await handlePdfConversion(request)
    case uri.includes(mimeType):
      return await handleUriConversion(request)
    case xlsx.includes(mimeType):
      return await handleXLSXConvertion(request)

    default:
      throw new Error('Invalid MIME type')
  }
}

/**
 * Verwerk een PDF verzoek dat zowel local als native geconverteerd kan worden
 * @async
 * @param request
 * @returns Geconverteerde PDF als ArrayBuffer
 */
const handleLocalAndNativeConvertion = async (request: Request) => {
  if (request.output.conversionMethod === 'native') {
    return await handleNativeConvertion(request)
  } else {
    return await handleLocalConvertion(request)
  }
}

/**
 * Verwerk een PDF verzoek dat alleen native geconverteerd kan worden
 * @async
 * @param request Het request
 * @returns Geconverteerde PDF
 * @throws Bij `request.output.conversionMethod === "local"`
 */
const handleNativeConvertion = async (request: Request) => {
  const method = request.output.conversionMethod
  if (method === 'native') {
    const file = await createFileObject(request, 'arraybuffer')
    return await convertNativeDocument(file)
  } else {
    throw new Error(
      'This MIME type can only be used with native conversion method'
    )
  }
}

/**
 * Verwerk een PDF verzoek dat alleen lokaal kan
 * @async
 * @param request Het request
 * @returns Geconverteerde PDF
 */
const handleLocalConvertion = async (request: Request) => {
  const file = await createFileObject(request, 'stream')
  return await convertLocalDocument(file)
}

/**
 * Verwerk een PDF verzoek van een eml bestand
 * @async
 * @param request Het request
 * @returns De geconverteerde PDF
 */
const handleEmlConversion = async (request: Request) => {
  const file = await createFileObject(request, 'arraybuffer')
  return await convertEml(file)
}

/**
 * Verwerk een PDF verzoek van een msg bestand
 * @async
 * @param request Het request
 * @returns De geconverteerde PDF
 */
const handleMsgConversion = async (request: Request) => {
  const file = await createFileObject(request, 'arraybuffer')
  return await convertMsg(file)
}

/**
 * Verwerk een request met een HTML document, kan zowel "native" als "local".
 * @async
 * @param request Het verzoek
 * @returns Geconverteerde PDF
 */
const handleHtmlConversion = async (request: Request) => {
  const isNative = request.output.conversionMethod === 'native'
  const responseType = isNative ? 'arraybuffer' : 'stream'
  const file = await createFileObject(request, responseType)
  // Uitgezet vanwege verkeerde conversie native
  // if (isNative) {
  //   return await convertNativeDocument(file)
  // } else {
    const orientation = request.output.orientation
    if(orientation === 'landscape'){
      const options = {orientation}
      return await convertLocalHTML(file, options)
    } else {
      return await convertLocalHTML(file)
    }
  // }
}

/**
 * Verwerk een request met als input een URI.
 * @async
 * @param request Het verzoek
 * @returns Geconverteerde PDF
 */
const handleUriConversion = async (request: Request) => {
  const orientation = request.output.orientation
  if (orientation === 'portrait'){
    const options = {
      orientation
    }
    return await convertURL(request.input.url, options)
  } else {
    return await convertURL(request.input.url)
  }
}

/**
 * Verwerk een request om een PDF te converteren naar PDF/A
 * @todo PDF naar PDF/A conversie wordt vervangen met de Python conversie server. Als dat gebeurt
 * is, zal deze functie veranderd moeten worden!
 * @async
 * @param request Het verzoek
 * @returns Geconverteerde PDF
 */
const handlePdfConversion = async (request: Request) => {
  const file = await createFileObject(request, 'arraybuffer')
  return file.data
}

/**
 * Verwerk een request om een XLSX bestand te converteren naar PDF
 * @async
 * @param request Het verzoek
 * @returns Geconverteerde PDF
 */
const handleXLSXConvertion = async (request: Request) => {
  const file = await createFileObject(request, 'arraybuffer')
  return await convertXLSXConvertApi(request.id, file.data)
}

/**
 * Haal het te converteren document op
 * @async
 * @param id ID van request
 * @param url De URL waar het document staat
 * @param responseType Het data type van het document dat je terug krijgt
 * @param ResponseEncoding: Het type van de encoding, base64 of leeg
 * @returns Het document
 */
export const getDocument = async (
  id: string,
  url: string,
  responseType: ResponseType,
  responseEncoding?: string,
) => {
  const sourceDocument = await axios.get(url, {
    responseType,
    responseEncoding
  })
  logger.info(`${id}: got document endpoint response ${sourceDocument.status}`)
  return sourceDocument
}

/**
 * Genereer een FileObject
 * @async
 * @param request Het verzoek
 * @param documentType Type van het document dat wordt opgehaald
 * @param documentEncoding Encoding van het document
 * @returns Een file object
 * @see fileObject.d.ts voor FileObject types
 */
const createFileObject = async (
  request: Request,
  documentType: ResponseType,
  documentEncoding = ''
) => {
  const { id, extension, input } = request
  const sourceDocumentResponse = await getDocument(id, input.url, documentType, documentEncoding)
  const sourceDocument = sourceDocumentResponse.data
  const name = `${id}.${extension}`
  const file = {
    id,
    data: sourceDocument,
    name,
    size: input.size,
    mimeType: input.mimeType,
  }
  return file
}

/**
 * Schrijf een PDF lokaal weg in de `testOutput` map.
 * Indien de `testOutput` map niet bestaat, wordt deze eerst aangemaakt.
 * @param id Request ID
 * @param data De PDF
 */
export const writeFileLocal = (request: Request| RequestZip, data: ArrayBuffer) => {
  const dirName = 'testOutput'
  const dirExists = existsSync(dirName)
  const relPath = `../../../${dirName}`

  if (!dirExists) mkdirSync(path.join(__dirname, relPath))

  writeFileSync(path.join(__dirname, relPath, `${request.id}.${request.output.extension}`), Buffer.from(data))
  logger.info(`${request.id}: ${request.output.extension} written successfully`)
}

/**
 * Upload de gemaakte PDF
 * @async
 * @param request Het request
 * @param data De PDF
 */
export const upload = async (request: Request| RequestZip, data: ArrayBuffer) => {
  if (process.env.NODE_ENV === 'development') {
    writeFileLocal(request, data)
    return
  }
  const { callback } = request
  if (callback.s3Compatible) {
    await uploadS3Compatible(request, data)
  } else {
    await uploadNotS3Compatible(request, data)
  }
}

/**
 * Callbacks voor S3 compatible clients:
 * we uploaden een document direct naar een presigned URL en sturen een
 * bericht naar de statuscallback
 * @async
 * @param request Het request
 * @param data  De PDF
 */
export const uploadS3Compatible = async (request: Request | RequestZip, data: ArrayBuffer) => {
  const { id, callback, output } = request
  logger.info(`${id}: sending s3 compatible callbacks`)
  const res = await axios.put(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    callback.document!,
    data,
    {
      headers: {
        'Content-Type': output.type,
      },
    }
  )
  logger.info(`${id}": upload request:" ${res}`)
  logger.info(`${id}: document callback: ${res.status}`)
  await axios.post(
    callback.status,
    {
      result: 'OK',
    },
    {
      headers: {
        'User-Agent': '@mozardbv/conversion-gateway@1.0.0',
      },
    }
  )
  logger.info(`${id}: status callback: ${res.status}`)
}

/**
 * Callbacks voor niet-S3 compatible clients:
 * we uploaden een document naar een eigen bucket en sturen een presigned URL
 * naar de statuscallback
 * @async
 * @param request Het request
 * @param data De PDF
 */
export const uploadNotS3Compatible = async (
  request: Request | RequestZip,
  data: ArrayBuffer
) => {
  logger.info(`${request.id}: sending non-s3 compatible callback`)

  logger.info(`${request.id}: sending to: s3://${bucket}/${prefix}${request.id}.${request.output.extension}`)

  const params = {
    Bucket: bucket,
    Key: `${prefix}${request.id}.${request.output.extension}`,
    Body: data as Buffer,
  }

  await s3Client.send(new PutObjectCommand(params))
  logger.info(`${request.id}: s3 PUT ok`)
  logger.info(`${request.id}: generating signed URL`)
  const url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: `${prefix}${request.id}.${request.output.extension}`,
    }),
    { expiresIn: 900 }
  )
  logger.info(`${request.id}: s3 signed URL generated`)

  const res = await axios.post(
    request.callback.status,
    {
      result: 'OK',
      url,
    },
    {
      headers: {
        'User-Agent': '@mozardbv/conversion-gateway@1.0.0',
      },
    }
  )
  logger.info(`${request.id}: status callback: ${res.status}`)
}
