// ***********************************************
// This example commands.js shows you how to
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

// Custom command to set Zustand store state
Cypress.Commands.add('setZustandStore', (storeFn, newState) => {
  cy.window().then(window => {
    window[storeFn].setState(newState);
  });
});

// Custom command to get Zustand store state
Cypress.Commands.add('getZustandStore', (storeFn) => {
  return cy.window().then(window => {
    return window[storeFn].getState();
  });
});