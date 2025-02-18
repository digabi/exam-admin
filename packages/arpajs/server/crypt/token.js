'use strict'

import CryptoJS from 'crypto-js'
import { logger } from '../logger'
import URLSafeBase64 from 'urlsafe-base64'
import config from '../config/configParser'
import crypto from 'crypto'

const key = CryptoJS.enc.Hex.parse(config.secrets.urlTokenKey)
const iv = CryptoJS.enc.Hex.parse(config.secrets.urlTokenIv)

function encrypt(str) {
  const encrypted = CryptoJS.AES.encrypt(str, key, { iv: iv })
  const base64Cipher = encrypted.ciphertext.toString(CryptoJS.enc.Base64)
  const urlSafeCipher = URLSafeBase64.encode(Buffer.from(base64Cipher, 'base64'))
  return urlSafeCipher
}

function decrypt(ciphertext) {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(config.secrets.urlTokenKey, 'hex'),
    Buffer.from(config.secrets.urlTokenIv, 'hex')
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
