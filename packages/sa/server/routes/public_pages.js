'use strict'
import express from 'express'
const router = express.Router()

const setCrawlerDenyHeaders = (req, res, next) => {
  res.header('X-Robots-Tag', 'noindex, nofollow')
  next()
}

router.get('/answers/:answer_paper_token', setCrawlerDenyHeaders, (req, res) => {
  res.sendFile('/public/answers.html', { root: `${__dirname}/../..` })
})

export default router
