import * as Hapi from '@hapi/hapi'
import * as Sentry from '@sentry/node'
import * as dotenv from 'dotenv'
import pino from 'pino'
import readiness from './modules/readiness'
import health from './modules/health'
import pdf from './modules/pdf'
import { client } from './modules/queue/queueService'

dotenv.config()
const logger = pino();

client.activate();

const server = Hapi.server({
    port: 3000,
    host: '0.0.0.0',
  })

server.route(health)
server.route(readiness)
server.route(pdf)

/**
 * Start MDCS server
 * @returns Hapi server
 */
export const start = async () => {
    await server.start()
    logger.info('Server running on %s', server.info.uri)
    return server
  }