import { useState, useCallback } from 'react';
import { SalesforcePasswordAuth } from '../services/salesforce/SalesforcePasswordAuth';
import { SalesforceAPIClient } from '../services/salesforce/SalesforceAPIClient';
import { SecurityAnalysisService } from '../services/salesforce/SecurityAnalysisService';
import { Organization } from '../types';
import { useSecurityStore } from '../store/useSecurityStore';

interface LoginCredentials {
  username: string;
  password: string;
  securityToken?: string;
  instanceUrl: string;
  environment: 'production' | 'sandbox' | 'developer';
}

export const useSalesforcePasswordAuth = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectedOrgs, setConnectedOrgs] = useState<Organization[]>([]);
  const [apiClient, setApiClient] = useState<SalesforceAPIClient | null>(null);

  const {
    setOrganizations,
    addVulnerability,
    addAISecurityEvent,
    addTemporalRiskEvent,
    updateDashboardMetrics,
    setLoading
  } = useSecurityStore();

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('🔐 Starting Salesforce login...');
      
      // Create auth service
      const auth = new SalesforcePasswordAuth(credentials.environment);

      // Attempt login
      const loginResponse = await auth.login(credentials);
      console.log('✅ Login successful, getting user info...');

      // Get user information
      const userInfo = await auth.getUserInfo(loginResponse.access_token, loginResponse.instance_url);
      console.log('✅ User info retrieved');

      // Test connection
      const connectionTest = await auth.testConnection(loginResponse.access_token, loginResponse.instance_url);
      if (!connectionTest) {
        console.warn('⚠️ Connection test failed, but proceeding...');
      }

      // Create API client
      const client = new SalesforceAPIClient(loginResponse.instance_url, loginResponse.access_token);
      setApiClient(client);

      // Create organization object
      const organization: Organization = {
        id: userInfo.organization_id,
        name: userInfo.organization_name || 'Salesforce Org',
        type: credentials.environment,
        instanceUrl: loginResponse.instance_url,
        isConnected: true,
        lastScanDate: new Date(),
        riskScore: 85, // Initial score, will be updated after scan
        vulnerabilityCount: 0 // Will be updated after scan
      };

      // Update connected organizations
      const updatedOrgs = [...connectedOrgs, organization];
      setConnectedOrgs(updatedOrgs);
      setOrganizations(updatedOrgs);

      console.log(`✅ Successfully connected to ${organization.name}`);

      // Simulate security scan results
      await performMockSecurityScan(organization.id);

    } catch (error) {
      console.error('❌ Login failed:', error);
      setConnectionError(error.message);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [connectedOrgs, setOrganizations, addVulnerability, addAISecurityEvent, addTemporalRiskEvent, updateDashboardMetrics]);

  const performMockSecurityScan = async (orgId: string): Promise<void> => {
    setLoading(true);
    
    try {
      console.log('🔍 Starting security analysis...');

      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock vulnerabilities
      const mockVulnerabilities = [
        {
          id: `vuln-${orgId}-1`,
          orgId,
          type: 'soql_injection' as const,
          severity: 'critical' as const,
          title: 'SOQL Injection in Custom Controller',
          description: 'Dynamic SOQL construction without proper sanitization detected',
          location: 'CustomController.cls',
          discoveredAt: new Date(),
          status: 'open' as const,
          cvssScore: 9.1,
          businessImpact: 'Potential unauthorized data access and database compromise',
          remediation: 'Use parameterized queries and input validation'
        },
        {
          id: `vuln-${orgId}-2`,
          orgId,
          type: 'permission_escalation' as const,
          severity: 'high' as const,
          title: 'Missing Sharing Declaration',
          description: 'Apex class without sharing declaration allows unauthorized data access',
          location: 'DataProcessor.cls',
          discoveredAt: new Date(),
          status: 'open' as const,
          cvssScore: 7.5,
          businessImpact: 'Users may access records they should not have permission to view',
          remediation: 'Add "with sharing" to class declaration'
        },
        {
          id: `vuln-${orgId}-3`,
          orgId,
          type: 'data_exposure' as const,
          severity: 'medium' as const,
          title: 'Hardcoded Credentials in Apex',
          description: 'Sensitive credentials found hardcoded in source code',
          location: 'IntegrationService.cls',
          discoveredAt: new Date(),
          status: 'open' as const,
          cvssScore: 6.8,
          businessImpact: 'Credentials may be exposed to unauthorized users',
          remediation: 'Use Custom Settings or Named Credentials'
        }
      ];

      // Generate mock AI security events
      const mockAIEvents = [
        {
          id: `ai-${orgId}-1`,
          orgId,
          eventType: 'einstein_gpt_access' as const,
          userId: 'user-001',
          timestamp: new Date(),
          dataAccessed: ['Account.Name', 'Contact.Email', 'Opportunity.Amount'],
          riskLevel: 'medium' as const,
          businessHoursViolation: false,
          sensitiveDataExposed: true
        },
        {
          id: `ai-${orgId}-2`,
          orgId,
          eventType: 'copilot_data_exposure' as const,
          userId: 'user-002',
          timestamp: new Date(),
          dataAccessed: ['Contact.SSN__c', 'Account.Revenue__c'],
          riskLevel: 'high' as const,
          businessHoursViolation: true,
          sensitiveDataExposed: true
        }
      ];

      // Generate mock temporal risk events
      const mockTemporalEvents = [
        {
          id: `temp-${orgId}-1`,
          orgId,
          userId: 'user-001',
          eventType: 'after_hours_access' as const,
          timestamp: new Date(),
          riskScore: 7.5,
          businessHoursViolation: true,
          geographicAnomaly: false,
          sessionDurationAnomaly: false
        },
        {
          id: `temp-${orgId}-2`,
          orgId,
          userId: 'user-003',
          eventType: 'privilege_escalation' as const,
          timestamp: new Date(),
          riskScore: 8.2,
          businessHoursViolation: false,
          geographicAnomaly: true,
          sessionDurationAnomaly: true
        }
      ];

      // Add to store
      mockVulnerabilities.forEach(vuln => addVulnerability(vuln));
      mockAIEvents.forEach(event => addAISecurityEvent(event));
      mockTemporalEvents.forEach(event => addTemporalRiskEvent(event));

      // Update dashboard metrics
      updateDashboardMetrics({
        totalVulnerabilities: mockVulnerabilities.length,
        criticalVulnerabilities: mockVulnerabilities.filter(v => v.severity === 'critical').length,
        averageRiskScore: 85,
        aiSecurityEvents: mockAIEvents.length,
        temporalAnomalies: mockTemporalEvents.length
      });

      console.log('✅ Security analysis completed');
    } catch (error) {
      console.error('❌ Security scan failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = useCallback((orgId: string) => {
    const updatedOrgs = connectedOrgs.filter(org => org.id !== orgId);
    setConnectedOrgs(updatedOrgs);
    setOrganizations(updatedOrgs);
    setApiClient(null);
    console.log(`✅ Disconnected from org ${orgId}`);
  }, [connectedOrgs, setOrganizations]);

  const getAPIClient = useCallback(() => {
    return apiClient;
  }, [apiClient]);

  return {
    login,
    disconnect,
    getAPIClient,
    isConnecting,
    connectionError,
    connectedOrganizations: connectedOrgs,
    clearError: () => setConnectionError(null),
    isConnected: connectedOrgs.length > 0
  };
};