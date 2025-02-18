export function validEmail(email) {
  return (
    typeof email === 'string' && /^[a-zA-Z0-9.!#$%&'*+/=?_`{|}~^-]+@[a-zA-Z0-9.-]+$/.test(email) && email.length < 255
  )
}
