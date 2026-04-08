import express, { Request, Response, NextFunction, Router } from 'express'
import z from 'zod'
import { postJsonAsync, deleteJsonAsync } from '@digabi/fetch'
import { config } from '../../../config'
import { authCache } from './auth-cache'

const API_KEY_LEN = 64

const ApiKeySchema = z.string().length(API_KEY_LEN)
const RevokeKeyBodySchema = z.object({ apiKey: ApiKeySchema })

export async function verifyYtlApiKey(req: Request, res: Response, next: NextFunction) {
  const parsed = ApiKeySchema.safeParse(req.headers['x-ktp-api-key'])

  if (!parsed.success) {
    return res.sendStatus(401)
  }

  const apiKey = parsed.data
  const cached = authCache.get(apiKey)

  if (cached !== undefined) {
    return cached ? next() : res.sendStatus(401)
  }

  try {
    const { ok } = await postJsonAsync<{ ok: boolean }>(`${config().examUri}/ytl-connection/key-verify`, { apiKey })
    authCache.set(apiKey, ok)

    return ok ? next() : res.sendStatus(401)
  } catch {
    return res.sendStatus(401)
  }
}

const router = Router()

router.get('/status', (_: Request, res: Response) => {
  res.sendStatus(200)
})

router.delete('/revoke-ytl-key', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey } = RevokeKeyBodySchema.parse(req.body)
    await deleteJsonAsync(`${config().examUri}/ytl-connection/key-revoke`, { apiKey })
    authCache.delete(apiKey)

    return res.sendStatus(200)
  } catch (err) {
    next(err)
  }
})

export default router
