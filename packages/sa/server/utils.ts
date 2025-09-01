import { Request } from 'express'

export function baseUrlFromRequestHeaders(req: Partial<Request>) {
  if (req.headers?.['x-forwarded-host'] && req.headers?.['x-forwarded-proto']) {
    return `${req.headers['x-forwarded-proto'] as string}://${req.headers['x-forwarded-host'] as string}`
  } else {
    return `${req.protocol}://${req.headers?.host}`
  }
}
