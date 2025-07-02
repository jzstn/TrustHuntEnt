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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTab = tab;
  }

  async detectSalesforceOrg() {
    if (!this.currentTab) return;

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
      console.error('Error detecting org:', error);
      this.showNotSalesforceState();
    }
  }

  isSalesforceUrl(url) {
    if (!url) return false;
    
    const salesforcePatterns = [
      /https:\/\/.*\.salesforce\.com/,
      /https:\/\/.*\.force\.com/,
      /https:\/\/.*\.my\.salesforce\.com/,
      /https:\/\/.*\.lightning\.force\.com/
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
      } else {
        // Default values for new orgs
        this.orgData.securityData = null;
        this.orgData.lastScan = null;
        this.orgData.riskScore = 0;
        this.orgData.vulnerabilityCount = 0;
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
    const states = ['loadingState', 'notSalesforceState', 'orgDetectedState', 'scanningState'];
    states.forEach(state => {
      document.getElementById(state).classList.add('hidden');
    });
  }

  updateConnectionStatus(status, text) {
    const statusElement = document.getElementById('connectionStatus');
    const dot = statusElement.querySelector('.status-dot');
    const span = statusElement.querySelector('span');
    
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
    document.getElementById('orgName').textContent = this.orgData.orgName;
    document.getElementById('orgUrl').textContent = this.orgData.instanceUrl;
    
    const orgTypeElement = document.getElementById('orgType');
    orgTypeElement.textContent = this.orgData.orgType;
    orgTypeElement.className = `org-type ${this.orgData.orgType}`;

    // Update security status
    document.getElementById('riskScore').textContent = this.orgData.riskScore || '--';
    document.getElementById('vulnerabilityCount').textContent = this.orgData.vulnerabilityCount || '--';
    
    const lastScanElement = document.getElementById('lastScan');
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
  }

  updateInsights() {
    const insightsList = document.getElementById('insightsList');
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

  setupEventListeners() {
    // Open web app button
    document.getElementById('openWebApp').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    });

    // Start scan button
    document.getElementById('startScanButton').addEventListener('click', () => {
      this.startSecurityScan();
    });

    // View reports button
    document.getElementById('viewReportsButton').addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://localhost:5173' });
    });

    // Settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Help button
    document.getElementById('helpButton').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://trusthunt.com/help' });
    });
  }

  async startSecurityScan() {
    if (this.scanInProgress || !this.orgData) return;

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
      console.error('Security scan failed:', error);
      this.showOrgDetectedState();
    } finally {
      this.scanInProgress = false;
    }
  }

  async simulateSecurityScan() {
    const progressElement = document.getElementById('progressFill');
    const progressText = document.getElementById('scanProgress');
    const itemsScanned = document.getElementById('itemsScanned');
    const issuesFound = document.getElementById('issuesFound');

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
  }

  async updateSecurityData() {
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