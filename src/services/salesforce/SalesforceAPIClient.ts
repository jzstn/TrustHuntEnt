import { CorsProxyManager } from './CorsProxyManager';

export interface SalesforceAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  retryAfter?: number;
}

export interface SOQLQueryResult<T = any> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}

export interface ApexClass {
  Id: string;
  Name: string;
  Body: string;
  Status: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface Profile {
  Id: string;
  Name: string;
  UserType: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

export interface PermissionSet {
  Id: string;
  Name: string;
  Label: string;
  Description: string;
  IsOwnedByProfile: boolean;
}

export interface User {
  Id: string;
  Username: string;
  Email: string;
  Name: string;
  ProfileId: string;
  IsActive: boolean;
  LastLoginDate: string;
  CreatedDate: string;
}

class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly maxRequests = 45; // Stay under the 50 request limit
  private readonly windowMs = 60 * 60 * 1000; // 1 hour

  async executeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      // Reset window if needed
      const now = Date.now();
      if (now - this.windowStart >= this.windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Check if we've hit the rate limit
      if (this.requestCount >= this.maxRequests) {
        const waitTime = this.windowMs - (now - this.windowStart);
        console.log(`⏳ Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s before next request...`);
        await this.sleep(waitTime);
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.requestCount++;
        await request();
        // Add delay between requests to be respectful
        await this.sleep(1000);
      }
    }

    this.isProcessing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class SalesforceAPIClient {
  private instanceUrl: string;
  private accessToken: string;
  private apiVersion: string = 'v58.0';
  private corsProxyManager: CorsProxyManager;
  private rateLimiter: RateLimiter = new RateLimiter();
  private maxRetries: number = 3;
  private baseDelay: number = 1000;

  constructor(instanceUrl: string, accessToken: string) {
    // Normalize instanceUrl to prevent malformed URLs
    this.instanceUrl = this.normalizeInstanceUrl(instanceUrl);
    this.accessToken = accessToken;
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
      new URL(normalized);
      return normalized;
    } catch (error) {
      throw new Error(`Invalid instance URL format: ${url}`);
    }
  }

  /**
   * Execute SOQL query with rate limiting and error handling
   */
  async query<T = any>(soql: string): Promise<SalesforceAPIResponse<SOQLQueryResult<T>>> {
    return this.rateLimiter.executeRequest(async () => {
      try {
        const encodedQuery = encodeURIComponent(soql);
        const response = await this.makeRequestWithRetry(`/services/data/${this.apiVersion}/query/?q=${encodedQuery}`);
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        } else {
          const error = await response.text();
          return { 
            success: false, 
            error: this.parseErrorMessage(error), 
            statusCode: response.status,
            retryAfter: this.getRetryAfter(response)
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: this.handleError(error).message,
          statusCode: error.status || 500
        };
      }
    });
  }

  /**
   * Get all Apex classes for security analysis with pagination
   */
  async getApexClasses(): Promise<SalesforceAPIResponse<ApexClass[]>> {
    try {
      // Use a more efficient query with LIMIT to reduce data transfer
      const soql = `
        SELECT Id, Name, Status, CreatedDate, LastModifiedDate 
        FROM ApexClass 
        WHERE Status = 'Active' 
        ORDER BY LastModifiedDate DESC
        LIMIT 200
      `;
      
      const result = await this.query<ApexClass>(soql);
      if (result.success) {
        return { success: true, data: result.data.records };
      }
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to get Apex classes: ${this.handleError(error).message}` 
      };
    }
  }

  /**
   * Get all profiles for permission analysis
   */
  async getProfiles(): Promise<SalesforceAPIResponse<Profile[]>> {
    const soql = `
      SELECT Id, Name, UserType, CreatedDate, LastModifiedDate 
      FROM Profile 
      ORDER BY Name
      LIMIT 100
    `;
    
    const result = await this.query<Profile>(soql);
    if (result.success) {
      return { success: true, data: result.data.records };
    }
    return result;
  }

  /**
   * Get all permission sets
   */
  async getPermissionSets(): Promise<SalesforceAPIResponse<PermissionSet[]>> {
    const soql = `
      SELECT Id, Name, Label, Description, IsOwnedByProfile 
      FROM PermissionSet 
      WHERE IsOwnedByProfile = false 
      ORDER BY Name
      LIMIT 100
    `;
    
    const result = await this.query<PermissionSet>(soql);
    if (result.success) {
      return { success: true, data: result.data.records };
    }
    return result;
  }

  /**
   * Get users for access analysis
   */
  async getUsers(limit: number = 100): Promise<SalesforceAPIResponse<User[]>> {
    const soql = `
      SELECT Id, Username, Email, Name, ProfileId, IsActive, LastLoginDate, CreatedDate 
      FROM User 
      WHERE IsActive = true 
      ORDER BY LastLoginDate DESC NULLS LAST 
      LIMIT ${Math.min(limit, 100)}
    `;
    
    const result = await this.query<User>(soql);
    if (result.success) {
      return { success: true, data: result.data.records };
    }
    return result;
  }

  /**
   * Get organization limits
   */
  async getOrganizationLimits(): Promise<SalesforceAPIResponse<any>> {
    return this.rateLimiter.executeRequest(async () => {
      try {
        const response = await this.makeRequestWithRetry(`/services/data/${this.apiVersion}/limits`);
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        } else {
          const error = await response.text();
          return { 
            success: false, 
            error: this.parseErrorMessage(error), 
            statusCode: response.status 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: this.handleError(error).message 
        };
      }
    });
  }

  /**
   * Get custom objects for security analysis
   */
  async getCustomObjects(): Promise<SalesforceAPIResponse<any[]>> {
    return this.rateLimiter.executeRequest(async () => {
      try {
        const response = await this.makeRequestWithRetry(`/services/data/${this.apiVersion}/sobjects`);
        
        if (response.ok) {
          const data = await response.json();
          const customObjects = data.sobjects.filter((obj: any) => obj.custom);
          return { success: true, data: customObjects };
        } else {
          const error = await response.text();
          return { 
            success: false, 
            error: this.parseErrorMessage(error), 
            statusCode: response.status 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: this.handleError(error).message 
        };
      }
    });
  }

  /**
   * Get field-level security for an object
   */
  async getFieldLevelSecurity(objectName: string): Promise<SalesforceAPIResponse<any>> {
    return this.rateLimiter.executeRequest(async () => {
      try {
        const response = await this.makeRequestWithRetry(`/services/data/${this.apiVersion}/sobjects/${objectName}/describe`);
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data: data.fields };
        } else {
          const error = await response.text();
          return { 
            success: false, 
            error: this.parseErrorMessage(error), 
            statusCode: response.status 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: this.handleError(error).message 
        };
      }
    });
  }

  /**
   * Execute Tooling API query for metadata analysis
   */
  async toolingQuery<T = any>(soql: string): Promise<SalesforceAPIResponse<SOQLQueryResult<T>>> {
    return this.rateLimiter.executeRequest(async () => {
      try {
        const encodedQuery = encodeURIComponent(soql);
        const response = await this.makeRequestWithRetry(`/services/data/${this.apiVersion}/tooling/query/?q=${encodedQuery}`);
        
        if (response.ok) {
          const data = await response.json();
          return { success: true, data };
        } else {
          const error = await response.text();
          return { 
            success: false, 
            error: this.parseErrorMessage(error), 
            statusCode: response.status 
          };
        }
      } catch (error) {
        return { 
          success: false, 
          error: this.handleError(error).message 
        };
      }
    });
  }

  /**
   * Get Lightning components for security analysis
   */
  async getLightningComponents(): Promise<SalesforceAPIResponse<any[]>> {
    const soql = `
      SELECT Id, DeveloperName, MasterLabel, Description, CreatedDate, LastModifiedDate 
      FROM LightningComponentBundle 
      WHERE NamespacePrefix = null 
      ORDER BY LastModifiedDate DESC
      LIMIT 50
    `;
    
    const result = await this.toolingQuery(soql);
    if (result.success) {
      return { success: true, data: result.data.records };
    }
    return result;
  }

  /**
   * Get Visualforce pages
   */
  async getVisualforcePages(): Promise<SalesforceAPIResponse<any[]>> {
    const soql = `
      SELECT Id, Name, MasterLabel, ControllerType, CreatedDate, LastModifiedDate 
      FROM ApexPage 
      WHERE NamespacePrefix = null 
      ORDER BY LastModifiedDate DESC
      LIMIT 50
    `;
    
    const result = await this.toolingQuery(soql);
    if (result.success) {
      return { success: true, data: result.data.records };
    }
    return result;
  }

  /**
   * Get security health check data
   */
  async getSecurityHealthCheck(): Promise<SalesforceAPIResponse<any>> {
    try {
      console.log('🔍 Performing security health check...');
      
      // Execute requests sequentially to avoid overwhelming the rate limiter
      const profiles = await this.getProfiles();
      if (!profiles.success) {
        throw new Error(`Failed to get profiles: ${profiles.error}`);
      }

      const permissionSets = await this.getPermissionSets();
      if (!permissionSets.success) {
        throw new Error(`Failed to get permission sets: ${permissionSets.error}`);
      }

      const users = await this.getUsers(50);
      if (!users.success) {
        throw new Error(`Failed to get users: ${users.error}`);
      }

      const healthData = {
        profiles: profiles.data || [],
        permissionSets: permissionSets.data || [],
        users: users.data || [],
        timestamp: new Date().toISOString()
      };

      return { success: true, data: healthData };
    } catch (error) {
      return { 
        success: false, 
        error: this.handleError(error).message 
      };
    }
  }

  /**
   * Make authenticated request with retry logic and CORS proxy fallback
   */
  private async makeRequestWithRetry(endpoint: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(endpoint, options);
        
        // If we get a rate limit error, handle it appropriately
        if (response.status === 429) {
          const retryAfter = this.getRetryAfter(response);
          
          // Mark current proxy as rate limited
          const currentProxy = this.corsProxyManager.getCurrentProxy();
          this.corsProxyManager.markProxyRateLimited(currentProxy, retryAfter);
          
          // If this is our last attempt, throw a helpful error
          if (attempt === this.maxRetries) {
            const error = new Error(`All CORS proxies are rate limited. Please wait ${retryAfter} seconds or set up your own CORS proxy.`);
            (error as any).status = 429;
            (error as any).retryAfter = retryAfter;
            throw error;
          }
          
          // Try with next proxy
          continue;
        }

        // If successful or client error (4xx), return immediately
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // For server errors (5xx), retry
        if (response.status >= 500 && attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          console.log(`⚠️ Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        return response;

      } catch (error) {
        lastError = error;
        
        // Handle rate limit errors
        if (error.message.includes('rate limit') || error.status === 429) {
          if (attempt < this.maxRetries) {
            continue; // Try next proxy
          }
          throw error;
        }

        // Don't retry client errors
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1);
          console.log(`⚠️ Request failed, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries}):`, error.message);
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Make authenticated request to Salesforce API via CORS proxy
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    // Ensure endpoint starts with / for proper URL construction
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.instanceUrl}${normalizedEndpoint}`;
    
    // Get current CORS proxy
    const corsProxy = this.corsProxyManager.getCurrentProxy();
    const proxiedUrl = this.buildProxiedUrl(corsProxy, url);
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    const requestOptions = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(proxiedUrl, requestOptions);
      return response;
    } catch (error) {
      console.error('❌ Request failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Build proxied URL based on proxy type
   */
  private buildProxiedUrl(corsProxy: string, targetUrl: string): string {
    if (corsProxy.includes('allorigins.win') || 
        corsProxy.includes('corsproxy.io') || 
        corsProxy.includes('cors.sh') || 
        corsProxy.includes('bridged.cc')) {
      return `${corsProxy}${encodeURIComponent(targetUrl)}`;
    } else {
      // Default CORS Anywhere format
      return `${corsProxy}${targetUrl}`;
    }
  }

  /**
   * Handle and normalize errors
   */
  private handleError(error: any): Error {
    if (error.message?.includes('too many requests') || error.status === 429) {
      return new Error('CORS proxy rate limit exceeded. Trying alternative proxies or please wait before making more requests.');
    }

    if (error.message?.includes('Failed to fetch')) {
      return new Error('Network error. Please check your internet connection and ensure the CORS proxy is accessible.');
    }

    if (error.status === 401) {
      return new Error('Authentication failed. Please check your access token.');
    }

    if (error.status === 403) {
      return new Error('Access denied. Please check your permissions.');
    }

    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Parse error message from response
   */
  private parseErrorMessage(errorText: string): string {
    try {
      const errorData = JSON.parse(errorText);
      return errorData.message || errorData.error_description || errorData.error || errorText;
    } catch {
      if (errorText.includes('too many requests')) {
        return 'Rate limit exceeded. Trying alternative CORS proxies.';
      }
      return errorText;
    }
  }

  /**
   * Get retry-after header value
   */
  private getRetryAfter(response: Response): number {
    const retryAfter = response.headers.get('Retry-After');
    return retryAfter ? parseInt(retryAfter, 10) : 3600;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update access token
   */
  updateToken(newAccessToken: string): void {
    this.accessToken = newAccessToken;
  }

  /**
   * Get current instance URL
   */
  getInstanceUrl(): string {
    return this.instanceUrl;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string {
    return this.accessToken;
  }

  /**
   * Get CORS proxy status for debugging
   */
  getCorsProxyStatus(): Array<{proxy: string, rateLimited: boolean, resetTime?: number}> {
    return this.corsProxyManager.getProxyStatus();
  }
}