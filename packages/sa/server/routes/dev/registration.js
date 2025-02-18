'use strict'

import express from 'express'
const router = express.Router()
import pgrm from '../../db/arpajs-database'
import BPromise from 'bluebird'
const using = BPromise.using

router.get('/:email', (req, res, next) => {
  using(pgrm.getConnection(), connection =>
    connection
      .queryAsync('SELECT token as access_token FROM user_account WHERE lower(user_account_username) = lower($1)', [
        req.params.email
      ])
      .then(result => result.rows[0])
  )
    .then(token => res.status(200).json(token))
    .catch(next)
})

export default router
