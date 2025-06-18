import basicAuth from 'basic-auth'
import _ from 'lodash'
import tls, { PeerCertificate } from 'tls'
import multer from 'multer'
import * as fs from 'fs'
import * as https from 'https'
import * as json2csv from 'json2csv'
import { pipeline } from 'stream/promises'
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, AxiosResponseHeaders, ResponseType } from 'axios'
import { Express, Handler, NextFunction, Request, Response } from 'express'
import { Logger } from 'winston'
import { FieldInfo } from 'json2csv'

export const abittiImportExamMaxFileSize = 305 * 1024 * 1024

export function setupDefaultErrorHandlers(app: Express, isDevEnv: boolean, logger: Logger) {
  // development error handler
  // will print stacktrace
  if (isDevEnv) {
    // eslint-disable-next-line no-unused-vars
    app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      safeLogError(err)
      if (!res.headersSent) {
        const status = (err as Error & { status?: number }).status
        res.status(status || 500)
        res.json({
          message: err.message,
          error: _.omit(err, 'renderedToEndUser')
        })
      }
    })
  }

  // production error handler
  // no stacktraces leaked to user
  // eslint-disable-next-line no-unused-vars
  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    if (isBodyParserError(err)) {
      logger.warn(err.toString(), _.omit(err, 'stack'))
      return
    }

    safeLogError(err)
    if (!res.headersSent) {
      const status = (err as Error & { status?: number }).status
      const renderedToEndUser = (err as Error & { renderedToEndUser?: boolean }).renderedToEndUser
      res.status(status || 500)
      res.json({
        message: renderedToEndUser ? err.message : '',
        error: _.pick(err, 'errorType')
      })
    }
  })

  function isBodyParserError(err: Error) {
    return 'type' in err && err.type === 'stream.not.readable'
  }
  function safeLogError(err: Error) {
    const status = (err as Error & { status?: number }).status
    if (!status || status >= 500) {
      logger.error(err.toString(), err)
    } else {
      logger.warn(err.toString(), _.omit(err, 'stack'))
    }
  }
}

function unauthorized(res: Response) {
  res.set('WWW-Authenticate', 'Basic realm=Authorization Required')
  return res.sendStatus(401)
}

export const basicAuthMiddleware =
  (username: string, password: string) => (req: Request, res: Response, next: NextFunction) => {
    const creds = basicAuth(req)
    if (creds && creds.name === username && creds.pass === password) {
      return next()
    } else {
      return unauthorized(res)
    }
  }

export function fileUploadMiddleware(
  fieldName: string,
  fileMaxSizeBytes: number,
  errorCodeForTooBigFile: number,
  errorMsgForTooBigFile: string
): Handler {
  const config = {
    limits: { fileSize: fileMaxSizeBytes }
  }
  return fileUpload(config, fieldName, errorCodeForTooBigFile, errorMsgForTooBigFile)
}

function fileUpload(config: multer.Options, fieldName: string, errorCode: number, errorMessage: string): Handler {
  const examUpload = multer(config).single(fieldName)
  const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
    void examUpload(req, res, err => {
      if (err instanceof multer.MulterError && _.includes(err.message, 'File too large')) {
        return res.status(errorCode || 413).send(errorMessage || 'Uploaded file was too big')
      } else {
        return next(err)
      }
    })
  }
  return uploadMiddleware as unknown as Handler
}

export const respondWith204 = (res: Response) => () => {
  // Firefox can't handle responses wo content-type, see https://bugzilla.mozilla.org/show_bug.cgi?id=521301
  res.setHeader('content-type', 'application/javascript')
  res.status(204).end()
}

export const respondWith204Or400 = (res: Response) => (data: unknown) => {
  if (!_.isEmpty(data)) {
    respondWith204(res)()
  } else {
    res.status(400).end()
  }
}

export const respondWithJsonOr404 =
  <ResponseBody>(res: Response<ResponseBody>) =>
  (data: ResponseBody) => {
    if (!_.isEmpty(data)) res.json(data)
    else res.status(404).end()
  }

// Returns the JSON content when pred returns true for the response data
export const respondWithJsonOr404When =
  <ResponseBody>(res: Response<ResponseBody>, pred: (data: ResponseBody) => boolean) =>
  (data: ResponseBody) => {
    if (pred(data)) res.json(data)
    else res.status(404).end()
  }

export const respondWithJsonOrThrow =
  <ResponseBody>(res: Response<ResponseBody>, error: Error) =>
  (data: ResponseBody) => {
    if (!_.isEmpty(data)) res.json(data)
    else throw error
  }

export function respondWithZip(res: Response, filename: string, zip: Buffer, omitContentDispositionHeader?: boolean) {
  if (!omitContentDispositionHeader) res.setHeader('Content-disposition', `attachment; filename="${filename}"`)
  res.setHeader('Content-type', 'application/octet-stream')
  res.status(200).send(zip)
}

export const proxyWithOpts =
  (targetPrefix: string, opts: AxiosRequestConfig) => (req: Request, res: Response, next: NextFunction) => {
    const defaults = {
      url: targetPrefix + req.url,
      method: req.method,
      responseType: 'stream' as ResponseType,
      data: req
    }
    const mergedOpts = {
      ...defaults,
      ...opts,
      headers: {
        ..._.omit(req.headers, 'host'),
        ...(opts && opts.headers)
      }
    }

    axios(mergedOpts)
      .then(response => pipeResponseData(req, res, next, response, 'outgoing'))
      .catch((err: AxiosError) => {
        if (!err.response) {
          proxyErrorHandling(next, err, err.config, 'incoming')
        } else {
          // If target server responses with >=400, it comes here
          return pipeResponseData(req, res, next, err.response, 'outgoing after error')
        }
      })
  }

async function pipeResponseData(
  req: Request,
  res: Response,
  next: NextFunction,
  response: AxiosResponse,
  errorPrefix: string
) {
  res.writeHead(response.status, response.headers as AxiosResponseHeaders)
  try {
    return await pipeline(response.data, res)
  } catch (err: unknown) {
    const error = err as Error & { code?: string }
    proxyErrorHandling(next, error, req, errorPrefix)
  }
}

type ProxyErrorParams = Request | AxiosRequestConfig | undefined
type ProxyErrorError = Error & { code?: string }

function proxyErrorHandling(next: NextFunction, err: ProxyErrorError, params: ProxyErrorParams, errorPrefix: string) {
  // Most likely user cancels request when data is sent to backend
  // ECONNABORTED === timeout; ECONNRESET = socket hang up / aborted
  // ERR_STREAM_PREMATURE_CLOSE and ECONNRESET happens when the user's browser cancels the request when data is sent to browser
  if (err && err.code === 'ECONNRESET') {
    next(new ProxyError(err, params, errorPrefix, 400, 'notice'))
  } else if (err && (err.code === 'ECONNABORTED' || err.code === 'ERR_STREAM_PREMATURE_CLOSE')) {
    next(new ProxyError(err, params, errorPrefix, 400, 'warning'))
  } else {
    next(new ProxyError(err, params, errorPrefix, 500, 'error'))
  }
}

class ProxyError extends Error {
  url: string | undefined
  method: string | undefined
  status: number
  code: string | undefined

  constructor(error: ProxyErrorError, params: ProxyErrorParams, errorPrefix: string, status: number, type: string) {
    super(`Proxy ${type} ${errorPrefix}: ${error.message}`)
    this.url = params?.url
    this.method = params?.method
    this.status = status
    this.code = error.code
  }
}

export function setRootCaToDigabiIfExists(trustedCertFingerprint: string) {
  try {
    https.globalAgent.options.ca = fs.readFileSync('/usr/share/ca-certificates/digabi/ytl-net-root-ca.crt')
    if (trustedCertFingerprint) {
      https.globalAgent.options.checkServerIdentity = fingerprintServerIdentityChecker(trustedCertFingerprint)
    }
  } catch (e: unknown) {
    const code = (e as Error & { code?: string }).code
    if (code !== 'ENOENT') {
      throw e
    }
  }
}

export function fingerprintServerIdentityChecker(trustedCertFingerprint: string) {
  return (host: string, cert: PeerCertificate) => {
    const err = tls.checkServerIdentity(host, cert)
    if (err) {
      return err
    }
    if (trustedCertFingerprint !== cert.fingerprint256) {
      return new ServerCertError(
        `Server cert fingerprint is not trusted, server=${cert.fingerprint256}, trusted=${trustedCertFingerprint}`,
        host,
        cert
      )
    }
  }
}

class ServerCertError extends Error {
  host: string
  cert: PeerCertificate

  constructor(message: string, host: string, cert: PeerCertificate) {
    super(message)
    this.host = host
    this.cert = cert
  }
}

export function sendCsv<T>(
  res: Response,
  data: T | T[],
  fields: Array<string | FieldInfo<T>>,
  filename: string,
  opts: json2csv.Options<T> = {}
) {
  const csv = createCsvFromJson(data, fields, opts)
  sendRawCsv(res, csv, filename)
}

export function createCsvFromJson<T>(
  data: T | T[],
  fields: Array<string | FieldInfo<T>>,
  opts: json2csv.Options<T> = {}
) {
  return json2csv.parse(data, { fields, delimiter: opts.delimiter || ';', ...opts })
}

const bomBuffer = Buffer.from([0xef, 0xbb, 0xbf])

export function sendRawCsv(res: Response, csv: string, filename: string) {
  res.setHeader('Content-disposition', `attachment; filename=${filename}`)
  res.setHeader('Content-type', 'text/csv; charset=utf-8')
  const csvBuffer = Buffer.from(csv, 'utf-8')
  const responseBuffer = Buffer.concat([bomBuffer, csvBuffer])
  res.send(responseBuffer)
}

export function sendRawJson(res: Response, stringifiedJson: string, filename: string) {
  res.setHeader('Content-disposition', `attachment; filename=${filename}`)
  res.setHeader('Content-type', 'application/json; charset=utf-8')
  const jsonBuffer = Buffer.from(stringifiedJson, 'utf-8')
  const responseBuffer = Buffer.concat([bomBuffer, jsonBuffer])
  res.send(responseBuffer)
}

export function sendJson(res: Response, json: object | object[], filename: string) {
  sendRawJson(res, JSON.stringify(json), filename)
}

export const ensureQueryParameters =
  (requiredQueryParameters: string[]) =>
  ({ query }: Request, res: Response, next: NextFunction) =>
    requiredQueryParameters.every(parameter => _.includes(Object.keys(query), parameter))
      ? next()
      : res.status(404).end()

export function preventBowerJsonGet(req: Request, res: Response, next: NextFunction) {
  if (req.url.match(/\/bower\.json$/)) {
    return res.status(404).end()
  } else {
    return next()
  }
}

export function extendTimeoutForUploadRouteWithLargeFiles(req: Request, res: Response, next: NextFunction) {
  // node defaults to 2 minutes. With 300 MB, that's 20 Mbps. 30 minutes is 1.3 Mbps
  res.setTimeout(30 * 60 * 1000)
  next()
}
