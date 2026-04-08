import express, { Request, Response, NextFunction, Router } from 'express'
import z from 'zod'
import { postJsonAsync } from '@digabi/fetch'
import { config } from '../../../config'
import { PinSchema } from './utils'

const PinRedeemBodySchema = z.object({ pin: PinSchema })

const router = Router()

router.post('/redeem-ytl-pin', express.json(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pin } = PinRedeemBodySchema.parse(req.body)
    const result = await postJsonAsync(`${config().examUri}/ytl-connection/pin-redeem`, { pin })

    return res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
