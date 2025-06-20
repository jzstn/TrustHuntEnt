// DAST Engine Types for SecureForce Pro
export interface DASTScan {
  id: string;
  orgId: string;
  scanType: 'full' | 'targeted' | 'api_only' | 'lightning_only' | 'visualforce_only';
  status: 'queued' | 'crawling' | 'testing' | 'verifying' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  progress: number;
  crawledUrls: number;
  vulnerabilitiesFound: number;
  criticalFindings: number;
  configuration: DASTConfiguration;
  results?: DASTResults;
}

export interface DASTConfiguration {
  maxCrawlDepth: number;
  crawlScope: string[];
  excludePatterns: string[];
  authenticationProfile: string;
  testCategories: DASTTestCategory[];
  businessHoursOnly: boolean;
  maxDuration: number; // minutes
  rateLimit: number; // requests per second
}

export type DASTTestCategory = 
  | 'soql_injection'
  | 'xss_testing'
  | 'auth_bypass'
  | 'session_management'
  | 'business_logic'
  | 'api_security'
  | 'lightning_security'
  | 'visualforce_security';

export interface CrawledEndpoint {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  parameters: Parameter[];
  headers: Record<string, string>;
  responseCode: number;
  pageType: 'lightning' | 'visualforce' | 'api' | 'static';
  discoveredAt: Date;
  testStatus: 'pending' | 'testing' | 'completed' | 'skipped';
}

export interface Parameter {
  name: string;
  type: 'query' | 'body' | 'header' | 'cookie' | 'path';
  value: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  isRequired: boolean;
  validationRules?: string[];
}

export interface DASTVulnerability {
  id: string;
  scanId: string;
  type: DASTVulnerabilityType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  endpoint: string;
  parameter?: string;
  payload: string;
  evidence: DASTEvidence[];
  proofOfConcept: ProofOfConcept;
  cvssScore: number;
  cweId?: string;
  owaspCategory?: string;
  businessImpact: string;
  remediation: string;
  verificationStatus: 'unverified' | 'verified' | 'false_positive';
  discoveredAt: Date;
}

export type DASTVulnerabilityType =
  | 'soql_injection'
  | 'xss_reflected'
  | 'xss_stored'
  | 'xss_dom'
  | 'auth_bypass'
  | 'session_fixation'
  | 'session_hijacking'
  | 'csrf'
  | 'business_logic_flaw'
  | 'api_security_flaw'
  | 'lightning_security_bypass'
  | 'visualforce_injection'
  | 'privilege_escalation'
  | 'data_exposure';

export interface DASTEvidence {
  type: 'request' | 'response' | 'screenshot' | 'video' | 'log';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ProofOfConcept {
  steps: string[];
  payload: string;
  expectedResult: string;
  actualResult: string;
  reproducible: boolean;
  automatedTest?: string;
}

export interface DASTResults {
  summary: {
    totalEndpoints: number;
    testedEndpoints: number;
    vulnerabilitiesFound: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    falsePositiveRate: number;
  };
  vulnerabilities: DASTVulnerability[];
  coverage: {
    lightningComponents: number;
    visualforcePages: number;
    apiEndpoints: number;
    customObjects: number;
  };
  performance: {
    scanDuration: number;
    requestsPerSecond: number;
    errorRate: number;
  };
}

export interface PayloadTemplate {
  id: string;
  category: DASTTestCategory;
  name: string;
  description: string;
  payload: string;
  variations: string[];
  context: 'url' | 'body' | 'header' | 'cookie';
  encoding: 'none' | 'url' | 'html' | 'base64' | 'unicode';
  salesforceSpecific: boolean;
}

export interface SessionProfile {
  id: string;
  name: string;
  username: string;
  profileType: 'admin' | 'standard' | 'readonly' | 'custom';
  permissions: string[];
  ipRestrictions?: string[];
  loginHours?: string;
  mfaEnabled: boolean;
  sessionTimeout: number;
}

export interface BusinessLogicTest {
  id: string;
  name: string;
  description: string;
  category: 'workflow' | 'process_builder' | 'approval' | 'validation' | 'trigger';
  testSteps: BusinessLogicStep[];
  expectedBehavior: string;
  vulnerabilityIndicators: string[];
}

export interface BusinessLogicStep {
  action: string;
  parameters: Record<string, any>;
  expectedResponse: string;
  validationChecks: string[];
}

export interface SIEMIntegration {
  id: string;
  name: string;
  type: 'splunk' | 'qradar' | 'arcsight' | 'logrhythm' | 'custom';
  endpoint: string;
  apiKey: string;
  eventFormat: 'cef' | 'leef' | 'json' | 'syslog';
  realTimeEnabled: boolean;
  alertThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
}

export interface CICDIntegration {
  id: string;
  name: string;
  type: 'jenkins' | 'gitlab' | 'azure_devops' | 'github_actions';
  webhookUrl: string;
  qualityGates: {
    maxCritical: number;
    maxHigh: number;
    maxMedium: number;
    failOnNewVulnerabilities: boolean;
  };
  reportFormats: ('json' | 'xml' | 'html' | 'pdf')[];
}