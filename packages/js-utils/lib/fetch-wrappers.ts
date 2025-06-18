import { CookieJar } from 'tough-cookie'

export type FetchOptions = RequestInit & {
  url?: string
  jar?: boolean | CookieJar
  auth?: { username: string; password: string }
  qs?: QueryString
}

export type JSONBody = object | unknown[]
type QueryString = Record<string, string | number | boolean | undefined>

const cookieJar = new CookieJar()

type FileObject = {
  value: Buffer
  options: {
    filename: string
    contentType: string
  }
}

type FormObject = {
  [key: string]: FileObject[] | FileObject | string | number | boolean
}

function isFormObject(body: any): body is FormObject {
  if (body instanceof FormData) {
    return false
  }

  return !!body && body instanceof Object
}

function isFileObjectOrFileObjectArray(
  obj: FileObject[] | FileObject | string | number | boolean
): obj is FileObject[] | FileObject {
  return Array.isArray(obj) || obj instanceof Object
}

function addFilesToFormData(formData: FormData, key: string, files: FileObject[]) {
  files.forEach(file => {
    formData.append(key, new Blob([file.value], { type: file.options.contentType }), file.options.filename)
  })
}

function formObjectToFormData(body: FormObject): FormData {
  const formData = new FormData()

  Object.entries(body).forEach(([key, value]) => {
    if (isFileObjectOrFileObjectArray(value)) {
      addFilesToFormData(formData, key, Array.isArray(value) ? value : [value])
    } else {
      formData.append(key, value)
    }
  })

  return formData
}

function isContentTypeApplicationJson(res: Response) {
  const contentType = res.headers.get('content-type')

  if (contentType && contentType.includes('application/json')) {
    return true
  }

  return false
}

function basicAuthenticationHeader(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

function stringifyObjectValues(qs: QueryString): Record<string, string> {
  return Object.fromEntries(
    Object.entries(qs)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  )
}

function getQueryString(options: FetchOptions) {
  if (options.qs) {
    return `?${new URLSearchParams(stringifyObjectValues(options.qs)).toString()}`
  }

  return ''
}

function getCookieString(options: FetchOptions, url: string) {
  if (isToughCookieJar(options.jar)) {
    return options.jar.getCookieString(url)
  }

  if (options.jar === true) {
    return cookieJar.getCookieString(url)
  }
}

function isToughCookieJar(jar?: boolean | CookieJar): jar is CookieJar {
  return (
    !!jar &&
    typeof (jar as CookieJar).setCookie === 'function' &&
    typeof (jar as CookieJar).getCookieString === 'function'
  )
}

async function setCookie(res: Response, url: string, options: FetchOptions) {
  const setCookieHeaders = res.headers.getSetCookie?.() || []

  await Promise.all(
    setCookieHeaders.map(cookie => {
      if (isToughCookieJar(options.jar)) {
        return options.jar.setCookie(cookie, url)
      }

      if (options.jar === true) {
        return cookieJar.setCookie(cookie, url)
      }

      throw new Error('Unknown cookie jar!')
    })
  )
}

function requestJsonAsync<T>(
  url: string,
  method: string,
  options: FetchOptions,
  fullResponse: false,
  responseType: 'json'
): Promise<T>
function requestJsonAsync<T>(
  url: string,
  method: string,
  options: FetchOptions,
  fullResponse: true,
  responseType: 'json' | 'buffer'
): Promise<Response>
function requestJsonAsync(
  url: string,
  method: string,
  options: FetchOptions,
  fullResponse: false,
  responseType: 'buffer'
): Promise<Buffer>
async function requestJsonAsync<T>(
  url: string,
  method: string,
  options: FetchOptions,
  fullResponse: boolean,
  responseType: 'json' | 'buffer'
): Promise<T | Response | Buffer>
async function requestJsonAsync<T>(
  url: string,
  method: string,
  options: FetchOptions,
  fullResponse: boolean,
  responseType: 'json' | 'buffer'
): Promise<T | Response | Buffer> {
  const baseUrl = options.url ? options.url : url
  const res = await fetch(`${baseUrl}${getQueryString(options)}`, {
    ...options,
    method,
    headers: {
      ...options.headers,
      ...(options.jar && {
        Cookie: await getCookieString(options, baseUrl)
      }),
      ...(options.auth && {
        Authorization: basicAuthenticationHeader(options.auth.username, options.auth.password)
      })
    }
  })

  if (res.status >= 400) {
    throw new RequestJsonError(
      `Error ${res.status} ${method}ing to ${url}`,
      res.status,
      isContentTypeApplicationJson(res) ? await res.json() : undefined
    )
  }

  if (options.jar) {
    await setCookie(res, baseUrl, options)
  }

  if (fullResponse) {
    return res
  }

  if (responseType === 'buffer') {
    const arrayBuffer = await res.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  if (isContentTypeApplicationJson(res)) {
    return res.json() as T
  }

  if (!res.body) {
    return undefined as T
  }

  return res.text() as T
}

export class RequestJsonError extends Error {
  statusCode: number
  status: number
  body: unknown

  constructor(message: string, statusCode: number, body: unknown) {
    super()

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

function ensureJsonContentType(headers: RequestInit['headers'] | undefined) {
  const hasContentType = Object.keys(headers || {}).find(key => key.toLowerCase() == 'content-type')
  return {
    ...(!hasContentType ? { 'Content-Type': 'application/json' } : {}),
    ...headers
  }
}

export function postJsonAsync<T>(url: string, body?: JSONBody, options?: FetchOptions, fullResponse?: false): Promise<T>
export function postJsonAsync<T>(
  url: string,
  body?: JSONBody,
  options?: FetchOptions,
  fullResponse?: true
): Promise<Response>
export function postJsonAsync<T>(
  url: string,
  body: JSONBody = {},
  options: FetchOptions | undefined = {},
  fullResponse = false
) {
  return requestJsonAsync<T>(
    url,
    'POST',
    { ...options, headers: ensureJsonContentType(options.headers), body: JSON.stringify(body) },
    fullResponse,
    'json'
  )
}

export function postFormAsync<T>(
  url: string,
  body: FormData | FormObject,
  options?: FetchOptions,
  fullResponse?: false
): Promise<T>
export function postFormAsync<T>(
  url: string,
  body: FormData | FormObject,
  options?: FetchOptions,
  fullResponse?: true
): Promise<Response>
export function postFormAsync<T>(
  url: string,
  body: FormData | FormObject,
  options: FetchOptions | undefined = {},
  fullResponse = false
) {
  return requestJsonAsync<T>(
    url,
    'POST',
    {
      ...options,
      body: isFormObject(body) ? formObjectToFormData(body) : body
    },
    fullResponse,
    'json'
  )
}

export function postUrlEncodedFormAsync<T>(
  url: string,
  body: Record<string, string>,
  options?: FetchOptions,
  fullResponse?: false
): Promise<T>
export function postUrlEncodedFormAsync<T>(
  url: string,
  body: Record<string, string>,
  options?: FetchOptions,
  fullResponse?: true
): Promise<Response>
export function postUrlEncodedFormAsync(
  url: string,
  body: Record<string, string>,
  options: FetchOptions | undefined = {},
  fullResponse = false
) {
  return requestJsonAsync(url, 'POST', { ...options, body: new URLSearchParams(body) }, fullResponse, 'json')
}

export function getJsonAsync<T>(url: string, options?: FetchOptions, fullResponse?: false): Promise<T>
export function getJsonAsync<T>(url: string, options?: FetchOptions, fullResponse?: true): Promise<Response>
export function getJsonAsync(url: string, options: FetchOptions | undefined = {}, fullResponse = false) {
  return requestJsonAsync(url, 'GET', options || {}, fullResponse, 'json')
}

export function headAsync(url: string, options: FetchOptions | undefined = {}) {
  return requestJsonAsync(url, 'HEAD', options || {}, true, 'json')
}

export async function getBinaryAsync(url: string, options?: FetchOptions, fullResponse?: false): Promise<Buffer>
export async function getBinaryAsync(url: string, options?: FetchOptions, fullResponse?: true): Promise<Response>
export async function getBinaryAsync(url: string, options: FetchOptions = {}, fullResponse = false) {
  return await requestJsonAsync(url, 'GET', options || {}, fullResponse, 'buffer')
}

export function getBinaryResponseAsync(url: string, options: FetchOptions | undefined = {}) {
  return requestJsonAsync(url, 'GET', options || {}, true, 'buffer')
}

export function putJsonAsync<T>(url: string, body?: JSONBody, options?: FetchOptions, fullResponse?: false): Promise<T>
export function putJsonAsync<T>(
  url: string,
  body?: JSONBody,
  options?: FetchOptions,
  fullResponse?: true
): Promise<Response>
export function putJsonAsync<T>(
  url: string,
  body: JSONBody = {},
  options: FetchOptions | undefined = {},
  fullResponse = false
) {
  return requestJsonAsync<T>(
    url,
    'PUT',
    { ...options, headers: ensureJsonContentType(options.headers), body: JSON.stringify(body) },
    fullResponse,
    'json'
  )
}

export function deleteJsonAsync<T>(
  url: string,
  body?: JSONBody,
  options?: FetchOptions,
  fullResponse?: false
): Promise<T>
export function deleteJsonAsync<T>(
  url: string,
  body?: JSONBody,
  options?: FetchOptions,
  fullResponse?: true
): Promise<Response>
export function deleteJsonAsync(
  url: string,
  body: JSONBody = {},
  options: FetchOptions | undefined = {},
  fullResponse = false
) {
  return requestJsonAsync(
    url,
    'DELETE',
    { ...options, headers: ensureJsonContentType(options.headers), body: JSON.stringify(body) },
    fullResponse,
    'json'
  )
}
