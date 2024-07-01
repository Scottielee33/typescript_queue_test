import * as Hapi from '@hapi/hapi'

/**
 * Verwerk een health verzoek
 * @async
 * @param request Hapi request object
 * @param h Hapi response toolkit
 * @returns Een response met HTTP code
 * @see {@link https://hapi.dev/api/ Hapi documentatie}
 */
const handler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
  return h.response().code(204)
}

const health: Hapi.ServerRoute<Hapi.ReqRefDefaults> | Hapi.ServerRoute<Hapi.ReqRefDefaults>[] = {
  method: 'GET',
  path: '/health',
  handler,
}

/**
 * `/health` route.
 * Verwacht een GET request.
 */
export default health
