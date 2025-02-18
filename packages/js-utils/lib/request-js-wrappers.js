import _ from 'lodash'
import BPromise from 'bluebird'
import request from 'request'

var requestAsync = BPromise.promisify(
  request.defaults({
    json: true
  }),
  { multiArgs: true }
)

function requestJsonWithBodyAsync(url, bodyObj, method, options, fullResponse) {
  return requestJsonAsync(url, method, _.merge({ body: bodyObj || {} }, options), fullResponse)
}

function requestJsonWithFormDataAsync(url, formData, method, options, fullResponse) {
  return requestJsonAsync(url, method, _.merge({ formData: formData || {} }, options), fullResponse)
}

function requestJsonWithUrlEncodedFormDataAsync(url, formData, method, options, fullResponse) {
  return requestJsonAsync(url, method, _.merge({ form: formData || {} }, options), fullResponse)
}

function requestJsonAsync(url, method, options, fullResponse) {
  var safeToMutateOptions = _.clone(options, false)
  safeToMutateOptions.url = safeToMutateOptions.url || url
  safeToMutateOptions.method = safeToMutateOptions.method || method

  safeToMutateOptions.agentOptions = {
    keepAlive: false,
    ...(safeToMutateOptions.agentOptions || {})
  }

  return requestAsync(safeToMutateOptions).spread((res, body) => {
    if (res.statusCode >= 400) {
      throw new RequestJsonError(`Error ${res.statusCode} ${method}ing to ${url}`, res.statusCode, res.body)
    } else if (options.statusCodeChecker && !options.statusCodeChecker(res.statusCode)) {
      throw new RequestJsonError(
        `Error status code (${res.statusCode}) does not match the expected ${method}ing to ${url}`,
        res.statusCode,
        res.body
      )
    }
    if (fullResponse) {
      return res
    } else {
      return body
    }
  })
}

export class RequestJsonError extends Error {
  constructor(message, statusCode, body, ...params) {
    super(params)

    Error.captureStackTrace(this, RequestJsonError)
    this.message = message
    this.statusCode = statusCode
    this.status = statusCode
    this.body = body
    this.name = 'RequestJsonError'
  }

  toString() {
    return this.message
  }
}

export function postJsonAsync(url, bodyObj, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonWithBodyAsync(url, bodyObj, 'POST', options, fullResponse)
}
export function postJsonWithBinaryResponseAsync(url, bodyObj, options, fullResponse) {
  return postJsonAsync(url, bodyObj, _.merge({}, options, { encoding: null }), fullResponse)
}
export function postFormAsync(url, formData, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonWithFormDataAsync(url, formData, 'POST', options, fullResponse)
}
export function postUrlEncodedFormAsync(url, formData, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonWithUrlEncodedFormDataAsync(url, formData, 'POST', options, fullResponse)
}
export function getJsonAsync(url, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonAsync(url, 'GET', options, fullResponse)
}
export function headAsync(url, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonAsync(url, 'HEAD', options, fullResponse)
}
export function getBinaryAsync(url, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonAsync(url, 'GET', _.merge({}, options, { encoding: null, json: false }), fullResponse)
}
export function getBinaryResponseAsync(url, options, fullResponse = true) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonAsync(url, 'GET', _.merge({}, options, { encoding: null, json: false }), fullResponse)
}
export function putJsonAsync(url, bodyObj, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonWithBodyAsync(url, bodyObj, 'PUT', options, fullResponse)
}
export function deleteJsonAsync(url, bodyObj, options, fullResponse) {
  options = options || {} // eslint-disable-line no-param-reassign
  return requestJsonWithBodyAsync(url, bodyObj, 'DELETE', options, fullResponse)
}
