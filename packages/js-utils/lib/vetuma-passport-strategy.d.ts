import { Request } from 'express'
import { Strategy } from '@node-saml/passport-saml'

export function getVetumaStrategy(): Strategy

export const passThroughFields: ['nameID', 'nameIDFormat', 'nameQualifier', 'spNameQualifier', 'sessionIndex']

export class SessionStorage {
  getSessionIdByNameId: (nameId: string) => Promise<string | null>
  deleteSession: (sessionId: string) => Promise<void>
}
export function initAndGetVetumaStrategy(options: (req: Request) => object, sessionStorage?: SessionStorage): Strategy
