// Core Types for SecureForce Pro
export interface Organization {
  id: string;
  name: string;
  type: 'production' | 'sandbox' | 'developer';
  instanceUrl: string;
  isConnected: boolean;
  lastScanDate?: Date;
  riskScore: number;
  vulnerabilityCount: number;
}

export interface Vulnerability {
  id: string;
  orgId: string;
  type: VulnerabilityType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  location: string;
  discoveredAt: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive';
  cvssScore: number;
  businessImpact: string;
  remediation: string;
  evidence?: Evidence[];
}

export type VulnerabilityType = 
  | 'soql_injection'
  | 'xss'
  | 'crud_fls_violation'
  | 'permission_escalation'
  | 'data_exposure'
  | 'ai_security_violation'
  | 'temporal_anomaly'
  | 'cross_org_drift';

export interface Evidence {
  type: 'screenshot' | 'request_response' | 'code_snippet' | 'log_entry';
  content: string;
  timestamp: Date;
}

export interface AISecurityEvent {
  id: string;
  orgId: string;
  eventType: 'einstein_gpt_access' | 'copilot_data_exposure' | 'ai_anomaly';
  userId: string;
  timestamp: Date;
  dataAccessed: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessHoursViolation: boolean;
  sensitiveDataExposed: boolean;
}

export interface CrossOrgAnalysis {
  id: string;
  sourceOrgId: string;
  targetOrgId: string;
  analysisType: 'permission_drift' | 'data_leakage' | 'user_access_variance';
  driftPercentage: number;
  riskScore: number;
  findings: CrossOrgFinding[];
  analyzedAt: Date;
}

export interface CrossOrgFinding {
  type: string;
  description: string;
  impact: string;
  recommendation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TemporalRiskEvent {
  id: string;
  orgId: string;
  userId: string;
  eventType: 'after_hours_access' | 'privilege_escalation' | 'bulk_operation' | 'unusual_login_time';
  timestamp: Date;
  riskScore: number;
  businessHoursViolation: boolean;
  geographicAnomaly: boolean;
  sessionDurationAnomaly: boolean;
}

export interface SecurityScan {
  id: string;
  orgId: string;
  scanType: 'full' | 'incremental' | 'targeted';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  vulnerabilitiesFound: number;
  progress: number;
  scanResults?: ScanResult[];
}

export interface ScanResult {
  category: string;
  itemsScanned: number;
  vulnerabilitiesFound: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export interface DashboardMetrics {
  totalOrgs: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  averageRiskScore: number;
  activeScans: number;
  aiSecurityEvents: number;
  crossOrgIssues: number;
  temporalAnomalies: number;
}