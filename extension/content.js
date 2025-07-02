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
    
    // Don't inject overlay - keep UI in the extension popup only
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
        // Don't show alerts on page - keep UI in extension popup
        sendResponse({ success: true });
        break;

      case 'HIGHLIGHT_VULNERABILITY':
        // Don't highlight on page - keep UI in extension popup
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  handleSecurityDataUpdate(orgId, data) {
    if (this.orgInfo && this.orgInfo.orgId === orgId) {
      // Just update internal data, don't show UI on page
      console.log(`Security data updated for org ${orgId}`);
    }
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