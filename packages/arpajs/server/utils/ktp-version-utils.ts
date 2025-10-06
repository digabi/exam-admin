export function isAbitti2KtpVersion(ktpVersion: string | undefined) {
  return /^SERVER-v\d+\.\d+\.\d+$/.test(ktpVersion ?? '')
}
