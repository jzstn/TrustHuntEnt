import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SalesforceTokenAuth } from './SalesforceTokenAuth';
import { CorsProxyManager } from './CorsProxyManager';

// Mock CorsProxyManager
vi.mock('./CorsProxyManager', () => {
  return {
    CorsProxyManager: {
      getInstance: vi.fn(() => ({
        getCurrentProxy: vi.fn(() => 'https://cors-anywhere.herokuapp.com/'),
        markProxyRateLimited: vi.fn(),
        markProxyFailed: vi.fn(),
        getProxyStatus: vi.fn(() => [
          { proxy: 'https://cors-anywhere.herokuapp.com/', rateLimited: false }
        ]),
        resetAllProxies: vi.fn()
      }))
    }
  };
});

// Mock fetch
global.fetch = vi.fn();

describe('SalesforceTokenAuth', () => {
  let tokenAuth: SalesforceTokenAuth;
  
  beforeEach(() => {
    vi.resetAllMocks();
    
    tokenAuth = new SalesforceTokenAuth({
      accessToken: 'test-token',
      instanceUrl: 'https://test.my.salesforce.com'
    });
  });
  
  describe('validateToken', () => {
    it('should successfully validate a token', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ limits: { DailyApiRequests: { Max: 15000, Remaining: 14500 } } })
      });
      
      // Mock userInfo response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user_id: 'test-user-id',
          organization_id: 'test-org-id',
          username: 'test@example.com',
          display_name: 'Test User',
          email: 'test@example.com',
          organization_name: 'Test Org',
          organization_type: 'Developer Edition'
        })
      });
      
      const result = await tokenAuth.validateToken();
      
      expect(result).toEqual(expect.objectContaining({
        access_token: 'test-token',
        instance_url: 'https://test.my.salesforce.com',
        userInfo: expect.objectContaining({
          user_id: 'test-user-id',
          organization_id: 'test-org-id'
        })
      }));
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
    
    it('should handle invalid token', async () => {
      // Mock failed API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid Session ID'
      });
      
      await expect(tokenAuth.validateToken()).rejects.toThrow('Invalid or expired access token');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should handle network errors', async () => {
      // Mock network error
      (global.fetch as any).mockRejectedValueOnce(new Error('Failed to fetch'));
      
      await expect(tokenAuth.validateToken()).rejects.toThrow('Connection failed');
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should handle rate limiting', async () => {
      // Mock rate limit response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'Retry-After' ? '60' : null
        },
        text: async () => 'Rate limit exceeded'
      });
      
      // Mock for additional proxy attempts
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'Retry-After' ? '60' : null
        },
        text: async () => 'Rate limit exceeded'
      });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          get: (name: string) => name === 'Retry-After' ? '60' : null
        },
        text: async () => 'Rate limit exceeded'
      });
      
      await expect(tokenAuth.validateToken()).rejects.toThrow('All CORS proxies are rate limited');
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      
      // Verify proxy manager was called to mark proxies as rate limited
      expect(CorsProxyManager.getInstance().markProxyRateLimited).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('getUserInfo', () => {
    it('should get user information', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user_id: 'test-user-id',
          organization_id: 'test-org-id',
          username: 'test@example.com',
          display_name: 'Test User',
          email: 'test@example.com',
          organization_name: 'Test Org',
          organization_type: 'Developer Edition'
        })
      });
      
      const userInfo = await tokenAuth.getUserInfo();
      
      expect(userInfo).toEqual(expect.objectContaining({
        user_id: 'test-user-id',
        organization_id: 'test-org-id',
        username: 'test@example.com'
      }));
      
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should fall back to org info if userinfo fails', async () => {
      // Mock failed userinfo response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'Insufficient privileges'
      });
      
      // Mock successful org query response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          records: [{
            Id: 'test-org-id',
            Name: 'Test Org',
            OrganizationType: 'Developer Edition'
          }]
        })
      });
      
      const userInfo = await tokenAuth.getUserInfo();
      
      expect(userInfo).toEqual(expect.objectContaining({
        organization_id: 'test-org-id',
        organization_name: 'Test Org'
      }));
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ limits: {} })
      });
      
      const result = await tokenAuth.testConnection();
      
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should return false for failed connection', async () => {
      // Mock failed API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid Session ID'
      });
      
      const result = await tokenAuth.testConnection();
      
      expect(result).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});