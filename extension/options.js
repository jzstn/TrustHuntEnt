class TrustHuntOptions {
  constructor() {
    this.defaultSettings = {
      autoScan: true,
      scanInterval: 24, // hours
      notifications: true,
      realTimeMonitoring: true,
      alertThreshold: 'medium',
      dataRetention: 30, // days
      encryptData: true,
      apiEndpoint: 'http://localhost:5173',
      syncWithWebApp: false,
      debugMode: false,
      maxConcurrentScans: 1
    };
    
    this.settings = { ...this.defaultSettings };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.populateForm();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      if (result.settings) {
        this.settings = { ...this.defaultSettings, ...result.settings };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  populateForm() {
    // Toggle switches
    document.getElementById('autoScan').checked = this.settings.autoScan;
    document.getElementById('notifications').checked = this.settings.notifications;
    document.getElementById('realTimeMonitoring').checked = this.settings.realTimeMonitoring;
    document.getElementById('syncWithWebApp').checked = this.settings.syncWithWebApp;
    document.getElementById('debugMode').checked = this.settings.debugMode;
    document.getElementById('encryptData').checked = this.settings.encryptData;
    
    // Dropdowns
    document.getElementById('scanInterval').value = this.settings.scanInterval;
    document.getElementById('alertThreshold').value = this.settings.alertThreshold;
    document.getElementById('dataRetention').value = this.settings.dataRetention;
    document.getElementById('maxConcurrentScans').value = this.settings.maxConcurrentScans;
    
    // Text inputs
    document.getElementById('apiEndpoint').value = this.settings.apiEndpoint;
  }

  setupEventListeners() {
    // Save button
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // Reset button
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Export data button
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportData();
    });
    
    // Clear data button
    document.getElementById('clearData').addEventListener('click', () => {
      this.clearData();
    });
  }

  async saveSettings() {
    try {
      // Collect values from form
      this.settings.autoScan = document.getElementById('autoScan').checked;
      this.settings.notifications = document.getElementById('notifications').checked;
      this.settings.realTimeMonitoring = document.getElementById('realTimeMonitoring').checked;
      this.settings.syncWithWebApp = document.getElementById('syncWithWebApp').checked;
      this.settings.debugMode = document.getElementById('debugMode').checked;
      
      this.settings.scanInterval = parseInt(document.getElementById('scanInterval').value);
      this.settings.alertThreshold = document.getElementById('alertThreshold').value;
      this.settings.dataRetention = parseInt(document.getElementById('dataRetention').value);
      this.settings.maxConcurrentScans = parseInt(document.getElementById('maxConcurrentScans').value);
      
      this.settings.apiEndpoint = document.getElementById('apiEndpoint').value;
      
      // Save to storage
      await chrome.storage.sync.set({ settings: this.settings });
      
      // Show success message
      this.showStatusMessage('Settings saved successfully!');
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: this.settings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showStatusMessage('Error saving settings', true);
    }
  }

  async resetSettings() {
    try {
      // Reset to defaults
      this.settings = { ...this.defaultSettings };
      
      // Update form
      this.populateForm();
      
      // Save to storage
      await chrome.storage.sync.set({ settings: this.settings });
      
      // Show success message
      this.showStatusMessage('Settings reset to defaults');
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: this.settings
      });
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showStatusMessage('Error resetting settings', true);
    }
  }

  async exportData() {
    try {
      // Get all stored data
      const storageData = await chrome.storage.local.get(null);
      
      // Filter for TrustHunt data
      const trustHuntData = {};
      Object.keys(storageData).forEach(key => {
        if (key.startsWith('trusthunt_')) {
          trustHuntData[key] = storageData[key];
        }
      });
      
      // Add settings
      trustHuntData.settings = this.settings;
      
      // Create export file
      const exportData = JSON.stringify(trustHuntData, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `trusthunt-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showStatusMessage('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showStatusMessage('Error exporting data', true);
    }
  }

  async clearData() {
    if (!confirm('Are you sure you want to clear all security data? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Get all keys
      const storageData = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(storageData).filter(key => key.startsWith('trusthunt_'));
      
      // Remove all TrustHunt data
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
      
      this.showStatusMessage(`Cleared ${keysToRemove.length} security data entries`);
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'DATA_CLEARED'
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      this.showStatusMessage('Error clearing data', true);
    }
  }

  showStatusMessage(message, isError = false) {
    const statusElement = document.getElementById('statusMessage');
    statusElement.textContent = message;
    statusElement.className = isError ? 'status-message error show' : 'status-message show';
    
    setTimeout(() => {
      statusElement.classList.remove('show');
    }, 3000);
  }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', () => {
  new TrustHuntOptions();
});