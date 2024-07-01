import * as Hapi from '@hapi/hapi'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

/**
 * Controleer of MDCS klaar is voor gebruik.
 * Controleert of Gotenberg draait.
 * @todo Voeg Gotenberg Ghostscript/Python server toe
 * @async
 * @param request Hapi request object
 * @param h Hapi response toolkit
 * @returns Een response met HTTP code
 * @see {@link https://hapi.dev/api/ Hapi documentatie}
 */
const handler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
  try {
    const res = await axios.get(`${process.env.GOTENBERG_HOST}/health`)
    return h
      .response({
        status: 'HEALTHY',
        gotenberg: res.data,
      })
      .code(200)
  } catch (error) {
    return h.response({ status: 'UNHEALTHY', reason: error }).code(503)
  }
}

const readiness: Hapi.ServerRoute<Hapi.ReqRefDefaults> | Hapi.ServerRoute<Hapi.ReqRefDefaults>[] = {
  method: 'GET',
  path: '/readiness',
  handler,
}

/**
 * `/readiness` route.
 * Verwacht een GET request.
 */
export default readiness
