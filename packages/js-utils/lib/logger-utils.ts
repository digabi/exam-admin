import winston, { format, LoggerOptions } from 'winston'
import { Handler, Request, Response } from 'express'
import util from 'util'
import _ from 'lodash'
import process from 'process'
import tracer from 'cls-rtracer'
import basicAuth from 'basic-auth'

const inAws = !!process.env.YTL_AWS_STACK
const requestFinishedMessage = 'Request finished'

declare module 'winston' {
  interface Logger {
    audit: {
      // The LeveledLogMethod type isn't exported from winston, so I copy-pasted the definition here.
      (message: string, meta: any): void
      (message: string, ...meta: any[]): void
      (message: any): void
    }
  }
}

/**
 * Create a winston logger with sane defaults for most of our projects.
 * The function accepts the same options as winston.createLogger.
 *
 * The created logger is configured in following manner:
 *
 * - All logs are sent to stdout, using the console transport
 * - In non-AWS environments, logs are colorized and pretty-printed
 * - In AWS environments, logs are serialized as ndjson for Cloudwatch
 *
 * You can add a custom formatter to the default console transport by
 * defining the `format` option.
 */
export function createLogger(options: LoggerOptions = {}) {
  // We need to tell winston how to colorize our custom 'audit' log level.
  // Unfortunately, winston stores colors globally and not per instance.
  winston.addColors({ audit: 'magenta' })

  const formats = _.compact(
    inAws
      ? [
          format.timestamp(),
          combineMeta(),
          format(info => {
            info.requestId = getRequestId()
            return info
          })(),
          convertErrorToObject(),
          options.format,
          trimMessage(),
          format.json()
        ]
      : [
          format.colorize(),
          format.timestamp(),
          combineMeta(),
          trimMessage(),
          options.format,
          format.printf(({ level, timestamp, message, stack, ...meta }) => {
            if (message === requestFinishedMessage) {
              const { method, url, statusCode, responseTime } = meta
              // Simple morgan-like request logging.
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              return `${timestamp} ${level}: ${method} ${url} ${statusCode} ${responseTime}ms`
            }

            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            let msg = `${timestamp} ${level}: ${message}`

            // Print metadata fields on a separate line, indented by 2 spaces.
            msg += serializeMeta(meta)
            // Print the error stack on a separate line, indented by 2 spaces.
            if (stack) msg += `\n  ${String(stack as string)}`

            return msg
          })
        ]
  )

  return winston.createLogger({
    level: inAws ? 'http' : 'debug',
    levels: { audit: 0, error: 1, warn: 2, info: 3, http: 4, verbose: 5, debug: 6, silly: 7 },
    transports: [
      new winston.transports.Console({
        format: format.combine(...formats)
      })
    ],
    handleExceptions: true,
    ...options
  })
}

const splatSymbol = Symbol.for('splat')
/**
 * An alternative to winston's `format.splat()`.
 *
 * This formatter does two things:
 *
 * - Combines log messages with multiple string arguments, so e.g. `logger.info('foo', 'bar')` is combined to `'foo bar'`.
 *   This matches the old behavior of winston 2.
 * - It allows the user to add multiple metadata objects to the log message. All own enumerable properties from each
 *   metadata object are added to the final log message with Object.assign(). This matches the behavior of
 *   `format.splat()`.
 *
 * Unlike winston's `format.splat()`, it doesn't support printf-style parameters.
 */
const combineMeta = format(info => {
  const splats = (info[splatSymbol] as unknown[]) || []

  for (let i = 0; i < splats.length; i++) {
    const splat = splats[i]
    if (
      i > 0 && // The first object is already assigned by winston
      splat != null &&
      typeof splat === 'object'
    ) {
      Object.assign(info, splat)
    } else if (typeof splat === 'string') {
      ;(info.message as string) += ` ${splat}`
    }
  }

  return info
})

const convertErrorToObject = format(info => {
  for (const key in info) {
    if (Object.prototype.hasOwnProperty.call(info, key) && info[key] instanceof Error) {
      const errorInstance = info[key] as { message?: string; stack?: string; [key: string]: unknown }
      info[key] = { ...errorInstance, message: errorInstance.message, stack: errorInstance.stack }
    }
  }
  return info
})

function serializeMeta(meta: Record<string, unknown>) {
  let str = ''

  for (const key in meta) {
    if (Object.prototype.hasOwnProperty.call(meta, key)) {
      const value = meta[key]
      if (value !== undefined) {
        str += `\n  ${key}: ${util.inspect(value)}`
      }
    }
  }

  return str
}

const trimMessage = format(info => {
  if (_.isString(info.message)) {
    info.message = info.message.trim()
  }
  return info
})

interface RequestLoggerOptions {
  /** Retrieves the name of the user that initiated the request. Defaults to the basic auth username. */
  getRemoteUser?: (request: Request) => string | undefined
}

/** Creates a HTTP request logger middleware for express */
export function requestLogger(logger: winston.Logger, options: RequestLoggerOptions = {}): [Handler, Handler] {
  // Store the request processing start times in a WeakMap to avoid modifying the response object.
  const startTimes = new WeakMap<Response, bigint>()
  // eslint-disable-next-line prettier/prettier
  const getRemoteUser = options.getRemoteUser || (req => basicAuth(req)?.name)

  function onFinished(this: Response) {
    const endTime = process.hrtime.bigint()
    const startTime = startTimes.get(this)!
    // Measure response times in microsecond precision (formatted as milliseconds with 0–3 decimals).
    const responseTime = Number((endTime - startTime) / 1000n) / 1000

    // Ensure each request is logged only once.
    this.removeListener('finish', onFinished)
    this.removeListener('error', onFinished)

    const req = this.req

    logger.http(requestFinishedMessage, {
      // HTTP method and URL first, so they're the first fields in the serialized output.
      method: req.method,
      url: req.originalUrl,
      contentLength: Number(this.get('content-length')),
      remoteAddress: req.ip,
      remoteUser: getRemoteUser(req),
      responseTime: responseTime,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
      route: req.route?.path,
      statusCode: this.statusCode,
      userAgent: req.headers['user-agent']
    })
  }

  const tracerMiddleware = tracer.expressMiddleware({ headerName: 'X-Amzn-Trace-Id', useHeader: true })

  const loggingMiddleware: Handler = (req, res, next) => {
    startTimes.set(res, process.hrtime.bigint())
    res.on('finish', onFinished).on('error', onFinished)
    next()
  }

  // Express supports arrays of middlewares as well.
  return [tracerMiddleware, loggingMiddleware]
}

export function getRequestId(): string | undefined {
  return tracer.id() as string | undefined
}
