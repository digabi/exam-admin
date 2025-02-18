import { Request, Response, NextFunction } from 'express'
import { validate } from 'uuid'

export function uuidValidator(paramsName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const uuid = req.params[paramsName]
    if (validate(uuid)) {
      next()
    } else {
      res.sendStatus(400)
    }
  }
}
