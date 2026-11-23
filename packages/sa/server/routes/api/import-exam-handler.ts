import { abittiImportExamMaxFileSize, extendTimeoutForUploadRouteWithLargeFiles } from '@digabi/express-utils'
import { NextFunction, Request, Response } from 'express'
import { proxyToArpa } from '../../proxying'

const maxImportFileSize = abittiImportExamMaxFileSize

export const importExamHandler = [
  extendTimeoutForUploadRouteWithLargeFiles,
  (req: Request, res: Response, next: NextFunction) => {
    if (Number(req.headers['content-length']) > maxImportFileSize) {
      // Answer only once the client has sent everything: responding mid-upload makes node destroy
      // the socket, and the client sees a connection reset instead of our 413.
      req.on('end', () => res.status(413).send(`${maxImportFileSize}`))
      req.resume() // discard the upload
      return
    } else {
      req.url = `/${req.user!.userId}`
      return proxyToArpa('/exams/import-exam')(req, res, next)
    }
  }
]
