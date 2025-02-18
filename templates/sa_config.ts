const oneMinute = 60
const oneHour = 60 * oneMinute
const oneDay = 24 * oneHour

const configuration = {
  nodeEnv: 'development',
  interface: '0.0.0.0',
  port: 3000,
  runningInCloud: false,
  stackTracesOnErrorResponses: true,
  arpajsDbUrl: 'postgres://db:5432/arpa',
  examUri: 'http://localhost:8030',
  oauth: {
    enabled: false,
    accessTokenExpirySeconds: oneHour,
    authorizationCodeExpirySeconds: oneMinute,
    refreshTokenExpirySeconds: 60 * oneDay
  },
  sessionTimeout: oneDay * 1000,
  superUserUsername: 'superuser@example.com',
  rootPage: '/',
  termsOfServicePage: { fi: '#', sv: '#' },
  registrationMail,
  updateEmail,
  secrets: {
    sessionSecret: 'secret'
  }
}

function registrationMail(to: string, tokenUrl: string) {
  return {
    from: `Example Rekisteröinti / Example Registrering <example@example.com>`,
    to,
    subject: 'Tervetuloa! Välkommen!',
    text:
      `Tervetuloa käyttäjäksi!\n\nVahvistaaksesi rekisteröinnin, klikkaa alla olevaa linkkiä tai kopioi se selaimen osoitekenttään. Käyttäjätunnuksesi on antamasi sähköpostiosoite.\n${tokenUrl}` +
      `\n\n\n\n` +
      `Välkommen!\n\nFör att bekräfta registeringen klicka på nedanstående länk eller kopiera den till webbläsarens adressfält. Ditt användarnamn är e-postadressen som du angett.\n${tokenUrl}`
  }
}

function updateEmail(to: string, confirmationUrl: string) {
  return {
    from: `Examples <example@example.com>`,
    to,
    subject: 'Vahvista uusi sähköpostiosoite.',
    text: `Vahvista sähköpostiosoitteen vaihto klikkaamalla alla olevaa linkkiä.` + `\n\n${confirmationUrl}`
  }
}
export default configuration
