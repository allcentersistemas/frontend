export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una letra mayúscula, un número y un símbolo'

const STRONG = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/

export function isStrongPassword(password) {
  return STRONG.test(String(password || ''))
}

export function validatePassword(password) {
  if (!isStrongPassword(password)) {
    return PASSWORD_POLICY_MESSAGE
  }
  return null
}
