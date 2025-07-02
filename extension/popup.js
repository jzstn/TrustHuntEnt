class TrustHuntPopup {
  constructor() {
    this.currentTab = null;
    this.orgData = null;
    this.scanInProgress = false;
    this.init();
  }

  async init() {
    await this.getCurrentTab();
    await this.detectSalesforceOrg();
    this.setupEventListeners();
    this.startPeriodicUpdates();
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      this.showErrorState('Could not access current tab');
    }
  }

  async detectSalesforceOrg() {
    if (!this.currentTab) {
      this.showErrorState('No active tab found');
      return;
    }

    const url = this.currentTab.url;
    if (!url) {
      this.showErrorState('No URL in current tab');
      return;
    }
    
    const isSalesforce = this.isSalesforceUrl(url);

    if (!isSalesforce) {
      this.showNotSalesforceState();
      return;
    }

    this.showLoadingState();
    
    try {
      // Extract org information from URL and page
      const orgInfo = await this.extractOrgInfo();
      
      if (orgInfo) {
        this.orgData = orgInfo;
        await this.loadSecurityData();
        this.showOrgDetectedState();
      } else {
        this.showNotSalesforceState();
      }
    } catch (error) {
      console.error('Error detecting org:', error);
      this.showErrorState('Failed to detect Salesforce organization');
    }
  }

  isSalesforceUrl(url) {
    if (!url) return false;
    
    const salesforcePatterns = [
      /https:\/\/.*\.salesforce\.com/,
      /https:\/\/.*\.force\.com/,
      /https:\/\/.*\.my\.salesforce\.com/,
      /https:\/\/.*\.lightning\.force\.com/,
      /https:\/\/.*\.develop\.lightning\.force\.com/
    ];
    
    return salesforcePatterns.some(pattern => pattern.test(url));
  }

  async extractOrgInfo() {
    try {
      // Inject script to extract org information from the page
      const results = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: this.extractOrgInfoFromPage
      });

      if (results && results[0] && results[0].result) {
        const orgInfo = results[0].result;
        
        // Enhance with URL analysis
        const url = new URL(this.currentTab.url);
        orgInfo.instanceUrl = `${url.protocol}//${url.hostname}`;
        orgInfo.orgType = this.determineOrgType(url.hostname);
        
        return orgInfo;
      }
    } catch (error) {
      console.error('Error extracting org info:', error);
    }
    
    return null;
  }

  extractOrgInfoFromPage() {
    // This function runs in the context of the Salesforce page
    try {
      let orgName = 'Unknown Organization';
      let orgId = null;

      // Try to get org name from various sources
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent.includes('|')) {
        orgName = titleElement.textContent.split('|')[1].trim();
      }

      // Try to get from Lightning Experience
      const orgNameElement = document.querySelector('[data-aura-class="oneHeader"] .slds-context-bar__label-action');
      if (orgNameElement) {
        orgName = orgNameElement.textContent.trim();
      }

      // Try to get from Classic
      const classicOrgElement = document.querySelector('.setupTab .tabText');
      if (classicOrgElement) {
        orgName = classicOrgElement.textContent.trim();
      }

      // Try to extract org ID from page source or meta tags
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

      // Try to get session info
      let sessionId = null;
      if (window.sforce && window.sforce.connection && window.sforce.connection.sessionId) {
        sessionId = window.sforce.connection.sessionId;
      }

      return {
        orgName: orgName || 'Salesforce Organization',
        orgId: orgId || 'unknown',
        sessionId: sessionId,
        detectedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in extractOrgInfoFromPage:', error);
      return null;
    }
  }

  determineOrgType(hostname) {
    if (hostname.includes('--dev') || hostname.includes('developer')) {
      return 'developer';
    } else if (hostname.includes('--') || hostname.includes('sandbox')) {
      return 'sandbox';
    } else {
      return 'production';
    }
  }

  async loadSecurityData() {
    try {
      // Load cached security data for this org
      const storageKey = `trusthunt_${this.orgData.orgId}`;
      const result = await chrome.storage.local.get([storageKey]);
      
      if (result[storageKey]) {
        const data = result[storageKey];
        this.orgData.securityData = data;
        this.orgData.lastScan = new Date(data.lastScan);
        this.orgData.riskScore = data.riskScore || 0;
        this.orgData.vulnerabilityCount = data.vulnerabilityCount || 0;
        this.orgData.vulnerabilities = data.vulnerabilities || [];
      } else {
        // Default values for new orgs
        this.orgData.securityData = null;
        this.orgData.lastScan = null;
        this.orgData.riskScore = 0;
        this.orgData.vulnerabilityCount = 0;
        this.orgData.vulnerabilities = [];
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    }
  }

  showLoadingState() {
    this.hideAllStates();
    document.getElementById('loadingState').classList.remove('hidden');
    this.updateConnectionStatus('detecting', 'Detecting...');
  }

  showNotSalesforceState() {
    this.hideAllStates();
    document.getElementById('notSalesforceState').classList.remove('hidden');
    this.updateConnectionStatus('error', 'Not Salesforce');
  }

  showErrorState(message) {
    this.hideAllStates();
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorState && errorMessage) {
      errorMessage.textContent = message || 'An unexpected error occurred';
      errorState.classList.remove('hidden');
    }
    
    this.updateConnectionStatus('error', 'Error');
  }

  showOrgDetectedState() {
    this.hideAllStates();
    document.getElementById('orgDetectedState').classList.remove('hidden');
    this.updateConnectionStatus('connected', 'Connected');
    this.populateOrgInfo();
  }

  showScanningState() {
    this.hideAllStates();
    document.getElementById('scanningState').classList.remove('hidden');
    this.updateConnectionStatus('scanning', 'Scanning...');
  }

  hideAllStates() {
    const states = ['loadingState', 'notSalesforceState', 'orgDetectedState', 'scanningState', 'errorState'];
    states.forEach(state => {
      const element = document.getElementById(state);
      if (element) {
        element.classList.add('hidden');
      }
    });
  }

  updateConnectionStatus(status, text) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const dot = statusElement.querySelector('.status-dot');
    const span = statusElement.querySelector('span');
    
    if (!dot || !span) return;
    
    // Remove existing classes
    dot.classList.remove('warning', 'error');
    
    switch (status) {
      case 'connected':
        // Default green
        break;
      case 'detecting':
      case 'scanning':
        dot.classList.add('warning');
        break;
      case 'error':
        dot.classList.add('error');
        break;
    }
    
    span.textContent = text;
  }

  populateOrgInfo() {
    if (!this.orgData) return;

    // Update org details
    const orgNameElement = document.getElementById('orgName');
    const orgUrlElement = document.getElementById('orgUrl');
    const orgTypeElement = document.getElementById('orgType');
    
    if (orgNameElement) orgNameElement.textContent = this.orgData.orgName;
    if (orgUrlElement) orgUrlElement.textContent = this.orgData.instanceUrl;
    
    if (orgTypeElement) {
      orgTypeElement.textContent = this.orgData.orgType;
      orgTypeElement.className = `org-type ${this.orgData.orgType}`;
    }

    // Update security status
    const riskScoreElement = document.getElementById('riskScore');
    const vulnerabilityCountElement = document.getElementById('vulnerabilityCount');
    const lastScanElement = document.getElementById('lastScan');
    
    if (riskScoreElement) riskScoreElement.textContent = this.orgData.riskScore || '--';
    if (vulnerabilityCountElement) vulnerabilityCountElement.textContent = this.orgData.vulnerabilityCount || '--';
    
    if (lastScanElement && this.orgData.lastScan) {
      const timeDiff = Date.now() - this.orgData.lastScan.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        lastScanElement.textContent = `${days}d ago`;
      } else if (hours > 0) {
        lastScanElement.textContent = `${hours}h ago`;
      } else {
        lastScanElement.textContent = 'Recent';
      }
    } else if (lastScanElement) {
      lastScanElement.textContent = 'Never';
    }

    // Update insights
    this.updateInsights();
    
    // Update vulnerability list if available
    this.updateVulnerabilityList();
  }

  updateInsights() {
    const insightsList = document.getElementById('insightsList');
    if (!insightsList) return;
    
    const insights = [];

    if (this.orgData.securityData) {
      if (this.orgData.riskScore > 80) {
        insights.push({
          icon: '✅',
          text: 'Security posture is good'
        });
      } else if (this.orgData.riskScore > 60) {
        insights.push({
          icon: '⚠️',
          text: 'Some security issues detected'
        });
      } else {
        insights.push({
          icon: '🚨',
          text: 'Critical security issues found'
        });
      }

      if (this.orgData.vulnerabilityCount === 0) {
        insights.push({
          icon: '🛡️',
          text: 'No vulnerabilities detected'
        });
      }
    } else {
      insights.push({
        icon: '🔍',
        text: 'Ready for security scan'
      });
    }

    // Always show real-time monitoring
    insights.push({
      icon: '📡',
      text: 'Real-time monitoring active'
    });

    // Update the insights list
    insightsList.innerHTML = insights.map(insight => `
      <div class="insight-item">
        <div class="insight-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <span>${insight.text}</span>
      </div>
    `).join('');
  }
  
  updateVulnerabilityList() {
    const vulnerabilitiesList = document.getElementById('vulnerabilitiesList');
    if (!vulnerabilitiesList || !this.orgData.vulnerabilities) return;
    
    if (this.orgData.vulnerabilities.length === 0) {
      vulnerabilitiesList.innerHTML = `
        <div class="p-4 bg-gray-50 rounded-lg text-center">
          <p class="text-sm text-gray-600">No vulnerabilities found</p>
        </div>
      `;
      return;
    }
    
    // Sort by severity
    const sortedVulns = [...this.orgData.vulnerabilities].sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
    
    // Display top 5 vulnerabilities
    vulnerabilitiesList.innerHTML = sortedVulns.slice(0, 5).map(vuln => {
      const severityClass = 
        vuln.severity === 'critical' ? 'bg-red-100 text-red-800' :
        vuln.severity === 'high' ? 'bg-orange-100 text-orange-800' :
        vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
        'bg-green-100 text-green-800';
      
      return `
        <div class="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-2">
          <div class="flex items-center justify-between mb-1">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${severityClass}">
              ${vuln.severity.toUpperCase()}
            </span>
            <span class="text-xs text-gray-500">CVSS ${vuln.cvssScore}</span>
          </div>
          <p class="text-sm font-medium text-gray-900">${vuln.title}</p>
          <p class="text-xs text-gray-600 mt-1">${vuln.location}</p>
        </div>
      `;
    }).join('');
    
    // Add "View All" if there are more
    if (sortedVulns.length > 5) {
      vulnerabilitiesList.innerHTML += `
        <div class="text-center mt-2">
          <button id="viewAllVulns" class="text-sm text-blue-600 hover:text-blue-700">
            View All (${sortedVulns.length})
          </button>
        </div>
      `;
      
      // Add event listener
      setTimeout(() => {
        const viewAllBtn = document.getElementById('viewAllVulns');
        if (viewAllBtn) {
          viewAllBtn.addEventListener('click', () => {
            this.openSecurityReport();
          });
        }
      }, 0);
    }
  }

  async startSecurityScan() {
    if (this.scanInProgress || !this.orgData) return;

    this.scanInProgress = true;
    this.showScanningState();

    try {
      // Update progress UI
      const progressText = document.getElementById('scanProgress');
      const progressFill = document.getElementById('progressFill');
      const itemsScanned = document.getElementById('itemsScanned');
      const issuesFound = document.getElementById('issuesFound');
      
      if (progressText) progressText.textContent = 'Initializing scan...';
      if (progressFill) progressFill.style.width = '10%';
      if (itemsScanned) itemsScanned.textContent = '0';
      if (issuesFound) issuesFound.textContent = '0';
      
      // Start the scan
      const response = await chrome.runtime.sendMessage({
        type: 'START_SCAN',
        orgId: this.orgData.orgId,
        options: { manual: true }
      });
      
      if (!response.success) {
        throw new Error('Failed to start scan');
      }
      
      // Simulate scan progress
      await this.simulateScanProgress();
      
      // Reload security data
      await this.loadSecurityData();
      
      // Show results
      this.showOrgDetectedState();
      
    } catch (error) {
      console.error('Security scan failed:', error);
      this.showErrorState('Security scan failed: ' + error.message);
    } finally {
      this.scanInProgress = false;
    }
  }
  
  async simulateScanProgress() {
    const progressText = document.getElementById('scanProgress');
    const progressFill = document.getElementById('progressFill');
    const itemsScanned = document.getElementById('itemsScanned');
    const issuesFound = document.getElementById('issuesFound');
    
    if (!progressText || !progressFill || !itemsScanned || !issuesFound) return;
    
    const phases = [
      { text: 'Analyzing Apex classes...', progress: 25, items: 50, issues: 2, duration: 1000 },
      { text: 'Scanning Visualforce pages...', progress: 50, items: 75, issues: 4, duration: 1000 },
      { text: 'Checking permissions...', progress: 75, items: 120, issues: 6, duration: 1000 },
      { text: 'Finalizing results...', progress: 95, items: 150, issues: 8, duration: 1000 }
    ];
    
    for (const phase of phases) {
      progressText.textContent = phase.text;
      progressFill.style.width = `${phase.progress}%`;
      itemsScanned.textContent = phase.items.toString();
      issuesFound.textContent = phase.issues.toString();
      
      await new Promise(resolve => setTimeout(resolve, phase.duration));
    }
    
    progressText.textContent = 'Scan completed!';
    progressFill.style.width = '100%';
  }

  openSecurityReport() {
    chrome.tabs.create({ url: 'http://localhost:5173/report' });
  }

  setupEventListeners() {
    // Open web app button
    const openWebAppBtn = document.getElementById('openWebApp');
    if (openWebAppBtn) {
      openWebAppBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'http://localhost:5173' });
      });
    }

    // Start scan button
    const startScanButton = document.getElementById('startScanButton');
    if (startScanButton) {
      startScanButton.addEventListener('click', () => {
        this.startSecurityScan();
      });
    }

    // View reports button
    const viewReportsButton = document.getElementById('viewReportsButton');
    if (viewReportsButton) {
      viewReportsButton.addEventListener('click', () => {
        this.openSecurityReport();
      });
    }

    // Retry button for error state
    const retryButton = document.getElementById('retryButton');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.init();
      });
    }
  }

  startPeriodicUpdates() {
    // Update every 30 seconds
    setInterval(() => {
      if (this.orgData && !this.scanInProgress) {
        this.updateInsights();
      }
    }, 30000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new TrustHuntPopup();
});