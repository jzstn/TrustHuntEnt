/// <reference types="cypress" />

describe('Security Scanning', () => {
  beforeEach(() => {
    // Visit the application
    cy.visit('/');
    
    // Mock successful authentication
    cy.window().then((win) => {
      win.useSecurityStore.setState({
        organizations: [{
          id: 'test-org-id',
          name: 'Test Organization',
          type: 'developer',
          instanceUrl: 'https://test.my.salesforce.com',
          isConnected: true,
          lastScanDate: new Date(),
          riskScore: 85,
          vulnerabilityCount: 0
        }]
      });
    });
    
    // Reload to apply state changes
    cy.reload();
    
    // Wait for dashboard to load
    cy.contains('Test Organization').should('be.visible');
  });
  
  it('should start a security scan', () => {
    // Click Start Scan button
    cy.contains('Start Scan').click();
    
    // Verify scanning state
    cy.contains('Scanning...').should('be.visible');
    
    // Mock scan completion
    cy.window().then((win) => {
      win.useSecurityStore.setState({
        vulnerabilities: [
          {
            id: 'vuln-1',
            orgId: 'test-org-id',
            type: 'soql_injection',
            severity: 'critical',
            title: 'SOQL Injection in CustomController',
            description: 'Dynamic SOQL construction without proper sanitization',
            location: 'CustomController.cls',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 9.1,
            businessImpact: 'Potential unauthorized data access',
            remediation: 'Use parameterized queries'
          },
          {
            id: 'vuln-2',
            orgId: 'test-org-id',
            type: 'crud_fls_violation',
            severity: 'high',
            title: 'Missing Sharing Declaration',
            description: 'Apex class without sharing declaration',
            location: 'DataProcessor.cls',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 7.5,
            businessImpact: 'Users may access records they should not have permission to view',
            remediation: 'Add "with sharing" to class declaration'
          }
        ],
        organizations: [{
          id: 'test-org-id',
          name: 'Test Organization',
          type: 'developer',
          instanceUrl: 'https://test.my.salesforce.com',
          isConnected: true,
          lastScanDate: new Date(),
          riskScore: 75,
          vulnerabilityCount: 2
        }]
      });
    });
    
    // Verify scan results are displayed
    cy.contains('Critical Vulnerabilities').should('be.visible');
    cy.contains('SOQL Injection in CustomController').should('be.visible');
    cy.contains('Missing Sharing Declaration').should('be.visible');
  });
  
  it('should navigate to scan results view', () => {
    // Add mock vulnerabilities
    cy.window().then((win) => {
      win.useSecurityStore.setState({
        vulnerabilities: [
          {
            id: 'vuln-1',
            orgId: 'test-org-id',
            type: 'soql_injection',
            severity: 'critical',
            title: 'SOQL Injection in CustomController',
            description: 'Dynamic SOQL construction without proper sanitization',
            location: 'CustomController.cls',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 9.1,
            businessImpact: 'Potential unauthorized data access',
            remediation: 'Use parameterized queries'
          }
        ]
      });
    });
    
    // Reload to apply state changes
    cy.reload();
    
    // Click on Scan Results in navigation
    cy.contains('Scan Results').click();
    
    // Verify scan results view is displayed
    cy.contains('Comprehensive Security Scan Results').should('be.visible');
    cy.contains('Export Report').should('be.visible');
    
    // Verify vulnerability details are displayed
    cy.contains('SOQL Injection in CustomController').should('be.visible');
    cy.contains('Show Details').click();
    cy.contains('Business Impact').should('be.visible');
    cy.contains('Potential unauthorized data access').should('be.visible');
  });
  
  it('should export scan report', () => {
    // Add mock vulnerabilities
    cy.window().then((win) => {
      win.useSecurityStore.setState({
        vulnerabilities: [
          {
            id: 'vuln-1',
            orgId: 'test-org-id',
            type: 'soql_injection',
            severity: 'critical',
            title: 'SOQL Injection in CustomController',
            description: 'Dynamic SOQL construction without proper sanitization',
            location: 'CustomController.cls',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 9.1,
            businessImpact: 'Potential unauthorized data access',
            remediation: 'Use parameterized queries'
          }
        ]
      });
    });
    
    // Navigate to scan results view
    cy.contains('Scan Results').click();
    
    // Spy on window.URL.createObjectURL
    cy.window().then((win) => {
      cy.spy(win.URL, 'createObjectURL').as('createObjectURL');
    });
    
    // Click Export Report button
    cy.contains('Export Report').click();
    
    // Verify that createObjectURL was called (indicating file download)
    cy.get('@createObjectURL').should('have.been.called');
  });
});