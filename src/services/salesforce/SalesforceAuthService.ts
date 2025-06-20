import { Organization } from '../../types';

export interface SalesforceAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: 'production' | 'sandbox';
}

export interface SalesforceTokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface SalesforceUserInfo {
  user_id: string;
  organization_id: string;
  username: string;
  display_name: string;
  email: string;
  organization_name: string;
  organization_type: string;
}

export class SalesforceAuthService {
  private config: SalesforceAuthConfig;
  private tokenStorage = new Map<string, SalesforceTokenResponse>();

  constructor(config: SalesforceAuthConfig) {
    this.config = config;
    this.loadStoredTokens();
  }

  /**
   * Generate OAuth authorization URL for Salesforce login
   */
  getAuthorizationUrl(state?: string): string {
    // For developer orgs and sandboxes, always use test.salesforce.com
    // Production orgs use login.salesforce.com
    const baseUrl = this.config.environment === 'production' 
      ? 'https://login.salesforce.com' 
      : 'https://test.salesforce.com';
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: 'api refresh_token web full',
      state: state || this.generateState()
    });

    console.log(`🔗 Using OAuth URL: ${baseUrl} for environment: ${this.config.environment}`);
    return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state?: string): Promise<SalesforceTokenResponse> {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://login.salesforce.com' 
      : 'https://test.salesforce.com';

    console.log(`🔄 Exchanging code for token using: ${baseUrl}`);

    const response = await fetch(`${baseUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        redirect_uri: this.config.redirectUri,
        code
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Token exchange failed:`, error);
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData: SalesforceTokenResponse = await response.json();
    console.log(`✅ Token exchange successful for instance: ${tokenData.instance_url}`);
    
    // Store token for future use
    this.storeToken(tokenData.instance_url, tokenData);
    
    return tokenData;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<SalesforceTokenResponse> {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://login.salesforce.com' 
      : 'https://test.salesforce.com';

    const response = await fetch(`${baseUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const tokenData: SalesforceTokenResponse = await response.json();
    
    // Update stored token
    this.storeToken(tokenData.instance_url, tokenData);
    
    return tokenData;
  }

  /**
   * Get user information from Salesforce
   */
  async getUserInfo(accessToken: string, instanceUrl: string): Promise<SalesforceUserInfo> {
    const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Validate token and get organization info
   */
  async validateTokenAndGetOrgInfo(accessToken: string, instanceUrl: string): Promise<Organization> {
    try {
      const userInfo = await this.getUserInfo(accessToken, instanceUrl);
      
      // Get additional org details
      const orgResponse = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Organization/describe`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Determine org type based on instance URL patterns
      let orgType: 'production' | 'sandbox' | 'developer' = 'production';
      
      if (instanceUrl.includes('sandbox') || instanceUrl.includes('--')) {
        orgType = 'sandbox';
      } else if (instanceUrl.includes('--dev') || instanceUrl.includes('developer')) {
        orgType = 'developer';
      } else if (instanceUrl.includes('.my.salesforce.com') && !instanceUrl.includes('--')) {
        // This is likely a production org
        orgType = 'production';
      } else {
        // Default to sandbox for safety (developer orgs, scratch orgs, etc.)
        orgType = 'sandbox';
      }

      console.log(`🏢 Detected org type: ${orgType} for instance: ${instanceUrl}`);

      return {
        id: userInfo.organization_id,
        name: userInfo.organization_name,
        type: orgType,
        instanceUrl,
        isConnected: true,
        lastScanDate: new Date(),
        riskScore: 0, // Will be calculated after security scan
        vulnerabilityCount: 0 // Will be updated after scan
      };
    } catch (error) {
      throw new Error(`Token validation failed: ${error.message}`);
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    const baseUrl = this.config.environment === 'production' 
      ? 'https://login.salesforce.com' 
      : 'https://test.salesforce.com';

    await fetch(`${baseUrl}/services/oauth2/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        token: accessToken
      })
    });

    // Remove from storage
    this.removeStoredToken(accessToken);
  }

  /**
   * Get stored token for instance
   */
  getStoredToken(instanceUrl: string): SalesforceTokenResponse | null {
    return this.tokenStorage.get(instanceUrl) || null;
  }

  /**
   * Store token securely
   */
  private storeToken(instanceUrl: string, token: SalesforceTokenResponse): void {
    this.tokenStorage.set(instanceUrl, token);
    
    // Also store in localStorage for persistence
    const tokens = JSON.parse(localStorage.getItem('sf_tokens') || '{}');
    tokens[instanceUrl] = {
      ...token,
      stored_at: new Date().toISOString()
    };
    localStorage.setItem('sf_tokens', JSON.stringify(tokens));
  }

  /**
   * Load tokens from storage
   */
  private loadStoredTokens(): void {
    try {
      const tokens = JSON.parse(localStorage.getItem('sf_tokens') || '{}');
      Object.entries(tokens).forEach(([instanceUrl, token]) => {
        this.tokenStorage.set(instanceUrl, token as SalesforceTokenResponse);
      });
    } catch (error) {
      console.warn('Failed to load stored tokens:', error);
    }
  }

  /**
   * Remove token from storage
   */
  private removeStoredToken(accessToken: string): void {
    // Find and remove from memory
    for (const [instanceUrl, token] of this.tokenStorage.entries()) {
      if (token.access_token === accessToken) {
        this.tokenStorage.delete(instanceUrl);
        break;
      }
    }

    // Remove from localStorage
    const tokens = JSON.parse(localStorage.getItem('sf_tokens') || '{}');
    Object.keys(tokens).forEach(instanceUrl => {
      if (tokens[instanceUrl].access_token === accessToken) {
        delete tokens[instanceUrl];
      }
    });
    localStorage.setItem('sf_tokens', JSON.stringify(tokens));
  }

  /**
   * Generate secure state parameter
   */
  private generateState(): string {
    return btoa(Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15));
  }
}