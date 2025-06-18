'use strict'

import express from 'express'
const router = express.Router()
import * as studentDb from '../db/student-data'

router.get('/:audioId', (req, res) => {
  studentDb
    .getAudio(req.params.audioId)
    .then(audio => {
      res.setHeader('Content-type', 'audio/ogg')
      return res.status(200).send(audio)
    })
    .catch(() => {
      res.sendStatus(404)
    })
})

export default router
