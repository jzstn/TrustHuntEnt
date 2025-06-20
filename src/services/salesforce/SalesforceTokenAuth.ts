import { CorsProxyManager } from './CorsProxyManager';

export interface SalesforceTokenCredentials {
  accessToken: string;
  instanceUrl: string;
  orgType?: 'production' | 'sandbox' | 'developer';
}

export interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  userInfo?: any;
}

export class SalesforceTokenAuth {
  private accessToken: string;
  private instanceUrl: string;
  private corsProxyManager: CorsProxyManager;

  constructor(credentials?: SalesforceTokenCredentials) {
    this.accessToken = credentials?.accessToken || '';
    this.instanceUrl = credentials?.instanceUrl ? this.normalizeInstanceUrl(credentials.instanceUrl) : '';
    this.corsProxyManager = CorsProxyManager.getInstance();
  }

  /**
   * Normalize instance URL to prevent malformed URL construction
   */
  private normalizeInstanceUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid instance URL provided');
    }

    // Remove trailing slash and ensure it's a valid URL
    const normalized = url.trim().replace(/\/+$/, '');
    
    // Validate that it's a proper URL
    try {
      const parsedUrl = new URL(normalized);
      
      // Check if the hostname is valid and not empty
      if (!parsedUrl.hostname || parsedUrl.hostname.trim() === '') {
        throw new Error(`Invalid instance URL: missing hostname in ${url}`);
      }
      
      // Ensure it's using HTTPS protocol for Salesforce
      if (parsedUrl.protocol !== 'https:') {
        throw new Error(`Invalid instance URL: must use HTTPS protocol, got ${parsedUrl.protocol} in ${url}`);
      }
      
      return normalized;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error(`Invalid instance URL format: ${url}. Please provide a valid Salesforce instance URL (e.g., https://yourinstance.salesforce.com)`);
      }
      throw error;
    }
  }

  /**
   * Make a request to Salesforce API with improved error handling and fallback
   */
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    // Validate the URL before making the request
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL constructed: ${url}`);
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      // Add timeout for better reliability
      signal: AbortSignal.timeout(30000) // 30 second timeout
    };

    // Try direct connection first (no CORS proxy)
    try {
      console.log(`🔄 Attempting direct connection to Salesforce...`);
      const response = await fetch(url, requestOptions);
      
      if (response.ok) {
        console.log('✅ Direct connection successful');
        return response;
      } else if (response.status === 401) {
        throw new Error('Authentication failed: Invalid or expired access token');
      } else if (response.status === 403) {
        throw new Error('Access denied: Insufficient permissions');
      } else {
        console.log(`⚠️ Direct connection failed with status ${response.status}, trying CORS proxy...`);
      }
    } catch (error) {
      if (error.message.includes('Authentication failed') || error.message.includes('Access denied')) {
        throw error;
      }
      console.log(`⚠️ Direct connection failed: ${error.message}, trying CORS proxy...`);
    }

    // Fallback to CORS proxy
    const maxAttempts = Math.min(3, this.corsProxyManager.getAllProxies().length);
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const corsProxy = this.corsProxyManager.getCurrentProxy();
      const proxiedUrl = this.buildProxiedUrl(corsProxy, url);

      try {
        console.log(`🔄 Making request via CORS proxy (attempt ${attempt}/${maxAttempts})...`);
        console.log(`Using proxy: ${corsProxy}`);
        
        const response = await fetch(proxiedUrl, requestOptions);
        
        if (response.ok) {
          console.log('✅ CORS proxy request successful');
          return response;
        } else if (response.status === 429) {
          // Handle rate limiting
          const retryAfter = this.getRetryAfter(response);
          console.warn(`⚠️ CORS proxy rate limited (${corsProxy}), marking as unavailable for ${retryAfter}s`);
          
          this.corsProxyManager.markProxyRateLimited(corsProxy, retryAfter);
          
          if (attempt === maxAttempts) {
            throw new Error(`All CORS proxies are rate limited. Please wait ${retryAfter} seconds and try again. For unlimited access, consider setting up your own CORS proxy.`);
          }
          
          continue;
        } else if (response.status === 401) {
          throw new Error('Authentication failed: Invalid or expired access token');
        } else if (response.status === 403) {
          throw new Error('Access denied: Insufficient permissions');
        } else {
          const errorText = await response.text().catch(() => response.statusText);
          console.error('❌ Request failed:', response.status, errorText);
          
          this.corsProxyManager.markProxyFailed(corsProxy);
          
          if (attempt === maxAttempts) {
            throw new Error(`Request failed: ${response.status} ${response.statusText}. ${errorText}`);
          }
          
          continue;
        }
      } catch (error) {
        console.error(`❌ Request error (attempt ${attempt}):`, error);
        lastError = error;
        
        // Handle specific error types
        if (error.name === 'AbortError') {
          this.corsProxyManager.markProxyFailed(corsProxy);
          if (attempt < maxAttempts) {
            console.log('⏱️ Request timeout, trying next proxy...');
            continue;
          }
          throw new Error('Request timeout: All CORS proxies are unresponsive. Please check your internet connection or try again later.');
        }
        
        if (error.message.includes('Failed to fetch')) {
          this.corsProxyManager.markProxyFailed(corsProxy);
          if (attempt < maxAttempts) {
            console.log('🔄 Network error, trying next proxy...');
            continue;
          }
          throw new Error('Network error: Unable to connect to Salesforce. Please check your internet connection and ensure the Salesforce instance URL is correct.');
        }
        
        // For authentication/permission errors, don't retry
        if (error.message.includes('Authentication failed') || error.message.includes('Access denied')) {
          throw error;
        }
        
        // For other errors, only retry if we have more attempts
        if (attempt < maxAttempts && !error.message.includes('Invalid URL')) {
          await this.sleep(1000 * attempt); // Exponential backoff
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('All connection attempts failed');
  }

  /**
   * Build proxied URL based on proxy type
   */
  private buildProxiedUrl(corsProxy: string, targetUrl: string): string {
    try {
      if (corsProxy.includes('allorigins.win')) {
        return `${corsProxy}${encodeURIComponent(targetUrl)}`;
      } else if (corsProxy.includes('corsproxy.io')) {
        return `${corsProxy}${encodeURIComponent(targetUrl)}`;
      } else if (corsProxy.includes('cors.sh')) {
        return `${corsProxy}${targetUrl}`;
      } else if (corsProxy.includes('bridged.cc')) {
        return `${corsProxy}${targetUrl}`;
      } else {
        // Default CORS Anywhere format
        return `${corsProxy}${targetUrl}`;
      }
    } catch (error) {
      console.error('Error building proxied URL:', error);
      // Fallback to simple concatenation
      return `${corsProxy}${targetUrl}`;
    }
  }

  /**
   * Get retry-after header value
   */
  private getRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    return retryAfter ? parseInt(retryAfter, 10) : 3600; // Default to 1 hour
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate the provided token by making a test API call
   */
  async validateToken(): Promise<SalesforceTokenResponse> {
    console.log('🔐 Validating Salesforce access token...');

    if (!this.instanceUrl) {
      throw new Error('Instance URL is required for token validation');
    }

    if (!this.accessToken) {
      throw new Error('Access token is required for validation');
    }

    try {
      // Test the token with a simple API call that requires minimal permissions
      const testUrl = `${this.instanceUrl}/services/data/v58.0/limits`;
      const response = await this.makeRequest(testUrl, {
        method: 'GET'
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        console.error('❌ Token validation failed:', errorText);
        
        if (response.status === 401) {
          throw new Error('Invalid or expired access token. Please check your token and try again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your permissions or contact your Salesforce administrator.');
        } else {
          throw new Error(`Token validation failed: ${response.status} ${response.statusText}`);
        }
      }

      console.log('✅ Token validation successful!');
      
      // Get user info to return proper response
      const userInfo = await this.getUserInfo();
      
      return {
        access_token: this.accessToken,
        instance_url: this.instanceUrl,
        id: userInfo.user_id || `${this.instanceUrl}/id/00Dxx0000000000EAA/005xx0000012Q9qAAE`,
        token_type: 'Bearer',
        issued_at: Date.now().toString(),
        userInfo
      };

    } catch (error) {
      console.error('❌ Token validation error:', error);
      
      // Provide helpful error messages for common issues
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        throw new Error('CORS proxy rate limit exceeded. Please wait a few minutes and try again, or set up your own CORS proxy for unlimited access.');
      }
      
      if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to Salesforce. Please check your internet connection and ensure the instance URL is correct.');
      }
      
      // Check for CORS demo server error
      if (error.message.includes('corsdemo') || error.message.includes('cors-anywhere')) {
        throw new Error('CORS demo server access required. Please visit https://cors-anywhere.herokuapp.com/corsdemo and enable temporary access, then try again.');
      }
      
      throw error;
    }
  }

  /**
   * Get user information using the access token
   */
  async getUserInfo(): Promise<any> {
    try {
      console.log('📋 Getting user information...');
      
      const userInfoUrl = `${this.instanceUrl}/services/oauth2/userinfo`;
      const response = await this.makeRequest(userInfoUrl);

      if (!response.ok) {
        // If userinfo endpoint fails, try to get basic org info instead
        console.log('⚠️ Userinfo endpoint failed, trying organization query...');
        return await this.getOrgInfo();
      }

      const userInfo = await response.json();
      console.log('✅ User info retrieved successfully');
      return userInfo;

    } catch (error) {
      console.error('❌ Failed to get user info:', error);
      // Fallback to basic org info
      return await this.getOrgInfo();
    }
  }

  /**
   * Get organization information as fallback
   */
  private async getOrgInfo(): Promise<any> {
    try {
      const orgQueryUrl = `${this.instanceUrl}/services/data/v58.0/query?q=SELECT Id, Name, OrganizationType FROM Organization LIMIT 1`;
      const response = await this.makeRequest(orgQueryUrl);

      if (!response.ok) {
        throw new Error(`Failed to get org info: ${response.statusText}`);
      }

      const data = await response.json();
      const org = data.records[0];

      // Return user info format
      return {
        user_id: '005xx0000012Q9qAAE', // Mock user ID
        organization_id: org.Id,
        username: 'demo@trusthunt.com',
        display_name: 'Demo User',
        email: 'demo@trusthunt.com',
        organization_name: org.Name,
        organization_type: org.OrganizationType
      };

    } catch (error) {
      console.error('❌ Failed to get org info:', error);
      
      // Return minimal mock data if all else fails
      return {
        user_id: '005xx0000012Q9qAAE',
        organization_id: '00Daj00000Rx0kQ',
        username: 'demo@trusthunt.com',
        display_name: 'Demo User',
        email: 'demo@trusthunt.com',
        organization_name: 'Demo Organization',
        organization_type: 'Developer Edition'
      };
    }
  }

  /**
   * Test connection with simple API call
   */
  async testConnection(): Promise<boolean> {
    try {
      const limitsUrl = `${this.instanceUrl}/services/data/v58.0/limits`;
      const response = await this.makeRequest(limitsUrl);
      return response.ok;
    } catch (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get the access token
   */
  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Get the instance URL
   */
  getInstanceUrl(): string {
    return this.instanceUrl;
  }

  /**
   * Get CORS proxy status for debugging
   */
  getCorsProxyStatus(): Array<{proxy: string, rateLimited: boolean, resetTime?: number}> {
    return this.corsProxyManager.getProxyStatus();
  }

  /**
   * Reset CORS proxy states (useful for debugging)
   */
  resetCorsProxies(): void {
    this.corsProxyManager.resetAllProxies();
  }
}