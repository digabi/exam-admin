export function isAbitti2KtpVersion(ktpVersion: string | undefined) {
  // A1 used ^SERVER\d{4}\w$ or the string "->" instead
  return /^SERVER-.*$/.test(ktpVersion ?? '')
}
