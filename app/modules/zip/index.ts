import * as Hapi from '@hapi/hapi'
import { v4 as uuidv4 } from 'uuid'
import { handleRequest } from './handler'
import { Response } from './index.d'
import { Request } from './request.d'

/**
 * Verwerk een Zip verzoek
 * @async
 * @param request Hapi request object
 * @param h Hapi response toolkit
 * @returns Een response met HTTP code
 * @see {@link https://hapi.dev/api/ Hapi documentatie}
 */
const handleZipRequest = async (
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) => {
  try {
    const payload = request.payload as Request
    const { validated, message } = validateRequest(payload)

    if (validated) {
      payload.id = uuidv4()
      payload.output.extension = "zip"
      handleRequest(payload)
      return h.response().code(201)
    } else {
      const res: Response = {
        result: 'FAIL',
        error: message,
      }
      return h.response(res).code(400)
    }
  } catch (err) {
    console.error(err);
    let errorMessage = 'An error occurred';
    if (err instanceof Error) {
      errorMessage = err.message;
    }

    const res: Response = {
      result: 'FAIL',
      error: errorMessage,
    }
    return h.response(res).code(500)
  }
}

/**
 * Valideer de request van een Zip bestand
 *
 *@param request: het API-Request
 *@returns validatiestatus  en validatie message
 */
export const validateRequest = (request: Request) => {
  /** @todo input gedeelte nog valideren */
  const { output, callback, priority, input } = request
  // const { size, mimeType, url, naam } = input
  const { type } = output
  const { status, document } = callback

  if (input.length === 0) {
    return {
      validated: false,
      message: 'Missing or invalid input',
    }
  }

  for (const document of input) {
    if (!document.size || !document.url || !document.mimeType || !document.naam) {
      return {
        validated: false,
        message: 'Missing or invalid input',
      }
    }
  }

  if (type !== 'application/zip') {
    return {
      validated: false,
      message: 'Missing or invalid output.type',
    }
  }

  if (!validateUrl(status)) {
    return {
      validated: false,
      message: 'Missing or invalid callback.status',
    }
  }

  if (document && !validateUrl(document)) {
    return {
      validated: false,
      message: 'Missing or invalid callback.document',
    }
  }

  if (priority && (isNaN(priority) || priority < 0)) {
    return {
      validated: false,
      message: 'Invalid value for priority',
    }
  }
  return {
    validated: true,
    message: 'Request is valid',
  }
}

/**
 * Controleer of een url geldig is
 *
 * @param url url die gecontroleerd moeten worden
 * @returns True bij valide url anders fout
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

const zip: Hapi.ServerRoute<Hapi.ReqRefDefaults> | Hapi.ServerRoute<Hapi.ReqRefDefaults>[] = {
  method: 'POST',
  path: '/zip',
  handler: handleZipRequest,
}

/**
 * Zuo route object.
 * Verwacht een POST request op `/zip`.
 */
export default zip
