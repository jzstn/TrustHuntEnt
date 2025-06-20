import { SalesforceAuthService, SalesforceAuthConfig } from './SalesforceAuthService';
import { SalesforceAPIClient } from './SalesforceAPIClient';
import { SecurityAnalysisService } from './SecurityAnalysisService';
import { Organization } from '../../types';

export interface ConnectionStatus {
  isConnected: boolean;
  lastChecked: Date;
  error?: string;
}

export class SalesforceConnectionManager {
  private authService: SalesforceAuthService;
  private connections = new Map<string, SalesforceAPIClient>();
  private connectionStatus = new Map<string, ConnectionStatus>();

  constructor(authConfig: SalesforceAuthConfig) {
    this.authService = new SalesforceAuthService(authConfig);
  }

  /**
   * Initiate Salesforce OAuth flow
   */
  initiateConnection(): string {
    const state = this.generateConnectionState();
    return this.authService.getAuthorizationUrl(state);
  }

  /**
   * Complete OAuth flow and establish connection
   */
  async completeConnection(code: string, state: string): Promise<Organization> {
    try {
      // Exchange code for token
      const tokenResponse = await this.authService.exchangeCodeForToken(code, state);
      
      // Validate token and get org info
      const orgInfo = await this.authService.validateTokenAndGetOrgInfo(
        tokenResponse.access_token,
        tokenResponse.instance_url
      );

      // Create API client
      const apiClient = new SalesforceAPIClient(
        tokenResponse.instance_url,
        tokenResponse.access_token
      );

      // Store connection
      this.connections.set(orgInfo.id, apiClient);
      this.updateConnectionStatus(orgInfo.id, { isConnected: true, lastChecked: new Date() });

      console.log(`✅ Successfully connected to ${orgInfo.name}`);
      return orgInfo;

    } catch (error) {
      console.error('❌ Connection failed:', error);
      throw new Error(`Failed to connect to Salesforce: ${error.message}`);
    }
  }

  /**
   * Get API client for organization
   */
  getAPIClient(orgId: string): SalesforceAPIClient | null {
    return this.connections.get(orgId) || null;
  }

  /**
   * Check connection health
   */
  async checkConnectionHealth(orgId: string): Promise<ConnectionStatus> {
    const client = this.connections.get(orgId);
    if (!client) {
      return { isConnected: false, lastChecked: new Date(), error: 'No connection found' };
    }

    try {
      // Test connection with a simple API call
      const result = await client.getOrganizationLimits();
      
      if (result.success) {
        const status = { isConnected: true, lastChecked: new Date() };
        this.updateConnectionStatus(orgId, status);
        return status;
      } else {
        const status = { 
          isConnected: false, 
          lastChecked: new Date(), 
          error: result.error 
        };
        this.updateConnectionStatus(orgId, status);
        return status;
      }
    } catch (error) {
      const status = { 
        isConnected: false, 
        lastChecked: new Date(), 
        error: error.message 
      };
      this.updateConnectionStatus(orgId, status);
      return status;
    }
  }

  /**
   * Refresh connection token
   */
  async refreshConnection(orgId: string): Promise<boolean> {
    const client = this.connections.get(orgId);
    if (!client) {
      return false;
    }

    try {
      const instanceUrl = client.getInstanceUrl();
      const storedToken = this.authService.getStoredToken(instanceUrl);
      
      if (!storedToken?.refresh_token) {
        throw new Error('No refresh token available');
      }

      const newToken = await this.authService.refreshToken(storedToken.refresh_token);
      client.updateToken(newToken.access_token);

      this.updateConnectionStatus(orgId, { isConnected: true, lastChecked: new Date() });
      console.log(`✅ Refreshed token for org ${orgId}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to refresh token for org ${orgId}:`, error);
      this.updateConnectionStatus(orgId, { 
        isConnected: false, 
        lastChecked: new Date(), 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Disconnect from organization
   */
  async disconnect(orgId: string): Promise<void> {
    const client = this.connections.get(orgId);
    if (client) {
      try {
        const instanceUrl = client.getInstanceUrl();
        const storedToken = this.authService.getStoredToken(instanceUrl);
        
        if (storedToken) {
          await this.authService.revokeToken(storedToken.access_token);
        }
      } catch (error) {
        console.warn('Failed to revoke token:', error);
      }

      this.connections.delete(orgId);
      this.connectionStatus.delete(orgId);
      console.log(`✅ Disconnected from org ${orgId}`);
    }
  }

  /**
   * Perform security analysis for organization
   */
  async performSecurityAnalysis(orgId: string): Promise<any> {
    const client = this.connections.get(orgId);
    if (!client) {
      throw new Error(`No connection found for org ${orgId}`);
    }

    // Check connection health first
    const health = await this.checkConnectionHealth(orgId);
    if (!health.isConnected) {
      // Try to refresh token
      const refreshed = await this.refreshConnection(orgId);
      if (!refreshed) {
        throw new Error(`Connection to org ${orgId} is not healthy: ${health.error}`);
      }
    }

    const analysisService = new SecurityAnalysisService(client, orgId);
    return await analysisService.performSecurityAnalysis();
  }

  /**
   * Get all connected organizations
   */
  getConnectedOrganizations(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection status for organization
   */
  getConnectionStatus(orgId: string): ConnectionStatus | null {
    return this.connectionStatus.get(orgId) || null;
  }

  /**
   * Load existing connections from storage
   */
  async loadStoredConnections(): Promise<Organization[]> {
    const organizations: Organization[] = [];
    
    try {
      const tokens = JSON.parse(localStorage.getItem('sf_tokens') || '{}');
      
      for (const [instanceUrl, tokenData] of Object.entries(tokens)) {
        try {
          const token = tokenData as any;
          const orgInfo = await this.authService.validateTokenAndGetOrgInfo(
            token.access_token,
            instanceUrl
          );

          const apiClient = new SalesforceAPIClient(instanceUrl, token.access_token);
          this.connections.set(orgInfo.id, apiClient);
          this.updateConnectionStatus(orgInfo.id, { isConnected: true, lastChecked: new Date() });
          
          organizations.push(orgInfo);
        } catch (error) {
          console.warn(`Failed to restore connection for ${instanceUrl}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to load stored connections:', error);
    }

    return organizations;
  }

  /**
   * Update connection status
   */
  private updateConnectionStatus(orgId: string, status: ConnectionStatus): void {
    this.connectionStatus.set(orgId, status);
  }

  /**
   * Generate unique state for OAuth flow
   */
  private generateConnectionState(): string {
    return btoa(JSON.stringify({
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    }));
  }
}