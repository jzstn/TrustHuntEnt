export interface SIEMConfig {
  type: 'splunk' | 'qradar' | 'arcsight' | 'logrhythm' | 'sentinel' | 'custom';
  endpoint: string;
  apiKey: string;
  format: 'cef' | 'leef' | 'json' | 'syslog';
  realTimeEnabled: boolean;
  batchSize: number;
  retryAttempts: number;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  source: string;
  description: string;
  details: Record<string, any>;
  orgId: string;
  userId?: string;
}

export class SIEMIntegrationService {
  private config: SIEMConfig;
  private eventQueue: SecurityEvent[] = [];
  private isProcessing: boolean = false;

  constructor(config: SIEMConfig) {
    this.config = config;
    
    if (config.realTimeEnabled) {
      this.startRealTimeProcessing();
    }
  }

  /**
   * Send security event to SIEM
   */
  async sendEvent(event: SecurityEvent): Promise<void> {
    if (this.config.realTimeEnabled) {
      await this.sendEventImmediate(event);
    } else {
      this.eventQueue.push(event);
      
      if (this.eventQueue.length >= this.config.batchSize) {
        await this.processBatch();
      }
    }
  }

  /**
   * Send multiple events in batch
   */
  async sendEvents(events: SecurityEvent[]): Promise<void> {
    for (const event of events) {
      await this.sendEvent(event);
    }
  }

  /**
   * Send event immediately
   */
  private async sendEventImmediate(event: SecurityEvent): Promise<void> {
    const formattedEvent = this.formatEvent(event);
    
    try {
      await this.sendToSIEM(formattedEvent);
      console.log(`✅ Event sent to SIEM: ${event.id}`);
    } catch (error) {
      console.error(`❌ Failed to send event to SIEM: ${event.id}`, error);
      await this.retryEvent(event);
    }
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const batch = this.eventQueue.splice(0, this.config.batchSize);

    try {
      const formattedEvents = batch.map(event => this.formatEvent(event));
      await this.sendBatchToSIEM(formattedEvents);
      console.log(`✅ Batch of ${batch.length} events sent to SIEM`);
    } catch (error) {
      console.error(`❌ Failed to send batch to SIEM`, error);
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Format event based on SIEM type
   */
  private formatEvent(event: SecurityEvent): string {
    switch (this.config.format) {
      case 'cef':
        return this.formatCEF(event);
      case 'leef':
        return this.formatLEEF(event);
      case 'json':
        return this.formatJSON(event);
      case 'syslog':
        return this.formatSyslog(event);
      default:
        return this.formatJSON(event);
    }
  }

  /**
   * Format event as CEF (Common Event Format)
   */
  private formatCEF(event: SecurityEvent): string {
    const severity = this.mapSeverityToCEF(event.severity);
    return `CEF:0|SecureForce Pro|DAST|1.0|${event.category}|${event.description}|${severity}|src=${event.source} suser=${event.userId || 'unknown'} cs1=${event.orgId} cs1Label=OrgId`;
  }

  /**
   * Format event as LEEF (Log Event Extended Format)
   */
  private formatLEEF(event: SecurityEvent): string {
    return `LEEF:2.0|SecureForce Pro|DAST|1.0|${event.category}|devTime=${event.timestamp.toISOString()}|severity=${event.severity}|src=${event.source}|usrName=${event.userId || 'unknown'}|identSrc=${event.orgId}|cat=${event.category}`;
  }

  /**
   * Format event as JSON
   */
  private formatJSON(event: SecurityEvent): string {
    return JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
      vendor: 'SecureForce Pro',
      product: 'DAST Engine',
      version: '1.0'
    });
  }

  /**
   * Format event as Syslog
   */
  private formatSyslog(event: SecurityEvent): string {
    const priority = this.mapSeverityToSyslog(event.severity);
    const timestamp = event.timestamp.toISOString();
    return `<${priority}>${timestamp} SecureForce-Pro: ${event.category} - ${event.description} [orgId=${event.orgId}] [userId=${event.userId || 'unknown'}]`;
  }

  /**
   * Send formatted event to SIEM
   */
  private async sendToSIEM(formattedEvent: string): Promise<void> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': this.getContentType(),
        'User-Agent': 'SecureForce-Pro-SIEM-Integration/1.0'
      },
      body: formattedEvent
    });

    if (!response.ok) {
      throw new Error(`SIEM API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send batch of events to SIEM
   */
  private async sendBatchToSIEM(formattedEvents: string[]): Promise<void> {
    const batchPayload = this.config.format === 'json' 
      ? JSON.stringify(formattedEvents)
      : formattedEvents.join('\n');

    await this.sendToSIEM(batchPayload);
  }

  /**
   * Retry failed event
   */
  private async retryEvent(event: SecurityEvent, attempt: number = 1): Promise<void> {
    if (attempt > this.config.retryAttempts) {
      console.error(`❌ Max retry attempts reached for event: ${event.id}`);
      return;
    }

    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.sendEventImmediate(event);
    } catch (error) {
      await this.retryEvent(event, attempt + 1);
    }
  }

  /**
   * Start real-time event processing
   */
  private startRealTimeProcessing(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processBatch();
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Get content type for SIEM format
   */
  private getContentType(): string {
    switch (this.config.format) {
      case 'json':
        return 'application/json';
      case 'cef':
      case 'leef':
      case 'syslog':
        return 'text/plain';
      default:
        return 'application/json';
    }
  }

  /**
   * Map severity to CEF numeric value
   */
  private mapSeverityToCEF(severity: string): number {
    switch (severity) {
      case 'critical': return 10;
      case 'high': return 8;
      case medium: return 5;
      case 'low': return 3;
      case 'info': return 1;
      default: return 1;
    }
  }

  /**
   * Map severity to Syslog priority
   */
  private mapSeverityToSyslog(severity: string): number {
    switch (severity) {
      case 'critical': return 130; // Local0.Crit
      case 'high': return 131; // Local0.Error
      case 'medium': return 132; // Local0.Warning
      case 'low': return 134; // Local0.Info
      case 'info': return 134; // Local0.Info
      default: return 134;
    }
  }

  /**
   * Create security event from vulnerability
   */
  static createSecurityEventFromVulnerability(vulnerability: any): SecurityEvent {
    return {
      id: `vuln-${vulnerability.id}`,
      timestamp: new Date(),
      severity: vulnerability.severity,
      category: 'vulnerability_detected',
      source: 'SecureForce Pro DAST',
      description: vulnerability.title,
      details: {
        vulnerabilityType: vulnerability.type,
        cvssScore: vulnerability.cvssScore,
        location: vulnerability.location,
        remediation: vulnerability.remediation,
        businessImpact: vulnerability.businessImpact
      },
      orgId: vulnerability.orgId,
      userId: vulnerability.userId
    };
  }

  /**
   * Test SIEM connection
   */
  async testConnection(): Promise<boolean> {
    const testEvent: SecurityEvent = {
      id: 'test-connection',
      timestamp: new Date(),
      severity: 'info',
      category: 'connection_test',
      source: 'SecureForce Pro',
      description: 'SIEM connection test',
      details: { test: true },
      orgId: 'test-org'
    };

    try {
      await this.sendEventImmediate(testEvent);
      return true;
    } catch (error) {
      console.error('SIEM connection test failed:', error);
      return false;
    }
  }
}