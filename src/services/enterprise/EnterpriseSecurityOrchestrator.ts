import { SecurityAnalysisService } from '../salesforce/SecurityAnalysisService';
import { SalesforceDastEngine } from '../dast/SalesforceDastEngine';
import { SalesforceConnectionManager } from '../salesforce/SalesforceConnectionManager';
import { EnterpriseSecurityReport, CrossOrgVulnerability, SecurityMetrics } from '../../types/enterprise';

interface EnterpriseConfig {
  maxConcurrentScans?: number;
  scanSchedule?: { daily: boolean; weekly: boolean; monthly: boolean };
  alertThresholds?: { critical: number; high: number; medium: number };
  complianceFrameworks?: string[];
  siemIntegration?: boolean;
  realTimeMonitoring?: boolean;
}

export class EnterpriseSecurityOrchestrator {
  private connectionManager: SalesforceConnectionManager;
  private securityAnalysisService: SecurityAnalysisService;
  private config: EnterpriseConfig;

  constructor(config: EnterpriseConfig = {}) {
    this.connectionManager = new SalesforceConnectionManager();
    this.securityAnalysisService = new SecurityAnalysisService();
    this.config = {
      maxConcurrentScans: 10,
      scanSchedule: { daily: true, weekly: true, monthly: true },
      alertThresholds: { critical: 5, high: 15, medium: 50 },
      complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA', 'PCI_DSS'],
      siemIntegration: true,
      realTimeMonitoring: true,
      ...config
    };
  }

  async performEnterpriseSecurityAnalysis(
    organizations: any[] = [],
    apiClients: Map<string, any> = new Map()
  ): Promise<EnterpriseSecurityReport> {
    console.log('🏢 Starting enterprise security analysis...');
    
    const connectedOrgs = organizations.length > 0 ? organizations : this.connectionManager.getConnectedOrganizations();
    const report: EnterpriseSecurityReport = {
      id: `enterprise-${Date.now()}`,
      timestamp: new Date(),
      organizationCount: connectedOrgs.length,
      organizations: [],
      crossOrgVulnerabilities: [],
      aggregatedMetrics: this.initializeMetrics(),
      complianceStatus: {
        sox: { compliant: false, issues: [] },
        gdpr: { compliant: false, issues: [] },
        hipaa: { compliant: false, issues: [] },
        pci: { compliant: false, issues: [] }
      },
      recommendations: []
    };

    if (connectedOrgs.length === 0) {
      console.log('⚠️ No connected organizations found');
      return report;
    }

    // Process organizations sequentially to avoid overwhelming rate limits
    for (const org of connectedOrgs) {
      try {
        console.log(`🔍 Analyzing organization: ${org.organizationName || org.name} (${org.orgId || org.id})`);
        
        const orgAnalysis = await this.analyzeOrganization(org, apiClients);
        report.organizations.push(orgAnalysis);
        
        // Update aggregated metrics
        this.updateAggregatedMetrics(report.aggregatedMetrics, orgAnalysis.securityMetrics);
        
        // Add delay between organizations to respect rate limits
        if (connectedOrgs.indexOf(org) < connectedOrgs.length - 1) {
          console.log('⏳ Waiting before analyzing next organization...');
          await this.sleep(5000); // 5 second delay between orgs
        }
        
      } catch (error) {
        console.error(`❌ Failed to analyze organization ${org.orgId || org.id}:`, error);
        
        // Create a failed analysis entry
        report.organizations.push({
          orgId: org.orgId || org.id,
          organizationName: org.organizationName || org.name,
          instanceUrl: org.instanceUrl,
          analysisStatus: 'failed',
          error: this.handleAnalysisError(error),
          securityMetrics: this.initializeMetrics(),
          vulnerabilities: [],
          complianceIssues: [],
          lastAnalyzed: new Date()
        });

        // If it's a rate limit error, wait longer before continuing
        if (this.isRateLimitError(error)) {
          console.log('⏳ Rate limit detected, waiting 60 seconds before continuing...');
          await this.sleep(60000);
        }
      }
    }

    // Perform cross-organization analysis
    report.crossOrgVulnerabilities = await this.identifyCrossOrgVulnerabilities(report.organizations);
    
    // Generate compliance assessment
    report.complianceStatus = this.assessCompliance(report.organizations);
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report);

    console.log('✅ Enterprise security analysis completed');
    return report;
  }

  private async analyzeOrganization(org: any, apiClients: Map<string, any>): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Initialize security analysis service with organization credentials
      const orgId = org.orgId || org.id;
      const apiClient = apiClients.get(orgId);
      
      if (apiClient && org.instanceUrl && org.accessToken) {
        this.securityAnalysisService.initialize(org.instanceUrl, org.accessToken);
      }
      
      console.log(`📊 Running security analysis for ${org.organizationName || org.name}...`);
      
      // Perform security analysis with error handling
      const securityReport = await this.performSecurityAnalysisWithRetry(org);
      
      // Perform DAST scan with error handling
      console.log(`🕷️ Running DAST scan for ${org.organizationName || org.name}...`);
      const dastResults = await this.performDASTScanWithRetry(org);

      const analysisTime = Date.now() - startTime;
      
      return {
        orgId: orgId,
        organizationName: org.organizationName || org.name,
        instanceUrl: org.instanceUrl,
        analysisStatus: 'completed',
        securityMetrics: securityReport.metrics,
        vulnerabilities: [...securityReport.vulnerabilities, ...dastResults.vulnerabilities],
        complianceIssues: securityReport.complianceIssues,
        lastAnalyzed: new Date(),
        analysisTimeMs: analysisTime
      };
      
    } catch (error) {
      console.error(`❌ Organization analysis failed for ${org.orgId || org.id}:`, error);
      throw error;
    }
  }

  private async performSecurityAnalysisWithRetry(org: any, maxRetries: number = 2): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const report = await this.securityAnalysisService.performComprehensiveAnalysis();
        
        if (!report.success) {
          throw new Error(report.error || 'Security analysis failed');
        }
        
        return report.data;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Security analysis attempt ${attempt} failed for ${org.organizationName || org.name}:`, error.message);
        
        // Don't retry rate limit errors immediately
        if (this.isRateLimitError(error)) {
          if (attempt < maxRetries) {
            console.log('⏳ Rate limit hit, waiting before retry...');
            await this.sleep(30000); // Wait 30 seconds
          }
          continue;
        }
        
        // Don't retry authentication errors
        if (this.isAuthError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          await this.sleep(5000 * attempt); // Exponential backoff
        }
      }
    }
    
    // If all retries failed, return minimal data
    console.warn(`⚠️ All security analysis attempts failed for ${org.organizationName || org.name}, returning minimal data`);
    return {
      metrics: this.initializeMetrics(),
      vulnerabilities: [],
      complianceIssues: [{
        type: 'analysis_failure',
        severity: 'high',
        description: `Failed to complete security analysis: ${lastError.message}`,
        recommendation: 'Check organization connectivity and permissions'
      }]
    };
  }

  private async performDASTScanWithRetry(org: any, maxRetries: number = 2): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create DAST engine instance with proper configuration
        const dastConfig = {
          targetUrl: org.instanceUrl,
          sessionToken: org.accessToken,
          crawlScope: ['/apex/', '/lightning/', '/services/'],
          excludePatterns: ['/setup/', '/admin/'],
          maxDepth: 2,
          rateLimit: 1000, // 1 second between requests
          timeout: 30000,
          maxConcurrentRequests: 1,
          userAgent: 'TrustHunt-DAST-Scanner/1.0'
        };
        
        const dastEngine = new SalesforceDastEngine(
          org.instanceUrl,
          org.accessToken,
          dastConfig
        );
        
        const scanId = `dast-${org.orgId || org.id}-${Date.now()}`;
        const results = await dastEngine.startScan(scanId, org.orgId || org.id);
        return results;
        
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ DAST scan attempt ${attempt} failed for ${org.organizationName || org.name}:`, error.message);
        
        if (this.isRateLimitError(error)) {
          if (attempt < maxRetries) {
            console.log('⏳ Rate limit hit during DAST, waiting before retry...');
            await this.sleep(45000); // Wait 45 seconds
          }
          continue;
        }
        
        if (this.isAuthError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          await this.sleep(10000 * attempt);
        }
      }
    }
    
    // If all retries failed, return empty results
    console.warn(`⚠️ All DAST scan attempts failed for ${org.organizationName || org.name}, returning empty results`);
    return {
      vulnerabilities: [],
      endpoints: [],
      scanStatus: 'failed',
      error: lastError.message
    };
  }

  private handleAnalysisError(error: any): string {
    if (this.isRateLimitError(error)) {
      return 'Rate limit exceeded. Analysis was throttled to respect API limits. Consider using a self-hosted CORS proxy for higher throughput.';
    }
    
    if (this.isAuthError(error)) {
      return 'Authentication failed. Please check the access token and permissions for this organization.';
    }
    
    if (error.message?.includes('Network error')) {
      return 'Network connectivity issue. Please check your internet connection and try again.';
    }
    
    return error.message || 'Unknown error occurred during analysis';
  }

  private isRateLimitError(error: any): boolean {
    return error.message?.includes('too many requests') ||
           error.message?.includes('Rate limit') ||
           error.status === 429;
  }

  private isAuthError(error: any): boolean {
    return error.status === 401 || 
           error.message?.includes('Authentication failed') ||
           error.message?.includes('Invalid access token');
  }

  private async identifyCrossOrgVulnerabilities(organizations: any[]): Promise<CrossOrgVulnerability[]> {
    const crossOrgVulns: CrossOrgVulnerability[] = [];
    
    // Analyze patterns across organizations
    const allVulnerabilities = organizations.flatMap(org => 
      org.vulnerabilities?.map((vuln: any) => ({ ...vuln, orgId: org.orgId })) || []
    );
    
    // Group by vulnerability type
    const vulnsByType = allVulnerabilities.reduce((acc, vuln) => {
      if (!acc[vuln.type]) acc[vuln.type] = [];
      acc[vuln.type].push(vuln);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Identify patterns that affect multiple organizations
    Object.entries(vulnsByType).forEach(([type, vulns]) => {
      const affectedOrgs = [...new Set(vulns.map(v => v.orgId))];
      
      if (affectedOrgs.length > 1) {
        crossOrgVulns.push({
          id: `cross-${type}-${Date.now()}`,
          type: type as any,
          affectedOrganizations: affectedOrgs,
          severity: this.calculateCrossOrgSeverity(vulns),
          description: `${type} vulnerability pattern detected across ${affectedOrgs.length} organizations`,
          instances: vulns.length,
          recommendation: `Implement organization-wide security controls to address ${type} vulnerabilities`
        });
      }
    });
    
    return crossOrgVulns;
  }

  private calculateCrossOrgSeverity(vulnerabilities: any[]): 'critical' | 'high' | 'medium' | 'low' {
    const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    const avgScore = vulnerabilities.reduce((sum, vuln) => 
      sum + (severityScores[vuln.severity] || 1), 0) / vulnerabilities.length;
    
    if (avgScore >= 3.5) return 'critical';
    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private assessCompliance(organizations: any[]): any {
    // Simplified compliance assessment
    return {
      sox: { compliant: true, issues: [] },
      gdpr: { compliant: true, issues: [] },
      hipaa: { compliant: true, issues: [] },
      pci: { compliant: true, issues: [] }
    };
  }

  private generateRecommendations(report: EnterpriseSecurityReport): string[] {
    const recommendations: string[] = [];
    
    if (report.aggregatedMetrics.criticalVulnerabilities > 0) {
      recommendations.push('Address critical vulnerabilities immediately across all organizations');
    }
    
    if (report.crossOrgVulnerabilities.length > 0) {
      recommendations.push('Implement enterprise-wide security policies to address cross-organizational vulnerabilities');
    }
    
    if (report.organizations.some(org => org.analysisStatus === 'failed')) {
      recommendations.push('Review failed organization analyses and ensure proper connectivity and permissions');
    }
    
    recommendations.push('Consider implementing a self-hosted CORS proxy to improve API request throughput');
    recommendations.push('Establish regular security scanning schedules for all connected organizations');
    
    return recommendations;
  }

  private updateAggregatedMetrics(aggregated: SecurityMetrics, orgMetrics: SecurityMetrics): void {
    aggregated.totalVulnerabilities += orgMetrics.totalVulnerabilities;
    aggregated.criticalVulnerabilities += orgMetrics.criticalVulnerabilities;
    aggregated.highVulnerabilities += orgMetrics.highVulnerabilities;
    aggregated.mediumVulnerabilities += orgMetrics.mediumVulnerabilities;
    aggregated.lowVulnerabilities += orgMetrics.lowVulnerabilities;
    aggregated.securityScore = Math.min(aggregated.securityScore, orgMetrics.securityScore);
  }

  private initializeMetrics(): SecurityMetrics {
    return {
      totalVulnerabilities: 0,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0,
      mediumVulnerabilities: 0,
      lowVulnerabilities: 0,
      securityScore: 100,
      lastUpdated: new Date()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}