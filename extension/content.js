class TrustHuntContent {
  constructor() {
    this.orgInfo = null;
    this.securityOverlay = null;
    this.isInjected = false;
    this.init();
  }

  async init() {
    // Avoid double injection
    if (window.trustHuntContentInjected) return;
    window.trustHuntContentInjected = true;

    console.log('TrustHunt Enterprise content script loaded');
    
    await this.detectOrgInfo();
    this.setupMessageListener();
    this.injectSecurityOverlay();
    this.startRealTimeMonitoring();
  }

  async detectOrgInfo() {
    try {
      this.orgInfo = this.extractOrgInfo();
      
      if (this.orgInfo) {
        // Notify background script
        chrome.runtime.sendMessage({
          type: 'ORG_DETECTED',
          orgInfo: this.orgInfo
        });
      }
    } catch (error) {
      console.error('Error detecting org info:', error);
    }
  }

  extractOrgInfo() {
    try {
      let orgName = 'Unknown Organization';
      let orgId = null;

      // Try to get org name from page title
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent.includes('|')) {
        orgName = titleElement.textContent.split('|')[1].trim();
      }

      // Try Lightning Experience selectors
      const lightningOrgElement = document.querySelector('[data-aura-class="oneHeader"] .slds-context-bar__label-action');
      if (lightningOrgElement) {
        orgName = lightningOrgElement.textContent.trim();
      }

      // Try Classic selectors
      const classicOrgElement = document.querySelector('.setupTab .tabText');
      if (classicOrgElement) {
        orgName = classicOrgElement.textContent.trim();
      }

      // Extract org ID from scripts
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        if (script.textContent && script.textContent.includes('organizationId')) {
          const match = script.textContent.match(/organizationId['"]\s*:\s*['"]([^'"]+)['"]/);
          if (match) {
            orgId = match[1];
            break;
          }
        }
      }

      // Get session info if available
      let sessionId = null;
      if (window.sforce && window.sforce.connection && window.sforce.connection.sessionId) {
        sessionId = window.sforce.connection.sessionId;
      }

      const url = new URL(window.location.href);
      
      // Check for Lightning or Visualforce
      const isLightning = url.hostname.includes('lightning.force.com') || 
                          url.hostname.includes('develop.lightning.force.com') ||
                          document.querySelector('[data-aura-class]') !== null;
      
      const isVisualforce = url.pathname.includes('/apex/') || 
                           document.querySelector('.vfPage') !== null;
      
      // If we have any Salesforce indicators, consider it a Salesforce org
      const isSalesforce = isLightning || 
                          isVisualforce || 
                          url.hostname.includes('salesforce.com') || 
                          url.hostname.includes('force.com') ||
                          document.querySelector('.slds-') !== null;

      if (!isSalesforce) {
        return null;
      }
      
      return {
        orgName: orgName || 'Salesforce Organization',
        orgId: orgId || this.generateOrgIdFromUrl(url),
        instanceUrl: `${url.protocol}//${url.hostname}`,
        sessionId: sessionId,
        detectedAt: new Date().toISOString(),
        pageType: this.detectPageType()
      };
    } catch (error) {
      console.error('Error extracting org info:', error);
      return null;
    }
  }

  generateOrgIdFromUrl(url) {
    // Generate a consistent ID from the hostname
    return url.hostname.replace(/[^a-zA-Z0-9]/g, '_');
  }

  detectPageType() {
    if (document.querySelector('[data-aura-class]') || document.querySelector('.slds-')) {
      return 'lightning';
    } else if (document.querySelector('.bPageTitle') || document.querySelector('.individualPalette')) {
      return 'classic';
    } else if (window.location.pathname.includes('/apex/')) {
      return 'visualforce';
    } else {
      return 'unknown';
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });
  }

  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_ORG_INFO':
        sendResponse({ success: true, data: this.orgInfo });
        break;

      case 'SECURITY_DATA_UPDATED':
        this.handleSecurityDataUpdate(message.orgId, message.data);
        sendResponse({ success: true });
        break;

      case 'SHOW_SECURITY_ALERT':
        this.showSecurityAlert(message.alert);
        sendResponse({ success: true });
        break;

      case 'HIGHLIGHT_VULNERABILITY':
        this.highlightVulnerability(message.vulnerability);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  injectSecurityOverlay() {
    if (this.securityOverlay) return;

    // Create floating security status indicator
    this.securityOverlay = document.createElement('div');
    this.securityOverlay.id = 'trusthunt-security-overlay';
    this.securityOverlay.innerHTML = `
      <div class="trusthunt-overlay-content">
        <div class="trusthunt-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="trusthunt-status">
          <div class="trusthunt-status-dot"></div>
          <span class="trusthunt-status-text">Monitoring</span>
        </div>
        <div class="trusthunt-actions">
          <button class="trusthunt-scan-btn" title="Start Security Scan">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5,3 19,12 5,21 5,3"/>
            </svg>
          </button>
          <button class="trusthunt-report-btn" title="View Security Report">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.securityOverlay.querySelector('.trusthunt-scan-btn').addEventListener('click', () => {
      this.startSecurityScan();
    });

    this.securityOverlay.querySelector('.trusthunt-report-btn').addEventListener('click', () => {
      this.openSecurityReport();
    });

    document.body.appendChild(this.securityOverlay);
    
    // Load initial security status
    this.updateSecurityStatus();
  }

  async updateSecurityStatus() {
    if (!this.orgInfo || !this.securityOverlay) return;

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SECURITY_DATA',
        orgId: this.orgInfo.orgId
      });

      if (response.success && response.data) {
        const data = response.data;
        const statusDot = this.securityOverlay.querySelector('.trusthunt-status-dot');
        const statusText = this.securityOverlay.querySelector('.trusthunt-status-text');

        if (data.vulnerabilityCount > 5) {
          statusDot.className = 'trusthunt-status-dot critical';
          statusText.textContent = `${data.vulnerabilityCount} Issues`;
        } else if (data.vulnerabilityCount > 0) {
          statusDot.className = 'trusthunt-status-dot warning';
          statusText.textContent = `${data.vulnerabilityCount} Issues`;
        } else {
          statusDot.className = 'trusthunt-status-dot secure';
          statusText.textContent = 'Secure';
        }
      }
    } catch (error) {
      console.error('Error updating security status:', error);
    }
  }

  async startSecurityScan() {
    if (!this.orgInfo) return;

    try {
      const statusText = this.securityOverlay.querySelector('.trusthunt-status-text');
      const originalText = statusText.textContent;
      
      statusText.textContent = 'Scanning...';
      
      const response = await chrome.runtime.sendMessage({
        type: 'START_SCAN',
        orgId: this.orgInfo.orgId,
        options: { manual: true }
      });

      if (response.success) {
        this.showNotification('Security scan started', 'success');
        
        // Simulate scan progress
        setTimeout(() => {
          statusText.textContent = originalText;
          this.updateSecurityStatus();
        }, 5000);
      }
    } catch (error) {
      console.error('Error starting scan:', error);
      this.showNotification('Failed to start scan', 'error');
    }
  }

  openSecurityReport() {
    // Open TrustHunt web app with report view
    window.open('http://localhost:5173/report', '_blank');
  }

  handleSecurityDataUpdate(orgId, data) {
    if (this.orgInfo && this.orgInfo.orgId === orgId) {
      this.updateSecurityStatus();
      
      // Show notification for new vulnerabilities
      if (data.vulnerabilityCount > 0) {
        this.showNotification(
          `Security scan complete: ${data.vulnerabilityCount} issues found`,
          'warning'
        );
      }
    }
  }

  showSecurityAlert(alert) {
    // Create and show security alert overlay
    const alertElement = document.createElement('div');
    alertElement.className = 'trusthunt-security-alert';
    alertElement.innerHTML = `
      <div class="trusthunt-alert-content">
        <div class="trusthunt-alert-icon ${alert.severity}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div class="trusthunt-alert-text">
          <div class="trusthunt-alert-title">${alert.title}</div>
          <div class="trusthunt-alert-message">${alert.message}</div>
        </div>
        <button class="trusthunt-alert-close">×</button>
      </div>
    `;

    alertElement.querySelector('.trusthunt-alert-close').addEventListener('click', () => {
      alertElement.remove();
    });

    document.body.appendChild(alertElement);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.remove();
      }
    }, 10000);
  }

  highlightVulnerability(vulnerability) {
    // Highlight specific elements on the page that have vulnerabilities
    const selector = vulnerability.selector;
    if (selector) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        element.classList.add('trusthunt-vulnerability-highlight');
        
        // Add tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'trusthunt-vulnerability-tooltip';
        tooltip.textContent = vulnerability.description;
        element.appendChild(tooltip);
      });
    }
  }

  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `trusthunt-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 3000);
  }

  startRealTimeMonitoring() {
    // Monitor for DOM changes that might indicate security issues
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          this.checkForSecurityIssues(mutation.addedNodes);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Monitor for form submissions
    document.addEventListener('submit', (event) => {
      this.analyzeFormSubmission(event);
    });

    // Monitor for AJAX requests
    this.interceptAjaxRequests();
  }

  checkForSecurityIssues(nodes) {
    nodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Check for potential XSS vulnerabilities
        if (node.innerHTML && node.innerHTML.includes('<script>')) {
          this.reportSecurityIssue('potential_xss', node);
        }
        
        // Check for exposed sensitive data
        if (node.textContent && this.containsSensitiveData(node.textContent)) {
          this.reportSecurityIssue('sensitive_data_exposure', node);
        }
      }
    });
  }

  containsSensitiveData(text) {
    const sensitivePatterns = [
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email (basic)
    ];
    
    return sensitivePatterns.some(pattern => pattern.test(text));
  }

  analyzeFormSubmission(event) {
    const form = event.target;
    const inputs = form.querySelectorAll('input[type="password"], input[name*="password"]');
    
    if (inputs.length > 0 && !form.action.startsWith('https://')) {
      this.reportSecurityIssue('insecure_form_submission', form);
    }
  }

  interceptAjaxRequests() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch.apply(this, args);
      
      // Analyze request for security issues
      const url = args[0];
      if (typeof url === 'string' && !url.startsWith('https://')) {
        this.reportSecurityIssue('insecure_ajax_request', { url });
      }
      
      return response;
    };
  }

  reportSecurityIssue(type, element) {
    // Report security issue to background script
    chrome.runtime.sendMessage({
      type: 'SECURITY_ISSUE_DETECTED',
      issueType: type,
      orgId: this.orgInfo?.orgId,
      details: {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        element: element.tagName || 'unknown'
      }
    });
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new TrustHuntContent();
  });
} else {
  new TrustHuntContent();
}