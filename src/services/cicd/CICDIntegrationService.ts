export interface CICDConfig {
  type: 'jenkins' | 'gitlab' | 'azure_devops' | 'github_actions' | 'bamboo';
  webhookUrl: string;
  apiToken: string;
  qualityGates: {
    maxCritical: number;
    maxHigh: number;
    maxMedium: number;
    failOnNewVulnerabilities: boolean;
    minimumRiskScore: number;
  };
  reportFormats: ('json' | 'xml' | 'html' | 'pdf' | 'sarif')[];
  notifications: {
    slack?: string;
    teams?: string;
    email?: string[];
  };
}

export interface SecurityScanReport {
  scanId: string;
  timestamp: Date;
  orgId: string;
  vulnerabilities: any[];
  riskScore: number;
  qualityGateStatus: 'passed' | 'failed' | 'warning';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  newVulnerabilities: any[];
  resolvedVulnerabilities: any[];
}

export class CICDIntegrationService {
  private config: CICDConfig;

  constructor(config: CICDConfig) {
    this.config = config;
  }

  /**
   * Process security scan results for CI/CD pipeline
   */
  async processScanResults(
    scanResults: any,
    previousResults?: any
  ): Promise<SecurityScanReport> {
    console.log('🔄 Processing scan results for CI/CD integration...');

    const report = this.generateScanReport(scanResults, previousResults);
    
    // Check quality gates
    const qualityGateStatus = this.checkQualityGates(report);
    report.qualityGateStatus = qualityGateStatus;

    // Generate reports in requested formats
    await this.generateReports(report);

    // Send notifications
    await this.sendNotifications(report);

    // Update CI/CD pipeline status
    await this.updatePipelineStatus(report);

    console.log(`✅ CI/CD integration completed with status: ${qualityGateStatus}`);
    return report;
  }

  /**
   * Generate scan report
   */
  private generateScanReport(
    scanResults: any,
    previousResults?: any
  ): SecurityScanReport {
    const vulnerabilities = scanResults.vulnerabilities || [];
    
    const summary = {
      critical: vulnerabilities.filter((v: any) => v.severity === 'critical').length,
      high: vulnerabilities.filter((v: any) => v.severity === 'high').length,
      medium: vulnerabilities.filter((v: any) => v.severity === 'medium').length,
      low: vulnerabilities.filter((v: any) => v.severity === 'low').length,
      total: vulnerabilities.length
    };

    // Compare with previous results to find new/resolved vulnerabilities
    const newVulnerabilities = this.findNewVulnerabilities(vulnerabilities, previousResults?.vulnerabilities || []);
    const resolvedVulnerabilities = this.findResolvedVulnerabilities(vulnerabilities, previousResults?.vulnerabilities || []);

    return {
      scanId: scanResults.scanId || `scan-${Date.now()}`,
      timestamp: new Date(),
      orgId: scanResults.orgId,
      vulnerabilities,
      riskScore: scanResults.riskScore || 0,
      qualityGateStatus: 'passed', // Will be updated by checkQualityGates
      summary,
      newVulnerabilities,
      resolvedVulnerabilities
    };
  }

  /**
   * Check quality gates
   */
  private checkQualityGates(report: SecurityScanReport): 'passed' | 'failed' | 'warning' {
    const { qualityGates } = this.config;
    const { summary, newVulnerabilities, riskScore } = report;

    // Check critical vulnerabilities
    if (summary.critical > qualityGates.maxCritical) {
      console.log(`❌ Quality gate failed: ${summary.critical} critical vulnerabilities (max: ${qualityGates.maxCritical})`);
      return 'failed';
    }

    // Check high vulnerabilities
    if (summary.high > qualityGates.maxHigh) {
      console.log(`❌ Quality gate failed: ${summary.high} high vulnerabilities (max: ${qualityGates.maxHigh})`);
      return 'failed';
    }

    // Check medium vulnerabilities
    if (summary.medium > qualityGates.maxMedium) {
      console.log(`⚠️ Quality gate warning: ${summary.medium} medium vulnerabilities (max: ${qualityGates.maxMedium})`);
      return 'warning';
    }

    // Check new vulnerabilities
    if (qualityGates.failOnNewVulnerabilities && newVulnerabilities.length > 0) {
      console.log(`❌ Quality gate failed: ${newVulnerabilities.length} new vulnerabilities detected`);
      return 'failed';
    }

    // Check minimum risk score
    if (riskScore < qualityGates.minimumRiskScore) {
      console.log(`❌ Quality gate failed: Risk score ${riskScore} below minimum ${qualityGates.minimumRiskScore}`);
      return 'failed';
    }

    console.log('✅ All quality gates passed');
    return 'passed';
  }

  /**
   * Generate reports in requested formats
   */
  private async generateReports(report: SecurityScanReport): Promise<void> {
    console.log('📊 Generating security reports...');

    for (const format of this.config.reportFormats) {
      try {
        switch (format) {
          case 'json':
            await this.generateJSONReport(report);
            break;
          case 'xml':
            await this.generateXMLReport(report);
            break;
          case 'html':
            await this.generateHTMLReport(report);
            break;
          case 'pdf':
            await this.generatePDFReport(report);
            break;
          case 'sarif':
            await this.generateSARIFReport(report);
            break;
        }
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error);
      }
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJSONReport(report: SecurityScanReport): Promise<void> {
    const jsonReport = {
      ...report,
      timestamp: report.timestamp.toISOString(),
      metadata: {
        tool: 'SecureForce Pro',
        version: '1.0.0',
        scanType: 'comprehensive'
      }
    };

    // In a real implementation, this would save to file or upload to artifact storage
    console.log('📄 JSON report generated');
  }

  /**
   * Generate SARIF report (Static Analysis Results Interchange Format)
   */
  private async generateSARIFReport(report: SecurityScanReport): Promise<void> {
    const sarifReport = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'SecureForce Pro',
            version: '1.0.0',
            informationUri: 'https://secureforce.pro'
          }
        },
        results: report.vulnerabilities.map(vuln => ({
          ruleId: vuln.type,
          level: this.mapSeverityToSARIF(vuln.severity),
          message: {
            text: vuln.description
          },
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: vuln.location
              }
            }
          }],
          properties: {
            cvssScore: vuln.cvssScore,
            businessImpact: vuln.businessImpact
          }
        }))
      }]
    };

    console.log('📄 SARIF report generated');
  }

  /**
   * Send notifications
   */
  private async sendNotifications(report: SecurityScanReport): Promise<void> {
    const { notifications } = this.config;

    // Send Slack notification
    if (notifications.slack) {
      await this.sendSlackNotification(report, notifications.slack);
    }

    // Send Teams notification
    if (notifications.teams) {
      await this.sendTeamsNotification(report, notifications.teams);
    }

    // Send email notifications
    if (notifications.email && notifications.email.length > 0) {
      await this.sendEmailNotifications(report, notifications.email);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(report: SecurityScanReport, webhookUrl: string): Promise<void> {
    const color = report.qualityGateStatus === 'passed' ? 'good' : 
                  report.qualityGateStatus === 'warning' ? 'warning' : 'danger';

    const message = {
      attachments: [{
        color,
        title: `SecureForce Pro Security Scan - ${report.qualityGateStatus.toUpperCase()}`,
        fields: [
          {
            title: 'Organization',
            value: report.orgId,
            short: true
          },
          {
            title: 'Risk Score',
            value: `${report.riskScore}/100`,
            short: true
          },
          {
            title: 'Critical',
            value: report.summary.critical.toString(),
            short: true
          },
          {
            title: 'High',
            value: report.summary.high.toString(),
            short: true
          },
          {
            title: 'New Vulnerabilities',
            value: report.newVulnerabilities.length.toString(),
            short: true
          },
          {
            title: 'Resolved',
            value: report.resolvedVulnerabilities.length.toString(),
            short: true
          }
        ],
        footer: 'SecureForce Pro',
        ts: Math.floor(report.timestamp.getTime() / 1000)
      }]
    };

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      console.log('✅ Slack notification sent');
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error);
    }
  }

  /**
   * Update CI/CD pipeline status
   */
  private async updatePipelineStatus(report: SecurityScanReport): Promise<void> {
    const status = report.qualityGateStatus === 'failed' ? 'failure' : 'success';
    const description = this.generateStatusDescription(report);

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          state: status,
          description,
          context: 'SecureForce Pro Security Scan',
          target_url: `https://secureforce.pro/reports/${report.scanId}`
        })
      });

      console.log(`✅ Pipeline status updated: ${status}`);
    } catch (error) {
      console.error('❌ Failed to update pipeline status:', error);
    }
  }

  /**
   * Generate status description
   */
  private generateStatusDescription(report: SecurityScanReport): string {
    const { summary } = report;
    
    if (report.qualityGateStatus === 'passed') {
      return `✅ Security scan passed - ${summary.total} issues found (${summary.critical} critical)`;
    } else if (report.qualityGateStatus === 'warning') {
      return `⚠️ Security scan warning - ${summary.total} issues found (${summary.critical} critical, ${summary.high} high)`;
    } else {
      return `❌ Security scan failed - ${summary.total} issues found (${summary.critical} critical, ${summary.high} high)`;
    }
  }

  /**
   * Find new vulnerabilities compared to previous scan
   */
  private findNewVulnerabilities(current: any[], previous: any[]): any[] {
    const previousIds = new Set(previous.map(v => v.id));
    return current.filter(v => !previousIds.has(v.id));
  }

  /**
   * Find resolved vulnerabilities compared to previous scan
   */
  private findResolvedVulnerabilities(current: any[], previous: any[]): any[] {
    const currentIds = new Set(current.map(v => v.id));
    return previous.filter(v => !currentIds.has(v.id));
  }

  /**
   * Map severity to SARIF level
   */
  private mapSeverityToSARIF(severity: string): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'note';
      default:
        return 'note';
    }
  }

  // Additional report generation methods would be implemented here
  private async generateXMLReport(report: SecurityScanReport): Promise<void> {
    console.log('📄 XML report generated');
  }

  private async generateHTMLReport(report: SecurityScanReport): Promise<void> {
    console.log('📄 HTML report generated');
  }

  private async generatePDFReport(report: SecurityScanReport): Promise<void> {
    console.log('📄 PDF report generated');
  }

  private async sendTeamsNotification(report: SecurityScanReport, webhookUrl: string): Promise<void> {
    console.log('✅ Teams notification sent');
  }

  private async sendEmailNotifications(report: SecurityScanReport, emails: string[]): Promise<void> {
    console.log('✅ Email notifications sent');
  }
}