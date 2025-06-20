// Enterprise-specific types for TrustHunt

export interface EnterpriseConfiguration {
  organizationId: string;
  subscriptionTier: 'starter' | 'professional' | 'enterprise' | 'ultimate';
  maxOrganizations: number;
  maxUsers: number;
  features: EnterpriseFeature[];
  complianceFrameworks: ComplianceFramework[];
  integrations: IntegrationConfig[];
  securityPolicies: SecurityPolicy[];
}

export interface EnterpriseFeature {
  name: string;
  enabled: boolean;
  configuration: Record<string, any>;
  limits?: {
    maxUsage: number;
    currentUsage: number;
    resetPeriod: 'daily' | 'weekly' | 'monthly';
  };
}

export interface ComplianceFramework {
  name: 'SOC2' | 'GDPR' | 'HIPAA' | 'PCI_DSS' | 'ISO27001' | 'NIST';
  enabled: boolean;
  requirements: ComplianceRequirement[];
  assessmentSchedule: 'monthly' | 'quarterly' | 'annually';
  lastAssessment?: Date;
  nextAssessment?: Date;
  status: 'compliant' | 'partial' | 'non_compliant' | 'pending';
  score: number;
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'passed' | 'failed' | 'not_applicable' | 'pending';
  evidence?: string[];
  remediation?: string;
  dueDate?: Date;
}

export interface IntegrationConfig {
  type: 'siem' | 'cicd' | 'vulnerability_management' | 'ticketing' | 'notification';
  provider: string;
  enabled: boolean;
  configuration: Record<string, any>;
  credentials: {
    encrypted: boolean;
    lastUpdated: Date;
  };
  healthStatus: 'healthy' | 'warning' | 'error' | 'unknown';
  lastSync?: Date;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  description: string;
  category: 'access_control' | 'data_protection' | 'incident_response' | 'vulnerability_management';
  rules: SecurityRule[];
  enforcement: 'strict' | 'moderate' | 'advisory';
  exceptions: SecurityException[];
  lastUpdated: Date;
  approvedBy: string;
}

export interface SecurityRule {
  id: string;
  condition: string;
  action: 'allow' | 'deny' | 'alert' | 'quarantine';
  severity: 'critical' | 'high' | 'medium' | 'low';
  parameters: Record<string, any>;
}

export interface SecurityException {
  id: string;
  reason: string;
  approvedBy: string;
  expiresAt: Date;
  conditions: string[];
}

export interface EnterpriseUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'security_analyst' | 'compliance_officer' | 'viewer';
  permissions: Permission[];
  organizationAccess: string[];
  lastLogin?: Date;
  mfaEnabled: boolean;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  actions: ('read' | 'write' | 'delete' | 'admin')[];
  conditions?: Record<string, any>;
}

export interface EnterpriseAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'partial';
  riskScore?: number;
}

export interface EnterpriseMetrics {
  organizationId: string;
  timestamp: Date;
  securityScore: number;
  complianceScore: number;
  vulnerabilityCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  scanMetrics: {
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    averageDuration: number;
  };
  userActivity: {
    activeUsers: number;
    loginAttempts: number;
    failedLogins: number;
    suspiciousActivity: number;
  };
  systemPerformance: {
    apiResponseTime: number;
    systemUptime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface EnterpriseAlert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'compliance' | 'performance' | 'system';
  title: string;
  description: string;
  source: string;
  organizationId?: string;
  userId?: string;
  metadata: Record<string, any>;
  status: 'open' | 'acknowledged' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: Date;
  escalationLevel: number;
  notificationsSent: string[];
}

export interface EnterpriseReport {
  id: string;
  type: 'security_assessment' | 'compliance_report' | 'executive_summary' | 'technical_details';
  title: string;
  description: string;
  organizationIds: string[];
  generatedAt: Date;
  generatedBy: string;
  format: 'pdf' | 'html' | 'json' | 'csv';
  content: string | Buffer;
  metadata: {
    timeRange: {
      start: Date;
      end: Date;
    };
    filters: Record<string, any>;
    version: string;
  };
  distribution: {
    recipients: string[];
    deliveryMethod: 'email' | 'download' | 'api';
    scheduledDelivery?: Date;
  };
}

export interface EnterpriseDashboard {
  id: string;
  name: string;
  description: string;
  type: 'executive' | 'operational' | 'compliance' | 'technical';
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  permissions: {
    viewers: string[];
    editors: string[];
    admins: string[];
  };
  refreshInterval: number;
  lastUpdated: Date;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert_list' | 'compliance_status';
  title: string;
  configuration: Record<string, any>;
  dataSource: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  refreshInterval?: number;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  responsive: boolean;
  breakpoints: Record<string, any>;
}

export interface EnterpriseNotification {
  id: string;
  type: 'alert' | 'report' | 'system' | 'compliance';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  scheduledAt?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  metadata: Record<string, any>;
}

export interface NotificationRecipient {
  type: 'user' | 'role' | 'group';
  identifier: string;
  preferences?: {
    channels: string[];
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
    quietHours?: {
      start: string;
      end: string;
      timezone: string;
    };
  };
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'slack' | 'teams' | 'webhook' | 'push';
  configuration: Record<string, any>;
  enabled: boolean;
  fallback?: boolean;
}

export interface EnterpriseBackup {
  id: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  startedAt: Date;
  completedAt?: Date;
  size: number;
  location: string;
  encryption: {
    enabled: boolean;
    algorithm?: string;
    keyId?: string;
  };
  retention: {
    days: number;
    autoDelete: boolean;
  };
  verification: {
    verified: boolean;
    verifiedAt?: Date;
    checksum?: string;
  };
}

export interface EnterpriseRecovery {
  id: string;
  backupId: string;
  type: 'full_restore' | 'partial_restore' | 'point_in_time';
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  targetEnvironment: string;
  recoveryPoint: Date;
  verification: {
    verified: boolean;
    verifiedAt?: Date;
    issues?: string[];
  };
}