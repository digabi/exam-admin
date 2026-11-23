import { config } from '../config'
import { Request, Response, NextFunction } from 'express'
import * as proxying from '../proxying'

export function checkExamStatisticsApiKey(req: Request, res: Response, next: NextFunction) {
  const expectedApiKey = config().abittiExamStatisticsApiKey
  const apiKey = req.headers['x-abitti-exam-statistics-api-key']
  if (expectedApiKey && apiKey === expectedApiKey) {
    next()
    return
  }
  res.status(403).end()
}

export const getStatisticsProxy = proxying.proxyToArpa('/exam-statistics/get-statistics')
