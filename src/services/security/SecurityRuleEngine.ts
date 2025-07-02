import { Vulnerability } from '../../types';

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  cvssScore: number;
  detectionPatterns: RegExp[];
  businessImpact: string;
  remediation: string;
  cweId?: string;
}

export interface CodeAnalysisResult {
  vulnerabilities: Vulnerability[];
  riskScore: number;
  metrics: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
  };
}

export class SecurityRuleEngine {
  private static instance: SecurityRuleEngine;
  private rules: SecurityRule[] = [];

  private constructor() {
    this.initializeRules();
  }

  public static getInstance(): SecurityRuleEngine {
    if (!SecurityRuleEngine.instance) {
      SecurityRuleEngine.instance = new SecurityRuleEngine();
    }
    return SecurityRuleEngine.instance;
  }

  private initializeRules(): void {
    // SOQL Injection Rules
    this.rules.push({
      id: 'SOQL-INJ-001',
      name: 'SOQL Injection - String Concatenation',
      description: 'Dynamic SOQL query constructed with string concatenation',
      severity: 'critical',
      type: 'soql_injection',
      cvssScore: 9.1,
      detectionPatterns: [
        /String\s+\w+\s*=\s*['"]SELECT\s+.*?\+\s*\w+/gi,
        /Database\.query\s*\(\s*['"].*?\+\s*\w+/gi,
        /\[\s*SELECT\s+.*?\+\s*\w+/gi,
        /WHERE\s+\w+\s*=\s*['"]?\s*\+\s*\w+/gi
      ],
      businessImpact: 'Attackers could access unauthorized data, potentially exposing sensitive information',
      remediation: 'Use parameterized queries with proper binding or apply String.escapeSingleQuotes() to user input',
      cweId: 'CWE-89'
    });

    // CRUD/FLS Violation Rules
    this.rules.push({
      id: 'CRUD-FLS-001',
      name: 'Missing Sharing Declaration',
      description: 'Apex class does not specify sharing model',
      severity: 'high',
      type: 'crud_fls_violation',
      cvssScore: 7.5,
      detectionPatterns: [
        /^(?!.*with\s+sharing|inherited\s+sharing|without\s+sharing).*\bclass\s+\w+/gm
      ],
      businessImpact: 'Users may access records they should not have permission to view or modify',
      remediation: 'Add "with sharing", "inherited sharing", or explicitly "without sharing" to class declaration',
      cweId: 'CWE-732'
    });

    this.rules.push({
      id: 'CRUD-FLS-002',
      name: 'Missing CRUD Checks',
      description: 'DML operations performed without checking CRUD permissions',
      severity: 'medium',
      type: 'crud_fls_violation',
      cvssScore: 5.4,
      detectionPatterns: [
        /(?:insert|update|delete|upsert)\s+\w+(?!.*isCreateable\(\)|.*isUpdateable\(\)|.*isDeletable\(\))/gi
      ],
      businessImpact: 'Users may perform operations they lack permission for',
      remediation: 'Add CRUD permission checks using Schema.sObjectType.isCreateable(), isUpdateable(), or isDeletable() before DML operations',
      cweId: 'CWE-732'
    });

    // Data Exposure Rules
    this.rules.push({
      id: 'DATA-EXP-001',
      name: 'Hardcoded Credentials',
      description: 'Sensitive credentials found hardcoded in source code',
      severity: 'high',
      type: 'data_exposure',
      cvssScore: 7.8,
      detectionPatterns: [
        /password\s*=\s*['"][^'"]{6,}['"]/gi,
        /apikey\s*=\s*['"][^'"]{10,}['"]/gi,
        /secret\s*=\s*['"][^'"]{10,}['"]/gi,
        /token\s*=\s*['"][^'"]{20,}['"]/gi,
        /key\s*=\s*['"][^'"]{15,}['"]/gi
      ],
      businessImpact: 'Credentials may be exposed to unauthorized users with code access',
      remediation: 'Use Custom Settings, Custom Metadata Types, or Named Credentials to store sensitive information',
      cweId: 'CWE-798'
    });

    // XSS Rules
    this.rules.push({
      id: 'XSS-001',
      name: 'Reflected XSS in Visualforce',
      description: 'User input from page parameters used without proper encoding',
      severity: 'medium',
      type: 'xss',
      cvssScore: 6.1,
      detectionPatterns: [
        /<apex:outputText\s+value=["']\{!.*?\}["']\s+escape=["']false["']/gi,
        /<apex:outputText\s+escape=["']false["']\s+value=["']\{!.*?\}["']/gi,
        /\{!.*?Request\.Parameter.*?\}/gi
      ],
      businessImpact: 'Potential cross-site scripting attacks against users',
      remediation: 'Use HTMLENCODE(), JSENCODE(), or set escape="true" on outputText components',
      cweId: 'CWE-79'
    });

    // Debug Logging Rules
    this.rules.push({
      id: 'DEBUG-001',
      name: 'Debug Logs with Sensitive Data',
      description: 'Debug statements containing potentially sensitive information',
      severity: 'low',
      type: 'data_exposure',
      cvssScore: 3.5,
      detectionPatterns: [
        /System\.debug\s*\(\s*.*?(?:password|email|phone|ssn|credit|token|key|secret)/gi
      ],
      businessImpact: 'Sensitive information may be exposed in debug logs',
      remediation: 'Remove debug statements with sensitive data or mask the sensitive information',
      cweId: 'CWE-532'
    });

    // Permission Escalation Rules
    this.rules.push({
      id: 'PERM-001',
      name: 'Unsafe runAs Usage',
      description: 'Using System.runAs without proper validation',
      severity: 'high',
      type: 'permission_escalation',
      cvssScore: 8.2,
      detectionPatterns: [
        /System\.runAs\s*\(/gi
      ],
      businessImpact: 'Potential privilege escalation and unauthorized access',
      remediation: 'Ensure runAs is only used in test methods or with proper authorization checks',
      cweId: 'CWE-250'
    });
  }

  public analyzeCode(code: string, fileName: string, orgId: string): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    
    this.rules.forEach(rule => {
      rule.detectionPatterns.forEach(pattern => {
        const matches = code.match(pattern);
        if (matches) {
          matches.forEach((match, index) => {
            // Find line number (approximate)
            const lines = code.substring(0, code.indexOf(match)).split('\n');
            const lineNumber = lines.length;
            
            vulnerabilities.push({
              id: `${rule.id}-${fileName.replace(/\W/g, '')}-${index}`,
              orgId,
              type: rule.type as any,
              severity: rule.severity,
              title: `${rule.name} in ${fileName}`,
              description: rule.description,
              location: fileName,
              discoveredAt: new Date(),
              status: 'open',
              cvssScore: rule.cvssScore,
              businessImpact: rule.businessImpact,
              remediation: rule.remediation,
              evidence: [{
                type: 'code_snippet',
                content: match.substring(0, 200) + (match.length > 200 ? '...' : ''),
                timestamp: new Date()
              }]
            });
          });
        }
      });
    });
    
    return vulnerabilities;
  }

  public analyzeApexClass(apexClass: any, orgId: string): Vulnerability[] {
    if (!apexClass.Body) {
      return [];
    }
    
    return this.analyzeCode(apexClass.Body, `${apexClass.Name}.cls`, orgId);
  }

  public analyzeVisualforcePage(vfPage: any, orgId: string): Vulnerability[] {
    if (!vfPage.Markup) {
      return [];
    }
    
    return this.analyzeCode(vfPage.Markup, `${vfPage.Name}.page`, orgId);
  }

  public analyzeLightningComponent(component: any, orgId: string): Vulnerability[] {
    if (!component.Source) {
      return [];
    }
    
    return this.analyzeCode(component.Source, `${component.DeveloperName}.js`, orgId);
  }

  public calculateRiskScore(vulnerabilities: Vulnerability[]): number {
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

  public getRules(): SecurityRule[] {
    return [...this.rules];
  }

  public addCustomRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }
}