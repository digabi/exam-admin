export type RoleType = 'GRADING_TEACHER' | 'PRINCIPAL' | 'ASSISTANT' | 'STUDENTCOUNSELLOR' | 'CENSOR'

export type Role = SchoolPersonnelRole | CensorRole

export type SchoolPersonnelRole = {
  roleType: 'GRADING_TEACHER' | 'PRINCIPAL' | 'ASSISTANT' | 'STUDENTCOUNSELLOR'
  schoolId: string
  schoolName: string
  startdate: string
  enddate?: string
  allowedExams?: string[]
}

type CensorRole = {
  roleType: 'CENSOR'
  divisionId: string
  divisionName: string
  startdate: string
  enddate?: string
  shortCode: string
  censorId: string
  divisionExamType: string
}

export type UserData = {
  roles?: Role[]
  user: UserAPI
}

export type UserAPI = {
  acceptedEulaRoles: string[]
  details: UserDetailsAPI
  firstName: string
  lastName: string
  censorId?: string
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
