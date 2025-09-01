import {
  abittiImportExamMaxFileSize,
  extendTimeoutForUploadRouteWithLargeFiles,
  fileUploadMiddleware
} from '@digabi/express-utils'
import { postFormAsync } from '@digabi/fetch'
import config from '../../config/configParser'
import * as _ from 'lodash'
import { logger } from '../../logger'

const maxImportFileSize = abittiImportExamMaxFileSize
export const importExamHandler = [
  extendTimeoutForUploadRouteWithLargeFiles,
  fileUploadMiddleware('examZip', maxImportFileSize, 413, `${maxImportFileSize}`),
  (req, res, next) => {
    function uploadZipToArpa(file, userId) {
      const formdata = {
        examZip: {
          value: file.buffer,
          options: {
            filename: Buffer.from(file.originalname, 'latin1').toString('utf8'),
            contentType: 'application/octet-stream'
          }
        },
        userId
      }
      return postFormAsync(`${config.examUri}/exams/import-exam`, formdata)
    }

    return uploadZipToArpa(req.file, req.user.userId)
      .then(arpaExam => res.status(201).json(_.assign({}, arpaExam)))
      .catch(e => {
        logger.warn('Import exam failed', e)
        if (e.code === 'ECONNREFUSED') {
          return res.status(500).end()
        }
        return res.status(e.statusCode ? e.statusCode : 500).end()
      })
      .catch(next)
  }
]
