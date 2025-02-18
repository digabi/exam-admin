'use strict'

import express from 'express'
import { expressUtils, loggerUtils } from '@digabi/js-utils'
import config from './config/configParser'
import { logger } from './logger'
import screenshotRouter from './routes/screenshot'
import gradingRouter from './routes/grading'
import examsRouter from './routes/exams'
import sendAnswerEmailsRouter from './routes/send-answer-emails'
import studentsRouter from './routes/student'
import composingRouter from './routes/composing'
import adminRouter from './routes/admin'
import helmet from 'helmet'
import { importYoExams } from './exam/public-exam-importer'

const app = express()

app.use(helmet())

app.get('/health-check', (req, res) => res.sendStatus(200))
if (config.runningInCloud) {
  app.set('trust proxy', 1) // one hop (private ALB)
}

app.use(loggerUtils.requestLogger(logger))

app.get('/', (req, res) => {
  res.json({ application: 'arpajs' })
})

app.use('/grading/screenshot', screenshotRouter)
app.use('/grading', gradingRouter)
app.use('/exams', examsRouter)

app.use('/grading/send-answer-emails', sendAnswerEmailsRouter)
app.use('/grading/student', studentsRouter)
app.use('/composing', composingRouter)
app.use('/admin', adminRouter)

app.post('/import-public-exams', (_, res) => {
  void importYoExams()
    .then(() => res.sendStatus(200))
    .catch(() => res.sendStatus(400))
})

const devEnv = !config.runningInCloud
if (devEnv && config.testRestRouter) {
  logger.warn('enabling dev route')
  import(`./routes/dev${config.testRestRouter}`)
    .then(imported => app.use(config.testRestRouter, imported.default))
    .catch(error => logger.error(`Failed to import ${config.testRestRouter}`, { error }))
}

expressUtils.setupDefaultErrorHandlers(app, devEnv, logger)

export default app
