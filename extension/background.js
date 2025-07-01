class TrustHuntBackground {
  constructor() {
    this.connectedOrgs = new Map();
    this.scanQueue = [];
    this.isProcessing = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startPeriodicTasks();
    console.log('TrustHunt Enterprise background service initialized');
  }

  setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });

    // Handle messages from popup and content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Handle tab updates to detect Salesforce navigation
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });

    // Handle storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  handleInstallation(details) {
    if (details.reason === 'install') {
      // First time installation
      this.showWelcomeNotification();
      this.initializeDefaultSettings();
    } else if (details.reason === 'update') {
      // Extension update
      this.handleUpdate(details.previousVersion);
    }
  }

  async showWelcomeNotification() {
    try {
      await chrome.notifications.create('welcome', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'TrustHunt Enterprise Installed',
        message: 'Navigate to any Salesforce org to start security analysis!'
      });
    } catch (error) {
      console.log('Notifications not available:', error);
    }
  }

  async initializeDefaultSettings() {
    const defaultSettings = {
      autoScan: true,
      scanInterval: 24, // hours
      notifications: true,
      realTimeMonitoring: true,
      apiEndpoint: 'http://localhost:5173',
      lastInstalled: new Date().toISOString()
    };

    await chrome.storage.sync.set({ settings: defaultSettings });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_ORG_INFO':
          const orgInfo = await this.getOrgInfo(sender.tab);
          sendResponse({ success: true, data: orgInfo });
          break;

        case 'START_SCAN':
          const scanResult = await this.startSecurityScan(message.orgId, message.options);
          sendResponse({ success: true, data: scanResult });
          break;

        case 'SCAN_COMPLETED':
          await this.handleScanCompleted(message.orgId, message.data);
          sendResponse({ success: true });
          break;

        case 'GET_SECURITY_DATA':
          const securityData = await this.getSecurityData(message.orgId);
          sendResponse({ success: true, data: securityData });
          break;

        case 'UPDATE_BADGE':
          await this.updateBadge(message.tabId, message.count);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
      const isSalesforce = this.isSalesforceUrl(tab.url);
      
      if (isSalesforce) {
        // Inject content script if needed
        await this.ensureContentScriptInjected(tabId);
        
        // Update badge
        await this.updateBadgeForTab(tabId, tab.url);
        
        // Check for auto-scan
        await this.checkAutoScan(tabId, tab.url);
      } else {
        // Clear badge for non-Salesforce tabs
        await this.clearBadge(tabId);
      }
    }
  }

  async handleTabActivation(activeInfo) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url && this.isSalesforceUrl(tab.url)) {
      await this.updateBadgeForTab(activeInfo.tabId, tab.url);
    }
  }

  handleStorageChange(changes, namespace) {
    if (namespace === 'local') {
      // Handle security data updates
      Object.keys(changes).forEach(key => {
        if (key.startsWith('trusthunt_')) {
          const orgId = key.replace('trusthunt_', '');
          this.notifySecurityDataUpdate(orgId, changes[key].newValue);
        }
      });
    }
  }

  isSalesforceUrl(url) {
    const salesforcePatterns = [
      /https:\/\/.*\.salesforce\.com/,
      /https:\/\/.*\.force\.com/,
      /https:\/\/.*\.my\.salesforce\.com/,
      /https:\/\/.*\.lightning\.force\.com/
    ];
    
    return salesforcePatterns.some(pattern => pattern.test(url));
  }

  async ensureContentScriptInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      // Content script might already be injected
      console.log('Content script injection skipped:', error.message);
    }
  }

  async updateBadgeForTab(tabId, url) {
    try {
      const orgId = this.extractOrgIdFromUrl(url);
      if (orgId) {
        const securityData = await this.getSecurityData(orgId);
        const vulnerabilityCount = securityData?.vulnerabilityCount || 0;
        
        if (vulnerabilityCount > 0) {
          await chrome.action.setBadgeText({
            text: vulnerabilityCount.toString(),
            tabId: tabId
          });
          
          await chrome.action.setBadgeBackgroundColor({
            color: vulnerabilityCount > 5 ? '#ef4444' : '#f59e0b',
            tabId: tabId
          });
        } else {
          await chrome.action.setBadgeText({
            text: '✓',
            tabId: tabId
          });
          
          await chrome.action.setBadgeBackgroundColor({
            color: '#10b981',
            tabId: tabId
          });
        }
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  }

  async clearBadge(tabId) {
    try {
      await chrome.action.setBadgeText({
        text: '',
        tabId: tabId
      });
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  extractOrgIdFromUrl(url) {
    // Extract org identifier from URL
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // For my.salesforce.com URLs, extract the subdomain
      const match = hostname.match(/^([^.]+)\.(?:my\.)?salesforce\.com$/);
      if (match) {
        return match[1];
      }
      
      // For other patterns, use the full hostname as identifier
      return hostname.replace(/[^a-zA-Z0-9]/g, '_');
    } catch (error) {
      return null;
    }
  }

  async checkAutoScan(tabId, url) {
    try {
      const settings = await this.getSettings();
      if (!settings.autoScan) return;

      const orgId = this.extractOrgIdFromUrl(url);
      if (!orgId) return;

      const securityData = await this.getSecurityData(orgId);
      const lastScan = securityData?.lastScan ? new Date(securityData.lastScan) : null;
      
      if (!lastScan || this.shouldAutoScan(lastScan, settings.scanInterval)) {
        // Queue auto-scan
        this.queueScan(orgId, { auto: true, tabId });
      }
    } catch (error) {
      console.error('Error checking auto-scan:', error);
    }
  }

  shouldAutoScan(lastScan, intervalHours) {
    const now = new Date();
    const diffHours = (now.getTime() - lastScan.getTime()) / (1000 * 60 * 60);
    return diffHours >= intervalHours;
  }

  async getSettings() {
    const result = await chrome.storage.sync.get(['settings']);
    return result.settings || {};
  }

  async getSecurityData(orgId) {
    const storageKey = `trusthunt_${orgId}`;
    const result = await chrome.storage.local.get([storageKey]);
    return result[storageKey] || null;
  }

  async startSecurityScan(orgId, options = {}) {
    // Add to scan queue
    this.queueScan(orgId, options);
    
    // Process queue
    this.processScanQueue();
    
    return { queued: true, position: this.scanQueue.length };
  }

  queueScan(orgId, options) {
    // Check if already queued
    const existing = this.scanQueue.find(scan => scan.orgId === orgId);
    if (existing) return;

    this.scanQueue.push({
      orgId,
      options,
      queuedAt: new Date(),
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  }

  async processScanQueue() {
    if (this.isProcessing || this.scanQueue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.scanQueue.length > 0) {
        const scan = this.scanQueue.shift();
        await this.executeScan(scan);
        
        // Rate limiting - wait between scans
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error('Error processing scan queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async executeScan(scan) {
    try {
      console.log(`Executing security scan for org: ${scan.orgId}`);
      
      // Simulate scan execution
      const scanResult = await this.performSecurityScan(scan.orgId);
      
      // Save results
      await this.saveScanResults(scan.orgId, scanResult);
      
      // Notify completion
      await this.notifyScanCompletion(scan.orgId, scanResult);
      
    } catch (error) {
      console.error(`Scan failed for org ${scan.orgId}:`, error);
      await this.notifyScanFailure(scan.orgId, error);
    }
  }

  async performSecurityScan(orgId) {
    // Simulate security scan with realistic data
    const vulnerabilityCount = Math.floor(Math.random() * 20);
    const riskScore = Math.max(20, 100 - (vulnerabilityCount * 3) - Math.floor(Math.random() * 30));
    
    return {
      orgId,
      scanId: `scan_${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds later
      riskScore,
      vulnerabilityCount,
      findings: {
        critical: Math.floor(vulnerabilityCount * 0.1),
        high: Math.floor(vulnerabilityCount * 0.2),
        medium: Math.floor(vulnerabilityCount * 0.4),
        low: Math.floor(vulnerabilityCount * 0.3)
      },
      categories: {
        apex: Math.floor(Math.random() * 10),
        permissions: Math.floor(Math.random() * 5),
        configuration: Math.floor(Math.random() * 8)
      }
    };
  }

  async saveScanResults(orgId, scanResult) {
    const storageKey = `trusthunt_${orgId}`;
    const securityData = {
      lastScan: scanResult.completedAt,
      riskScore: scanResult.riskScore,
      vulnerabilityCount: scanResult.vulnerabilityCount,
      scanHistory: [scanResult]
    };

    // Merge with existing data
    const existing = await this.getSecurityData(orgId);
    if (existing) {
      securityData.scanHistory = [scanResult, ...(existing.scanHistory || [])].slice(0, 10);
    }

    await chrome.storage.local.set({
      [storageKey]: securityData
    });
  }

  async notifyScanCompletion(orgId, scanResult) {
    const settings = await this.getSettings();
    if (!settings.notifications) return;

    try {
      const title = scanResult.vulnerabilityCount > 0 
        ? `Security Issues Found`
        : `Security Scan Complete`;
        
      const message = scanResult.vulnerabilityCount > 0
        ? `Found ${scanResult.vulnerabilityCount} vulnerabilities (Risk Score: ${scanResult.riskScore})`
        : `No security issues detected (Risk Score: ${scanResult.riskScore})`;

      await chrome.notifications.create(`scan_${orgId}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title,
        message
      });
    } catch (error) {
      console.log('Notification failed:', error);
    }
  }

  async notifyScanFailure(orgId, error) {
    const settings = await this.getSettings();
    if (!settings.notifications) return;

    try {
      await chrome.notifications.create(`scan_error_${orgId}`, {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Security Scan Failed',
        message: `Scan failed for org ${orgId}: ${error.message}`
      });
    } catch (notifError) {
      console.log('Error notification failed:', notifError);
    }
  }

  notifySecurityDataUpdate(orgId, newData) {
    // Broadcast to all tabs that security data has been updated
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && this.isSalesforceUrl(tab.url)) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'SECURITY_DATA_UPDATED',
            orgId,
            data: newData
          }).catch(() => {
            // Tab might not have content script
          });
        }
      });
    });
  }

  startPeriodicTasks() {
    // Check for scheduled scans every hour
    setInterval(() => {
      this.checkScheduledScans();
    }, 60 * 60 * 1000);

    // Clean up old data every day
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000);
  }

  async checkScheduledScans() {
    try {
      const settings = await this.getSettings();
      if (!settings.autoScan) return;

      // Get all stored org data
      const allData = await chrome.storage.local.get(null);
      
      Object.keys(allData).forEach(key => {
        if (key.startsWith('trusthunt_')) {
          const orgId = key.replace('trusthunt_', '');
          const data = allData[key];
          
          if (data.lastScan) {
            const lastScan = new Date(data.lastScan);
            if (this.shouldAutoScan(lastScan, settings.scanInterval)) {
              this.queueScan(orgId, { auto: true, scheduled: true });
            }
          }
        }
      });

      this.processScanQueue();
    } catch (error) {
      console.error('Error checking scheduled scans:', error);
    }
  }

  async cleanupOldData() {
    try {
      const allData = await chrome.storage.local.get(null);
      const keysToRemove = [];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      Object.keys(allData).forEach(key => {
        if (key.startsWith('trusthunt_')) {
          const data = allData[key];
          if (data.lastScan) {
            const lastScan = new Date(data.lastScan);
            if (lastScan < thirtyDaysAgo) {
              keysToRemove.push(key);
            }
          }
        }
      });

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} old security data entries`);
      }
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }
}

// Initialize background service
new TrustHuntBackground();