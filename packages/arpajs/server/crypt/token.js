'use strict'

import { logger } from '../logger'
import { config } from '../config'
import crypto from 'crypto'

const key = Buffer.from(config().urlTokenKey, 'hex')
const iv = Buffer.from(config().urlTokenIv, 'hex')

function encrypt(str) {
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()])
  return encrypted.toString('base64url')
}

function decrypt(ciphertext) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config().urlTokenKey, 'hex'),
    Buffer.from(config().urlTokenIv, 'hex')
  )

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')
  logger.info('Decrypted token', { ciphertext, decrypted })

  return decrypted.trim()
}

export function untokenizeApId(req, res, next) {
  const { answerPaperToken } = req.params
  try {
    const apId = decrypt(answerPaperToken)
    if (Number.isInteger(parseInt(apId, 10))) {
      req.apId = apId
    } else {
      throw new Error('Decrypted token is not an integer')
    }
  } catch (err) {
    logger.warn('Error while decrypting token', { answerPaperToken }, err.message)
    return res.status(401).end('Error while decrypting token')
  }
  return next()
}

export function answerPaperIdToToken(answerPaperId) {
  return encrypt(`${answerPaperId}`)
}
export function tokenToAnswerPaperId(token) {
  return decrypt(token)
}
