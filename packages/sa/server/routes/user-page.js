'use strict'

import express from 'express'
const router = express.Router()

router.get('/:slt', (req, res) => {
  sendIndex(res)
})

function sendIndex(res) {
  res.sendFile('/public/registration.html', { root: `${__dirname}/../..` })
}

export default router
