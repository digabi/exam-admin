import express, { Request, Response, NextFunction, Router } from 'express'
import z from 'zod'
import { postJsonAsync, getJsonAsync, deleteJsonAsync } from '@digabi/fetch'
import { config } from '../../../config'
import { ensureAuthenticated } from '../../../auth/auth-session'
import { authCache } from './auth-cache'
import { PinSchema } from './utils'

const PinRevokeBodySchema = z.object({ pin: PinSchema })

interface AuthenticatedUser {
  userId: string
  userName: string
}

function getUser(req: Request): AuthenticatedUser {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (req as any).user as AuthenticatedUser
}

const router = Router()

// Session-authenticated routes (UI)
router.get('/current-pin', ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const result = await getJsonAsync(`${config().examUri}/ytl-connection/pin/${userId}`)

    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post('/create-pin', ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const result = await postJsonAsync(`${config().examUri}/ytl-connection/pin-create`, {
      userAccountId: userId
    })

    return res.json(result)
  } catch (err) {
    next(err)
  }
})

router.post(
  '/revoke-pin',
  ensureAuthenticated,
  express.json(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getUser(req)
      const { pin } = PinRevokeBodySchema.parse(req.body)
      await postJsonAsync(`${config().examUri}/ytl-connection/pin-revoke`, {
        userAccountId: userId,
        pin
      })

      return res.sendStatus(200)
    } catch (err) {
      next(err)
    }
  }
)

router.get('/active-connections', ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = getUser(req)
    const connections = await getJsonAsync(`${config().examUri}/ytl-connection/active-connections/${userId}`)

    return res.json(connections)
  } catch (err) {
    next(err)
  }
})

router.delete(
  '/active-connections/:id',
  ensureAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = getUser(req)
      const result = await deleteJsonAsync<{ deletedApiKey?: string }>(
        `${config().examUri}/ytl-connection/active-connections/${req.params.id}`,
        { userAccountId: userId }
      )

      if (result.deletedApiKey) {
        authCache.delete(result.deletedApiKey)
      }

      return res.json(result)
    } catch (err) {
      next(err)
    }
  }
)

export default router
