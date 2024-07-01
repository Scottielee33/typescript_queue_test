import axios from 'axios'
import { nl } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import * as dotenv from 'dotenv'
import FormData from 'form-data'
import { DOMWindow, JSDOM } from 'jsdom'
import { AddressObject, simpleParser, Attachment } from 'mailparser'
import pino from 'pino'
import { v4 as uuidv4 } from 'uuid'
import { conversionMethods } from './conversionMethods'
import {
  ConvertedAttachment,
  NormalizedEmailHeaders,
  EmailHeaders,
  HeaderObject,
  ParsedEml,
  ParsedMsg
} from './emailConversion.d'
import { FileObjectBuffer } from './fileObject.d'
import {
  convertLocalDocument,
  convertLocalHTML,
} from './localConversion'
import { convertNativeDocument } from './nativeConversion'
import { parseMsg } from './parseMsg'
dotenv.config()

const logger = pino()

/**
 * Bewaar onderwerpen van bijlagen om te gebruiken bij de "subject" header, als
 * een mail een bijlage heeft.
 */
const mailAttachmentNames: string[] = []

/** Tekst die gerenderd moet worden bij de headers. */
const headerText: { [key: string]: string } = {
  from: 'Van:',
  to: 'Naar:',
  cc: 'CC:',
  bcc: 'BCC:',
  subject: 'Onderwerp:',
  date: 'Verzonden op:',
  attachments: 'Bijlage(n):',
}

/**
 * Converteer een Eml bestand
 * @async
 * @param file Object met data van het brondocument
 * @param attachment Boolean om aan te geven of deze Eml een bijlage is of niet
 * @returns De geconverteerde PDF
 */
export const convertEml = async (
  file: FileObjectBuffer,
  attachment?: boolean
) => {
  logger.info(`${file.id}: ${file.name} - using EML conversion`)
  const parsedEml = await parseEml(file.data)
  return await convertMail(file, parsedEml, 'eml', attachment)
}

/**
 * Converteer een Msg bestand
 * @async
 * @param file Object met data van het brondocument
 * @param attachment Boolean om aan te geven of deze Msg een bijlage is of niet
 * @returns De geconverteerde PDF
 */
export const convertMsg = async (
  file: FileObjectBuffer,
  attachment?: boolean
) => {
  logger.info(`${file.id}: ${file.name} - using MSG conversion`)
  const parsedMsg = await parseMsg(file.data)

  // Converteer getekende mails "smime.p7m"
  if (
    parsedMsg.attachments.length === 1 &&
    parsedMsg.attachments[0].filename === 'smime.p7m'
  ) {
    logger.info(`${file.id}: ${file.name} - using SMIME/EML conversion`)
    const { size, content } = parsedMsg.attachments[0]
    const attachment = {
      name: 'smime.eml',
      mimeType: 'message/rfc822',
      data: content,
      size,
      id: file.id,
    }
    return await convertSmime(attachment, parsedMsg.headers)
  }

  return await convertMail(file, parsedMsg, 'msg', attachment)
}

/**
 * Converteer Msg bestanden die digitaal ondertekend zijn met een PGP signing key.
 * Deze Msg bestanden bestaan uit de hoofdmail zonder inline bijlagen en vervolgens
 * worden alle bijlagen + nog een keer de hoofdmail in een bestand genaamd smime.p7m
 * gezet. Door alleen het smime.p7m bestand te converteren, wordt deze goed geconverteerd.
 * smime.p7m mist alle headers, afgezien van de bijlagen header. Alle andere headers
 * moeten vanuit de (eerste) hoofdmail gehaald worden en hier meegestuurd worden.
 * @async
 * @param file Object met data van het brondocument
 * @param existingHeaders Headers van het orginele Msg bestand
 * @returns De geconverteerde PDF
 */
const convertSmime = async (
  file: FileObjectBuffer,
  existingHeaders: NormalizedEmailHeaders
) => {
  logger.info(`${file.id}: ${file.name} - using SMIME/EML conversion`)
  const parsedSmime = await parseEml(file.data)
  parsedSmime.headers = { ...parsedSmime.headers, ...existingHeaders }
  return await convertMail(file, parsedSmime, 'eml')
}

/**
 * Converteer een mail; eml of msg bestanden.
 * @async
 * @param file Object met data van het brondocument
 * @param parsedMail De geparsde mail
 * @param attachment Boolean die aangeeft of deze mail een bijlage is of niet
 * @param format String die aangeeft of de mail in EML of MSG formaat is
 * @returns De geconverteerde mail
 */
const convertMail = async (
  file: FileObjectBuffer,
  parsedMail: ParsedEml | ParsedMsg,
  format: "eml" | "msg",
  attachment?: boolean
): Promise<ArrayBuffer> => {
  const subject = parsedMail.headers.subject
  if (attachment && subject) mailAttachmentNames.push(subject)
  const window = createWindow(parsedMail.html ? parsedMail.html : parsedMail.text?.replaceAll("\r\n", "<br>"))
  let { document } = window
  let attachments: Attachment[] = []
  let withoutCIDS: { document: Document; attachments: Attachment[] }
  if (format === 'eml') {
    if ('attachments' in parsedMail) {
      withoutCIDS = fixInlineAttachmentsEML(document, parsedMail.attachments)
      attachments = withoutCIDS.attachments
    } else {
      throw new Error('Invalid parsedMail object')
    }
  } else {
    if ('inlineAttachments' in parsedMail) {
      withoutCIDS = fixInlineAttachmentsMSG(document, parsedMail.inlineAttachments)
      attachments = parsedMail.attachments
    } else {
      throw new Error('Invalid parsedMail object')
    }
  }
  document = withoutCIDS.document
  document = setDefaultFont(window)
  document = removeWordStyling(document)
  let convertedAttachments: ConvertedAttachment[] | undefined
  if (attachments.length > 0) {
    convertedAttachments = (await convertAttachments(file.id, attachments) as ConvertedAttachment[])
    const hasANotConvertedAttachment = convertedAttachments.some(
      (attachment) => !attachment
    )
    if (hasANotConvertedAttachment)
      throw new Error(
        `${file.id} - ${subject} - Could not convert one or more attachments of this email`
      )
  }
  const headers = createDisplayHeaders(parsedMail.headers, attachments)
  const headerHTML = createHeaderHTML(document, headers)
  document.body.prepend(headerHTML)
  const preTags = document.querySelectorAll('pre');
  preTags.forEach((preTag) => {
    preTag.style.whiteSpace = 'pre-wrap';
    preTag.style.width = '';
  });
  const htmlToBeConverted = document.documentElement.outerHTML
  const modifiedHtml = htmlToBeConverted.replace('iso-8859-1', 'utf-8')
  let convertedMail: ArrayBuffer
  try {
    logger.info(`${file.id}: ${subject} - convert mail as HTML`)
    const htmlFileObject = {
      id: file.id,
      name: 'index.html',
      size: file.size,
      mimeType: 'text/html',
      data: modifiedHtml,
      emulatedMediaType: file.emulatedMediaType,
    }
    const htmlOptions = {
      margin: { top: 0.5, left: 0.5, bottom: 0.5, right: 0.5 },
    }
    convertedMail = await convertLocalHTML(htmlFileObject, htmlOptions)
  } catch (error) {
    throw new Error(`Failed to convert to HTML ${error}`)
  }
  // Merge indien bijlagen
  if (convertedAttachments) {
    logger.info(`${file.id}: ${subject} - merge pdfs`)
    const mergedPdf = await mergePdf(convertedMail, convertedAttachments)
    return mergedPdf
  }
  return convertedMail
}

/**
 * Normaliseer email headers naar strings.
 * @todo date kan nu nog "Date" zijn (volgens type) maar dit is ongewenst
 * @param headers Email headers
 * @returns Genormaliseerde email headers
 */
const normalizeEmailHeaders = (headers: EmailHeaders) => {
  for (const key in headers) {
    const value = headers[key as keyof typeof headers]
    if (typeof value === 'undefined' || typeof value === 'string') continue
    if (value instanceof Date) {
      headers.date = headers.date && formatTime(headers.date)
    } else if (Array.isArray(value)) {
      const addressStr = normalizeAddressObjArr(value)
      headers[key as keyof typeof headers] = addressStr
    } else {
      const parsedAddressObject = parseAddressObject(value)
      if (parsedAddressObject)
        headers[key as keyof typeof headers] = parsedAddressObject
    }
  }
  return headers as NormalizedEmailHeaders
}

/**
 * Normaliseer een AddressObject array
 * @param value Een AddressObject array
 * @returns Array van AddressObject'en als string
 * @see {@link https://nodemailer.com/message/addresses/ Address Object documentatie van Nodemailer}
 */
const normalizeAddressObjArr = (value: AddressObject[]) => {
  const parsedAddressObjectArray: string[] = []
  value.forEach((addressObj: AddressObject) => {
    const parsedAddressObject = parseAddressObject(addressObj)
    if (parsedAddressObject) parsedAddressObjectArray.push(parsedAddressObject)
  })
  return parsedAddressObjectArray.join(', ')
}

/**
 * Normaliseer een AddressObject
 * @param addressObject Een AddressObject
 * @returns AddressObject als string
 * @see {@link https://nodemailer.com/message/addresses/ Address Object documentatie van Nodemailer}
 */
const parseAddressObject = (addressObject: AddressObject) => {
  const addressDetails = addressObject.value
  if (addressDetails.length > 0) {
    const emailAddressObjParsed = addressDetails.map((emailAddressObj) => {
      const { address, name } = emailAddressObj
      return address ? `${name} <${address}>` : name
    })
    return emailAddressObjParsed.join(', ')
  }
  return undefined
}

/**
 * Formatteer een datum
 * @param date De datum die geformatteerd moet worden
 * @returns Datum als <naam-dag> d-mm-yyy hh:mm
 */
const formatTime = (date: string | number | Date) => {
  const formattedTime = formatInTimeZone(
    date,
    'Europe/Amsterdam',
    'EEEE d-MM-yyyy HH:mm',
    {
      locale: nl,
    }
  )
  return formattedTime
}

/**
 * Merge mail en bijlagen tot 1 PDF
 * @todo Maak deze functie zodat er oneindig veel pdf's in kunnen met rest parameter
 * @async
 * @param mail Hoofdmail als PDF
 * @param attachments Array met geconverteerde bijlages
 * @returns 1 merged PDF
 */
const mergePdf = async (
  mail: ArrayBuffer,
  attachments: ConvertedAttachment[]
) => {
  const data = new FormData()
  data.append('files', mail, 'pdf0.pdf')
  attachments.forEach((pdf, index) => {
    const reference = index + 1
    // ArrayBuffer wordt omgezet naar buffer
    if (pdf instanceof ArrayBuffer || Buffer.isBuffer(pdf)) {
      const bufferPDF = pdf instanceof ArrayBuffer ? Buffer.from(pdf) : pdf
      data.append('files', bufferPDF, `pdf${reference}.pdf`)
    } else {
      data.append('files', pdf.content, `pdf${reference}.pdf`)
    }
  })
  const merged = await axios.post(
    `${process.env.GOTENBERG_HOST}/forms/pdfengines/merge`,
    data,
    {
      headers: data.getHeaders(),
      responseType: 'arraybuffer',
    }
  )
  return merged.data as ArrayBuffer
}

/**
 * Creëer HTML van email headers
 * @todo maak hier een tabel van en lijn de headers goed uit ipv deze dump-alles-op-1-lijn-en-zoek-het-maar-uit
 * @param document HTML Document
 * @param headers Array van headers die bovenaan de mail gerenderd moeten worden
 * @returns De email headers als HTML
 */
const createHeaderHTML = (document: Document, headers: HeaderObject[]) => {
  const p = document.createElement('p')

  headers.forEach((headerObj) => {
    const { header, value } = headerObj
    const [b, span, br] = createElements(document, ['b', 'span', 'br'])
    b.append(header)
    span.append(` ${value}`)
    appendMultiple(p, [b, span, br])
  })

  return p
}

/**
 * Append meerdere elementen aan een target
 * @param target Element waar de andere elementen aan ge-append moeten worden
 * @param appendies De elementen die ge-append moeten worden
 * @returns Het target element met de appendies er aan ge-append
 */
const appendMultiple = (target: HTMLElement, appendies: HTMLElement[]) => {
  appendies.forEach((appendor) => {
    target.append(appendor)
  })
  return target
}

/**
 * Creëer meerdere HTML elementen
 * @param document HTML Document
 * @param tagNames Elementen tag names die je wilt creëeren
 * @returns De gemaakte elementen
 */
const createElements = (document: Document, tagNames: string[]) => {
  return tagNames.map((tagName) => document.createElement(tagName))
}

/**
 * Creëer email headers om in de PDF te zetten
 * @param headers Mail headers
 * @param attachments Bijlagen array
 * @returns De email headers die in de PDF gezet worden
 */
const createDisplayHeaders = (
  headers: EmailHeaders,
  attachments: Attachment[]
) => {
  const normalizedEmailHeaders = normalizeEmailHeaders(headers)
  const displayHeaders: HeaderObject[] = []
  const order = ['from', 'to', 'date', 'cc', 'bcc', 'subject']
  for (const key in normalizedEmailHeaders) {
    const value =
      normalizedEmailHeaders[key as keyof typeof normalizedEmailHeaders]
    if (value) {
      const displayHeader = { header: headerText[key], value }
      const index = order.findIndex((item) => item === key)
      displayHeaders.splice(index, 0, displayHeader)
    }
  }

  // Bijlagen header als laatste
  if (attachments.length > 0) {
    const attachmentDisplayHeader = createAttachmentHeader(attachments)
    displayHeaders.push(attachmentDisplayHeader)
  }

  return displayHeaders
}

/**
 * Converteer de bijlagen van een mail
 * @async
 * @param id Request ID
 * @param attachments Array van bijlagen
 * @param emulatedMediaType Optioneel media type, ofwel "screen" of "print"
 * @returns Promise met alle geconverteerde bijlagen
 */
const convertAttachments = async (
  id: string,
  attachments: Attachment[],
  emulatedMediaType?: 'screen' | 'print'
) => {
  const fileNames: string[] = [];
  const attachmentPromisses = attachments.map(
    async (attachment: Attachment) => {
      const { contentType, size, content, filename } = attachment
      let updatedFilename = `${uuidv4()} - ${filename}`
      if (filename) {
        fileNames.push(filename);
      }

      const file = {
        id,
        data: content,
        name: updatedFilename || uuidv4(),
        size,
        emulatedMediaType,
        mimeType: contentType,
      }
      return await handleAttachmentConversion(contentType, file)
    }
  )
  return Promise.all(attachmentPromisses)
}

/**
 * Creëer een DOMWindow van HTML als string
 * @todo Volgens type kan html undefined zijn? Controleer of dit gebeurt bij een lege mail?
 * @param html De HTML waar een DOMWindow van gemaakt moet worden
 * @returns Een JSDOM window o.b.v. de HTML
 */
const createWindow = (html: string | undefined) => {
  // lege mail?
  if (!html) console.log('HTML is undefined')
  return new JSDOM(html).window
}

/**
 * Creëer een header object
 * @param attachments Bijlagen als array
 * @returns Header object voor bijlagen
 */
const createAttachmentHeader = (attachments: Attachment[]) => {
  const attachmentNames = attachments.map((attachment) => attachment.filename)
  const nonEmpty = attachmentNames.filter((name): name is string => !!name)
  const allNamesArr = mailAttachmentNames.concat(nonEmpty)
  const allNames = allNamesArr.join(', ')
  const headerName = allNamesArr.length > 1 ? 'Bijlagen:' : 'Bijlage:'
  mailAttachmentNames.length = 0
  const header = {
    header: headerName,
    value: allNames,
  }
  return header
}

/**
 * Verwijder `.WordSection` CSS class.
 * Deze class zorgt ervoor dat de mail op een nieuwe pagina gezet wordt,
 * i.p.v. onder de email headers.
 * @param document HTML document
 * @returns HTML document zónder Word stijling
 */
const removeWordStyling = (document: Document) => {
  const wordSection = document.querySelector(
    "div[class^='WordSection'], div[class*=' WordSection']"
  )
  if (wordSection) {
    const classes = Object.values(wordSection.classList)
    classes.forEach((className) => {
      const isWordSection = className.includes('WordSection')
      if (isWordSection) wordSection.classList.remove(className)
    })
  }
  return document
}

/**
 * Parse een eml bestand
 * @async
 * @param data De eml
 * @returns Geparsde eml
 */
const parseEml = async (data: Buffer): Promise<ParsedEml> => {
  /* We houden hier de CID links omdat als we dit laten doen door simpleParser, worden
  de inline afbeeldingen wel degelijk goed opgelost. Alleen blijven ze wel in parsedEmail.attachments
  staan. Hierdoor worden ze later nog een keer geconverteerd als aparte bijlage. Hierom halen wij
  zelf de CID links weg. */
  const parsedEmail = await simpleParser(data, { keepCidLinks: true })
  const { from, to, cc, bcc, date, subject, html, textAsHtml, attachments } =
    parsedEmail
  const fixedAttachments = fixPgpSignature(attachments)
  return {
    text: undefined,
    html: html || textAsHtml,
    headers: {
      bcc,
      cc,
      date,
      from,
      subject,
      to,
    },
    attachments: fixedAttachments,
  }
}

/**
 * Controleer of tussen de bijlagen een bijlage met content type van "application/pgp-signature" zit.
 * Indien deze er is, vervang dit content type met "text/plain". Digitaal ondertekende mails
 * hebben een PGP signature als bijlage in een txt bestand. Om deze te converteren hebben ze
 * een content type van "text/plain" nodig.
 * @param attachments Bijlagen van een mail
 * @returns Bijlagen zonder eventuele PGP signature
 */
const fixPgpSignature = (attachments: Attachment[]) => {
  return attachments.map((attachment) => {
    if (attachment.contentType === 'application/pgp-signature')
      attachment.contentType = 'text/plain'
    return attachment
  })
}

/**
 * Zet een standaard lettertype, indien er geen aanwezig is.
 * @todo Wat als er wél een lettertype aanwezig is, maar het een obscuur lettertype is die
 * Gotenberg niet heeft?
 * @param window DOM Window
 * @param fontFamilies CSS value, zoals de waarde van de CSS `font-family` property
 * @returns HTML document met een lettertype
 */
const setDefaultFont = (window: DOMWindow, fontFamily = 'Verdana') => {
  const { document } = window
  const alreadyHasStyles = window.getComputedStyle(document.body).fontFamily
  if (!alreadyHasStyles) {
    document.body.style.fontFamily = fontFamily
  }
  return document
}

/**
 * Vervang CID's in document met data URI's en verwijder deze uit de attachment array
 * @param document DOM document
 * @param attachments Array van bijlagen
 * @returns Document mét inline bijlagen en attachments zónder inline bijlagen
 */
const fixInlineAttachmentsEML = (
  document: Document,
  attachments: Attachment[]
) => {
  for (let i = attachments.length - 1; i >= 0; i -= 1) {
    const { contentType, cid, content } = attachments[i]
    const imgEl = document.querySelector(
      `img[src='cid:${cid}']`
    ) as HTMLImageElement
    if (imgEl) {
      const dataUri = generateDataUri(content, contentType)
      const divEl = document.createElement('div');
      divEl.style.display = 'inline-block';
      if (imgEl.width && imgEl.height) {
        divEl.style.width = `${imgEl.width}px`;
        divEl.style.height = `${imgEl.height}px`;
        divEl.style.backgroundImage = `url(${dataUri})`;
        divEl.style.backgroundSize = 'contain';
      } else {
        const img = document.createElement('img');
        img.src = dataUri;
        img.style.width = '500px';
        divEl.appendChild(img);
      }
      imgEl.parentNode?.replaceChild(divEl, imgEl);
      attachments.splice(i, 1)
    }
  }
  return { document, attachments }
}

/**
 * Voeg de inline bijlagen toe aan de DOM en verwijder deze uit de attachment array
 * @param document DOM document
 * @param attachments Array van bijlagen
 * @returns Document mét inline bijlagen en attachments zónder inline bijlagen
 */
const fixInlineAttachmentsMSG = (
  document: Document,
  attachments: Attachment[]
) => {
  const imgEls = document.querySelectorAll('img[src^="cid:"]') as NodeListOf<HTMLImageElement>;
  for (let i = 0; i < imgEls.length; i++) {
    const imgEl = imgEls[i];
    const cid = imgEl.src.substring(4);
    const attachment = attachments.find((a) => a.cid === cid);
    if (attachment) {
      const dataUri = generateDataUri(attachment.content, attachment.contentType);
      const divEl = document.createElement('div');
      divEl.style.display = 'inline-block';
      divEl.style.width = `${imgEl.width}px`;
      divEl.style.height = `${imgEl.height}px`;
      divEl.style.backgroundImage = `url(${dataUri})`;
      divEl.style.backgroundSize = 'contain';
      imgEl.parentNode?.replaceChild(divEl, imgEl);
      attachments.splice(attachments.indexOf(attachment), 1);
    }
  }
  return { document, attachments }
}

/**
 * Maak een dataURI van buffer of string
 * @param data De bijlage
 * @param mediatype Bestandstype van de bijlage
 * @returns DataURI van de bijlage
 */
const generateDataUri = (data: Buffer | string, mediatype: string) => {
  const base64 = Buffer.isBuffer(data) ? data.toString('base64') : data
  return `data:${mediatype};base64,${base64}`
}



/**
 * Converteert een text bestand naar PDF als een mail een bijlage bevat die de MDCS niet kan converteren
 * In het tekst bestand staat een waarschuwing en het bestandsnaam
 *
 * @param file Object met data van het bijlage document
 * @returns een text bestand dat geconverteerd is naar PDF
 */
const ConvertInvalidMimeType = (file: FileObjectBuffer) => {
  const message = `De MDCS kan de volgende bijlage in de mail niet converteren. Het gaat om de bijlage met de naam ${file.name}`
  file.data = Buffer.from(message, "utf-8");
  file.name = "message.txt"
  return convertLocalDocument(file)
}


/**
 * Verwerk te converteren bijlage
 * @async
 * @param mimeType MIME type van bijlage
 * @param file
 * @returns Geconverteerde bijlage als PDF
 */
const handleAttachmentConversion = async (
  mimeType: string,
  file: FileObjectBuffer
) => {
  const { localAndNative, onlyLocal, onlyNative, msg, eml, html, pdf } =
    conversionMethods
  switch (true) {
    case localAndNative.includes(mimeType):
    case onlyNative.includes(mimeType):
      return await convertNativeDocument(file)
    case onlyLocal.includes(mimeType):
      return await convertLocalDocument(file)
    case msg.includes(mimeType):
      return await convertMsg(file)
    case eml.includes(mimeType):
      return await convertEml(file)
    case html.includes(mimeType):
      return await convertNativeDocument(file)
    case pdf.includes(mimeType):
      return file.data.buffer

    default:
      return await ConvertInvalidMimeType(file)
  }
}

