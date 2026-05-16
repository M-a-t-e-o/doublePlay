/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
declare global {
	namespace Cypress {
		interface Chainable {
			loginByApi(email: string, password: string): Cypress.Chainable
		}
	}
}

Cypress.Commands.add('loginByApi', (email: string, password: string, apiUrl = 'http://localhost:3000/api') => {
	return cy.request({
		method: 'POST',
		url: `${apiUrl}/auth/login`,
		body: { email, password },
		failOnStatusCode: false
	}).then((resp) => {
		if (resp.status === 200 && resp.body?.token) {
			// return the cy.window() chain so we don't mix sync returns with cy commands
			return cy.window().then((win) => {
				win.localStorage.setItem('token', resp.body.token)
				if (resp.body.name) win.localStorage.setItem('userName', resp.body.name)
				return resp
			})
		}

		return resp
	})
})

export {}