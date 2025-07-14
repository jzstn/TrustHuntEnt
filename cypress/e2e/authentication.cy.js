/// <reference types="cypress" />

describe('Authentication', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Intercept CORS proxy requests
    cy.intercept('**/cors-anywhere.herokuapp.com/**', (req) => {
      // Mock successful response
      req.reply({
        statusCode: 200,
        body: {
          limits: {
            DailyApiRequests: {
              Max: 15000,
              Remaining: 14500
            }
          }
        }
      });
    }).as('corsProxy');
    
    // Intercept user info request
    cy.intercept('**/services/oauth2/userinfo', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          user_id: 'test-user-id',
          organization_id: 'test-org-id',
          username: 'test@example.com',
          display_name: 'Test User',
          email: 'test@example.com',
          organization_name: 'Test Org',
          organization_type: 'Developer Edition'
        }
      });
    }).as('userInfo');
  });
  
  it('should display authentication options when not logged in', () => {
    // Check that authentication options are displayed
    cy.contains('Connect to Salesforce').should('be.visible');
    cy.contains('Choose your preferred connection method').should('be.visible');
    
    // Check that all authentication methods are available
    cy.contains('Test OAuth Token').should('be.visible');
    cy.contains('Access Token').should('be.visible');
    cy.contains('Username & Password').should('be.visible');
  });
  
  it('should authenticate with valid token', () => {
    // Click on Token authentication
    cy.contains('Connect with Token').click();
    
    // Fill in the form
    cy.get('#instanceUrl').type('https://test.my.salesforce.com');
    cy.get('#accessToken').type('00D5i000000XXXXXX!AQMAQNVZ9Ug8h9Wkk2Mqrt5XWBtpT7YTLRrYDNVjvLN5W4QNmfG2JTR5XYZ');
    
    // Select organization type
    cy.contains('Developer Edition').click();
    
    // Submit the form
    cy.contains('Connect with Token').click();
    
    // Wait for authentication to complete
    cy.wait('@corsProxy');
    cy.wait('@userInfo');
    
    // Verify successful authentication
    cy.contains('Test Org').should('be.visible');
    cy.contains('Connected').should('be.visible');
    cy.contains('Start Scan').should('be.visible');
  });
  
  it('should show error for invalid token', () => {
    // Intercept with error response
    cy.intercept('**/cors-anywhere.herokuapp.com/**', {
      statusCode: 401,
      body: 'Invalid Session ID'
    }).as('invalidToken');
    
    // Click on Token authentication
    cy.contains('Connect with Token').click();
    
    // Fill in the form
    cy.get('#instanceUrl').type('https://test.my.salesforce.com');
    cy.get('#accessToken').type('invalid_token');
    
    // Select organization type
    cy.contains('Developer Edition').click();
    
    // Submit the form
    cy.contains('Connect with Token').click();
    
    // Wait for authentication to fail
    cy.wait('@invalidToken');
    
    // Verify error message
    cy.contains('Invalid or expired access token').should('be.visible');
  });
  
  it('should handle CORS proxy issues', () => {
    // Intercept with network error
    cy.intercept('**/cors-anywhere.herokuapp.com/**', {
      forceNetworkError: true
    }).as('networkError');
    
    // Click on Token authentication
    cy.contains('Connect with Token').click();
    
    // Fill in the form
    cy.get('#instanceUrl').type('https://test.my.salesforce.com');
    cy.get('#accessToken').type('test-token');
    
    // Select organization type
    cy.contains('Developer Edition').click();
    
    // Submit the form
    cy.contains('Connect with Token').click();
    
    // Wait for authentication to fail
    cy.wait('@networkError');
    
    // Verify CORS error message
    cy.contains('Local CORS proxy not available').should('be.visible');
  });
});