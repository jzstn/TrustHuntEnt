import { SalesforceAPIClient } from './SalesforceAPIClient';
import { Vulnerability, AISecurityEvent, TemporalRiskEvent } from '../../types';

export interface SecurityAnalysisResult {
  success: boolean;
  data?: {
    vulnerabilities: Vulnerability[];
    aiSecurityEvents: AISecurityEvent[];
    temporalRiskEvents: TemporalRiskEvent[];
    riskScore: number;
    metrics: {
      totalVulnerabilities: number;
      criticalVulnerabilities: number;
      highVulnerabilities: number;
      mediumVulnerabilities: number;
      lowVulnerabilities: number;
      securityScore: number;
      lastUpdated: Date;
    };
    complianceIssues: Array<{
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
  };
  error?: string;
}

export class SecurityAnalysisService {
  private apiClient: SalesforceAPIClient;
  private orgId: string;

  constructor(apiClient: SalesforceAPIClient, orgId: string) {
    this.apiClient = apiClient;
    this.orgId = orgId;
  }

  /**
   * Initialize the service with new credentials
   */
  initialize(instanceUrl: string, accessToken: string): void {
    this.apiClient = new SalesforceAPIClient(instanceUrl, accessToken);
  }

  /**
   * Perform comprehensive security analysis
   */
  async performComprehensiveAnalysis(): Promise<SecurityAnalysisResult> {
    console.log('🔍 Starting comprehensive security analysis...');
    
    try {
      // Test API connectivity first
      const connectivityTest = await this.testConnectivity();
      if (!connectivityTest.success) {
        return {
          success: false,
          error: `Connectivity test failed: ${connectivityTest.error}`
        };
      }

      console.log('✅ Connectivity test passed, proceeding with analysis...');

      // Perform parallel analysis for better performance
      const [
        apexAnalysis,
        permissionAnalysis,
        userAnalysis,
        configurationAnalysis
      ] = await Promise.allSettled([
        this.analyzeApexSecurity(),
        this.analyzePermissionSecurity(),
        this.analyzeUserSecurity(),
        this.analyzeConfigurationSecurity()
      ]);

      // Collect all vulnerabilities
      const allVulnerabilities: Vulnerability[] = [];
      const complianceIssues: any[] = [];

      // Process Apex analysis results
      if (apexAnalysis.status === 'fulfilled') {
        allVulnerabilities.push(...apexAnalysis.value.vulnerabilities);
        complianceIssues.push(...apexAnalysis.value.complianceIssues);
      } else {
        console.warn('Apex analysis failed:', apexAnalysis.reason);
        complianceIssues.push({
          type: 'analysis_failure',
          severity: 'medium',
          description: 'Apex code analysis could not be completed',
          recommendation: 'Check API permissions for Tooling API access'
        });
      }

      // Process Permission analysis results
      if (permissionAnalysis.status === 'fulfilled') {
        allVulnerabilities.push(...permissionAnalysis.value.vulnerabilities);
        complianceIssues.push(...permissionAnalysis.value.complianceIssues);
      } else {
        console.warn('Permission analysis failed:', permissionAnalysis.reason);
      }

      // Process User analysis results
      if (userAnalysis.status === 'fulfilled') {
        allVulnerabilities.push(...userAnalysis.value.vulnerabilities);
        complianceIssues.push(...userAnalysis.value.complianceIssues);
      } else {
        console.warn('User analysis failed:', userAnalysis.reason);
      }

      // Process Configuration analysis results
      if (configurationAnalysis.status === 'fulfilled') {
        allVulnerabilities.push(...configurationAnalysis.value.vulnerabilities);
        complianceIssues.push(...configurationAnalysis.value.complianceIssues);
      } else {
        console.warn('Configuration analysis failed:', configurationAnalysis.reason);
      }

      // Generate AI security events and temporal risk events
      const aiSecurityEvents = await this.generateAISecurityEvents();
      const temporalRiskEvents = await this.generateTemporalRiskEvents();

      // Calculate metrics
      const metrics = this.calculateSecurityMetrics(allVulnerabilities);
      const riskScore = this.calculateRiskScore(allVulnerabilities);

      console.log(`✅ Security analysis completed: ${allVulnerabilities.length} vulnerabilities found`);

      return {
        success: true,
        data: {
          vulnerabilities: allVulnerabilities,
          aiSecurityEvents,
          temporalRiskEvents,
          riskScore,
          metrics,
          complianceIssues
        }
      };

    } catch (error) {
      console.error('❌ Security analysis failed:', error);
      return {
        success: false,
        error: `Security analysis failed: ${error.message}`
      };
    }
  }

  /**
   * Test API connectivity
   */
  private async testConnectivity(): Promise<{ success: boolean; error?: string }> {
    try {
      const limitsResult = await this.apiClient.getOrganizationLimits();
      if (limitsResult.success) {
        return { success: true };
      } else {
        return { success: false, error: limitsResult.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze Apex code security
   */
  private async analyzeApexSecurity(): Promise<{
    vulnerabilities: Vulnerability[];
    complianceIssues: any[];
  }> {
    console.log('🔍 Analyzing Apex code security...');
    
    const vulnerabilities: Vulnerability[] = [];
    const complianceIssues: any[] = [];

    try {
      // Get Apex classes using Tooling API
      const apexQuery = `
        SELECT Id, Name, Body, Status, CreatedDate, LastModifiedDate 
        FROM ApexClass 
        WHERE Status = 'Active' AND NamespacePrefix = null
        ORDER BY LastModifiedDate DESC
        LIMIT 50
      `;

      const apexResult = await this.apiClient.toolingQuery(apexQuery);
      
      if (!apexResult.success) {
        console.warn('Could not retrieve Apex classes:', apexResult.error);
        complianceIssues.push({
          type: 'tooling_api_access',
          severity: 'medium',
          description: 'Unable to access Apex classes for security analysis',
          recommendation: 'Ensure the connected user has Tooling API access'
        });
        return { vulnerabilities, complianceIssues };
      }

      const apexClasses = apexResult.data?.records || [];
      console.log(`📊 Analyzing ${apexClasses.length} Apex classes...`);

      for (const apexClass of apexClasses) {
        if (!apexClass.Body) continue;

        // Analyze for SOQL injection vulnerabilities
        const soqlVulns = this.detectSOQLInjection(apexClass);
        vulnerabilities.push(...soqlVulns);

        // Analyze for CRUD/FLS violations
        const crudVulns = this.detectCRUDFLSViolations(apexClass);
        vulnerabilities.push(...crudVulns);

        // Analyze for hardcoded credentials
        const credVulns = this.detectHardcodedCredentials(apexClass);
        vulnerabilities.push(...credVulns);

        // Analyze for other security issues
        const otherVulns = this.detectOtherSecurityIssues(apexClass);
        vulnerabilities.push(...otherVulns);
      }

      console.log(`✅ Apex analysis complete: ${vulnerabilities.length} issues found`);

    } catch (error) {
      console.error('Error in Apex analysis:', error);
      complianceIssues.push({
        type: 'apex_analysis_error',
        severity: 'medium',
        description: `Apex analysis failed: ${error.message}`,
        recommendation: 'Check API connectivity and permissions'
      });
    }

    return { vulnerabilities, complianceIssues };
  }

  /**
   * Detect SOQL injection vulnerabilities
   */
  private detectSOQLInjection(apexClass: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const body = apexClass.Body || '';

    // Patterns for dynamic SOQL construction
    const soqlPatterns = [
      {
        pattern: /String\s+\w+\s*=\s*['"]SELECT\s+.*?\+\s*\w+/gi,
        description: 'Dynamic SOQL string concatenation detected'
      },
      {
        pattern: /Database\.query\s*\(\s*['"].*?\+\s*\w+/gi,
        description: 'Database.query with string concatenation'
      },
      {
        pattern: /\[\s*SELECT\s+.*?\+\s*\w+/gi,
        description: 'SOQL query with variable concatenation'
      },
      {
        pattern: /WHERE\s+\w+\s*=\s*['"]?\s*\+\s*\w+/gi,
        description: 'WHERE clause with direct variable concatenation'
      }
    ];

    soqlPatterns.forEach((patternInfo, index) => {
      const matches = body.match(patternInfo.pattern);
      if (matches) {
        matches.forEach((match, matchIndex) => {
          vulnerabilities.push({
            id: `soql-${apexClass.Id}-${index}-${matchIndex}`,
            orgId: this.orgId,
            type: 'soql_injection',
            severity: 'critical',
            title: `SOQL Injection Risk in ${apexClass.Name}`,
            description: patternInfo.description,
            location: `${apexClass.Name}.cls`,
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 9.1,
            businessImpact: 'Potential unauthorized data access, data manipulation, or complete database compromise',
            remediation: 'Use parameterized queries, input validation, and String.escapeSingleQuotes() method',
            evidence: [{
              type: 'code_snippet',
              content: match.substring(0, 200) + (match.length > 200 ? '...' : ''),
              timestamp: new Date()
            }]
          });
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * Detect CRUD/FLS violations
   */
  private detectCRUDFLSViolations(apexClass: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const body = apexClass.Body || '';

    // Check for missing sharing declarations
    if (!body.includes('with sharing') && !body.includes('inherited sharing') && !body.includes('without sharing')) {
      vulnerabilities.push({
        id: `crud-${apexClass.Id}-sharing`,
        orgId: this.orgId,
        type: 'crud_fls_violation',
        severity: 'high',
        title: `Missing Sharing Declaration in ${apexClass.Name}`,
        description: 'Class does not declare sharing behavior, potentially allowing unauthorized data access',
        location: `${apexClass.Name}.cls`,
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 7.5,
        businessImpact: 'Users may access records they should not have permission to view or modify',
        remediation: 'Add "with sharing", "inherited sharing", or explicitly "without sharing" to class declaration'
      });
    }

    // Check for DML operations without permission checks
    const dmlPatterns = [
      { pattern: /insert\s+\w+/gi, operation: 'INSERT' },
      { pattern: /update\s+\w+/gi, operation: 'UPDATE' },
      { pattern: /delete\s+\w+/gi, operation: 'DELETE' },
      { pattern: /upsert\s+\w+/gi, operation: 'UPSERT' }
    ];

    const hasPermissionChecks = body.includes('Schema.sObjectType') || 
                               body.includes('isAccessible') || 
                               body.includes('isCreateable') || 
                               body.includes('isUpdateable') || 
                               body.includes('isDeletable');

    if (!hasPermissionChecks) {
      dmlPatterns.forEach((dmlInfo, index) => {
        const matches = body.match(dmlInfo.pattern);
        if (matches) {
          vulnerabilities.push({
            id: `crud-${apexClass.Id}-dml-${index}`,
            orgId: this.orgId,
            type: 'crud_fls_violation',
            severity: 'medium',
            title: `Missing CRUD Check for ${dmlInfo.operation} in ${apexClass.Name}`,
            description: `${dmlInfo.operation} operation without explicit CRUD permission checking`,
            location: `${apexClass.Name}.cls`,
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 5.4,
            businessImpact: 'Users may perform operations they lack permission for',
            remediation: `Add CRUD permission checks using Schema.sObjectType.${dmlInfo.operation === 'INSERT' ? 'isCreateable()' : dmlInfo.operation === 'UPDATE' ? 'isUpdateable()' : 'isDeletable()'} before DML operations`
          });
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * Detect hardcoded credentials
   */
  private detectHardcodedCredentials(apexClass: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const body = apexClass.Body || '';

    const credentialPatterns = [
      { pattern: /password\s*=\s*['"][^'"]{6,}['"]/gi, type: 'password' },
      { pattern: /apikey\s*=\s*['"][^'"]{10,}['"]/gi, type: 'API key' },
      { pattern: /secret\s*=\s*['"][^'"]{10,}['"]/gi, type: 'secret' },
      { pattern: /token\s*=\s*['"][^'"]{20,}['"]/gi, type: 'token' },
      { pattern: /key\s*=\s*['"][^'"]{15,}['"]/gi, type: 'key' }
    ];

    credentialPatterns.forEach((credInfo, index) => {
      const matches = body.match(credInfo.pattern);
      if (matches) {
        matches.forEach((match, matchIndex) => {
          vulnerabilities.push({
            id: `cred-${apexClass.Id}-${index}-${matchIndex}`,
            orgId: this.orgId,
            type: 'data_exposure',
            severity: 'high',
            title: `Hardcoded ${credInfo.type} in ${apexClass.Name}`,
            description: `Sensitive ${credInfo.type} found hardcoded in source code`,
            location: `${apexClass.Name}.cls`,
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 7.8,
            businessImpact: 'Credentials may be exposed to unauthorized users with code access',
            remediation: 'Use Custom Settings, Custom Metadata Types, or Named Credentials to store sensitive information'
          });
        });
      }
    });

    return vulnerabilities;
  }

  /**
   * Detect other security issues
   */
  private detectOtherSecurityIssues(apexClass: any): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const body = apexClass.Body || '';

    // Check for potential XSS in Visualforce controllers
    if (body.includes('PageReference') || body.includes('ApexPages')) {
      const xssPatterns = [
        /ApexPages\.currentPage\(\)\.getParameters\(\)\.get\([^)]+\)/gi,
        /String\s+\w+\s*=\s*ApexPages\.currentPage\(\)/gi
      ];

      xssPatterns.forEach((pattern, index) => {
        const matches = body.match(pattern);
        if (matches && !body.includes('String.escapeSingleQuotes') && !body.includes('HTMLENCODE')) {
          vulnerabilities.push({
            id: `xss-${apexClass.Id}-${index}`,
            orgId: this.orgId,
            type: 'xss',
            severity: 'medium',
            title: `Potential XSS in ${apexClass.Name}`,
            description: 'User input from page parameters used without proper encoding',
            location: `${apexClass.Name}.cls`,
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 6.1,
            businessImpact: 'Potential cross-site scripting attacks against users',
            remediation: 'Use String.escapeSingleQuotes(), HTMLENCODE(), or JSENCODE() functions'
          });
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * Analyze permission security
   */
  private async analyzePermissionSecurity(): Promise<{
    vulnerabilities: Vulnerability[];
    complianceIssues: any[];
  }> {
    console.log('🔍 Analyzing permission security...');
    
    const vulnerabilities: Vulnerability[] = [];
    const complianceIssues: any[] = [];

    try {
      const [profilesResult, permSetsResult] = await Promise.all([
        this.apiClient.getProfiles(),
        this.apiClient.getPermissionSets()
      ]);

      // Analyze profiles
      if (profilesResult.success) {
        const profiles = profilesResult.data || [];
        const adminProfiles = profiles.filter(p => 
          p.Name.toLowerCase().includes('admin') || 
          p.Name.toLowerCase().includes('system')
        );

        if (adminProfiles.length > 3) {
          vulnerabilities.push({
            id: `perm-${this.orgId}-admin-profiles`,
            orgId: this.orgId,
            type: 'permission_escalation',
            severity: 'medium',
            title: 'Excessive Administrative Profiles',
            description: `${adminProfiles.length} administrative profiles detected`,
            location: 'Profile Management',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 5.8,
            businessImpact: 'Increased risk of unauthorized administrative access',
            remediation: 'Review and consolidate administrative profiles, implement least privilege principle'
          });
        }
      }

      // Analyze permission sets
      if (permSetsResult.success) {
        const permSets = permSetsResult.data || [];
        
        if (permSets.length > 50) {
          complianceIssues.push({
            type: 'permission_complexity',
            severity: 'medium',
            description: `High number of permission sets (${permSets.length}) may indicate complex permission model`,
            recommendation: 'Review and simplify permission set architecture'
          });
        }
      }

    } catch (error) {
      console.error('Error in permission analysis:', error);
      complianceIssues.push({
        type: 'permission_analysis_error',
        severity: 'low',
        description: `Permission analysis failed: ${error.message}`,
        recommendation: 'Check API connectivity and permissions'
      });
    }

    return { vulnerabilities, complianceIssues };
  }

  /**
   * Analyze user security
   */
  private async analyzeUserSecurity(): Promise<{
    vulnerabilities: Vulnerability[];
    complianceIssues: any[];
  }> {
    console.log('🔍 Analyzing user security...');
    
    const vulnerabilities: Vulnerability[] = [];
    const complianceIssues: any[] = [];

    try {
      const usersResult = await this.apiClient.getUsers(100);
      
      if (usersResult.success) {
        const users = usersResult.data || [];
        
        // Check for inactive users
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const inactiveUsers = users.filter(u => {
          if (!u.LastLoginDate) return true;
          const lastLogin = new Date(u.LastLoginDate);
          return lastLogin < thirtyDaysAgo;
        });

        if (inactiveUsers.length > 0) {
          vulnerabilities.push({
            id: `user-${this.orgId}-inactive`,
            orgId: this.orgId,
            type: 'permission_escalation',
            severity: 'medium',
            title: 'Inactive Users with Access',
            description: `${inactiveUsers.length} users haven't logged in for 30+ days`,
            location: 'User Management',
            discoveredAt: new Date(),
            status: 'open',
            cvssScore: 6.2,
            businessImpact: 'Dormant accounts may be compromised without detection',
            remediation: 'Deactivate or review inactive user accounts regularly'
          });
        }

        // Check for users without email
        const usersWithoutEmail = users.filter(u => !u.Email || u.Email.trim() === '');
        if (usersWithoutEmail.length > 0) {
          complianceIssues.push({
            type: 'user_data_quality',
            severity: 'low',
            description: `${usersWithoutEmail.length} users without email addresses`,
            recommendation: 'Ensure all users have valid email addresses for security notifications'
          });
        }
      }

    } catch (error) {
      console.error('Error in user analysis:', error);
      complianceIssues.push({
        type: 'user_analysis_error',
        severity: 'low',
        description: `User analysis failed: ${error.message}`,
        recommendation: 'Check API connectivity and permissions'
      });
    }

    return { vulnerabilities, complianceIssues };
  }

  /**
   * Analyze configuration security
   */
  private async analyzeConfigurationSecurity(): Promise<{
    vulnerabilities: Vulnerability[];
    complianceIssues: any[];
  }> {
    console.log('🔍 Analyzing configuration security...');
    
    const vulnerabilities: Vulnerability[] = [];
    const complianceIssues: any[] = [];

    try {
      // Get organization limits to check configuration
      const limitsResult = await this.apiClient.getOrganizationLimits();
      
      if (limitsResult.success) {
        const limits = limitsResult.data;
        
        // Check API usage
        if (limits.DailyApiRequests) {
          const usagePercent = (limits.DailyApiRequests.Remaining / limits.DailyApiRequests.Max) * 100;
          if (usagePercent < 20) {
            complianceIssues.push({
              type: 'api_usage_high',
              severity: 'medium',
              description: `High API usage detected (${(100 - usagePercent).toFixed(1)}% of daily limit used)`,
              recommendation: 'Monitor API usage and optimize integrations'
            });
          }
        }

        // Check data storage
        if (limits.DataStorageMB) {
          const storagePercent = (limits.DataStorageMB.Remaining / limits.DataStorageMB.Max) * 100;
          if (storagePercent < 10) {
            complianceIssues.push({
              type: 'storage_capacity',
              severity: 'medium',
              description: `Low data storage remaining (${storagePercent.toFixed(1)}% available)`,
              recommendation: 'Review data retention policies and archive old data'
            });
          }
        }
      }

    } catch (error) {
      console.error('Error in configuration analysis:', error);
      complianceIssues.push({
        type: 'config_analysis_error',
        severity: 'low',
        description: `Configuration analysis failed: ${error.message}`,
        recommendation: 'Check API connectivity and permissions'
      });
    }

    return { vulnerabilities, complianceIssues };
  }

  /**
   * Generate AI security events (simulated based on current time and patterns)
   */
  private async generateAISecurityEvents(): Promise<AISecurityEvent[]> {
    const events: AISecurityEvent[] = [];
    const currentTime = new Date();
    const hour = currentTime.getHours();

    // Simulate AI security events based on time patterns
    if (hour < 6 || hour > 22) {
      events.push({
        id: `ai-${this.orgId}-${Date.now()}`,
        orgId: this.orgId,
        eventType: 'einstein_gpt_access',
        userId: 'after-hours-user',
        timestamp: currentTime,
        dataAccessed: ['Account.Name', 'Contact.Email', 'Opportunity.Amount'],
        riskLevel: 'high',
        businessHoursViolation: true,
        sensitiveDataExposed: true
      });
    }

    // Add a routine AI security event
    events.push({
      id: `ai-${this.orgId}-routine-${Date.now()}`,
      orgId: this.orgId,
      eventType: 'copilot_data_exposure',
      userId: 'system-user',
      timestamp: currentTime,
      dataAccessed: ['User.Profile', 'Account.Industry'],
      riskLevel: 'medium',
      businessHoursViolation: false,
      sensitiveDataExposed: false
    });

    return events;
  }

  /**
   * Generate temporal risk events
   */
  private async generateTemporalRiskEvents(): Promise<TemporalRiskEvent[]> {
    const events: TemporalRiskEvent[] = [];

    try {
      const usersResult = await this.apiClient.getUsers(20);
      if (usersResult.success) {
        const users = usersResult.data || [];
        
        users.forEach(user => {
          if (user.LastLoginDate) {
            const lastLogin = new Date(user.LastLoginDate);
            const hour = lastLogin.getHours();
            
            // Check for after-hours access
            if (hour < 6 || hour > 22) {
              events.push({
                id: `temp-${user.Id}-${lastLogin.getTime()}`,
                orgId: this.orgId,
                userId: user.Id,
                eventType: 'after_hours_access',
                timestamp: lastLogin,
                riskScore: 7.5,
                businessHoursViolation: true,
                geographicAnomaly: false,
                sessionDurationAnomaly: false
              });
            }
          }
        });
      }
    } catch (error) {
      console.error('Error generating temporal events:', error);
    }

    return events;
  }

  /**
   * Calculate security metrics
   */
  private calculateSecurityMetrics(vulnerabilities: Vulnerability[]) {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    return {
      totalVulnerabilities: vulnerabilities.length,
      criticalVulnerabilities: criticalCount,
      highVulnerabilities: highCount,
      mediumVulnerabilities: mediumCount,
      lowVulnerabilities: lowCount,
      securityScore: this.calculateRiskScore(vulnerabilities),
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(vulnerabilities: Vulnerability[]): number {
    if (vulnerabilities.length === 0) return 100;

    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowCount = vulnerabilities.filter(v => v.severity === 'low').length;

    // Weight the vulnerabilities by severity
    const weightedScore = (criticalCount * 25) + (highCount * 15) + (mediumCount * 8) + (lowCount * 3);
    
    // Calculate risk score (0-100, where 100 is best)
    const riskScore = Math.max(0, 100 - weightedScore);
    
    return Math.round(riskScore);
  }
}