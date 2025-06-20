import { SecurityEvent, SIEMIntegrationService } from '../integration/SIEMIntegrationService';
import { CICDIntegrationService } from '../cicd/CICDIntegrationService';

export interface MonitoringConfig {
  scanInterval: number; // milliseconds
  alertThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
  enableRealTimeAlerts: boolean;
  enableTrendAnalysis: boolean;
  retentionPeriod: number; // days
}

export interface SecurityMetrics {
  timestamp: Date;
  orgId: string;
  vulnerabilityCount: number;
  riskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  newVulnerabilities: number;
  resolvedVulnerabilities: number;
  scanDuration: number;
  apiResponseTime: number;
}

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'vulnerability_spike' | 'risk_score_drop' | 'scan_failure' | 'performance_degradation';
  orgId: string;
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export class RealTimeSecurityMonitor {
  private config: MonitoringConfig;
  private siemService?: SIEMIntegrationService;
  private cicdService?: CICDIntegrationService;
  private metricsHistory: SecurityMetrics[] = [];
  private activeAlerts: SecurityAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  constructor(
    config: MonitoringConfig,
    siemService?: SIEMIntegrationService,
    cicdService?: CICDIntegrationService
  ) {
    this.config = config;
    this.siemService = siemService;
    this.cicdService = cicdService;
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(): void {
    console.log('🔍 Starting real-time security monitoring...');
    
    this.monitoringInterval = setInterval(() => {
      this.performMonitoringCycle();
    }, this.config.scanInterval);

    console.log(`✅ Real-time monitoring started (interval: ${this.config.scanInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('🛑 Real-time monitoring stopped');
    }
  }

  /**
   * Perform monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Collect current metrics
      const currentMetrics = await this.collectSecurityMetrics();
      
      // Store metrics
      this.storeMetrics(currentMetrics);
      
      // Analyze trends
      if (this.config.enableTrendAnalysis) {
        await this.analyzeTrends(currentMetrics);
      }
      
      // Check for alerts
      await this.checkAlertConditions(currentMetrics);
      
      // Clean up old data
      this.cleanupOldData();
      
    } catch (error) {
      console.error('❌ Monitoring cycle failed:', error);
      await this.createAlert({
        type: 'scan_failure',
        severity: 'high',
        message: 'Monitoring cycle failed',
        details: { error: error.message }
      });
    }
  }

  /**
   * Collect current security metrics
   */
  private async collectSecurityMetrics(): Promise<SecurityMetrics[]> {
    // In a real implementation, this would collect metrics from all connected orgs
    // For now, we'll simulate metrics collection
    
    const metrics: SecurityMetrics[] = [];
    const timestamp = new Date();
    
    // Simulate metrics for demo org
    metrics.push({
      timestamp,
      orgId: 'demo-org',
      vulnerabilityCount: Math.floor(Math.random() * 50) + 10,
      riskScore: Math.floor(Math.random() * 40) + 60,
      criticalCount: Math.floor(Math.random() * 5),
      highCount: Math.floor(Math.random() * 10) + 2,
      mediumCount: Math.floor(Math.random() * 15) + 5,
      lowCount: Math.floor(Math.random() * 20) + 3,
      newVulnerabilities: Math.floor(Math.random() * 3),
      resolvedVulnerabilities: Math.floor(Math.random() * 2),
      scanDuration: Math.floor(Math.random() * 30000) + 10000, // 10-40 seconds
      apiResponseTime: Math.floor(Math.random() * 1000) + 200 // 200-1200ms
    });

    return metrics;
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(metrics: SecurityMetrics[]): void {
    this.metricsHistory.push(...metrics);
    
    // Send metrics to SIEM if configured
    if (this.siemService) {
      metrics.forEach(metric => {
        const event: SecurityEvent = {
          id: `metric-${metric.orgId}-${metric.timestamp.getTime()}`,
          timestamp: metric.timestamp,
          severity: 'info',
          category: 'security_metrics',
          source: 'SecureForce Pro Monitor',
          description: 'Security metrics collected',
          details: metric,
          orgId: metric.orgId
        };
        
        this.siemService.sendEvent(event);
      });
    }
  }

  /**
   * Analyze security trends
   */
  private async analyzeTrends(currentMetrics: SecurityMetrics[]): Promise<void> {
    for (const metric of currentMetrics) {
      const historicalData = this.getHistoricalData(metric.orgId, 24); // Last 24 hours
      
      if (historicalData.length < 2) {
        continue; // Need at least 2 data points for trend analysis
      }

      // Analyze vulnerability trend
      const vulnerabilityTrend = this.calculateTrend(
        historicalData.map(m => m.vulnerabilityCount)
      );

      // Analyze risk score trend
      const riskScoreTrend = this.calculateTrend(
        historicalData.map(m => m.riskScore)
      );

      // Check for concerning trends
      if (vulnerabilityTrend > 0.2) { // 20% increase
        await this.createAlert({
          type: 'vulnerability_spike',
          severity: 'high',
          message: `Vulnerability count increased by ${(vulnerabilityTrend * 100).toFixed(1)}%`,
          details: { 
            orgId: metric.orgId,
            trend: vulnerabilityTrend,
            currentCount: metric.vulnerabilityCount
          }
        });
      }

      if (riskScoreTrend < -0.15) { // 15% decrease in risk score
        await this.createAlert({
          type: 'risk_score_drop',
          severity: 'medium',
          message: `Risk score decreased by ${Math.abs(riskScoreTrend * 100).toFixed(1)}%`,
          details: { 
            orgId: metric.orgId,
            trend: riskScoreTrend,
            currentScore: metric.riskScore
          }
        });
      }
    }
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(metrics: SecurityMetrics[]): Promise<void> {
    for (const metric of metrics) {
      // Check critical vulnerability threshold
      if (metric.criticalCount >= this.config.alertThresholds.critical) {
        await this.createAlert({
          type: 'vulnerability_spike',
          severity: 'critical',
          message: `Critical vulnerability threshold exceeded: ${metric.criticalCount} critical vulnerabilities`,
          details: { 
            orgId: metric.orgId,
            criticalCount: metric.criticalCount,
            threshold: this.config.alertThresholds.critical
          }
        });
      }

      // Check high vulnerability threshold
      if (metric.highCount >= this.config.alertThresholds.high) {
        await this.createAlert({
          type: 'vulnerability_spike',
          severity: 'high',
          message: `High vulnerability threshold exceeded: ${metric.highCount} high vulnerabilities`,
          details: { 
            orgId: metric.orgId,
            highCount: metric.highCount,
            threshold: this.config.alertThresholds.high
          }
        });
      }

      // Check performance degradation
      if (metric.apiResponseTime > 5000) { // 5 seconds
        await this.createAlert({
          type: 'performance_degradation',
          severity: 'medium',
          message: `API response time degraded: ${metric.apiResponseTime}ms`,
          details: { 
            orgId: metric.orgId,
            responseTime: metric.apiResponseTime
          }
        });
      }
    }
  }

  /**
   * Create security alert
   */
  private async createAlert(alertData: {
    type: SecurityAlert['type'];
    severity: SecurityAlert['severity'];
    message: string;
    details: Record<string, any>;
  }): Promise<void> {
    const alert: SecurityAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: alertData.severity,
      type: alertData.type,
      orgId: alertData.details.orgId || 'unknown',
      message: alertData.message,
      details: alertData.details,
      acknowledged: false
    };

    this.activeAlerts.push(alert);

    console.log(`🚨 Security alert created: ${alert.message}`);

    // Send to SIEM if configured
    if (this.siemService) {
      const event: SecurityEvent = {
        id: alert.id,
        timestamp: alert.timestamp,
        severity: alert.severity,
        category: 'security_alert',
        source: 'SecureForce Pro Monitor',
        description: alert.message,
        details: alert.details,
        orgId: alert.orgId
      };

      await this.siemService.sendEvent(event);
    }

    // Send real-time notification if enabled
    if (this.config.enableRealTimeAlerts) {
      await this.sendRealTimeAlert(alert);
    }
  }

  /**
   * Send real-time alert notification
   */
  private async sendRealTimeAlert(alert: SecurityAlert): Promise<void> {
    // In a real implementation, this would send notifications via:
    // - WebSocket to connected dashboards
    // - Email to administrators
    // - Slack/Teams notifications
    // - SMS for critical alerts
    
    console.log(`📱 Real-time alert sent: ${alert.message}`);
  }

  /**
   * Get historical data for an organization
   */
  private getHistoricalData(orgId: string, hours: number): SecurityMetrics[] {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.metricsHistory
      .filter(m => m.orgId === orgId && m.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Calculate trend (percentage change)
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    if (first === 0) return last > 0 ? 1 : 0;
    
    return (last - first) / first;
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = new Date(Date.now() - (this.config.retentionPeriod * 24 * 60 * 60 * 1000));
    
    // Clean up old metrics
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp >= cutoffTime);
    
    // Clean up resolved alerts older than 7 days
    const alertCutoffTime = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
    this.activeAlerts = this.activeAlerts.filter(a => 
      !a.resolvedAt || a.resolvedAt >= alertCutoffTime
    );
  }

  /**
   * Get current security status
   */
  getSecurityStatus(): {
    activeAlerts: SecurityAlert[];
    recentMetrics: SecurityMetrics[];
    systemHealth: 'healthy' | 'warning' | 'critical';
  } {
    const recentMetrics = this.metricsHistory.slice(-10); // Last 10 metrics
    const criticalAlerts = this.activeAlerts.filter(a => 
      a.severity === 'critical' && !a.acknowledged
    );
    const highAlerts = this.activeAlerts.filter(a => 
      a.severity === 'high' && !a.acknowledged
    );

    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (criticalAlerts.length > 0) {
      systemHealth = 'critical';
    } else if (highAlerts.length > 0) {
      systemHealth = 'warning';
    }

    return {
      activeAlerts: this.activeAlerts.filter(a => !a.acknowledged),
      recentMetrics,
      systemHealth
    };
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Alert acknowledged: ${alertId}`);
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      console.log(`✅ Alert resolved: ${alertId}`);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    averageResponseTime: number;
    averageScanDuration: number;
    systemUptime: number;
    alertsPerHour: number;
  } {
    const recentMetrics = this.metricsHistory.slice(-100); // Last 100 metrics
    const recentAlerts = this.activeAlerts.filter(a => 
      a.timestamp >= new Date(Date.now() - (60 * 60 * 1000)) // Last hour
    );

    return {
      averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.apiResponseTime, 0) / recentMetrics.length || 0,
      averageScanDuration: recentMetrics.reduce((sum, m) => sum + m.scanDuration, 0) / recentMetrics.length || 0,
      systemUptime: Date.now() - (this.monitoringInterval ? Date.now() - this.config.scanInterval : Date.now()),
      alertsPerHour: recentAlerts.length
    };
  }
}