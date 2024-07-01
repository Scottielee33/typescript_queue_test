import * as amqp from 'amqplib';
import { handleRequest } from '../pdf/handler';
import pino from 'pino';

const logger = pino()

let channel: amqp.Channel;
const MQ_URL = process.env.MQ_URL || 'amqp://localhost';

export async function connectToRabbitMQ() {
  try {
    const connection = await amqp.connect(MQ_URL);
    logger.info('Connected to RabbitMQ');

    channel = await connection.createChannel();
    logger.info('Channel created');

    // Set the prefetch count to 1
    channel.prefetch(1);

    const queue = 'pdf';
    await channel.assertQueue(queue, {
      durable: false
    });
    logger.info(`Queue ${queue} created`);
  } catch (error) {
    logger.error('Error connecting to RabbitMQ:', error);
  }
}

export async function sendToRabbitMQ(queue: string, message: object) {
  if (!channel) {
    logger.error('Channel is not initialized. Please connect to RabbitMQ first.');
    return;
  }

  try {
    // Convert the message object to a string and then to a Buffer
    const buffer = Buffer.from(JSON.stringify(message));

    channel.sendToQueue(queue, buffer);
    logger.info(`Sent message: ${JSON.stringify(message)}`);
  } catch (error) {
    logger.error('Error sending message to RabbitMQ:', error);
  }
}

export async function consumeFromRabbitMQPDF(queue: string, callback: (message: object) => void) {
  if (!channel) {
    logger.error('Channel is not initialized. Please connect to RabbitMQ first.');
    return;
  }

  try {
    await channel.consume(queue, async (msg) => {
      if (msg !== null) {
        try {
          logger.info(`Received From Queue: ${msg.content.toString()}`);
          let message = JSON.parse(msg.content.toString());
          if (!message.attempts) {
            message.attempts = 0;
          }
          message.attempts++;
          if (message.attempts > 5) {
            logger.error('Message failed after 5 attempts, not requeueing:', message);
            channel.ack(msg);
            return;
          }
          await handleRequest(message);
          callback(message);
          channel.ack(msg);
        } catch (error) {
          logger.error('Error handling message:', error);
          // Requeue the message for later processing
          channel.nack(msg, false, true);
        }
      }
    }, { noAck: false });
    logger.info(`Started consuming from queue: ${queue}`);
  } catch (error) {
      logger.error('Error consuming message from RabbitMQ:', error);
  }
}