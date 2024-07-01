import consumers from 'stream/consumers'
import 'isomorphic-fetch'
import { ClientSecretCredential } from '@azure/identity'
import {
  Client,
  FileUpload,
  LargeFileUploadTask,
} from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import * as dotenv from 'dotenv'
import pino from 'pino'
import { FileObjectBuffer } from './fileObject.d'
import { convertLocalDocument } from './localConversion'
dotenv.config()

const logger = pino()

/**
 * Creëer een Microsoft Graph Client instance
 * @returns Microsoft Graph Client
 * @throws Als de env's `AZ_TENANT_ID`, `AZ_CLIENT_ID` en `AZ_CLIENT_SECRET` niet zijn ingevuld.
 */
const init = () => {
  const { AZ_TENANT_ID, AZ_CLIENT_ID, AZ_CLIENT_SECRET } = process.env
  if (!AZ_TENANT_ID || !AZ_CLIENT_ID || !AZ_CLIENT_SECRET) {
    const envsCheck = {
      AZ_TENANT_ID: !AZ_TENANT_ID,
      AZ_CLIENT_ID: !AZ_CLIENT_ID,
      AZ_CLIENT_SECRET: !AZ_CLIENT_SECRET,
    }

    throw new Error(
      `Did not enter one or more Azure env's ${JSON.stringify(envsCheck)}`
    )
  }

  const credential = new ClientSecretCredential(
    AZ_TENANT_ID,
    AZ_CLIENT_ID,
    AZ_CLIENT_SECRET
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  const client = Client.initWithMiddleware({
    authProvider,
  })

  return client
}

const client = init()

/**
 * Converteer een native document
 * @async
 * @param source Object met data van het brondocument
 * @returns De gemaakte PDF
 */
export const convertNativeDocument = async (source: FileObjectBuffer) => {
  try {
    const { id, name } = source
    logger.info(`${id}: ${name} - using native document conversion`)
    const document = await uploadDocument(source)
    await document.id
    let res;
    try {
      res = await getPDF(document.id);
    } catch (error) {
      res = ConvertInvalidNativeDocument(source,error);
    }
    await deleteSourceDocument(source, document.id)

    return res
  } catch (error) {
    logger.error(error)
    throw error
  }
}

/**
 * Verkrijg de PDF
 * @async
 * @param oneDriveId ID van het document in One Drive
 * @returns Een buffer van het document
 */
const getPDF = async (oneDriveId: string) => {
  const uri = `/sites/${process.env.AZ_SITE_ID}/drive/items/${oneDriveId}/content?format=pdf`
  const documentStream = await client.api(uri).get()
  return await consumers.buffer(documentStream)
}

/**
 * Verwijder het brondocument uit One Drive
 * @async
 * @param source Object met data van het brondocument
 * @param oneDriveId ID van het document in One Drive
 */
const deleteSourceDocument = async (
  source: FileObjectBuffer,
  oneDriveId: string
) => {
  const { name, id } = source
  logger.info(`${id}: ${name} - deleting source document`)
  const uri = `/sites/${process.env.AZ_SITE_ID}/drive/items/${oneDriveId}`
  client.api(uri).delete()
  logger.info(`${id}: ${name} - source document is deleted`)
}

/**
 * Upload een document naar One Drive
 * @async
 * @param source Object met data van het brondocument
 * @returns Het document
 */
const uploadDocument = async (source: FileObjectBuffer) => {
  const { id, data, name, size } = source
  const parentId = process.env.AZ_DRIVE_PARENT_ID || 'root'
  const base = `/sites/${process.env.AZ_SITE_ID}/drive/items/${parentId}:/${name}:`
  let document
  if (size < 4_194_304) {
    logger.info(`${id}: ${name} - using simple file upload`)
    const route = 'content'
    document = await client.api(`${base}/${route}`).put(data)
  } else {
    logger.info(`${id}: ${name} - using upload session`)
    document = await uploadLargeDocument(source, base)
  }
  return document
}

/**
 * Upload een document groter dan 4.194.304 bytes to One Drive
 * @async
 * @param source Object met data van het brondocument
 * @param base Base URI van One Drive
 * @returns Het document
 */
const uploadLargeDocument = async (source: FileObjectBuffer, base: string) => {
  const { data, name } = source
  const route = 'createuploadsession'

  const uploadSession = await LargeFileUploadTask.createUploadSession(
    client,
    `${base}/${route}`,
    {
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
      },
    }
  )

  const fileObject = new FileUpload(data, name, data.byteLength)
  const task = new LargeFileUploadTask(client, fileObject, uploadSession, {
    rangeSize: 1024 * 1024,
  })
  const uploadResult = await task.upload()
  return uploadResult.responseBody
}

/**
 * Converteert een text bestand naar PDF als de MDCS het bestand niet kan converteren
 * In het tekst bestand staat een waarschuwing en het bestandsnaam
 *
 * @param file Object met data van het bijlage document
 * @returns een text bestand dat geconverteerd is naar PDF
 */
const ConvertInvalidNativeDocument = (file: FileObjectBuffer, error:unknown) => {
  logger.error(`${file.id}: ${file.name} - error ${error}`)
  const message = `De MDCS kan het volgende bestand niet converteren. Het gaat om de bijlage met de naam ${file.name}`
  file.data = Buffer.from(message, "utf-8");
  file.name = "message.txt"
  return convertLocalDocument(file)
}
