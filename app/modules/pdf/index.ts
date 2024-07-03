import { URL } from 'url'
import * as Hapi from '@hapi/hapi'
import mime from 'mime-types'
import { v4 as uuidv4 } from 'uuid'
import { allConversionMethods } from './conversionMethods'
import { Response } from './index.d'
import { Request } from './request.d'
import pino from 'pino'
import { sendMessageToQueue } from '../queue/queueService'

const logger = pino()

/**
 * Verwerk een health verzoek
 * @async
 * @param request Hapi request object
 * @param h Hapi response toolkit
 * @returns Een response met HTTP code
 * @see {@link https://hapi.dev/api/ Hapi documentatie}
 */
const handlePdfRequest = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
  try {
    logger.info(`received request: ${JSON.stringify(request.payload)}`)
    const payload = request.payload as Request
    const { validated, message } = validateRequest(payload)
    if (validated) {
      payload.id = uuidv4()
      payload.extension = mime.extension(payload.input.mimeType)
      payload.output.extension = "pdf"
      await sendMessageToQueue(JSON.stringify(payload))
      return h.response().code(201)
    } else {
      const res: Response = {
        result: 'FAIL',
        error: message,
      }
      return h.response(res).code(400)
    }
  } catch (err) {
    const res: Response = {
      result: 'FAIL',
      error: err as string,
    }
    return h.response(res).code(500)
  }
}

/**
 * Valideer een verzoek
 * @param request Het verzoek
 * @returns Object met de validation state (true of false) en bijbehorende message
 */
export const validateRequest = (request: Request) => {
  const { input, output, callback, priority } = request;
  const { size, mimeType, url } = input;
  const { type, conversionMethod } = output;
  const { status, document } = callback;

  const validations = [
    { condition: isNaN(size) || size < 0, message: 'Missing or invalid input.size' },
    { condition: size === 0 && mimeType !== 'text/x-uri', message: 'An input.size of 0 can only be used with a MIME type of "text/x-uri"' },
    { condition: !mimeType || !allConversionMethods.includes(mimeType), message: 'Missing, invalid or unsupported input.mimeType' },
    { condition: !validateUrl(url), message: 'Missing or invalid input.url' },
    { condition: type !== 'application/pdf', message: 'Missing or invalid output.type' },
    { condition: conversionMethod && conversionMethod !== 'native' && conversionMethod !== 'local', message: 'Missing or invalid output.conversionMethod' },
    { condition: !validateUrl(status), message: 'Missing or invalid callback.status' },
    { condition: document && !validateUrl(document), message: 'Missing or invalid callback.document' },
    { condition: priority && (isNaN(priority) || priority < 0), message: 'Invalid value for priority' },
  ];

  for (const validation of validations) {
    if (validation.condition) {
      return {
        validated: false,
        message: validation.message,
      };
    }
  }

  return {
    validated: true,
    message: 'Request is valid',
  };
};

/**
 * Valideer een URL.
 * @param url Url om te valideren
 * @returns Of de URL valide is of niet
 */
const validateUrl = (url: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(url)
    return true
  } catch {
    return false
  }
}

const pdf: Hapi.ServerRoute<Hapi.ReqRefDefaults> | Hapi.ServerRoute<Hapi.ReqRefDefaults>[] = {
    method: 'POST',
    path: '/pdf',
    handler: handlePdfRequest,
  }
  
  /**
   * `/health` route.
   * Verwacht een GET request.
   */
  export default pdf