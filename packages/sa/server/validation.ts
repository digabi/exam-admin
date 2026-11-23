import z from 'zod'

// Identifiers that sa copies into arpajs URLs. arpajs trusts every request sa sends,
// so these must not be able to contain anything that changes the path of that URL.
//
// Every handler that passes a request value on to arpajs checks it first, explicitly:
//
//   if (!isUuid(req.params.examUuid)) {
//     return res.sendStatus(400)
//   }

// Any 8-4-4-4-12 hex id. Version bits are left to arpajs, which validates its own ids.
export const UuidSchema = z.guid()

// z.coerce.number() would also accept "0x10", "1e3" and whitespace.
export const NumericIdSchema = z.string().regex(/^[0-9]+$/)

export function isUuid(value: unknown): value is string {
  return UuidSchema.safeParse(value).success
}

export function isNumericId(value: unknown): value is string {
  return NumericIdSchema.safeParse(value).success
}
