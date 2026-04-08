import { randomBytes, randomInt } from 'crypto'
import { pgrm } from './local-pg-resource-management'
import SQL from 'sql-template-strings'
import { addDays } from 'date-fns'
import z from 'zod'

export const KEY_LEN = 64
const PIN_PREFIX = 'AB'
const PIN_NUMERIC_LEN = 8

const PIN_REGEX = new RegExp(`^${PIN_PREFIX}\\d{${PIN_NUMERIC_LEN}}$`)
export const PinSchema = z.string().regex(PIN_REGEX)

// Effectively non-expiring per spec; kept finite so expiry logic stays exercised
export const API_KEY_TTL_DAYS = 36500

function genKey() {
  return randomBytes(KEY_LEN / 2).toString('hex')
}

function genPin() {
  return (
    PIN_PREFIX +
    randomInt(0, 10 ** PIN_NUMERIC_LEN)
      .toString()
      .padStart(PIN_NUMERIC_LEN, '0')
  )
}

export async function deleteExistingPin(userAccountId: string) {
  await pgrm.queryRowsAsync(
    SQL`DELETE FROM ytl_connection_pin WHERE ytl_connection_pin_user_account_id = ${userAccountId}`
  )
}

export async function createPin(userAccountId: string): Promise<{ pin: string } | null> {
  const pin = genPin()
  const res = await pgrm.queryRowsAsync(
    SQL`INSERT INTO ytl_connection_pin
        (ytl_connection_pin_code, ytl_connection_pin_user_account_id)
        VALUES (${pin}, ${userAccountId})
        ON CONFLICT DO NOTHING RETURNING 1`
  )

  return res.length === 0 ? null : { pin }
}

export async function revokePin(userAccountId: string, pin: string): Promise<boolean> {
  const res = await pgrm.queryRowsAsync(
    SQL`DELETE FROM ytl_connection_pin
        WHERE ytl_connection_pin_code = ${pin}
          AND ytl_connection_pin_user_account_id = ${userAccountId}
        RETURNING 1`
  )

  return res.length > 0
}

type PinRedeemResult = { ok: true; key: string } | { ok: false; err: 'PIN_NOT_FOUND' | 'CONFLICT' }

export async function redeemPin(pin: string): Promise<PinRedeemResult> {
  const found = await pgrm.queryRowsAsync<{ userAccountId: string }>(
    SQL`SELECT ytl_connection_pin_user_account_id AS "userAccountId"
        FROM ytl_connection_pin
        WHERE ytl_connection_pin_code = ${pin}`
  )
  if (found.length === 0) {
    return { ok: false, err: 'PIN_NOT_FOUND' }
  }

  const { userAccountId } = found[0]

  const key = genKey()
  const expiresAt = addDays(new Date(), API_KEY_TTL_DAYS)
  const inserted = await pgrm.queryRowsAsync(
    SQL`INSERT INTO ytl_connection_key
        (ytl_connection_key_value, ytl_connection_key_user_account_id, ytl_connection_key_expires_at)
        VALUES (decode(${key}, 'hex'), ${userAccountId}, ${expiresAt})
        ON CONFLICT DO NOTHING RETURNING 1`
  )

  return inserted.length === 0 ? { ok: false, err: 'CONFLICT' } : { ok: true, key }
}

export async function getExistingPin(userAccountId: string): Promise<{ pin: string } | null> {
  const res = await pgrm.queryRowsAsync<{ pin: string }>(
    SQL`SELECT ytl_connection_pin_code AS pin
        FROM ytl_connection_pin
        WHERE ytl_connection_pin_user_account_id = ${userAccountId}`
  )

  return res.length === 0 ? null : { pin: res[0].pin }
}

export async function verifyKey(key: string): Promise<boolean> {
  const res = await pgrm.queryRowsAsync(
    SQL`SELECT 1 FROM ytl_connection_key
        WHERE ytl_connection_key_value = decode(${key}, 'hex')
          AND now() < ytl_connection_key_expires_at`
  )

  return res.length === 1
}

export async function revokeKey(key: string): Promise<boolean> {
  const res = await pgrm.queryRowsAsync(
    SQL`DELETE FROM ytl_connection_key
        WHERE ytl_connection_key_value = decode(${key}, 'hex')
        RETURNING 1`
  )

  return res.length === 1
}

export async function getActiveConnections(userAccountId: string) {
  return pgrm.queryRowsAsync<{ name: string; createdAt: Date; expiresAt: Date; id: number }>(
    SQL`SELECT ua.user_account_username AS name,
               k.ytl_connection_key_created_at AS "createdAt",
               k.ytl_connection_key_expires_at AS "expiresAt",
               k.ytl_connection_key_id AS id
        FROM ytl_connection_key k
        JOIN user_account ua ON ua.user_account_id = k.ytl_connection_key_user_account_id
        WHERE k.ytl_connection_key_user_account_id = ${userAccountId}
          AND now() < k.ytl_connection_key_expires_at
        ORDER BY k.ytl_connection_key_created_at DESC`
  )
}

export async function removeActiveConnection(id: number, userAccountId: string): Promise<string | null> {
  const res = await pgrm.queryRowsAsync<{ deletedApiKey: string }>(
    SQL`DELETE FROM ytl_connection_key
        WHERE ytl_connection_key_id = ${id}
          AND ytl_connection_key_user_account_id = ${userAccountId}
        RETURNING encode(ytl_connection_key_value, 'hex') AS "deletedApiKey"`
  )

  return res.length === 0 ? null : res[0].deletedApiKey
}
