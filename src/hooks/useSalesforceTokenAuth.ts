import { useState, useCallback } from 'react';
import { SalesforceTokenAuth } from '../services/salesforce/SalesforceTokenAuth';
import { SalesforceAPIClient } from '../services/salesforce/SalesforceAPIClient';
import { SecurityAnalysisService } from '../services/salesforce/SecurityAnalysisService';
import { Organization } from '../types';
import { useSecurityStore } from '../store/useSecurityStore';

interface LoginCredentials {
  accessToken: string;
  instanceUrl: string;
  orgType: 'production' | 'sandbox' | 'developer';
}

export const useSalesforceTokenAuth = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [authService, setAuthService] = useState<SalesforceTokenAuth | null>(null);
  const [apiClient, setApiClient] = useState<SalesforceAPIClient | null>(null);
  const [connectedOrganization, setConnectedOrganization] = useState<Organization | null>(null);

  const {
    setOrganizations,
    addVulnerability,
    addAISecurityEvent,
    addTemporalRiskEvent,
    updateDashboardMetrics,
    setLoading,
    startSecurityScan,
    updateScanProgress,
    completeScan
  } = useSecurityStore();

  const login = useCallback(async (credentials: LoginCredentials): Promise<Organization> => {
    setIsConnecting(true);
    setConnectionError(null);

    try {
      console.log('🔐 Starting Salesforce token authentication...');
      
      if (!credentials.accessToken?.trim()) {
        throw new Error('Access token is required');
      }
      
      if (!credentials.instanceUrl?.trim()) {
        throw new Error('Instance URL is required');
      }
      
      // Create auth service with proper initialization
      const auth = new SalesforceTokenAuth({ 
        accessToken: credentials.accessToken.trim(), 
        instanceUrl: credentials.instanceUrl.trim() 
      });
      setAuthService(auth);

      // Validate token
      const loginResponse = await auth.validateToken();
      
      console.log('✅ Token validation successful');

      // Create API client with the authenticated token
      const client = new SalesforceAPIClient(
        credentials.instanceUrl.trim(),
        credentials.accessToken.trim()
      );
      setApiClient(client);

      // Test the API client
      console.log('🔍 Testing API client connection...');
      const testResult = await client.getOrganizationLimits();
      if (!testResult.success) {
        throw new Error(`API test failed: ${testResult.error}`);
      }
      console.log('✅ API client test successful');

      // Create organization object with dynamic data from userInfo if available
      const organization: Organization = {
        id: loginResponse.userInfo?.organization_id || '00Daj00000Rx0kQEAR',
        name: loginResponse.userInfo?.organization_name || 'Salesforce Organization',
        type: credentials.orgType,
        instanceUrl: credentials.instanceUrl.trim(),
        isConnected: true,
        lastScanDate: new Date(),
        riskScore: 0, // Will be calculated after security scan
        vulnerabilityCount: 0 // Will be updated after scan
      };

      setConnectedOrganization(organization);
      setOrganizations([organization]);

      console.log('✅ Organization created:', organization.name);
      return organization;

    } catch (error) {
      console.error('❌ Login failed:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      
      if (errorMessage.includes('Invalid instance URL')) {
        errorMessage = 'Invalid instance URL format. Please provide a valid Salesforce URL (e.g., https://yourinstance.salesforce.com)';
      } else if (errorMessage.includes('Authentication failed')) {
        errorMessage = 'Invalid or expired access token. Please check your token and try again.';
      } else if (errorMessage.includes('Access denied')) {
        errorMessage = 'Access denied. Please check your permissions or contact your Salesforce administrator.';
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'CORS proxy rate limit exceeded. Please wait a few minutes and try again.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to Salesforce. Please check your internet connection and instance URL.';
      }
      
      setConnectionError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [setOrganizations]);

  const performSecurityScan = useCallback(async (orgId: string): Promise<void> => {
    if (!apiClient || !connectedOrganization) {
      throw new Error('No API client available. Please connect to Salesforce first.');
    }

    try {
      setLoading(true);
      console.log('🔍 Starting comprehensive security scan...');

      // Start the scan in the store
      const scanId = `scan-${orgId}-${Date.now()}`;
      const securityScan = {
        id: scanId,
        orgId,
        scanType: 'full' as const,
        status: 'running' as const,
        startedAt: new Date(),
        vulnerabilitiesFound: 0,
        progress: 0
      };
      
      startSecurityScan(securityScan);

      // Update progress: Starting analysis
      updateScanProgress(scanId, 10);

      const analysisService = new SecurityAnalysisService(apiClient, orgId);
      
      // Update progress: Analyzing Apex code
      updateScanProgress(scanId, 25);
      
      // Perform the comprehensive analysis
      const results = await analysisService.performComprehensiveAnalysis();
      
      if (!results.success) {
        throw new Error(results.error || 'Security analysis failed');
      }

      // Update progress: Processing results
      updateScanProgress(scanId, 75);

      const analysisData = results.data!;

      // Update store with results
      analysisData.vulnerabilities.forEach(vuln => addVulnerability(vuln));
      analysisData.aiSecurityEvents.forEach(event => addAISecurityEvent(event));
      analysisData.temporalRiskEvents.forEach(event => addTemporalRiskEvent(event));

      // Update organization with new data
      const updatedOrg = {
        ...connectedOrganization,
        riskScore: analysisData.riskScore,
        vulnerabilityCount: analysisData.vulnerabilities.length,
        lastScanDate: new Date()
      };
      setConnectedOrganization(updatedOrg);
      setOrganizations([updatedOrg]);

      // Update dashboard metrics
      updateDashboardMetrics({
        totalVulnerabilities: analysisData.metrics.totalVulnerabilities,
        criticalVulnerabilities: analysisData.metrics.criticalVulnerabilities,
        averageRiskScore: analysisData.riskScore,
        aiSecurityEvents: analysisData.aiSecurityEvents.length,
        temporalAnomalies: analysisData.temporalRiskEvents.length
      });

      // Complete the scan
      updateScanProgress(scanId, 100);
      completeScan(scanId, analysisData);

      console.log(`✅ Security scan completed: ${analysisData.vulnerabilities.length} vulnerabilities found`);
      console.log(`📊 Risk Score: ${analysisData.riskScore}/100`);
      console.log(`🔍 Critical Issues: ${analysisData.metrics.criticalVulnerabilities}`);

    } catch (error) {
      console.error('❌ Security scan failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiClient, connectedOrganization, setOrganizations, addVulnerability, addAISecurityEvent, addTemporalRiskEvent, updateDashboardMetrics, setLoading, startSecurityScan, updateScanProgress, completeScan]);

  const disconnect = useCallback(() => {
    setAuthService(null);
    setApiClient(null);
    setConnectedOrganization(null);
    setOrganizations([]);
    setConnectionError(null);
    console.log('✅ Disconnected from Salesforce');
  }, [setOrganizations]);

  const getAPIClient = useCallback(() => {
    return apiClient;
  }, [apiClient]);

  const getConnectedOrganizations = useCallback(() => {
    return connectedOrganization ? [connectedOrganization] : [];
  }, [connectedOrganization]);

  return {
    login,
    performSecurityScan,
    disconnect,
    getAPIClient,
    getConnectedOrganizations,
    isConnecting,
    connectionError,
    clearError: () => setConnectionError(null),
    isConnected: !!apiClient,
    connectedOrganization,
    connectedOrganizations: connectedOrganization ? [connectedOrganization] : []
  };
};