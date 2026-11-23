// A school the user has access to. School access is permission-based; consumers may carry richer
// per-school data (e.g. permission grants), but grading-ui only needs the principal flag.
export type UserDataSchool = {
  schoolId: string
  schoolName?: string
  principal: boolean
}

export type UserData = {
  user: UserAPI
  schools?: UserDataSchool[]
}

export type UserAPI = {
  acceptedEulaRoles: string[]
  details: UserDetailsAPI
  firstName: string
  lastName: string
  shortCode?: string
  mock?: boolean
  userName: string
  userAccountId?: string
}

export type UserDetailsAPI = {
  ssn: string
  ssnFromVetuma: string
  impersonation?: {
    realSsn: string
  }
}

export type Language = 'fi' | 'sv'

export type CensorDistributionState = 'preview' | 'distribution'

export type MinutesImportStatus = 'ok' | 'empty' | 'failed'
