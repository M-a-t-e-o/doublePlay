describe('Login page', () => {
  it('shows the login form and navigates to register', () => {
    cy.visit('/login');

    cy.contains('h1', 'Welcome back').should('be.visible');
    cy.contains('p', 'Sign in to continue your entertainment journey').should('be.visible');
    cy.get('#email').should('have.attr', 'type', 'email');
    cy.get('#password').should('have.attr', 'type', 'password');

    cy.get('button[aria-label="Show password"]').click();
    cy.get('#password').should('have.attr', 'type', 'text');

    cy.contains('a', 'Sign up').click();

    cy.url().should('include', '/register');
    cy.contains('h1', 'Create your account').should('be.visible');
  });
});