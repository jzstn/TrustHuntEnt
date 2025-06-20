import { useState, useEffect, useCallback } from 'react';
import { SalesforceConnectionManager } from '../services/salesforce/SalesforceConnectionManager';
import { Organization } from '../types';
import { useSecurityStore } from '../store/useSecurityStore';

// Salesforce OAuth configuration from environment variables
const SALESFORCE_CONFIG = {
  clientId: import.meta.env.VITE_SALESFORCE_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_SALESFORCE_CLIENT_SECRET || '',
  redirectUri: import.meta.env.VITE_SALESFORCE_REDIRECT_URI || `${window.location.origin}/auth/callback`,
  environment: 'sandbox' as const
};

export const useSalesforceConnection = () => {
  const [connectionManager] = useState(() => new SalesforceConnectionManager(SALESFORCE_CONFIG));
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);
  
  const {
    organizations,
    setOrganizations,
    addVulnerability,
    addAISecurityEvent,
    addTemporalRiskEvent,
    updateDashboardMetrics,
    setLoading
  } = useSecurityStore();

  // Check if OAuth is properly configured
  const isConfigured = useCallback(() => {
    const clientId = SALESFORCE_CONFIG.clientId;
    const clientSecret = SALESFORCE_CONFIG.clientSecret;
    
    return clientId && 
           clientId !== 'demo_client_id_not_configured' &&
           clientId !== 'your_salesforce_connected_app_client_id' &&
           clientSecret && 
           clientSecret !== 'demo_client_secret_not_configured' &&
           clientSecret !== 'your_salesforce_connected_app_client_secret';
  }, []);

  // Auto-connect on mount if configured and no existing connections
  useEffect(() => {
    const autoConnect = async () => {
      if (hasAttemptedAutoConnect) return;
      
      setHasAttemptedAutoConnect(true);
      
      try {
        setLoading(true);
        
        // First, try to load existing connections
        const storedOrgs = await connectionManager.loadStoredConnections();
        setOrganizations(storedOrgs);
        
        if (storedOrgs.length > 0) {
          console.log(`✅ Loaded ${storedOrgs.length} existing connections`);
          return;
        }
        
        // If no stored connections and OAuth is configured, attempt auto-connect
        if (isConfigured()) {
          console.log('🔄 OAuth configured but no connections found. Checking for auto-connect...');
          
          // Check if we're returning from OAuth callback
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          const state = urlParams.get('state');
          
          if (code && state) {
            console.log('🔗 OAuth callback detected, completing connection...');
            // This will be handled by the OAuth callback effect
            return;
          }
          
          // Check if there are any stored tokens we can use
          const tokens = JSON.parse(localStorage.getItem('sf_tokens') || '{}');
          if (Object.keys(tokens).length > 0) {
            console.log('🔄 Found stored tokens, attempting to restore connections...');
            // The loadStoredConnections above should have handled this
            return;
          }
          
          console.log('ℹ️ OAuth configured but no existing connections. User needs to initiate connection.');
        } else {
          console.log('⚠️ OAuth not properly configured');
          setConnectionError('Salesforce OAuth credentials not configured. Please check your environment variables.');
        }
        
      } catch (error) {
        console.error('❌ Auto-connect failed:', error);
        setConnectionError(`Auto-connect failed: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    autoConnect();
  }, [connectionManager, setOrganizations, setLoading, isConfigured, hasAttemptedAutoConnect]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        let errorMessage = `OAuth error: ${error}`;
        if (errorDescription) {
          errorMessage += ` - ${decodeURIComponent(errorDescription)}`;
        }
        
        // Provide helpful error messages for common issues
        if (error === 'invalid_client_id') {
          errorMessage = 'Invalid Salesforce Connected App configuration. Please check your Client ID in the .env file and ensure the Connected App is properly configured in Salesforce.';
        } else if (error === 'redirect_uri_mismatch') {
          errorMessage = 'Redirect URI mismatch. Please ensure the callback URL in your Connected App matches exactly: http://localhost:5173/auth/callback';
        } else if (error === 'invalid_client') {
          errorMessage = 'Invalid client credentials. Please check your Client Secret and ensure "Require Secret for Web Server Flow" is enabled in your Connected App.';
        }
        
        setConnectionError(errorMessage);
        
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (code && state) {
        try {
          setIsConnecting(true);
          setConnectionError(null);
          
          const org = await connectionManager.completeConnection(code, state);
          
          // Add to store
          setOrganizations([...organizations, org]);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          
          console.log('✅ Successfully connected to Salesforce');
          
          // Automatically start security scan after connection
          setTimeout(() => {
            performSecurityScan(org.id);
          }, 1000);
          
        } catch (error) {
          let errorMessage = error.message;
          
          // Provide more specific error messages
          if (errorMessage.includes('invalid_client_id')) {
            errorMessage = 'Invalid Client ID. Please verify your Consumer Key in the .env file matches your Connected App.';
          } else if (errorMessage.includes('invalid_client')) {
            errorMessage = 'Invalid client credentials. Please check your Consumer Secret and Connected App configuration.';
          } else if (errorMessage.includes('invalid_grant')) {
            errorMessage = 'Authorization code expired or invalid. Please try connecting again.';
          }
          
          setConnectionError(errorMessage);
          console.error('❌ Connection failed:', error);
          
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } finally {
          setIsConnecting(false);
        }
      }
    };

    handleOAuthCallback();
  }, [connectionManager, organizations, setOrganizations]);

  const connectToSalesforce = useCallback((environment: 'production' | 'sandbox') => {
    try {
      setConnectionError(null);
      
      // Check if OAuth is properly configured
      if (!isConfigured()) {
        setConnectionError(
          'Salesforce OAuth is not configured. Please create a Connected App in Salesforce and set the VITE_SALESFORCE_CLIENT_ID and VITE_SALESFORCE_CLIENT_SECRET environment variables.'
        );
        return;
      }
      
      // Update configuration for selected environment
      const config = {
        ...SALESFORCE_CONFIG,
        environment
      };
      
      // Create new connection manager with updated config
      const newConnectionManager = new SalesforceConnectionManager(config);
      
      // Initiate OAuth flow
      const authUrl = newConnectionManager.initiateConnection();
      console.log('🔗 Redirecting to Salesforce OAuth:', authUrl);
      window.location.href = authUrl;
      
    } catch (error) {
      setConnectionError(`Failed to initiate connection: ${error.message}`);
      console.error('❌ Failed to initiate connection:', error);
    }
  }, [isConfigured]);

  const refreshConnection = useCallback(async (orgId: string) => {
    try {
      const success = await connectionManager.refreshConnection(orgId);
      if (success) {
        // Update organization status
        const updatedOrgs = organizations.map(org => 
          org.id === orgId ? { ...org, isConnected: true } : org
        );
        setOrganizations(updatedOrgs);
        setConnectionError(null);
      }
      return success;
    } catch (error) {
      console.error(`❌ Failed to refresh connection for ${orgId}:`, error);
      setConnectionError(`Failed to refresh connection: ${error.message}`);
      return false;
    }
  }, [connectionManager, organizations, setOrganizations]);

  const disconnectFromSalesforce = useCallback(async (orgId: string) => {
    try {
      await connectionManager.disconnect(orgId);
      
      // Remove from store
      const updatedOrgs = organizations.filter(org => org.id !== orgId);
      setOrganizations(updatedOrgs);
      
      console.log(`✅ Disconnected from org ${orgId}`);
    } catch (error) {
      console.error(`❌ Failed to disconnect from ${orgId}:`, error);
      throw error;
    }
  }, [connectionManager, organizations, setOrganizations]);

  const performSecurityScan = useCallback(async (orgId: string) => {
    try {
      setLoading(true);
      setConnectionError(null);
      console.log(`🔍 Starting security scan for org ${orgId}...`);
      
      const results = await connectionManager.performSecurityAnalysis(orgId);
      
      // Update store with results
      results.vulnerabilities.forEach(vuln => addVulnerability(vuln));
      results.aiSecurityEvents.forEach(event => addAISecurityEvent(event));
      results.temporalRiskEvents.forEach(event => addTemporalRiskEvent(event));
      
      // Update organization risk score
      const updatedOrgs = organizations.map(org => 
        org.id === orgId 
          ? { 
              ...org, 
              riskScore: results.riskScore,
              vulnerabilityCount: results.vulnerabilities.length,
              lastScanDate: new Date()
            }
          : org
      );
      setOrganizations(updatedOrgs);
      
      // Update dashboard metrics
      updateDashboardMetrics({
        totalVulnerabilities: results.vulnerabilities.length,
        criticalVulnerabilities: results.vulnerabilities.filter(v => v.severity === 'critical').length,
        averageRiskScore: results.riskScore,
        aiSecurityEvents: results.aiSecurityEvents.length,
        temporalAnomalies: results.temporalRiskEvents.length
      });
      
      console.log(`✅ Security scan completed for org ${orgId}`);
      return results;
      
    } catch (error) {
      console.error(`❌ Security scan failed for org ${orgId}:`, error);
      setConnectionError(`Security scan failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [
    connectionManager, 
    organizations, 
    setOrganizations, 
    addVulnerability, 
    addAISecurityEvent, 
    addTemporalRiskEvent, 
    updateDashboardMetrics,
    setLoading
  ]);

  const getConnectionStatus = useCallback((orgId: string) => {
    return connectionManager.getConnectionStatus(orgId);
  }, [connectionManager]);

  return {
    organizations,
    isConnecting,
    connectionError,
    isConfigured: isConfigured(),
    connectToSalesforce,
    refreshConnection,
    disconnectFromSalesforce,
    performSecurityScan,
    getConnectionStatus,
    clearError: () => setConnectionError(null)
  };
};