describe('Basic Test', () => {
  it('visits the app', () => {
    cy.visit('/')
    cy.contains('TrustHunt').should('exist')
  })
})