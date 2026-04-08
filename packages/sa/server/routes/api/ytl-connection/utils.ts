import z from 'zod'

export const PIN_LEN = 10
export const PinSchema = z.string().length(PIN_LEN)
