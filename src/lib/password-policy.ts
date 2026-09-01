export const PASSWORD_MIN_LENGTH = 12

export function validateSecurePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
  }
  if (!/[a-z]/.test(password)) return 'Incluye al menos una letra minúscula.'
  if (!/[A-Z]/.test(password)) return 'Incluye al menos una letra mayúscula.'
  if (!/\d/.test(password)) return 'Incluye al menos un número.'
  if (!/[^A-Za-z0-9]/.test(password)) return 'Incluye al menos un símbolo.'
  return null
}
