import { CrawledEndpoint, Parameter, DASTConfiguration } from '../../types/dast';

export class SalesforceWebCrawler {
  private baseUrl: string;
  private sessionToken: string;
  private configuration: DASTConfiguration;
  private crawledUrls: Set<string> = new Set();
  private discoveredEndpoints: CrawledEndpoint[] = [];
  private rateLimiter: RateLimiter;
  private corsProxy: string = 'https://cors-anywhere.herokuapp.com/';

  constructor(baseUrl: string, sessionToken: string, config: DASTConfiguration) {
    this.baseUrl = baseUrl;
    this.sessionToken = sessionToken;
    this.configuration = config;
    this.rateLimiter = new RateLimiter(config.rateLimit);
  }

  async startCrawl(): Promise<CrawledEndpoint[]> {
    console.log('🕷️ Starting Salesforce-aware web crawling...');
    
    try {
      // Phase 1: Lightning Experience Discovery
      await this.crawlLightningExperience();
      
      // Phase 2: Visualforce Page Discovery
      await this.crawlVisualforcePages();
      
      // Phase 3: API Endpoint Discovery
      await this.discoverAPIEndpoints();
      
      // Phase 4: Custom Component Analysis
      await this.analyzeCustomComponents();
      
      console.log(`✅ Crawling completed. Discovered ${this.discoveredEndpoints.length} endpoints`);
      return this.discoveredEndpoints;
      
    } catch (error) {
      console.error('❌ Crawling failed:', error);
      throw error;
    }
  }

  private async crawlLightningExperience(): Promise<void> {
    console.log('⚡ Crawling Lightning Experience...');
    
    // Discover Lightning Apps
    const lightningApps = await this.discoverLightningApps();
    
    for (const app of lightningApps) {
      await this.rateLimiter.wait();
      
      // Crawl each Lightning app
      const appEndpoints = await this.crawlLightningApp(app);
      this.discoveredEndpoints.push(...appEndpoints);
      
      // Discover Lightning Components within the app
      const components = await this.discoverLightningComponents(app);
      
      for (const component of components) {
        const componentEndpoints = await this.crawlLightningComponent(component);
        this.discoveredEndpoints.push(...componentEndpoints);
      }
    }
  }

  private async discoverLightningApps(): Promise<any[]> {
    const response = await this.makeAuthenticatedRequest('/services/data/v58.0/ui-api/apps');
    return response.apps || [];
  }

  private async crawlLightningApp(app: any): Promise<CrawledEndpoint[]> {
    const endpoints: CrawledEndpoint[] = [];
    
    // Discover app navigation items
    const navItems = await this.getAppNavigationItems(app.developerName);
    
    for (const item of navItems) {
      if (this.isInScope(item.url)) {
        const endpoint = await this.analyzeEndpoint(item.url, 'GET', 'lightning');
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
    }
    
    return endpoints;
  }

  private async discoverLightningComponents(app: any): Promise<any[]> {
    // Use Tooling API to discover Lightning Components
    const query = `SELECT Id, DeveloperName, MasterLabel FROM LightningComponentBundle WHERE NamespacePrefix = null`;
    const response = await this.makeAuthenticatedRequest(`/services/data/v58.0/tooling/query/?q=${encodeURIComponent(query)}`);
    return response.records || [];
  }

  private async crawlLightningComponent(component: any): Promise<CrawledEndpoint[]> {
    const endpoints: CrawledEndpoint[] = [];
    
    // Analyze component source for endpoints
    const componentSource = await this.getComponentSource(component.Id);
    const extractedEndpoints = this.extractEndpointsFromSource(componentSource);
    
    for (const url of extractedEndpoints) {
      if (this.isInScope(url)) {
        const endpoint = await this.analyzeEndpoint(url, 'GET', 'lightning');
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
    }
    
    return endpoints;
  }

  private async crawlVisualforcePages(): Promise<void> {
    console.log('📄 Crawling Visualforce Pages...');
    
    // Discover Visualforce pages using Metadata API
    const vfPages = await this.discoverVisualforcePages();
    
    for (const page of vfPages) {
      await this.rateLimiter.wait();
      
      const pageUrl = `/apex/${page.name}`;
      if (this.isInScope(pageUrl)) {
        const endpoint = await this.analyzeEndpoint(pageUrl, 'GET', 'visualforce');
        if (endpoint) {
          this.discoveredEndpoints.push(endpoint);
          
          // Analyze page for forms and parameters
          const pageAnalysis = await this.analyzeVisualforcePage(page);
          this.discoveredEndpoints.push(...pageAnalysis);
        }
      }
    }
  }

  private async discoverVisualforcePages(): Promise<any[]> {
    const query = `SELECT Id, Name, MasterLabel, ControllerType FROM ApexPage WHERE NamespacePrefix = null`;
    const response = await this.makeAuthenticatedRequest(`/services/data/v58.0/tooling/query/?q=${encodeURIComponent(query)}`);
    return response.records || [];
  }

  private async analyzeVisualforcePage(page: any): Promise<CrawledEndpoint[]> {
    const endpoints: CrawledEndpoint[] = [];
    
    // Get page source
    const pageSource = await this.getVisualforcePageSource(page.Id);
    
    // Extract forms and action methods
    const forms = this.extractFormsFromVFPage(pageSource);
    
    for (const form of forms) {
      const endpoint: CrawledEndpoint = {
        id: `vf-${page.Name}-${form.action}`,
        url: `/apex/${page.Name}`,
        method: form.method as any,
        parameters: form.parameters,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        responseCode: 200,
        pageType: 'visualforce',
        discoveredAt: new Date(),
        testStatus: 'pending'
      };
      
      endpoints.push(endpoint);
    }
    
    return endpoints;
  }

  private async discoverAPIEndpoints(): Promise<void> {
    console.log('🔌 Discovering API Endpoints...');
    
    // Discover REST API endpoints
    await this.discoverRESTEndpoints();
    
    // Discover custom Apex REST endpoints
    await this.discoverCustomApexREST();
    
    // Discover Lightning Data Service endpoints
    await this.discoverLightningDataService();
  }

  private async discoverRESTEndpoints(): Promise<void> {
    const standardEndpoints = [
      '/services/data/v58.0/sobjects',
      '/services/data/v58.0/query',
      '/services/data/v58.0/search',
      '/services/data/v58.0/composite',
      '/services/data/v58.0/composite/batch',
      '/services/data/v58.0/composite/tree'
    ];
    
    for (const endpoint of standardEndpoints) {
      if (this.isInScope(endpoint)) {
        const analyzedEndpoint = await this.analyzeEndpoint(endpoint, 'GET', 'api');
        if (analyzedEndpoint) {
          this.discoveredEndpoints.push(analyzedEndpoint);
        }
      }
    }
  }

  private async discoverCustomApexREST(): Promise<void> {
    // Query for custom Apex REST classes
    const query = `SELECT Id, Name, Body FROM ApexClass WHERE Body LIKE '%@RestResource%'`;
    const response = await this.makeAuthenticatedRequest(`/services/data/v58.0/tooling/query/?q=${encodeURIComponent(query)}`);
    
    for (const apexClass of response.records || []) {
      const endpoints = this.extractRESTEndpointsFromApex(apexClass.Body);
      this.discoveredEndpoints.push(...endpoints);
    }
  }

  private async analyzeEndpoint(url: string, method: string, pageType: any): Promise<CrawledEndpoint | null> {
    if (this.crawledUrls.has(`${method}:${url}`)) {
      return null;
    }
    
    this.crawledUrls.add(`${method}:${url}`);
    
    try {
      const response = await this.makeAuthenticatedRequest(url, method);
      
      const endpoint: CrawledEndpoint = {
        id: `${method.toLowerCase()}-${Buffer.from(url).toString('base64').substring(0, 8)}`,
        url,
        method: method as any,
        parameters: this.extractParameters(url, response),
        headers: response.headers || {},
        responseCode: response.status || 200,
        pageType,
        discoveredAt: new Date(),
        testStatus: 'pending'
      };
      
      return endpoint;
      
    } catch (error) {
      console.warn(`Failed to analyze endpoint ${url}:`, error);
      return null;
    }
  }

  private extractParameters(url: string, response: any): Parameter[] {
    const parameters: Parameter[] = [];
    
    // Extract query parameters from URL
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    urlParams.forEach((value, name) => {
      parameters.push({
        name,
        type: 'query',
        value,
        dataType: this.inferDataType(value),
        isRequired: false
      });
    });
    
    // Extract parameters from response (for forms, etc.)
    if (response.body) {
      const formParams = this.extractFormParameters(response.body);
      parameters.push(...formParams);
    }
    
    return parameters;
  }

  private extractFormParameters(html: string): Parameter[] {
    const parameters: Parameter[] = [];
    
    // Simple regex to extract form inputs (in production, use proper HTML parser)
    const inputRegex = /<input[^>]+name=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = inputRegex.exec(html)) !== null) {
      parameters.push({
        name: match[1],
        type: 'body',
        value: '',
        dataType: 'string',
        isRequired: match[0].includes('required')
      });
    }
    
    return parameters;
  }

  private isInScope(url: string): boolean {
    // Check if URL matches scope configuration
    if (this.configuration.crawlScope.length > 0) {
      return this.configuration.crawlScope.some(scope => url.includes(scope));
    }
    
    // Check exclude patterns
    return !this.configuration.excludePatterns.some(pattern => url.includes(pattern));
  }

  private async makeAuthenticatedRequest(url: string, method: string = 'GET'): Promise<any> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    const proxiedUrl = `${this.corsProxy}${fullUrl}`;
    
    const response = await fetch(proxiedUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${this.sessionToken}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text()
    };
  }

  private inferDataType(value: string): 'string' | 'number' | 'boolean' | 'object' | 'array' {
    if (value === 'true' || value === 'false') return 'boolean';
    if (!isNaN(Number(value))) return 'number';
    if (value.startsWith('{') || value.startsWith('[')) return value.startsWith('{') ? 'object' : 'array';
    return 'string';
  }

  // Additional helper methods would be implemented here...
  private async getAppNavigationItems(appName: string): Promise<any[]> { return []; }
  private async getComponentSource(componentId: string): Promise<string> { return ''; }
  private extractEndpointsFromSource(source: string): string[] { return []; }
  private async getVisualforcePageSource(pageId: string): Promise<string> { return ''; }
  private extractFormsFromVFPage(source: string): any[] { return []; }
  private async discoverLightningDataService(): Promise<void> {}
  private extractRESTEndpointsFromApex(apexBody: string): CrawledEndpoint[] { return []; }
  private async analyzeCustomComponents(): Promise<void> {}
}

class RateLimiter {
  private requestsPerSecond: number;
  private lastRequestTime: number = 0;

  constructor(requestsPerSecond: number) {
    this.requestsPerSecond = requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}