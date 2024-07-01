import axios from 'axios'
import * as dotenv from 'dotenv'
import FormData from 'form-data'
import pino from 'pino'
import { FileObjectBuffer, FileObjectHTML } from './fileObject.d'
import { ChromiumOptions, ChromiumNormalizedOptions } from './localConversion.d'
dotenv.config()

const logger = pino()

/**
 * Converteer een document lokaal
 * @async
 * @param source Object met het brondocument, id en naam van het document.
 * @returns Geconverteerde PDF
 */
export const convertLocalDocument = async (source: FileObjectBuffer) => {
  const { id, data, name } = source
  logger.info(`${id}: ${name} - using local document conversion`)
  const formData = new FormData()
  formData.append('files', data, name)
  return await gotenbergPOST('libreoffice', 'convert', formData)
}

/**
 * Converteer een HTML document lokaal
 * @async
 * @param source Object met brondocument, id en naam van het document.
 * @param options Eventuele opties voor de Chromium module van Gotenberg
 * @returns De geconverteerde PDF
 */
export const convertLocalHTML = async (
  source: FileObjectHTML,
  options?: ChromiumOptions
) => {
  const defaultOptions = {
    paper: {
      width: 8.27,
      height: 11.7,
    },
    margin: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
    printBackground: true,
    orientation: 'portrait',
    emulatedMediaType: 'screen',
    scale: 0.7,
  } as ChromiumOptions
  const route = 'html'
  return await chromiumConvert(source, route, defaultOptions, options)
}

/**
 * Converteer een URL, lokaal
 * @async
 * @param url De URL dat geconverteerd moet worden
 * @param options Eventuele opties voor de Chromium module van Gotenberg
 * @returns De geconverteerde PDF
 */
export const convertURL = async (url: string, options?: ChromiumOptions) => {
  const defaultOptions = {
    paper: {
      width: 8.27,
      height: 11.7,
    },
    margin: {
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
    },
    printBackground: true,
    orientation: 'landscape',
    emulatedMediaType: 'screen',
    scale: 0.7,
  } as ChromiumOptions
  const route = 'url'
  return await chromiumConvert(url, route, defaultOptions, options)
}

/**
 * Converteer met de Chromium Gotenberg module
 * @async
 * @param source Het document dat geconverteerd moet worden, als dit een string is, wordt er vanuit gegaan dat dit een URL is. Anders een object met het brondocument, id en de naam.
 * @param route De route van de Chromium module, bv. "url" of "html"
 * @param defaultOptions
 * @param options
 * @returns
 */
const chromiumConvert = async (
  source: string | FileObjectHTML,
  route: string,
  defaultOptions: ChromiumOptions,
  options?: ChromiumOptions
) => {
  const mergedOptions = {
    ...defaultOptions,
    ...options,
  }
  const normalizedOptions = createChromiumNormalizedOptions(mergedOptions)
  const data = generateChromiumFormData(source, normalizedOptions)
  route = `convert/${route}`
  return await gotenbergPOST('chromium', route, data)
}

/**
 * Converteer een PDF bestand naar PDFA
 * @async
 * @param id De id van het document dat geconverteerd moet worden
 * @param pdfData Het document dat geconverteerd moet worden als base64 string
 *
 */
export const convertPDF = async (id: string, pdfData: string) => {
  logger.info(`${id}: converting to PDF/A-3b with own PDF/A server`)
  const pdfaConversionHost = "https://pdfa.mozardsaas.nl"

  try {
    const res = await axios.post(
      `${pdfaConversionHost}/api/v1/convert`,
      {
        id,
        document: pdfData
      }
    )
    const buffer = Buffer.from(res?.data.document, 'base64');
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
  } catch (error: any) {
    if((error as Error).message.includes("connect ECONNREFUSED") ){
      logger.info(`${id}: ${error}`)
      return `${id}: connection Error pdfa conversion service`
    } else{
      logger.info(`${id}: ${error}`)
      return `${id}: something went wrong`
    }
  }
}

/**
 * Converteer een PDF bestand naar PDFA door middel van ConvertAPI
 * @async
 * @param id De id van het document dat geconverteerd moet worden
 * @param pdfData Het document dat geconverteerd moet worden als base64 string
 */
export const convertPDFConvertApi = async (id: string, pdfData: string) => {
  logger.info(`${id}: converting to PDF/A-3b with ConvertApi`)

  const token = 'pk9cvUVB07tPZ0pw'
  const body = {
  Parameters: [
      {
        Name: "File",
        FileValue: {
          Name: "pdftopdfa.pdf",
          Data: pdfData
        }
      }
    ]
  };

  try {
    const response = await axios.post("https://v2.convertapi.com/convert/pdf/to/pdfa?Secret=" + token + "&PdfaVersion=pdfa3", body)
    // logger.info(response.data.Files[0].FileData);
    const arrayBuffer = base64ToArrayBuffer(response.data.Files[0].FileData)
    return arrayBuffer
  } catch (error: unknown) {
    if((error as Error).message.includes("connect ECONNREFUSED") ){
      logger.info(`${id}: ${error}`)
      return `${id}: connection Error ConvertAPI`
    } else{
      logger.info(`${id}: ${error}`)
      return `${id}: something went wrong`
    }
  }
}

export const convertXLSXConvertApi = async (id: string, pdfData: string) => {
  logger.info(`${id}: converting XLSX to PDF/A-3b with ConvertApi`)
  const pdfbuffer = Buffer.from(pdfData)
  const document = pdfbuffer.toString('base64')

  const token = 'pk9cvUVB07tPZ0pw'
  const body = {
  Parameters: [
      {
        Name: "File",
        FileValue: {
          Name: "xlsxtopdfa.xlsx",
          Data: document
        }
      }
    ]
  };

  try {
    const response = await axios.post("https://v2.convertapi.com/convert/xlsx/to/pdfa?Secret=" + token + "&PdfaVersion=pdfa3", body)
    // logger.info(response.data.Files[0].FileData);
    const arrayBuffer = base64ToArrayBuffer(response.data.Files[0].FileData)
    return arrayBuffer
  } catch (error: unknown) {
    if((error as Error).message.includes("connect ECONNREFUSED") ){
      logger.info(`${id}: ${error}`)
      return `${id}: connection Error ConvertAPI`
    } else{
      logger.info(`${id}: ${error}`)
      console.log(error)
      return `${id}: something went wrong`
    }
  }
}

/**
 * Maakt van base64string een arraybuffer
 * @param base64 de base64string
 */

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    var binaryString = atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}


export const signDocument = async (id: string, pdfData: string) => {
  logger.info(`${id}: signing document via own PDF/A server`)
  const pdfaConversionHost = "https://pdfa.mozardsaas.nl"

  try {
    const res = await axios.post(
      `${pdfaConversionHost}/api/v1/sign`,
      {
        id,
        document: pdfData
      }
    )
    const buffer = Buffer.from(res?.data.document, 'base64');
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return arrayBuffer
  } catch (error: any) {
    if((error as Error).message.includes("connect ECONNREFUSED") ){
      logger.info(`${id}: ${error}`)
      return `${id}: connection Error pdfa conversion service`
    } else{
      logger.info(`${id}: ${error}`)
      return `${id}: something went wrong`
    }
  }
}


/**
 * Maak een POST request naar Gotenberg (evt. naar Ghostscript)
 * @async
 * @param module Naam van de Gotenberg module
 * @param route De route van deze Gotenberg module
 * @param data Het document dat geconverteerd moet worden
 * @param ghostscript True als je wilt dat het geconverteerd wordt met Ghostscript
 * @returns De geconverteerde PDF
 */
const gotenbergPOST = async (
  module: string,
  route: string,
  data: FormData,
  ghostscript?: boolean
) => {
  const { GOTENBERG_HOST_GHOSTSCRIPT, GOTENBERG_HOST } = process.env
  const gotenbergHost = ghostscript
    ? GOTENBERG_HOST_GHOSTSCRIPT
    : GOTENBERG_HOST
  const uri = `${gotenbergHost}/forms/${module}/${route}`
  const res = await axios.post(uri, data, {
    headers: data.getHeaders(),
    responseType: 'arraybuffer',
  })
  return res.data as ArrayBuffer
}

/**
 * Vertaal ons Chromium opties object naar een object dat de Chromium module verwacht
 * @param options Object van opties van de Chromium module
 * @returns Object van opties van de Chromium module op de manier hoe de Chromium module het wilt hebben
 */
const createChromiumNormalizedOptions = (options: ChromiumOptions) => {
  const {
    paper,
    margin,
    printBackground,
    orientation,
    scale,
    emulatedMediaType,
  } = options
  const normalizedOptions = {
    paperWidth: `${paper ? paper.width : undefined}`,
    paperHeight: `${paper ? paper.height : undefined}`,
    marginTop: `${margin ? margin.top : undefined}`,
    marginRight: `${margin ? margin.right : undefined}`,
    marginBottom: `${margin ? margin.bottom : undefined}`,
    marginLeft: `${margin ? margin.left : undefined}`,
    printBackground: `${printBackground}`,
    landscape: `${orientation === 'landscape'}`,
    scale: `${scale}`,
    emulatedMediaType: emulatedMediaType === 'print' ? 'print' : 'screen',
  }
  return normalizedOptions as ChromiumNormalizedOptions
}

/**
 * Creëer FormData met het brondocument en de Chromium opties
 * @param source Het brondocument, als dit een string is dan gaat het ervan uit dat dit een URL is. Anders een FileObject.
 * @param options Chromium opties object
 * @returns FormData met het brondocument en de Chromium opties
 */
const generateChromiumFormData = (
  source: FileObjectBuffer | FileObjectHTML | string,
  options: ChromiumNormalizedOptions
) => {
  const formData = new FormData()

  if (typeof source === 'string') {
    formData.append('url', source)
  } else {
    formData.append('files', source.data, 'index.html' )
  }

  for (const key in options) {
    const value = options[key as keyof typeof options]
    formData.append(key, value)
  }
  return formData
}
