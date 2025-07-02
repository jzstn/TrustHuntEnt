class TrustHuntPopup {
  constructor() {
    this.currentTab = null;
    this.orgData = null;
    this.scanInProgress = false;
    this.errorMessages = [];
    this.init();
  }

  async init() {
    try {
      await this.getCurrentTab();
      await this.detectSalesforceOrg();
      this.setupEventListeners();
      this.startPeriodicUpdates();
    } catch (error) {
      this.logError('Initialization error', error);
      this.showErrorState(error.message);
    }
  }

  logError(context, error) {
    console.error(`[TrustHunt Error] ${context}:`, error);
    this.errorMessages.push({
      context,
      message: error.message || String(error),
      timestamp: new Date()
    });
    this.updateErrorDisplay();
  }

  updateErrorDisplay() {
    const errorContainer = document.getElementById('errorContainer');
    if (!errorContainer) {
      // Create error container if it doesn't exist
      const container = document.createElement('div');
      container.id = 'errorContainer';
      container.className = 'bg-red-50 border border-red-200 rounded-lg p-4 mt-4 hidden';
      container.innerHTML = `
        <h4 class="text-sm font-medium text-red-800 mb-2">Diagnostic Information</h4>
        <div id="errorList" class="text-xs text-red-700 max-h-32 overflow-y-auto"></div>
        <button id="clearErrors" class="text-xs text-red-600 mt-2 hover:text-red-800">Clear Errors</button>
      `;
      
      // Add to main content
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.appendChild(container);
        
        // Add event listener for clear button
        document.getElementById('clearErrors').addEventListener('click', () => {
          this.errorMessages = [];
          this.updateErrorDisplay();
        });
      }
    }
    
    // Update error list
    const errorList = document.getElementById('errorList');
    if (errorList && this.errorMessages.length > 0) {
      errorContainer.classList.remove('hidden');
      errorList.innerHTML = this.errorMessages.map(err => 
        `<div class="mb-1 pb-1 border-b border-red-100">
          <span class="font-medium">${err.context}:</span> ${err.message}
          <div class="text-red-500 text-xs">${err.timestamp.toLocaleTimeString()}</div>
        </div>`
      ).join('');
    } else if (errorContainer) {
      errorContainer.classList.add('hidden');
    }
  }

  showErrorState(message) {
    this.hideAllStates();
    
    // Check if error state container exists, if not create it
    let errorState = document.getElementById('errorState');
    if (!errorState) {
      errorState = document.createElement('div');
      errorState.id = 'errorState';
      errorState.className = 'error-state';
      errorState.innerHTML = `
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Occurred</h3>
        <p id="errorMessage" class="text-gray-600 mb-4"></p>
        <button id="retryButton" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Retry
        </button>
      `;
      
      document.getElementById('mainContent').appendChild(errorState);
      
      // Add event listener for retry button
      document.getElementById('retryButton').addEventListener('click', () => {
        this.init();
      });
    }
    
    // Update error message
    document.getElementById('errorMessage').textContent = message || 'An unexpected error occurred. Please try again.';
    
    // Show error state
    errorState.classList.remove('hidden');
    
    // Update connection status
    this.updateConnectionStatus('error', 'Error');
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
    } catch (error) {
      this.logError('Failed to get current tab', error);
      throw error;
    }
  }

  async detectSalesforceOrg() {
    if (!this.currentTab) {
      this.logError('No current tab available', new Error('Tab information not available'));
      return;
    }

    const url = this.currentTab.url;
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
      this.logError('Error detecting org', error);
      this.showErrorState(`Failed to detect Salesforce org: ${error.message}`);
    }
  }

  isSalesforceUrl(url) {
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
      this.logError('Error extracting org info', error);
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
    if (hostname.includes('--dev') || hostname.includes('developer') || hostname.includes('develop')) {
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
      } else {
        // Default values for new orgs
        this.orgData.securityData = null;
        this.orgData.lastScan = null;
        this.orgData.riskScore = 0;
        this.orgData.vulnerabilityCount = 0;
      }
    } catch (error) {
      this.logError('Error loading security data', error);
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
    if (!statusElement) {
      console.error('Connection status element not found');
      return;
    }
    
    const dot = statusElement.querySelector('.status-dot');
    const span = statusElement.querySelector('span');
    
    if (!dot || !span) {
      console.error('Status dot or span not found');
      return;
    }
    
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
    if (!this.orgData) {
      this.logError('No org data available', new Error('Org data is null or undefined'));
      return;
    }

    try {
      // Update org details
      const orgNameElement = document.getElementById('orgName');
      const orgUrlElement = document.getElementById('orgUrl');
      const orgTypeElement = document.getElementById('orgType');
      
      if (!orgNameElement || !orgUrlElement || !orgTypeElement) {
        this.logError('Org info elements not found', new Error('Required DOM elements missing'));
        return;
      }
      
      orgNameElement.textContent = this.orgData.orgName;
      orgUrlElement.textContent = this.orgData.instanceUrl;
      
      orgTypeElement.textContent = this.orgData.orgType;
      orgTypeElement.className = `org-type ${this.orgData.orgType}`;

      // Update security status
      const riskScoreElement = document.getElementById('riskScore');
      const vulnerabilityCountElement = document.getElementById('vulnerabilityCount');
      const lastScanElement = document.getElementById('lastScan');
      
      if (!riskScoreElement || !vulnerabilityCountElement || !lastScanElement) {
        this.logError('Security status elements not found', new Error('Required DOM elements missing'));
        return;
      }
      
      riskScoreElement.textContent = this.orgData.riskScore || '--';
      vulnerabilityCountElement.textContent = this.orgData.vulnerabilityCount || '--';
      
      if (this.orgData.lastScan) {
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
      } else {
        lastScanElement.textContent = 'Never';
      }

      // Update insights
      this.updateInsights();
    } catch (error) {
      this.logError('Error populating org info', error);
    }
  }

  updateInsights() {
    try {
      const insightsList = document.getElementById('insightsList');
      if (!insightsList) {
        this.logError('Insights list element not found', new Error('Required DOM element missing'));
        return;
      }
      
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
    } catch (error) {
      this.logError('Error updating insights', error);
    }
  }

  setupEventListeners() {
    try {
      // Open web app button
      const openWebAppButton = document.getElementById('openWebApp');
      if (openWebAppButton) {
        openWebAppButton.addEventListener('click', () => {
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
          chrome.tabs.create({ url: 'http://localhost:5173' });
        });
      }

      // Settings button
      const settingsButton = document.getElementById('settingsButton');
      if (settingsButton) {
        settingsButton.addEventListener('click', () => {
          chrome.runtime.openOptionsPage();
        });
      }

      // Help button
      const helpButton = document.getElementById('helpButton');
      if (helpButton) {
        helpButton.addEventListener('click', () => {
          chrome.tabs.create({ url: 'https://trusthunt.com/help' });
        });
      }
    } catch (error) {
      this.logError('Error setting up event listeners', error);
    }
  }

  async startSecurityScan() {
    if (this.scanInProgress || !this.orgData) {
      this.logError('Cannot start scan', new Error(this.scanInProgress ? 'Scan already in progress' : 'No org data available'));
      return;
    }

    this.scanInProgress = true;
    this.showScanningState();

    try {
      // Simulate security scan progress
      await this.simulateSecurityScan();
      
      // Update security data
      await this.updateSecurityData();
      
      // Show results
      this.showOrgDetectedState();
      
    } catch (error) {
      this.logError('Security scan failed', error);
      this.showErrorState(`Security scan failed: ${error.message}`);
    } finally {
      this.scanInProgress = false;
    }
  }

  async simulateSecurityScan() {
    try {
      const progressElement = document.getElementById('progressFill');
      const progressText = document.getElementById('scanProgress');
      const itemsScanned = document.getElementById('itemsScanned');
      const issuesFound = document.getElementById('issuesFound');

      if (!progressElement || !progressText || !itemsScanned || !issuesFound) {
        throw new Error('Scan progress elements not found in DOM');
      }

      const phases = [
        { text: 'Initializing scan...', duration: 1000 },
        { text: 'Analyzing Apex classes...', duration: 2000 },
        { text: 'Checking permissions...', duration: 1500 },
        { text: 'Scanning for vulnerabilities...', duration: 2500 },
        { text: 'Generating report...', duration: 1000 }
      ];

      let totalProgress = 0;
      let scannedItems = 0;
      let foundIssues = 0;

      for (let i = 0; i < phases.length; i++) {
        const phase = phases[i];
        progressText.textContent = phase.text;
        
        const phaseProgress = (i + 1) / phases.length * 100;
        
        // Animate progress
        const startProgress = totalProgress;
        const endProgress = phaseProgress;
        const startTime = Date.now();
        
        while (Date.now() - startTime < phase.duration) {
          const elapsed = Date.now() - startTime;
          const progress = startProgress + (endProgress - startProgress) * (elapsed / phase.duration);
          
          progressElement.style.width = `${Math.min(progress, 100)}%`;
          
          // Update counters
          scannedItems = Math.floor(progress * 2.5);
          foundIssues = Math.floor(Math.random() * (scannedItems / 10));
          
          itemsScanned.textContent = scannedItems;
          issuesFound.textContent = foundIssues;
          
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        totalProgress = phaseProgress;
      }

      progressElement.style.width = '100%';
      progressText.textContent = 'Scan completed!';
    } catch (error) {
      this.logError('Error during scan simulation', error);
      throw error;
    }
  }

  async updateSecurityData() {
    try {
      // Generate mock security data
      const vulnerabilityCount = Math.floor(Math.random() * 15);
      const riskScore = Math.max(20, 100 - (vulnerabilityCount * 5) - Math.floor(Math.random() * 20));

      const securityData = {
        lastScan: new Date().toISOString(),
        riskScore: riskScore,
        vulnerabilityCount: vulnerabilityCount,
        scanResults: {
          apexClasses: Math.floor(Math.random() * 50) + 10,
          permissions: Math.floor(Math.random() * 20) + 5,
          users: Math.floor(Math.random() * 100) + 20
        }
      };

      // Update org data
      this.orgData.securityData = securityData;
      this.orgData.lastScan = new Date(securityData.lastScan);
      this.orgData.riskScore = securityData.riskScore;
      this.orgData.vulnerabilityCount = securityData.vulnerabilityCount;

      // Save to storage
      const storageKey = `trusthunt_${this.orgData.orgId}`;
      await chrome.storage.local.set({
        [storageKey]: securityData
      });

      // Notify background script
      chrome.runtime.sendMessage({
        type: 'SCAN_COMPLETED',
        orgId: this.orgData.orgId,
        data: securityData
      });
    } catch (error) {
      this.logError('Error updating security data', error);
      throw error;
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