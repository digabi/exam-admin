import { z } from 'zod'

const keyRegExp = /^(\w+\.?)+$/

export const ContactInformationSchema = z
  .object({
    titleKey: z.string().regex(keyRegExp),
    footerEmail: z.string().email(),
    footerPhone: z.string(),
    footerLinks: z.array(
      z.object({
        url: z.string(),
        titleKey: z.string().regex(keyRegExp)
      })
    )
  })
  .nullable()

type ContactInformation = z.infer<typeof ContactInformationSchema>

export type Configuration = {
  contactInformation: ContactInformation
}

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>
}
