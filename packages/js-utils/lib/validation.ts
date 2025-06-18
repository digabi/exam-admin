export function isSsnValid(ssn: string, ageSanityCheckForExams = false): boolean {
  const checkCodes: { [x: number]: string } = {
    0: '0',
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7',
    8: '8',
    9: '9',
    10: 'A',
    11: 'B',
    12: 'C',
    13: 'D',
    14: 'E',
    15: 'F',
    16: 'H',
    17: 'J',
    18: 'K',
    19: 'L',
    20: 'M',
    21: 'N',
    22: 'P',
    23: 'R',
    24: 'S',
    25: 'T',
    26: 'U',
    27: 'V',
    28: 'W',
    29: 'X',
    30: 'Y'
  }

  const centurySeparator21st = ['A', 'B', 'C', 'D', 'E', 'F']
  const specialFakeSsnToBeAllowed = '010101-0101'
  const matched = ssn
    .trim()
    .match(/^([0-9]{6})([-+]|[A-F]|[a-f]|[Yy]|[Xx]|[Ww]|[Vv]|[Uu])([\d]{3}|U[\d]{2})([\dA-Ya-y])$/)
  if (!matched) return false

  const individualNumber = matched[3]
  // Special YTL-defined fake ssn. checkCode calculations won't make sense for these
  if (individualNumber.startsWith('U')) return true

  const birthDate = matched[1]
  const centurySeparator = matched[2].toUpperCase()
  const checkCode = matched[4].toUpperCase()

  const birthDateYear = Number(birthDate.slice(-2))
  const currentYear = Number(new Date().getFullYear().toString().slice(-2))

  // We don't want to always do these checks, for example if we validate
  // data which is not related to current matricular exams
  if (ageSanityCheckForExams) {
    if (ssn.trim() === specialFakeSsnToBeAllowed) return true
    // Do not allow people over hundred years old (accidental use of - instead of A)
    if (centurySeparator === '+') return false
    if (centurySeparator === '-' && birthDateYear < currentYear) return false

    // Do not allow people not yet born
    if (centurySeparator21st.includes(centurySeparator) && birthDateYear > currentYear) return false
  }

  const checkCodeIndex = parseInt(birthDate.concat(individualNumber), 10) % 31
  return checkCode === checkCodes[checkCodeIndex]
}

export const isFakeYtlSsn = (ssn: string) => {
  const fakeYtlSsnRegEx = /\d{6}(AU|-U)\d{2}\w$/
  return fakeYtlSsnRegEx.test(ssn)
}

export function isValidEmail(email: string): boolean {
  const emailRegex =
    /^[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~](\.?[-!#$%&'*+/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/

  return email.length <= 254 && (emailRegex.test(email) || email.length === 0)
}
