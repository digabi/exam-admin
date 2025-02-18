import { SQS } from '@aws-sdk/client-sqs'
import config from './config/configParser'
import BPromise from 'bluebird'
import nodemailer from 'nodemailer'
import { logger } from './logger'

const sqs = new SQS()
const bufferTransport = nodemailer.createTransport({ streamTransport: true, buffer: true })

async function sendToSqsWithRetry(mail) {
  try {
    return await sendToSqs(mail)
  } catch (e) {
    if (e.toString().includes('InternalError') && e.toString().includes('Please try again')) {
      logger.warn(`AWS InternalError trying to send email to ${mail.to}, retrying once...`)
      return sendToSqs(mail)
    } else {
      logger.error('Error sending email to SQS', { error: e })
      throw new Error('Error sending email to SQS')
    }
  }
}

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

export function sendEmail(mail) {
  if (config.runningInCloud) {
    return BPromise.resolve(sendToSqsWithRetry(mail))
  } else {
    return BPromise.resolve(
      (() => {
        // eslint-disable-next-line no-console
        console.log(`Mock email sent:\n${JSON.stringify(mail)}`)
      })()
    )
  }
}
