import { createTestUser, generateValidPassword } from '../../support/auth-helpers'

describe('Login API interactions (real backend)', () => {
  it('successful login via UI (real backend) sets token and navigates home', () => {
    const apiUrl = 'http://localhost:3000/api'
    const testUser = createTestUser()

    // Register user first
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: testUser,
      failOnStatusCode: false
    })

    cy.visit('/login')

    cy.get('#email').type(testUser.email)
    cy.get('#password').type(testUser.password)
    cy.get('button[type="submit"]').click()

    // After a successful real backend login the app should navigate to /home
    cy.url({ timeout: 10000 }).should('include', '/home')

    // Token should be present in localStorage
    cy.window().its('localStorage.token').should('be.a', 'string').and('have.length.greaterThan', 10)
  })

  it('shows server error on invalid credentials (real backend)', () => {
    const apiUrl = 'http://localhost:3000/api'
    const testUser = createTestUser()

    // Register a valid user first
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: testUser,
      failOnStatusCode: false
    })

    // Try to login with correct email but wrong password
    cy.visit('/login')
    cy.get('#email').type(testUser.email)
    cy.get('#password').type('WrongPassword123!')
    cy.get('button[type="submit"]').click()

    // Backend should return a 4xx and the UI should display an error
    cy.get('.form-error').should('be.visible')
  })

  it('loginByApi command stores token and allows access to protected routes (real backend)', () => {
    const apiUrl = 'http://localhost:3000/api'
    const testUser = createTestUser({ email: 'apiuser@example.com' })

    // Register user first
    cy.request({
      method: 'POST',
      url: `${apiUrl}/auth/register`,
      body: testUser,
      failOnStatusCode: false
    })

    cy.loginByApi(testUser.email, testUser.password, apiUrl).then((resp) => {
      expect(resp.status).to.equal(200)
    })

    cy.visit('/home')
    cy.get('.signin-title').should('not.be.empty')
  })
})
