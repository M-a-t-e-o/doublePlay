/*
  Project: doublePlay (frontend)
  File: cypress/e2e/auth/register.cy.ts
  Description: End-to-end auth test that covers the registration screen, legal modal and navigation back to login.
*/

describe('Register page', () => {
  it('opens and closes the legal modal, then returns to login', () => {
    cy.visit('/register');

    cy.contains('h1', 'Create your account').should('be.visible');
    cy.contains('p', 'Join doublePlay and discover your next favorite movie or game').should('be.visible');

    cy.contains('a', 'Terms of Service').click();
    cy.contains('h2', 'Terms of Service').should('be.visible');
    cy.get('button[aria-label="Close modal"]').click();
    cy.get('.legal-modal').should('not.exist');

    cy.contains('a', 'Sign in').click();

    cy.url().should('include', '/login');
    cy.contains('h1', 'Welcome back').should('be.visible');
  });
});