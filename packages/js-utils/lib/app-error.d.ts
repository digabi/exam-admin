export class AppError extends Error {
  constructor(message: string, status?: number)
  message: string
  name: string
  status: number
}

export class DataError extends Error {
  constructor(message: string, status?: number, errorType?: any)
  message: string
  name: string
  status: number
  errorType?: any
  renderedToEndUser: boolean
}
