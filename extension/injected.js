/**
 * TrustHunt Enterprise - Injected Script
 * This script runs in the context of the Salesforce page
 * and can access Salesforce-specific objects and APIs
 */

(function() {
  // Avoid double injection
  if (window.trustHuntInjectedScript) return;
  window.trustHuntInjectedScript = true;

  console.log('TrustHunt Enterprise injected script loaded');

  class TrustHuntInjected {
    constructor() {
      this.sessionInfo = null;
      this.orgInfo = null;
      this.init();
    }

    init() {
      this.extractSessionInfo();
      this.extractOrgInfo();
      this.setupMessageListener();
      this.monitorSalesforceAPI();
    }

    extractSessionInfo() {
      try {
        // Try to get session ID from various sources
        if (window.sforce && window.sforce.connection && window.sforce.connection.sessionId) {
          this.sessionInfo = {
            sessionId: window.sforce.connection.sessionId,
            source: 'sforce.connection'
          };
          return;
        }

        // Try to get from Lightning
        if (window.$A && window.$A.get) {
          try {
            const authInfo = window.$A.get('$SObjectType.CurrentUser');
            if (authInfo) {
              this.sessionInfo = {
                sessionId: authInfo.session,
                source: 'lightning'
              };
              return;
            }
          } catch (e) {
            // Lightning API not available
          }
        }

        // Try to get from cookies
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split('=');
          if (name === 'sid') {
            this.sessionInfo = {
              sessionId: value,
              source: 'cookie'
            };
            return;
          }
        }

        // Try to extract from page source
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.textContent && script.textContent.includes('sid=')) {
            const match = script.textContent.match(/sid=([^&"']+)/);
            if (match) {
              this.sessionInfo = {
                sessionId: match[1],
                source: 'script'
              };
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error extracting session info:', error);
      }
    }

    extractOrgInfo() {
      try {
        let orgId = null;
        let orgName = null;

        // Try to get org ID from various sources
        if (window.UserContext && window.UserContext.organizationId) {
          orgId = window.UserContext.organizationId;
        }

        // Try to extract from page source
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          if (script.textContent) {
            const orgIdMatch = script.textContent.match(/organizationId['"]\s*:\s*['"]([^'"]+)['"]/);
            if (orgIdMatch) {
              orgId = orgIdMatch[1];
            }

            const orgNameMatch = script.textContent.match(/organizationName['"]\s*:\s*['"]([^'"]+)['"]/);
            if (orgNameMatch) {
              orgName = orgNameMatch[1];
            }
          }
        }

        // Try to get org name from page title
        if (!orgName) {
          const titleElement = document.querySelector('title');
          if (titleElement && titleElement.textContent.includes('|')) {
            orgName = titleElement.textContent.split('|')[1].trim();
          }
        }

        // Try Lightning Experience selectors
        if (!orgName) {
          const lightningOrgElement = document.querySelector('[data-aura-class="oneHeader"] .slds-context-bar__label-action');
          if (lightningOrgElement) {
            orgName = lightningOrgElement.textContent.trim();
          }
        }

        // Try Classic selectors
        if (!orgName) {
          const classicOrgElement = document.querySelector('.setupTab .tabText');
          if (classicOrgElement) {
            orgName = classicOrgElement.textContent.trim();
          }
        }

        this.orgInfo = {
          orgId: orgId,
          orgName: orgName || 'Salesforce Organization',
          instanceUrl: window.location.origin,
          pageType: this.detectPageType()
        };
      } catch (error) {
        console.error('Error extracting org info:', error);
      }
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
      window.addEventListener('message', (event) => {
        // Only accept messages from our extension
        if (event.source !== window || !event.data.trustHunt) return;

        const message = event.data;
        
        switch (message.action) {
          case 'GET_SESSION_INFO':
            this.sendResponse(message.id, { sessionInfo: this.sessionInfo });
            break;
            
          case 'GET_ORG_INFO':
            this.sendResponse(message.id, { orgInfo: this.orgInfo });
            break;
            
          case 'SCAN_ELEMENT':
            this.scanElement(message.selector);
            this.sendResponse(message.id, { success: true });
            break;
            
          case 'EXTRACT_METADATA':
            this.extractMetadata(message.type);
            this.sendResponse(message.id, { success: true });
            break;
        }
      });
    }

    sendResponse(messageId, data) {
      window.postMessage({
        trustHunt: true,
        responseId: messageId,
        data: data
      }, '*');
    }

    monitorSalesforceAPI() {
      // Monitor Salesforce API calls
      if (window.fetch) {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const url = args[0];
          const options = args[1] || {};
          
          // Only monitor Salesforce API calls
          if (typeof url === 'string' && url.includes('/services/data/')) {
            this.logAPICall('fetch', url, options);
          }
          
          return originalFetch.apply(window, args);
        };
      }

      // Monitor XMLHttpRequest
      if (window.XMLHttpRequest) {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this._trustHuntUrl = url;
          this._trustHuntMethod = method;
          return originalOpen.apply(this, [method, url, ...rest]);
        };
        
        XMLHttpRequest.prototype.send = function(body) {
          if (this._trustHuntUrl && this._trustHuntUrl.includes('/services/data/')) {
            this.addEventListener('load', () => {
              this.logAPICall('xhr', this._trustHuntUrl, {
                method: this._trustHuntMethod,
                body: body
              });
            });
          }
          return originalSend.apply(this, [body]);
        };
      }
    }

    logAPICall(type, url, options) {
      // Log API call for security analysis
      console.debug(`TrustHunt detected ${type} API call:`, url);
      
      // Check for security issues
      this.analyzeAPICall(url, options);
    }

    analyzeAPICall(url, options) {
      // Simple security checks for API calls
      const securityIssues = [];
      
      // Check for insecure endpoints
      if (url.startsWith('http://')) {
        securityIssues.push({
          type: 'insecure_request',
          severity: 'high',
          description: 'Insecure HTTP request detected'
        });
      }
      
      // Check for sensitive operations
      if (url.includes('/sobjects/User') && (options.method === 'POST' || options.method === 'PATCH')) {
        securityIssues.push({
          type: 'sensitive_operation',
          severity: 'medium',
          description: 'User record modification detected'
        });
      }
      
      // Report issues
      if (securityIssues.length > 0) {
        this.reportSecurityIssues(securityIssues);
      }
    }

    reportSecurityIssues(issues) {
      // Send security issues to content script
      window.postMessage({
        trustHunt: true,
        action: 'SECURITY_ISSUES',
        issues: issues,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }, '*');
    }

    scanElement(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return;
        
        elements.forEach(element => {
          // Add visual indicator
          element.style.outline = '2px solid #ef4444';
          element.style.outlineOffset = '2px';
          
          // Add data attribute for tracking
          element.setAttribute('data-trusthunt-scanned', 'true');
          
          // Analyze element for security issues
          this.analyzeElement(element);
        });
      } catch (error) {
        console.error('Error scanning element:', error);
      }
    }

    analyzeElement(element) {
      // Simple security checks for DOM elements
      const securityIssues = [];
      
      // Check for inline scripts
      const inlineScripts = element.querySelectorAll('script:not([src])');
      if (inlineScripts.length > 0) {
        securityIssues.push({
          type: 'inline_script',
          severity: 'medium',
          description: 'Inline script detected'
        });
      }
      
      // Check for event handlers with javascript: URLs
      const eventAttributes = ['onclick', 'onmouseover', 'onload', 'onerror'];
      for (const attr of eventAttributes) {
        if (element.hasAttribute(attr) && element.getAttribute(attr).includes('javascript:')) {
          securityIssues.push({
            type: 'javascript_url',
            severity: 'high',
            description: `JavaScript URL in ${attr} attribute`
          });
        }
      }
      
      // Report issues
      if (securityIssues.length > 0) {
        this.reportSecurityIssues(securityIssues);
      }
    }

    extractMetadata(type) {
      try {
        let metadata = null;
        
        switch (type) {
          case 'user':
            metadata = this.extractUserMetadata();
            break;
            
          case 'org':
            metadata = this.extractOrgMetadata();
            break;
            
          case 'permissions':
            metadata = this.extractPermissionsMetadata();
            break;
        }
        
        if (metadata) {
          window.postMessage({
            trustHunt: true,
            action: 'METADATA_EXTRACTED',
            type: type,
            data: metadata,
            timestamp: new Date().toISOString()
          }, '*');
        }
      } catch (error) {
        console.error(`Error extracting ${type} metadata:`, error);
      }
    }

    extractUserMetadata() {
      // Extract current user information
      let userInfo = {};
      
      // Try to get from UserContext
      if (window.UserContext) {
        userInfo = {
          userId: window.UserContext.userId,
          userName: window.UserContext.userName,
          userType: window.UserContext.userType,
          profileId: window.UserContext.profileId,
          roleId: window.UserContext.roleId
        };
      }
      
      return userInfo;
    }

    extractOrgMetadata() {
      // Extract organization metadata
      let orgInfo = {};
      
      // Try to get from UserContext
      if (window.UserContext) {
        orgInfo = {
          organizationId: window.UserContext.organizationId,
          organizationName: window.UserContext.organizationName,
          orgType: window.UserContext.orgType
        };
      }
      
      return orgInfo;
    }

    extractPermissionsMetadata() {
      // Extract permissions metadata
      let permissionsInfo = {};
      
      // Try to get from UserContext
      if (window.UserContext && window.UserContext.userPermissions) {
        permissionsInfo = {
          permissions: window.UserContext.userPermissions
        };
      }
      
      return permissionsInfo;
    }
  }

  // Initialize injected script
  new TrustHuntInjected();
})();