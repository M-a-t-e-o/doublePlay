/**
 * Password requirements matching backend validation
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true
}

/**
 * Generate a password that meets all requirements
 * @returns A valid password string
 */
export function generateValidPassword(): string {
  // Pattern: at least 8 chars, 1 uppercase, 1 number, 1 symbol + more chars
  return 'Password123!'
}

/**
 * Validate password against requirements
 * @param password The password to validate
 * @returns true if valid, false otherwise
 */
export function isValidPassword(password: string): boolean {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return false
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return false
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return false
  }
  if (PASSWORD_REQUIREMENTS.requireSymbol && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false
  }
  return true
}

/**
 * Create a test user object with valid credentials
 * @param override Optional overrides for user properties
 * @returns Test user object
 */
export function createTestUser(override?: Partial<any>) {
  const timestamp = Date.now()
  return {
    name: 'Cypress Test User',
    username: `cypress_${timestamp}`,
    email: `cypress+${timestamp}@example.com`,
    password: generateValidPassword(),
    ...override
  }
}
