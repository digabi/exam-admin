'use strict'

import express from 'express'
const router = express.Router()
import * as studentDb from '../db/student-data'

router.get('/:screenshotUuid', (req, res) => {
  studentDb
    .getScreenshot(req.params.screenshotUuid)
    .then(screenshot => {
      res.setHeader('Content-type', 'image/png')
      return res.status(200).send(screenshot)
    })
    .catch(() => {
      res.sendStatus(404)
    })
})

export default router
