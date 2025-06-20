// Mock data disabled - using real Salesforce data only
// This file is kept for reference but data is not loaded

import { 
  Organization, 
  Vulnerability, 
  AISecurityEvent, 
  CrossOrgAnalysis, 
  TemporalRiskEvent, 
  SecurityScan,
  DashboardMetrics 
} from '../types';
import { DASTScan, DASTVulnerability } from '../types/dast';

// All mock data exports are now empty arrays/objects
export const mockOrganizations: Organization[] = [];
export const mockVulnerabilities: Vulnerability[] = [];
export const mockAISecurityEvents: AISecurityEvent[] = [];
export const mockCrossOrgAnalyses: CrossOrgAnalysis[] = [];
export const mockTemporalRiskEvents: TemporalRiskEvent[] = [];
export const mockActiveScans: SecurityScan[] = [];
export const mockDASTScans: DASTScan[] = [];
export const mockDASTVulnerabilities: DASTVulnerability[] = [];

// Empty dashboard metrics
export const mockDashboardMetrics: DashboardMetrics = {
  totalOrgs: 0,
  totalVulnerabilities: 0,
  criticalVulnerabilities: 0,
  averageRiskScore: 0,
  activeScans: 0,
  aiSecurityEvents: 0,
  crossOrgIssues: 0,
  temporalAnomalies: 0
};