import express, { Router } from 'express'
import * as db from '../db/ytl-connection-api'
import { logger } from '../logger'
import z from 'zod'

const router = Router()
router.use(express.json())

const PinCreateSchema = z.object({ userAccountId: z.uuid() })

router.post('/pin-create', async (req, res) => {
  const parse = PinCreateSchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  const { userAccountId } = parse.data

  await db.deleteExistingPin(userAccountId)
  const result = await db.createPin(userAccountId)

  if (!result) {
    logger.error('Apparent PIN conflict', { userAccountId })
    return res.sendStatus(500)
  }

  logger.audit('Created YTL PIN', { userAccountId })

  return res.json(result)
})

const PinRevokeSchema = z.object({
  userAccountId: z.uuid(),
  pin: db.PinSchema
})

router.post('/pin-revoke', async (req, res) => {
  const parse = PinRevokeSchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  const { userAccountId, pin } = parse.data
  const ok = await db.revokePin(userAccountId, pin)

  if (!ok) {
    logger.warn('Tried to revoke non-existent YTL PIN', { userAccountId, pin })
  } else {
    logger.audit('Revoked YTL PIN', { userAccountId, pin })
  }

  return res.sendStatus(ok ? 200 : 404)
})

const PinRedeemSchema = z.object({ pin: db.PinSchema })

router.post('/pin-redeem', async (req, res) => {
  const parse = PinRedeemSchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  const result = await db.redeemPin(parse.data.pin)

  if (result.ok) {
    logger.audit('Redeemed YTL PIN', { pin: parse.data.pin })
    return res.json({ apiKey: result.key })
  }

  switch (result.err) {
    case 'PIN_NOT_FOUND':
      logger.warn('Tried to redeem non-existent YTL PIN', { pin: parse.data.pin })
      return res.sendStatus(401)
    case 'CONFLICT':
      logger.error('Key conflict during YTL PIN redeem', {})
      return res.sendStatus(500)
  }
})

const KeyVerifySchema = z.object({ apiKey: z.string().length(db.KEY_LEN) })

router.post('/key-verify', async (req, res) => {
  const parse = KeyVerifySchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  return res.json({ ok: await db.verifyKey(parse.data.apiKey) })
})

const KeyRevokeSchema = z.object({ apiKey: z.string().length(db.KEY_LEN) })

router.delete('/key-revoke', async (req, res) => {
  const parse = KeyRevokeSchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  return res.json({ ok: await db.revokeKey(parse.data.apiKey) })
})

router.get('/pin/:userAccountId', async (req, res) => {
  const { userAccountId } = z.object({ userAccountId: z.uuid() }).parse(req.params)
  const result = await db.getExistingPin(userAccountId)

  return res.json(result)
})

router.get('/active-connections/:userAccountId', async (req, res) => {
  const { userAccountId } = z.object({ userAccountId: z.uuid() }).parse(req.params)

  return res.json(await db.getActiveConnections(userAccountId))
})

const DeleteConnectionSchema = z.object({
  userAccountId: z.uuid()
})

router.delete('/active-connections/:id', async (req, res) => {
  const { id } = z.object({ id: z.coerce.number() }).parse(req.params)
  const parse = DeleteConnectionSchema.safeParse(req.body)

  if (!parse.success) {
    return res.status(400).json(parse.error.issues)
  }

  const deletedApiKey = await db.removeActiveConnection(id, parse.data.userAccountId)

  if (!deletedApiKey) {
    return res.sendStatus(404)
  }

  return res.json({ deletedApiKey })
})

export default router
