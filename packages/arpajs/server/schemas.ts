import z from 'zod'

export const ExamCodeSchema = z.string().max(5)
export const ExamPeriodSchema = z.string().max(5)
export const ExamTypeSchema = z.enum(['normal', 'visually-impaired', 'hearing-impaired'])
export const ExamLanguageSchema = z.enum(['fi-FI', 'sv-FI'])
