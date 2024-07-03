import { Client, IMessage } from '@stomp/stompjs';
import WebSocket = require('ws');
import pino from 'pino';
import { handleRequest } from '../pdf/handler';

const logger = pino();
const brokerURL = 'ws://localhost:61616';

export const client = new Client({
  brokerURL,
  connectHeaders: {
    login: 'artemis',
    passcode: 'artemis'
  },
  debug: function (str) {
    logger.info(str);
  },
  reconnectDelay: 5000,
  heartbeatIncoming: 40000,
  heartbeatOutgoing: 40000,
  webSocketFactory: () => {
    return new WebSocket(brokerURL);
  }
});

client.onConnect = function (frame) {
  logger.info('Connected: ' + frame);

  // Subscribe to the queue with client-individual acknowledgment
  client.subscribe('/queue/pdf', async function (message: IMessage) {
    if (message.body) {
      logger.info('Received: ' + message.body);
      await handleRequest(message);
    } else {
      logger.info('Received empty message');
      message.ack();
    }
  }, { ack: 'client-individual', 'activemq.prefetchSize': '1', 'temporary': 'false' });
};

export function sendMessageToQueue(body: string) {
  client.publish({
    destination: '/queue/pdf',
    body: body
  });
}

client.onStompError = function (frame) {
  console.error('Broker reported error: ' + frame.headers['message']);
  console.error('Additional details: ' + frame.body);
};
