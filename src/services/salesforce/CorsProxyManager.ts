/**
 * CORS Proxy Manager - Handles CORS proxy fallbacks and rate limiting
 */
export class CorsProxyManager {
  private static instance: CorsProxyManager;
  private corsProxies: string[] = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://cors.sh/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://thingproxy.freeboard.io/fetch/'
    'https://cors-anywhere.herokuapp.com/'
  ];
  private currentProxyIndex = 0;
  private rateLimitedProxies = new Set<string>();
  private rateLimitResetTimes = new Map<string, number>();

  private constructor() {}

  static getInstance(): CorsProxyManager {
    if (!CorsProxyManager.instance) {
      CorsProxyManager.instance = new CorsProxyManager();
    }
    return CorsProxyManager.instance;
  }

  /**
   * Get the current CORS proxy URL
   */
  getCurrentProxy(): string {
    // Clean up expired rate limits
    this.cleanupExpiredRateLimits();

    // Find next available proxy
    for (let i = 0; i < this.corsProxies.length; i++) {
      const proxyIndex = (this.currentProxyIndex + i) % this.corsProxies.length;
      const proxy = this.corsProxies[proxyIndex];
      
      if (!this.rateLimitedProxies.has(proxy)) {
        this.currentProxyIndex = proxyIndex;
        return proxy;
      }
    }

    // If all proxies are rate limited, return the first one
    // (user will get appropriate error message)
    return this.corsProxies[0];
  }

  /**
   * Mark a proxy as rate limited
   */
  markProxyRateLimited(proxy: string, retryAfterSeconds: number = 3600): void {
    this.rateLimitedProxies.add(proxy);
    this.rateLimitResetTimes.set(proxy, Date.now() + (retryAfterSeconds * 1000));
    
    // Move to next proxy
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
  }

  /**
   * Mark a proxy as failed (temporary failure, shorter timeout)
   */
  markProxyFailed(proxy: string): void {
    this.markProxyRateLimited(proxy, 300); // 5 minutes timeout for failed proxies
  }

  /**
   * Check if a proxy is currently rate limited
   */
  isProxyRateLimited(proxy: string): boolean {
    return this.rateLimitedProxies.has(proxy);
  }

  /**
   * Get all available proxies
   */
  getAllProxies(): string[] {
    return [...this.corsProxies];
  }

  /**
   * Add a custom CORS proxy
   */
  addCustomProxy(proxyUrl: string): void {
    if (!this.corsProxies.includes(proxyUrl)) {
      this.corsProxies.unshift(proxyUrl); // Add to beginning for priority
    }
  }

  /**
   * Clean up expired rate limits
   */
  private cleanupExpiredRateLimits(): void {
    const now = Date.now();
    for (const [proxy, resetTime] of this.rateLimitResetTimes.entries()) {
      if (now >= resetTime) {
        this.rateLimitedProxies.delete(proxy);
        this.rateLimitResetTimes.delete(proxy);
      }
    }
  }

  /**
   * Get status of all proxies
   */
  getProxyStatus(): Array<{proxy: string, rateLimited: boolean, resetTime?: number}> {
    return this.corsProxies.map(proxy => ({
      proxy,
      rateLimited: this.rateLimitedProxies.has(proxy),
      resetTime: this.rateLimitResetTimes.get(proxy)
    }));
  }

  /**
   * Reset all proxy states (useful for debugging)
   */
  resetAllProxies(): void {
    this.rateLimitedProxies.clear();
    this.rateLimitResetTimes.clear();
    this.currentProxyIndex = 0;
  }
}