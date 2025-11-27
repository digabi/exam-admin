import { UnresolvedConfig } from '../config-types'
import { mockAwsFetch } from '../config-aws-fetch'

const emailTemplates = {
  registrationMail(to: string, tokenUrl: string) {
    return {
      from: `Example Rekisteröinti / Example Registrering <example@example.com>`,
      to,
      subject: 'Tervetuloa! Välkommen!',
      text:
        `Tervetuloa käyttäjäksi!\n\nVahvistaaksesi rekisteröinnin, klikkaa alla olevaa linkkiä tai kopioi se selaimen osoitekenttään. Käyttäjätunnuksesi on antamasi sähköpostiosoite.\n${tokenUrl}` +
        `\n\n\n\n` +
        `Välkommen!\n\nFör att bekräfta registeringen klicka på nedanstående länk eller kopiera den till webbläsarens adressfält. Ditt användarnamn är e-postadressen som du angett.\n${tokenUrl}`
    }
  },
  updateEmail(to: string, confirmationUrl: string) {
    return {
      from: `Examples <example@example.com>`,
      to,
      subject: 'Vahvista uusi sähköpostiosoite.',
      text: `Vahvista sähköpostiosoitteen vaihto klikkaamalla alla olevaa linkkiä.` + `\n\n${confirmationUrl}`
    }
  }
}

export const developmentConfig: UnresolvedConfig = {
  interface: '0.0.0.0',
  port: 3000,
  runningInCloud: false,
  stackTracesOnErrorResponses: true,
  arpajsDbUrl: mockAwsFetch('postgres://db:5432/arpa'),
  emailQueue: undefined,
  examUri: 'http://localhost:8030',
  trustProxy: undefined,
  sessionTimeout: 30 * 24 * 60 * 60 * 1000, // One month
  superUserUsername: 'superuser@example.com',
  rootPage: '/',
  termsOfServicePage: {
    fi: '#',
    sv: '#'
  },
  emailTemplates,
  sessionSecret: mockAwsFetch('dev-session-secret'),
  useWebpackDevMiddleware: true
}
