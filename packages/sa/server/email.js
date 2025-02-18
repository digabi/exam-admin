import { SQS } from '@aws-sdk/client-sqs'
import BPromise from 'bluebird'
import config from './config/configParser'
import nodemailer from 'nodemailer'
import { logger } from './logger'

const sqs = new SQS()
const bufferTransport = nodemailer.createTransport({ streamTransport: true, buffer: true })

async function sendToSqs(mail) {
  const {
    envelope: { from, to },
    message
  } = await bufferTransport.sendMail(mail)
  // The SQS queue expects a raw message base64-encoded + envelope object (for logging only) in the attributes
  await sqs.sendMessage({
    QueueUrl: config.emailQueue,
    MessageBody: message.toString('base64'),
    MessageAttributes: {
      from: {
        DataType: 'String',
        StringValue: String(from)
      },
      to: {
        DataType: 'String',
        StringValue: String(to)
      }
    }
  })
}

export function send(mail) {
  if (config.runningInCloud) {
    return BPromise.resolve(sendToSqs(mail))
  } else {
    return BPromise.resolve(logger.info(`Mock email sent:\n${JSON.stringify(mail)}`))
  }
}
