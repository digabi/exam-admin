type AppConfigBase = {
  interface: string
  port: string | number
  stackTracesOnErrorResponses: boolean
  arpajsDbUrl: () => Promise<string>
  examUri: string
  sessionTimeout: number
  superUserUsername: string
  rootPage: string
  termsOfServicePage: {
    fi: string
    sv: string
  }
  sessionSecret: () => Promise<string>
  emailTemplates: {
    registrationMail: (
      to: string,
      locale: string
    ) => {
      from: string
      to: string
      subject: string
      text: string
    }

    updateEmail: (
      to: string,
      locale: string
    ) => {
      from: string
      to: string
      subject: string
      text: string
    }
  }
}

export type UnresolvedConfig =
  | (AppConfigBase & {
      runningInCloud: true
      emailQueue: string
      trustProxy: number
      useWebpackDevMiddleware: false
    })
  | (AppConfigBase & {
      runningInCloud: false
      emailQueue: undefined
      trustProxy: undefined
      useWebpackDevMiddleware: boolean
    })

export type ResolvedConfig = {
  [K in keyof UnresolvedConfig]: UnresolvedConfig[K] extends () => Promise<infer T>
    ? T
    : UnresolvedConfig[K] extends (() => Promise<string>) | string
      ? string
      : UnresolvedConfig[K] extends (() => Promise<string>) | undefined
        ? string | undefined
        : UnresolvedConfig[K]
}

export type Config = ResolvedConfig
