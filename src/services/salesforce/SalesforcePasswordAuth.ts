import { SalesforceAPIClient } from './SalesforceAPIClient';

export interface LoginCredentials {
  username: string;
  password: string;
  securityToken?: string;
  instanceUrl: string;
  environment: 'production' | 'sandbox' | 'developer';
}

export interface LoginResponse {
  access_token: string;
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

export class SalesforcePasswordAuth {
  private environment: string;
  private corsProxy = 'https://cors-anywhere.herokuapp.com/';

  constructor(environment: string = 'sandbox') {
    this.environment = environment;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { username, password, securityToken, instanceUrl } = credentials;
    
    // Combine password with security token if provided
    const fullPassword = securityToken ? `${password}${securityToken}` : password;

    const loginUrl = `${instanceUrl}/services/oauth2/token`;
    const proxiedUrl = `${this.corsProxy}${loginUrl}`;

    const body = new URLSearchParams({
      grant_type: 'password',
      client_id: import.meta.env.VITE_SALESFORCE_CLIENT_ID || '3MVG9pRzvMkjMb6lZlt3YjDQwe7JNVgger_PQiuUdQGWqKGDQoFWRJEoXJ8AXXx5nF7LM8HS9eq6b5COEisF1',
      client_secret: import.meta.env.VITE_SALESFORCE_CLIENT_SECRET || '1234567890123456789',
      username: username,
      password: fullPassword
    });

    try {
      console.log(`🔐 Attempting login to: ${proxiedUrl}`);
      
      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Login response error:', errorText);
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error_description || errorData.error || 'Login failed');
        } catch {
          if (response.status === 400) {
            throw new Error('Invalid username, password, or security token. Please check your credentials.');
          } else if (response.status === 401) {
            throw new Error('Authentication failed. Please verify your credentials and try again.');
          } else if (response.status === 403) {
            throw new Error('Access denied. Please check your Salesforce permissions.');
          } else {
            throw new Error(`Login failed with status ${response.status}. Please try again.`);
          }
        }
      }

      const loginData = await response.json();
      console.log('✅ Login successful');
      
      return loginData;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Connection failed. Please ensure you have enabled the CORS proxy at https://cors-anywhere.herokuapp.com/corsdemo and try again.');
      }
      
      throw error;
    }
  }

  async getUserInfo(accessToken: string, instanceUrl: string): Promise<SalesforceUserInfo> {
    const userInfoUrl = `${instanceUrl}/services/oauth2/userinfo`;
    const proxiedUrl = `${this.corsProxy}${userInfoUrl}`;

    try {
      console.log('👤 Getting user info...');
      
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ User info error:', errorText);
        throw new Error(`Failed to get user info: ${response.status}`);
      }

      const userInfo = await response.json();
      console.log('✅ User info retrieved');
      
      return {
        user_id: userInfo.user_id,
        organization_id: userInfo.organization_id,
        username: userInfo.preferred_username || userInfo.email,
        display_name: userInfo.name,
        email: userInfo.email,
        organization_name: userInfo.organization_name || 'Salesforce Organization',
        organization_type: this.environment
      };
    } catch (error) {
      console.error('❌ User info error:', error);
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Failed to get user information. Please ensure the CORS proxy is enabled.');
      }
      
      throw error;
    }
  }

  async testConnection(accessToken: string, instanceUrl: string): Promise<boolean> {
    const testUrl = `${instanceUrl}/services/data/v58.0/`;
    const proxiedUrl = `${this.corsProxy}${testUrl}`;

    try {
      console.log('🔍 Testing connection...');
      
      const response = await fetch(proxiedUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      const isConnected = response.ok;
      console.log(`✅ Connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      
      return isConnected;
    } catch (error) {
      console.error('❌ Connection test error:', error);
      return false;
    }
  }
}