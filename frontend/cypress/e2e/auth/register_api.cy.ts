/*
  Project: doublePlay (frontend)
  File: cypress/e2e/auth/register_api.cy.ts
  Description: End-to-end auth test that registers users through the UI and verifies backend validation on duplicates.
*/

import { createTestUser } from '../../support/auth-helpers'

describe('Register API interactions (real backend)', () => {
  it('successfully registers and navigates to login', () => {
    const testUser = createTestUser()

    cy.visit('/register')

    cy.get('#fullname').type(testUser.name)
    cy.get('#username').type(testUser.username)
    cy.get('#email').type(testUser.email)
    cy.get('#password').type(testUser.password)
    cy.get('#confirm-password').type(testUser.password)
    cy.get('input[type="checkbox"][name="acceptedTerms"]').check()

    cy.get('button[type="submit"]').click()

    cy.url({ timeout: 10000 }).should('include', '/login')
  })

  it('shows validation error from backend on duplicate username', () => {
    const apiUrl = 'http://localhost:3000/api'
    const testUser = createTestUser()

    // Register user first
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: testUser,
      failOnStatusCode: false
    })

    // Try to register again with same username
    cy.visit('/register')

    cy.get('#fullname').type('Another User')
    cy.get('#username').type(testUser.username) // Same username
    cy.get('#email').type(`different+${Date.now()}@example.com`) // Different email
    cy.get('#password').type(testUser.password)
    cy.get('#confirm-password').type(testUser.password)
    cy.get('input[type="checkbox"][name="acceptedTerms"]').check()

    cy.get('button[type="submit"]').click()

    cy.get('.form-error').should('be.visible')
  })
})
