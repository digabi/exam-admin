import express, { Router } from 'express'
import * as db from '../db/exam-statistics'
import z from 'zod'
import { logger } from '../logger'

const router = Router()
router.use(express.json())

const weekFormatSchema = z.string().regex(/^\d{4}-(0[1-9]|[1-4]\d|5[0-3])$/)

const GetStatisticsSchema = z.object({ startWeek: weekFormatSchema.optional(), endWeek: weekFormatSchema.optional() })

router.get('/get-statistics', async (req, res) => {
  const parsed = GetStatisticsSchema.safeParse(req.query)

  if (!parsed.success) {
    return res.status(400).json(parsed.error.issues)
  }

  const { startWeek, endWeek } = parsed.data
  logger.info(`Getting exam statistics: startWeek=${startWeek}, endWeek=${endWeek}`)
  const result = await db.getExamStatistics(startWeek, endWeek)
  logger.info(`Returning ${result.length} rows of exam statistics: ${JSON.stringify(result)}`)
  res.json(result)
})

export default router
