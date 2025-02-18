import BPromise from 'bluebird'
import _ from 'lodash'
import { MultiSamlStrategy } from '@node-saml/passport-saml'

export const passThroughFields = ['nameID', 'nameIDFormat', 'nameQualifier', 'spNameQualifier', 'sessionIndex']

function checkUserCredentialsFromVetuma(profile, done) {
  return getCredentials().nodeify(done)

  function getCredentials() {
    return BPromise.resolve(
      _.merge({ ssnFromVetuma: getId(profile) }, _.pick(profile, passThroughFields), getNames(profile))
    )
  }

  function getNames(profile) {
    // eslint-disable-line no-shadow
    var commonNameId = 'urn:oid:2.5.4.3'
    var firstNameId = 'http://eidas.europa.eu/attributes/naturalperson/CurrentGivenName'
    var lastNameId = 'urn:oid:2.5.4.4'

    var fullName = profile[commonNameId]
    var firstName = profile[firstNameId]
    var lastName = profile[lastNameId]

    if (firstName && lastName) {
      return {
        displayName: fullName || '-',
        firstName,
        lastName
      }
    } else if (fullName) {
      return {
        displayName: fullName || '-',
        firstName: _.tail(fullName.split(' ')).join(' ') || '-',
        lastName: fullName.split(' ')[0] || '-'
      }
    } else {
      return {
        displayName: '-',
        firstName: '-',
        lastName: '-'
      }
    }
  }

  function getId(profile) {
    // eslint-disable-line no-shadow
    var nationalIdentificationNumber = 'urn:oid:1.2.246.21'
    var electronicIdentificationNumber = 'urn:oid:1.2.246.22'
    if (profile[nationalIdentificationNumber]) {
      return profile[nationalIdentificationNumber]
    } else if (profile[electronicIdentificationNumber]) {
      return profile[electronicIdentificationNumber]
    } else {
      return '-'
    }
  }
}

var vetumaStrategy

export function initAndGetVetumaStrategy(options, sessionStorage) {
  const commonOptions = {
    identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:transient', //'urn:oasis:names:tc:SAML:2.0:nameid-format:transient',
    disableRequestedAuthnContext: true,
    signatureAlgorithm: 'sha256',
    skipRequestCompression: false,
    acceptedClockSkewMs: 1500,
    validateInResponseTo: 'always',
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true
  }

  vetumaStrategy = new MultiSamlStrategy(
    {
      passReqToCallback: true,
      getSamlOptions: (req, done) => done(null, { ...commonOptions, ...options(req) })
    },
    (_req, profile, done) => checkUserCredentialsFromVetuma(profile, done),
    async (req, profile, done) => {
      if (sessionStorage) {
        const sessionId = await sessionStorage.getSessionIdByNameId(profile.nameID)
        if (sessionId) {
          // req.user might be undefined if cookie is for some reason missing but session exists
          if (!req.user) {
            await sessionStorage.deleteSession(sessionId)
          }
          return done(null, req.user)
        }
      } else {
        // Expect cookie to always exist
        if (profile && req.user && profile.nameID === req.user.nameID) {
          return done(null, req.user)
        }
      }
      done(`User not found, profile: ${JSON.stringify(profile)}`)
    }
  )
  return getVetumaStrategy()
}

export function getVetumaStrategy() {
  if (!vetumaStrategy) {
    throw new Error('Vetuma strategy must be initialized!')
  }
  return vetumaStrategy
}
