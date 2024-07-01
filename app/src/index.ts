import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import WebSocket = require('ws');

const brokerURL = 'ws://localhost:61616';

const client = new Client({
  brokerURL,
  connectHeaders: {
    login: 'artemis',
    passcode: 'artemis'
  },
  debug: function (str) {
    console.log(str);
  },
  reconnectDelay: 5000,
  heartbeatIncoming: 40000,
  heartbeatOutgoing: 40000,
  webSocketFactory: () => {
    return new WebSocket(brokerURL);
  }
});

async function processMessage(message: IMessage) {
  console.log('Processing message:', message.body);

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Finished processing message:', message.body);
  message.ack();
}

client.onConnect = function (frame) {
  console.log('Connected: ' + frame);

  // Subscribe to the queue with client-individual acknowledgment
  client.subscribe('/queue/test', async function (message: IMessage) {
    if (message.body) {
      console.log('Received: ' + message.body);
      await processMessage(message);
    } else {
      console.log('Received empty message');
      message.ack();
    }
  }, { ack: 'client-individual' });

  // Send a message to the queue
  client.publish({
    destination: '/queue/test',
    body: 'Hello, ActiveMQ Artemis!'
  });
};

client.onStompError = function (frame) {
  console.error('Broker reported error: ' + frame.headers['message']);
  console.error('Additional details: ' + frame.body);
};

client.activate();
