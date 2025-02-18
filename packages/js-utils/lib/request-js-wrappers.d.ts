import { CoreOptions } from 'request'
import BPromise from 'bluebird'

export function postJsonAsync(
  url: string,
  bodyObj: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export function postJsonWithBinaryResponseAsync(
  url: string,
  bodyObj: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export function postFormAsync(
  url: string,
  formData: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export function postUrlEncodedFormAsync(
  url: string,
  formData: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export function getJsonAsync(url: string, options?: CoreOptions, fullResponse?: boolean): BPromise<unknown>
export function headAsync(url: string, options?: CoreOptions, fullResponse?: boolean): BPromise<unknown>
export function getBinaryAsync(url: string, options?: CoreOptions, fullResponse?: boolean): BPromise<unknown>
export function getBinaryResponseAsync(url: string, options?: CoreOptions, fullResponse?: boolean): BPromise<unknown>
export function putJsonAsync(
  url: string,
  bodyObj: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export function deleteJsonAsync(
  url: string,
  bodyObj: any,
  options?: CoreOptions,
  fullResponse?: boolean
): BPromise<unknown>
export class RequestJsonError extends Error {
  constructor(message: string, status?: number, body?: unknown, ...params: unknown[])
  message: string
  name: string
  status: number
  statusCode: number
  body: unknown
}
