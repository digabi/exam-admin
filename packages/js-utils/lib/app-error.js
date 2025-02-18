function AppError(message, status) {
  this.message = message
  this.name = 'AppError'
  this.status = status
  Error.captureStackTrace(this, AppError)
}
AppError.prototype = Object.create(Error.prototype)
AppError.prototype.constructor = AppError

function DataError(message, status, errorType) {
  this.message = message
  this.name = 'DataError'
  this.status = status || 400 // Default to bad request
  this.errorType = errorType || undefined
  this.renderedToEndUser = true
  Error.captureStackTrace(this, DataError)
}
DataError.prototype = Object.create(Error.prototype)
DataError.prototype.constructor = DataError

export { AppError, DataError }
