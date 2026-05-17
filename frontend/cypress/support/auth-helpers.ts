/*
  Project: doublePlay (frontend)
  File: cypress/support/auth-helpers.ts
  Description: Shared Cypress helpers for auth tests, including password rules and test-user factories.
*/

/** Password requirements matching backend validation. */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSymbol: true
}

/** Generates a password that satisfies the backend rules. */
export function generateValidPassword(): string {
  // Pattern: at least 8 chars, 1 uppercase, 1 number, 1 symbol + more chars
  return 'Password123!'
}

/** Validates a password against the shared requirements. */
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

/** Builds a Cypress test user with valid credentials and optional overrides. */
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
