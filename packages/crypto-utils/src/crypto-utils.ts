import * as crypto from 'crypto'
import { Readable } from 'stream'

const symmetricAlgo = 'aes-256-ctr'
const signAlgo = 'RSA-SHA256'
const defaultDigest = 'SHA1'

export interface KeyAndIv {
  key: Buffer
  iv: Buffer
}

type BufferOrString = Buffer | string
type BufferOrStream = Buffer | NodeJS.ReadableStream

function isBuffer(bufferOrStream: BufferOrStream): bufferOrStream is Buffer {
  return Buffer.isBuffer(bufferOrStream)
}

export function createAES256EncryptStreamWithIv(key: BufferOrString, iv: BufferOrString): crypto.Cipher {
  return crypto.createCipheriv(symmetricAlgo, asBuffer(key), asBuffer(iv))
}

// crypto.Cipher -> String
export function createAES256DecryptStreamWithIv(key: BufferOrString, iv: BufferOrString): crypto.Decipher {
  return crypto.createDecipheriv(symmetricAlgo, asBuffer(key), asBuffer(iv))
}

export async function signWithSHA256AndRSA(input: BufferOrStream, privateKeyPem: string): Promise<Buffer> {
  const signer = crypto.createSign(signAlgo)

  let inputStream
  if (isBuffer(input)) {
    inputStream = new Readable()
    // _read is required but you can noop it
    inputStream._read = () => {}
    inputStream.push(input)
    inputStream.push(null)
  } else {
    inputStream = input
  }
  const signerStream = inputStream.pipe(signer)

  return new Promise((resolve, reject) => {
    signerStream.on('finish', () => resolve(Buffer.from(signer.sign(privateKeyPem, 'base64'), 'utf-8')))
    signerStream.on('error', error => reject(error))
  })
}

export function deriveAES256KeyAndIv(password: string): KeyAndIv {
  const trimmedPassword = password.replace(/\s/g, '')
  const derivedData = crypto.pbkdf2Sync(trimmedPassword, trimmedPassword, 2000, 32 + 16, defaultDigest) // Use password as salt as well, 32 bytes for key, 16 for iv
  const key = derivedData.slice(0, 32)
  const iv = derivedData.slice(32, 48)
  return { key, iv }
}

function asBuffer(val: string | Buffer): Buffer {
  return Buffer.isBuffer(val) ? val : Buffer.from(val, 'base64')
}

// {Buffer, Buffer} -> ()
export function generateKeyAndIv() {
  return {
    key: crypto.randomBytes(32),
    iv: crypto.randomBytes(16)
  }
}

// String(base64) -> String -> String
export function encryptWithPublicKey(publicKeyPem: string, plaintextUtf8String: string): string {
  return encryptWithPublicKeyBuffer(publicKeyPem, Buffer.from(plaintextUtf8String, 'utf-8')).toString('base64')
}

// Buffer -> String -> Buffer
export function encryptWithPublicKeyBuffer(publicKeyPem: string, plaintextBuffer: string | Buffer): Buffer {
  return crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    typeof plaintextBuffer === 'string' ? Buffer.from(plaintextBuffer, 'utf-8') : Buffer.from(plaintextBuffer)
  )
}

// String(base64) -> String -> String(base64)
export function decryptWithPrivateKey(privateKeyPem: string, base64CipherText: string): string {
  return decryptWithPrivateKeyFromBuffer(privateKeyPem, asBuffer(base64CipherText)).toString()
}

// Buffer -> String -> Buffer
export function decryptWithPrivateKeyFromBuffer(privateKeyPem: string, ciphertextBuffer: Buffer): Buffer {
  return crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
    },
    ciphertextBuffer
  )
}

// Buffer -> Buffer -> Buffer|String(base64) -> Buffer
export function encryptAES256Async(inBuffer: Buffer | undefined, key: BufferOrString, iv: BufferOrString): Buffer {
  if (inBuffer === undefined) {
    return Buffer.from('')
  }
  const cipher = crypto.createCipheriv(symmetricAlgo, asBuffer(key), asBuffer(iv))
  return Buffer.concat([cipher.update(inBuffer), cipher.final()])
}

// Buffer -> Buffer -> Buffer|String(base64) -> Buffer
export function decryptAES256Async(encryptedBuffer: Buffer, key: BufferOrString, iv: BufferOrString): Buffer {
  const cipher = crypto.createDecipheriv(symmetricAlgo, asBuffer(key), asBuffer(iv))
  return Buffer.concat([cipher.update(encryptedBuffer), cipher.final()])
}

// boolean -> Buffer -> String -> String
export function verifyWithSHA256AndRSA(signedDataBuffer: Buffer, publicKey: string, signature: string): boolean {
  const verifier = crypto.createVerify(signAlgo)
  verifier.update(signedDataBuffer)
  return verifier.verify(publicKey, signature, 'base64')
}
