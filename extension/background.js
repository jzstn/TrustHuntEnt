class TrustHuntBackground {
  constructor() {
    this.connectedOrgs = new Map();
    this.scanQueue = [];
    this.isProcessing = false;
    this.securityRules = this.initializeSecurityRules();
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
      if (details.reason === 'install') {
        // First time installation
        this.showWelcomeNotification();
        this.initializeDefaultSettings();
      } else if (details.reason === 'update') {
        // Extension update
        this.handleUpdate(details.previousVersion);
      }
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

  handleUpdate(previousVersion) {
    console.log(`Extension updated from ${previousVersion}`);
    // Add update-specific logic here if needed
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

        case 'ORG_DETECTED':
          await this.handleOrgDetected(message.orgInfo, sender.tab);
          sendResponse({ success: true });
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

        case 'SECURITY_ISSUE_DETECTED':
          await this.handleSecurityIssue(message.issueType, message.orgId, message.details);
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
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url && this.isSalesforceUrl(tab.url)) {
        await this.updateBadgeForTab(activeInfo.tabId, tab.url);
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
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

  async updateBadgeForTab(tabId, urlOrOrgId) {
    try {
      let orgId;
      
      if (typeof urlOrOrgId === 'string' && urlOrOrgId.startsWith('http')) {
        // It's a URL, extract org ID
        orgId = this.extractOrgIdFromUrl(urlOrOrgId);
      } else {
        // It's already an org ID
        orgId = urlOrOrgId;
      }
      
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

  async checkAutoScan(tabId, urlOrOrgId) {
    try {
      const settings = await this.getSettings();
      if (!settings.autoScan) return;

      let orgId;
      
      if (typeof urlOrOrgId === 'string' && urlOrOrgId.startsWith('http')) {
        // It's a URL, extract org ID
        orgId = this.extractOrgIdFromUrl(urlOrOrgId);
      } else {
        // It's already an org ID
        orgId = urlOrOrgId;
      }
      
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
      
      // Perform security scan using the rule engine
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
    // Generate mock code samples for analysis
    const mockCodeSamples = [
      {
        name: "AccountController",
        body: `public class AccountController {
          public List<Account> searchAccounts(String searchTerm) {
            String query = 'SELECT Id, Name FROM Account WHERE Name LIKE \\'' + searchTerm + '\\'';
            return Database.query(query);
          }
        }`
      },
      {
        name: "OpportunityService",
        body: `public class OpportunityService {
          public void updateOpportunities(List<Opportunity> opps) {
            update opps;
          }
        }`
      },
      {
        name: "IntegrationService",
        body: `public class IntegrationService {
          private static final String API_KEY = 'ak_live_51KdJkEFjx7pL8Jn5vVCizU7Fb';
          
          public static void callExternalService() {
            // API call logic
            System.debug('Using API key: ' + API_KEY);
          }
        }`
      },
      {
        name: "UserService",
        body: `public class UserService {
          public User getUserDetails(String userId) {
            User u = [SELECT Id, Name, Email, Phone FROM User WHERE Id = :userId];
            System.debug('User email: ' + u.Email);
            return u;
          }
        }`
      },
      {
        name: "LeadController",
        body: `public with sharing class LeadController {
          public void convertLead(String leadId) {
            Lead l = [SELECT Id, Status FROM Lead WHERE Id = :leadId];
            Database.LeadConvert lc = new Database.LeadConvert();
            lc.setLeadId(leadId);
            Database.convertLead(lc);
            System.debug('Lead converted: ' + leadId);
          }
        }`
      },
      {
        name: "AccountDetailPage",
        body: `<apex:page controller="AccountController">
          <apex:outputText value="{!$Request.name}" escape="false"/>
          <apex:outputPanel>
            <script>
              var accountId = '{!$CurrentPage.parameters.id}';
              console.log(accountId);
            </script>
          </apex:outputPanel>
        </apex:page>`
      }
    ];
    
    // Analyze code samples using the security rules
    const vulnerabilities = [];
    
    mockCodeSamples.forEach(sample => {
      const vulns = this.analyzeCode(sample.body, `${sample.name}.${sample.name.includes('Page') ? 'page' : 'cls'}`, orgId);
      vulnerabilities.push(...vulns);
    });
    
    const vulnerabilityCount = vulnerabilities.length;
    const riskScore = Math.max(20, 100 - (vulnerabilityCount * 3) - Math.floor(Math.random() * 30));
    
    return {
      scanId: `scan_${Date.now()}`,
      orgId,
      startedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 30000).toISOString(), // 30 seconds later
      riskScore,
      vulnerabilityCount,
      vulnerabilities,
      findings: {
        critical: vulnerabilities.filter(v => v.severity === 'critical').length,
        high: vulnerabilities.filter(v => v.severity === 'high').length,
        medium: vulnerabilities.filter(v => v.severity === 'medium').length,
        low: vulnerabilities.filter(v => v.severity === 'low').length
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
      vulnerabilities: scanResult.vulnerabilities,
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

  async handleOrgDetected(orgInfo, tab) {
    console.log('Salesforce org detected:', orgInfo);
    
    // Store org info
    this.connectedOrgs.set(orgInfo.orgId, {
      ...orgInfo,
      tabId: tab.id
    });
    
    // Update badge
    await this.updateBadgeForTab(tab.id, orgInfo.orgId);
    
    // Check for auto-scan
    await this.checkAutoScan(tab.id, orgInfo.orgId);
  }

  async getOrgInfo(tab) {
    try {
      // Try to get org info from content script
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ORG_INFO' });
      return response?.data || null;
    } catch (error) {
      console.error('Error getting org info:', error);
      return null;
    }
  }

  async handleScanCompleted(orgId, data) {
    console.log(`Scan completed for org ${orgId}`);
    
    // Update badge for all tabs with this org
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && this.isSalesforceUrl(tab.url)) {
          const tabOrgId = this.extractOrgIdFromUrl(tab.url);
          if (tabOrgId === orgId) {
            this.updateBadgeForTab(tab.id, orgId);
          }
        }
      });
    });
    
    // Notify content scripts
    this.notifySecurityDataUpdate(orgId, data);
  }

  async handleSecurityIssue(issueType, orgId, details) {
    console.log(`Security issue detected: ${issueType} in org ${orgId}`);
    
    // In a real implementation, this would:
    // 1. Log the issue to a database
    // 2. Update the security score
    // 3. Potentially trigger alerts
    
    // For now, we'll just update the badge
    if (orgId) {
      const securityData = await this.getSecurityData(orgId);
      if (securityData) {
        securityData.vulnerabilityCount = (securityData.vulnerabilityCount || 0) + 1;
        
        // Update storage
        const storageKey = `trusthunt_${orgId}`;
        await chrome.storage.local.set({
          [storageKey]: securityData
        });
        
        // Update badges
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            if (tab.url && this.isSalesforceUrl(tab.url)) {
              const tabOrgId = this.extractOrgIdFromUrl(tab.url);
              if (tabOrgId === orgId) {
                this.updateBadgeForTab(tab.id, orgId);
              }
            }
          });
        });
      }
    }
  }

  // Security rule engine methods
  initializeSecurityRules() {
    return [
      {
        id: 'SOQL-INJ-001',
        name: 'SOQL Injection - String Concatenation',
        description: 'Dynamic SOQL query constructed with string concatenation',
        severity: 'critical',
        type: 'soql_injection',
        cvssScore: 9.1,
        detectionPatterns: [
          /String\s+\w+\s*=\s*['"]SELECT\s+.*?\+\s*\w+/,
          /Database\.query\s*\(\s*['"].*?\+\s*\w+/,
          /\[\s*SELECT\s+.*?\+\s*\w+/,
          /WHERE\s+\w+\s*=\s*['"]?\s*\+\s*\w+/
        ],
        businessImpact: 'Attackers could access unauthorized data, potentially exposing sensitive information',
        remediation: 'Use parameterized queries with proper binding or apply String.escapeSingleQuotes() to user input'
      },
      {
        id: 'CRUD-FLS-001',
        name: 'Missing Sharing Declaration',
        description: 'Apex class does not specify sharing model',
        severity: 'high',
        type: 'crud_fls_violation',
        cvssScore: 7.5,
        detectionPatterns: [
          /^(?!.*with\s+sharing|inherited\s+sharing|without\s+sharing).*\bclass\s+\w+/m
        ],
        businessImpact: 'Users may access records they should not have permission to view or modify',
        remediation: 'Add "with sharing", "inherited sharing", or explicitly "without sharing" to class declaration'
      },
      {
        id: 'DATA-EXP-001',
        name: 'Hardcoded Credentials',
        description: 'Sensitive credentials found hardcoded in source code',
        severity: 'high',
        type: 'data_exposure',
        cvssScore: 7.8,
        detectionPatterns: [
          /password\s*=\s*['"][^'"]{6,}['"]/,
          /apikey\s*=\s*['"][^'"]{10,}['"]/,
          /secret\s*=\s*['"][^'"]{10,}['"]/,
          /token\s*=\s*['"][^'"]{20,}['"]/,
          /key\s*=\s*['"][^'"]{15,}['"]/
        ],
        businessImpact: 'Credentials may be exposed to unauthorized users with code access',
        remediation: 'Use Custom Settings, Custom Metadata Types, or Named Credentials to store sensitive information'
      },
      {
        id: 'DEBUG-001',
        name: 'Debug Logs with Sensitive Data',
        description: 'Debug statements containing potentially sensitive information',
        severity: 'low',
        type: 'data_exposure',
        cvssScore: 3.5,
        detectionPatterns: [
          /System\.debug\s*\(\s*.*?(?:password|email|phone|ssn|credit|token|key|secret)/
        ],
        businessImpact: 'Sensitive information may be exposed in debug logs',
        remediation: 'Remove debug statements with sensitive data or mask the sensitive information'
      },
      {
        id: 'XSS-001',
        name: 'Reflected XSS in Visualforce',
        description: 'User input from page parameters used without proper encoding',
        severity: 'medium',
        type: 'xss',
        cvssScore: 6.1,
        detectionPatterns: [
          /<apex:outputText\s+value=["']\{!.*?\}["']\s+escape=["']false["']/,
          /<apex:outputText\s+escape=["']false["']\s+value=["']\{!.*?\}["']/,
          /\{!.*?Request\.Parameter.*?\}/
        ],
        businessImpact: 'Potential cross-site scripting attacks against users',
        remediation: 'Use HTMLENCODE(), JSENCODE(), or set escape="true" on outputText components'
      },
      {
        id: 'CRUD-FLS-002',
        name: 'Missing CRUD Checks',
        description: 'DML operations performed without checking CRUD permissions',
        severity: 'medium',
        type: 'crud_fls_violation',
        cvssScore: 5.4,
        detectionPatterns: [
          /(?:insert|update|delete|upsert)\s+\w+(?!.*isCreateable\(\)|.*isUpdateable\(\)|.*isDeletable\(\))/
        ],
        businessImpact: 'Users may perform operations they lack permission for',
        remediation: 'Add CRUD permission checks using Schema.sObjectType.isCreateable(), isUpdateable(), or isDeletable() before DML operations'
      }
    ];
  }

  analyzeCode(code, fileName, orgId) {
    const vulnerabilities = [];
    
    this.securityRules.forEach(rule => {
      rule.detectionPatterns.forEach(pattern => {
        let matches;
        try {
          matches = code.match(pattern);
        } catch (e) {
          console.error(`Error with pattern in rule ${rule.id}:`, e);
          return;
        }
        
        if (matches) {
          matches.forEach((match, index) => {
            vulnerabilities.push({
              id: `${rule.id}-${fileName.replace(/\W/g, '')}-${index}`,
              orgId,
              type: rule.type,
              severity: rule.severity,
              title: `${rule.name} in ${fileName}`,
              description: rule.description,
              location: fileName,
              discoveredAt: new Date(),
              status: 'open',
              cvssScore: rule.cvssScore,
              businessImpact: rule.businessImpact,
              remediation: rule.remediation,
              evidence: [{
                type: 'code_snippet',
                content: match.substring(0, 200) + (match.length > 200 ? '...' : ''),
                timestamp: new Date()
              }]
            });
          });
        }
      });
    });
    
    return vulnerabilities;
  }
}

// Initialize background service
new TrustHuntBackground();