import React, { useState, useEffect } from 'react';
import { useSecurityStore } from '../../store/useSecurityStore';
import { useSalesforcePasswordAuth } from '../../hooks/useSalesforcePasswordAuth';
import { useSalesforceTokenAuth } from '../../hooks/useSalesforceTokenAuth';
import { SalesforceConnectionModal } from './SalesforceConnectionModal';
import { SalesforceTokenModal } from './SalesforceTokenModal';
import { OAuthTestModal } from './OAuthTestModal';
import { AuthenticationGuide } from './AuthenticationGuide';
import { VulnerabilityReportsView } from './VulnerabilityReportsView';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp, 
  Clock, 
  Building2,
  Zap,
  Target,
  CheckCircle,
  RefreshCw,
  Settings,
  Bell,
  Download,
  Eye,
  Search,
  Filter,
  BarChart3,
  Network,
  Brain,
  Lock,
  Globe,
  Server,
  Database,
  Cpu,
  HardDrive,
  ExternalLink,
  Play,
  Key,
  Code,
  TestTube,
  Wifi,
  WifiOff,
  HelpCircle,
  Loader,
  Info
} from 'lucide-react';
import { format } from 'date-fns';

export const TrustHuntDashboard: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'overview' | 'vulnerabilities' | 'ai_security' | 'cross_org' | 'dast' | 'compliance' | 'monitoring'>('overview');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showOAuthTestModal, setShowOAuthTestModal] = useState(false);
  const [showAuthGuide, setShowAuthGuide] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [enterpriseMetrics, setEnterpriseMetrics] = useState({
    totalOrganizations: 0,
    totalVulnerabilities: 0,
    criticalVulnerabilities: 0,
    averageRiskScore: 0,
    activeScans: 0,
    complianceScore: 0,
    systemHealth: 'healthy',
    lastUpdated: new Date(),
    aiSecurityEvents: 0,
    crossOrgIssues: 0,
    temporalAnomalies: 0,
    dastFindings: 0
  });
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [complianceFrameworks, setComplianceFrameworks] = useState([
    {
      name: 'SOC 2 Type II',
      status: 'compliant',
      score: 95,
      requirements: 64,
      passed: 61,
      failed: 3,
      lastAssessment: new Date()
    },
    {
      name: 'GDPR',
      status: 'partial',
      score: 78,
      requirements: 32,
      passed: 25,
      failed: 7,
      lastAssessment: new Date()
    },
    {
      name: 'HIPAA',
      status: 'compliant',
      score: 92,
      requirements: 45,
      passed: 41,
      failed: 4,
      lastAssessment: new Date()
    },
    {
      name: 'PCI DSS',
      status: 'non_compliant',
      score: 65,
      requirements: 78,
      passed: 51,
      failed: 27,
      lastAssessment: new Date()
    }
  ]);

  const {
    organizations,
    vulnerabilities,
    aiSecurityEvents,
    crossOrgAnalyses,
    temporalRiskEvents,
    activeScans,
    dashboardMetrics,
    isLoading,
    addVulnerability,
    addAISecurityEvent,
    addTemporalRiskEvent,
    updateDashboardMetrics,
    setOrganizations
  } = useSecurityStore();

  const passwordAuth = useSalesforcePasswordAuth();
  const tokenAuth = useSalesforceTokenAuth();

  // Use token auth as primary if available, fallback to password auth
  const {
    login,
    isConnecting,
    connectionError,
    connectedOrganizations,
    clearError,
    performSecurityScan
  } = tokenAuth.isConnected ? tokenAuth : passwordAuth;

  // Update enterprise metrics
  useEffect(() => {
    const criticalCount = vulnerabilities?.filter(v => v.severity === 'critical').length || 0;
    const highCount = vulnerabilities?.filter(v => v.severity === 'high').length || 0;
    const avgRiskScore = organizations?.length > 0 
      ? organizations.reduce((sum, org) => sum + org.riskScore, 0) / organizations.length 
      : 0;

    // Calculate system health
    let systemHealth = 'healthy';
    if (criticalCount > 10) systemHealth = 'critical';
    else if (criticalCount > 5 || highCount > 20) systemHealth = 'warning';

    // Calculate compliance score
    const complianceScore = complianceFrameworks.reduce((sum, framework) => sum + framework.score, 0) / complianceFrameworks.length;

    setEnterpriseMetrics({
      totalOrganizations: organizations?.length || 0,
      totalVulnerabilities: vulnerabilities?.length || 0,
      criticalVulnerabilities: criticalCount,
      averageRiskScore: Math.round(avgRiskScore),
      activeScans: activeScans?.filter(s => s.status === 'running').length || 0,
      complianceScore: Math.round(complianceScore),
      systemHealth,
      lastUpdated: new Date(),
      aiSecurityEvents: aiSecurityEvents?.length || 0,
      crossOrgIssues: crossOrgAnalyses?.length || 0,
      temporalAnomalies: temporalRiskEvents?.length || 0,
      dastFindings: 0 // Would be populated from DAST scans
    });

    // Generate security alerts from vulnerabilities
    const alerts = vulnerabilities
      ?.filter(v => v.severity === 'critical' || v.severity === 'high')
      .slice(0, 10)
      .map(v => ({
        id: v.id,
        severity: v.severity,
        title: v.title,
        description: v.description,
        timestamp: v.discoveredAt,
        orgId: v.orgId,
        category: 'vulnerability',
        acknowledged: false
      })) || [];

    setSecurityAlerts(alerts);
  }, [organizations, vulnerabilities, aiSecurityEvents, crossOrgAnalyses, temporalRiskEvents, activeScans, complianceFrameworks]);

  // Update connection status based on auth states
  useEffect(() => {
    if (isConnecting) {
      setConnectionStatus('connecting');
    } else if (connectedOrganizations.length > 0) {
      setConnectionStatus('connected');
    } else if (connectionError) {
      setConnectionStatus('error');
    } else {
      setConnectionStatus('idle');
    }
  }, [isConnecting, connectedOrganizations.length, connectionError]);

  // Generate mock data if no real data exists
  useEffect(() => {
    if (organizations.length === 0 && vulnerabilities.length === 0) {
      generateMockData();
    }
  }, []);

  const generateMockData = () => {
    // Create a mock organization
    const mockOrg = {
      id: 'mock-org-1',
      name: 'TrustHunt Demo Org',
      type: 'developer',
      instanceUrl: 'https://trusthunt-dev-ed.develop.lightning.force.com',
      isConnected: true,
      lastScanDate: new Date(),
      riskScore: 75,
      vulnerabilityCount: 12
    };
    
    setOrganizations([mockOrg]);
    
    // Generate mock vulnerabilities
    const mockVulnerabilities = [
      {
        id: 'vuln-1',
        orgId: 'mock-org-1',
        type: 'soql_injection',
        severity: 'critical',
        title: 'SOQL Injection in Custom Controller',
        description: 'Dynamic SOQL construction without proper sanitization detected',
        location: 'CustomController.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 9.1,
        businessImpact: 'Potential unauthorized data access and database compromise',
        remediation: 'Use parameterized queries and input validation'
      },
      {
        id: 'vuln-2',
        orgId: 'mock-org-1',
        type: 'permission_escalation',
        severity: 'high',
        title: 'Missing Sharing Declaration',
        description: 'Apex class without sharing declaration allows unauthorized data access',
        location: 'DataProcessor.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 7.5,
        businessImpact: 'Users may access records they should not have permission to view',
        remediation: 'Add "with sharing" to class declaration'
      },
      {
        id: 'vuln-3',
        orgId: 'mock-org-1',
        type: 'data_exposure',
        severity: 'medium',
        title: 'Hardcoded Credentials in Apex',
        description: 'Sensitive credentials found hardcoded in source code',
        location: 'IntegrationService.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 6.8,
        businessImpact: 'Credentials may be exposed to unauthorized users',
        remediation: 'Use Custom Settings or Named Credentials'
      }
    ];
    
    mockVulnerabilities.forEach(vuln => addVulnerability(vuln));
    
    // Generate mock AI security events
    const mockAIEvents = [
      {
        id: 'ai-1',
        orgId: 'mock-org-1',
        eventType: 'einstein_gpt_access',
        userId: 'user-001',
        timestamp: new Date(),
        dataAccessed: ['Account.Name', 'Contact.Email', 'Opportunity.Amount'],
        riskLevel: 'medium',
        businessHoursViolation: false,
        sensitiveDataExposed: true
      },
      {
        id: 'ai-2',
        orgId: 'mock-org-1',
        eventType: 'copilot_data_exposure',
        userId: 'user-002',
        timestamp: new Date(),
        dataAccessed: ['Contact.SSN__c', 'Account.Revenue__c'],
        riskLevel: 'high',
        businessHoursViolation: true,
        sensitiveDataExposed: true
      }
    ];
    
    mockAIEvents.forEach(event => addAISecurityEvent(event));
    
    // Generate mock temporal risk events
    const mockTemporalEvents = [
      {
        id: 'temp-1',
        orgId: 'mock-org-1',
        userId: 'user-001',
        eventType: 'after_hours_access',
        timestamp: new Date(),
        riskScore: 7.5,
        businessHoursViolation: true,
        geographicAnomaly: false,
        sessionDurationAnomaly: false
      },
      {
        id: 'temp-2',
        orgId: 'mock-org-1',
        userId: 'user-003',
        eventType: 'privilege_escalation',
        timestamp: new Date(),
        riskScore: 8.2,
        businessHoursViolation: false,
        geographicAnomaly: true,
        sessionDurationAnomaly: true
      }
    ];
    
    mockTemporalEvents.forEach(event => addTemporalRiskEvent(event));
    
    // Update dashboard metrics
    updateDashboardMetrics({
      totalVulnerabilities: mockVulnerabilities.length,
      criticalVulnerabilities: mockVulnerabilities.filter(v => v.severity === 'critical').length,
      averageRiskScore: 75,
      aiSecurityEvents: mockAIEvents.length,
      temporalAnomalies: mockTemporalEvents.length
    });
  };

  const handleStartSecurityScan = async () => {
    if (connectedOrganizations.length === 0) {
      alert('Please connect to a Salesforce organization first.');
      return;
    }

    const connectedOrg = connectedOrganizations[0];
    
    try {
      setIsScanning(true);
      console.log(`🚀 Starting security scan for ${connectedOrg.name}...`);
      
      await performSecurityScan(connectedOrg.id);
      
      console.log('✅ Security scan completed successfully!');
    } catch (error) {
      console.error('❌ Security scan failed:', error);
      alert(`Security scan failed: ${error.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePasswordConnect = async (credentials) => {
    try {
      setConnectionStatus('connecting');
      passwordAuth.clearError();
      await passwordAuth.login(credentials);
      setShowConnectionModal(false);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Password connection failed:', error);
      setConnectionStatus('error');
      // Error is handled by the hook
    }
  };

  const handleTokenConnect = async (credentials) => {
    try {
      setConnectionStatus('connecting');
      tokenAuth.clearError();
      
      console.log('🔐 Attempting token connection with credentials:', {
        instanceUrl: credentials.instanceUrl,
        hasToken: !!credentials.accessToken,
        orgType: credentials.orgType
      });
      
      await tokenAuth.login(credentials);
      setShowTokenModal(false);
      setConnectionStatus('connected');
      
      console.log('✅ Token connection successful');
    } catch (error) {
      console.error('❌ Token connection failed:', error);
      setConnectionStatus('error');
      
      // Show user-friendly error message
      let errorMessage = 'Connection failed. ';
      
      if (error.message.includes('corsdemo') || error.message.includes('CORS demo server')) {
        errorMessage += 'Please enable the CORS demo server first. Click the "Help" button for instructions.';
      } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
        errorMessage += 'Unable to connect to Salesforce. Please check your internet connection and ensure the instance URL is correct.';
      } else if (error.message.includes('Invalid or expired')) {
        errorMessage += 'Your access token appears to be invalid or expired. Please check your token and try again.';
      } else {
        errorMessage += error.message;
      }
      
      // You could show this in a toast notification or modal
      alert(errorMessage);
    }
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplianceColor = (status) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'non_compliant': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connecting':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'connected':
        return <Wifi className="w-4 h-4" />;
      case 'error':
        return <WifiOff className="w-4 h-4" />;
      default:
        return <WifiOff className="w-4 h-4" />;
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'bg-blue-100 text-blue-800';
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Not Connected';
    }
  };

  // Handle vulnerability tile clicks
  const handleVulnerabilityTileClick = (severity) => {
    setSelectedView('vulnerabilities');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing TrustHunt Enterprise</h2>
          <p className="text-gray-600">Loading enterprise security platform...</p>
        </div>
      </div>
    );
  }

  const isConnected = connectedOrganizations.length > 0;
  const connectedOrg = connectedOrganizations[0];

  // Show vulnerability reports view
  if (selectedView === 'vulnerabilities') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
          <div className="max-w-[1920px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Brand */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      TrustHunt Enterprise
                    </h1>
                    <p className="text-xs text-gray-500">Salesforce Security Assessment Platform</p>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusIcon()}
                <span className="hidden sm:inline">{getConnectionStatusText()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1920px] mx-auto px-6 py-6">
          <VulnerabilityReportsView 
            onBack={() => setSelectedView('overview')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enterprise Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1920px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    TrustHunt Enterprise
                  </h1>
                  <p className="text-xs text-gray-500">Salesforce Security Assessment Platform</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Shield },
                { id: 'ai_security', label: 'AI Security', icon: Brain },
                { id: 'cross_org', label: 'Cross-Org', icon: Network },
                { id: 'dast', label: 'DAST Engine', icon: Search },
                { id: 'compliance', label: 'Compliance', icon: CheckCircle },
                { id: 'monitoring', label: 'Monitoring', icon: Activity }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedView(item.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedView === item.id
                      ? 'bg-blue-100 text-blue-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* System Health */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(enterpriseMetrics.systemHealth)}`}>
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">System {enterpriseMetrics.systemHealth}</span>
              </div>

              {/* Connection Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
                {getConnectionStatusIcon()}
                <span className="hidden sm:inline">{getConnectionStatusText()}</span>
              </div>

              {/* Help Button */}
              <button
                onClick={() => setShowAuthGuide(true)}
                className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Help</span>
              </button>

              {/* Connection Options */}
              {!isConnected && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowOAuthTestModal(true)}
                    disabled={connectionStatus === 'connecting'}
                    className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4" />
                    <span className="hidden sm:inline">Test OAuth</span>
                  </button>
                  <button
                    onClick={() => setShowTokenModal(true)}
                    disabled={connectionStatus === 'connecting'}
                    className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <Key className="w-4 h-4" />
                    <span className="hidden sm:inline">Token</span>
                  </button>
                  <button
                    onClick={() => setShowConnectionModal(true)}
                    disabled={connectionStatus === 'connecting'}
                    className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">Login</span>
                  </button>
                </div>
              )}

              {/* Security Scan Button */}
              {isConnected && (
                <button
                  onClick={handleStartSecurityScan}
                  disabled={isScanning || connectionStatus === 'connecting'}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isScanning ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Start Scan</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Connection Options - Always visible when not connected */}
        {!isConnected && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect to Salesforce</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Choose your preferred connection method to start comprehensive security analysis.
              </p>
              
              {/* Connection Error Display */}
              {connectionError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="text-left">
                      <h4 className="text-sm font-medium text-red-900">Connection Failed</h4>
                      <p className="text-xs text-red-800 mt-1">{connectionError}</p>
                      {(connectionError.includes('corsdemo') || connectionError.includes('CORS')) && (
                        <div className="mt-2">
                          <button
                            onClick={() => setShowAuthGuide(true)}
                            className="text-xs text-red-700 underline hover:text-red-900 font-medium"
                          >
                            Click here for step-by-step fix →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* OAuth Test - New Option */}
              <div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <TestTube className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Test OAuth Token</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Test your existing OAuth token to verify connection and see what data we can access.
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-purple-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Verify token validity</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Test API access</span>
                      </div>
                      <div className="flex items-center text-sm text-purple-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>View connection details</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOAuthTestModal(true)}
                      disabled={connectionStatus === 'connecting'}
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>Test OAuth Token</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Token Authentication - Recommended */}
              <div className="border-2 border-green-200 rounded-xl p-6 bg-green-50 relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                    Recommended for Testing
                  </span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Key className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Access Token</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Use your existing Salesforce access token for instant connection. Perfect for testing and development.
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Direct connection (enhanced)</span>
                      </div>
                      <div className="flex items-center text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Instant connection</span>
                      </div>
                      <div className="flex items-center text-sm text-green-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Automatic fallback proxies</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTokenModal(true)}
                      disabled={connectionStatus === 'connecting'}
                      className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Key className="w-4 h-4" />
                      )}
                      <span>Connect with Token</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Username/Password Authentication */}
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Username & Password</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Connect using your Salesforce username and password. Direct connection with enhanced error handling.
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Standard authentication</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Works with any Salesforce org</span>
                      </div>
                      <div className="flex items-center text-sm text-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        <span>Enhanced error handling</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowConnectionModal(true)}
                      disabled={connectionStatus === 'connecting'}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      {connectionStatus === 'connecting' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                      <span>Connect with Password</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enterprise Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Organizations</p>
                <p className="text-2xl font-bold text-gray-900">{enterpriseMetrics.totalOrganizations}</p>
              </div>
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mt-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{enterpriseMetrics.totalOrganizations} connected
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleVulnerabilityTileClick()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Vulnerabilities</p>
                <p className="text-2xl font-bold text-gray-900">{enterpriseMetrics.totalVulnerabilities}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="mt-1 text-xs text-red-600">
              {enterpriseMetrics.criticalVulnerabilities} critical
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Risk Score</p>
                <p className="text-2xl font-bold text-gray-900">{enterpriseMetrics.averageRiskScore}%</p>
              </div>
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <div className="mt-1 text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              Improving
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Scans</p>
                <p className="text-2xl font-bold text-blue-600">{enterpriseMetrics.activeScans}</p>
              </div>
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <div className="mt-1 text-xs text-blue-600">
              {isScanning ? 'Scanning...' : 'Real-time monitoring'}
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedView('ai_security')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">AI Security</p>
                <p className="text-2xl font-bold text-purple-600">{enterpriseMetrics.aiSecurityEvents}</p>
              </div>
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div className="mt-1 text-xs text-purple-600">
              Einstein GPT monitored
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedView('cross_org')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Cross-Org</p>
                <p className="text-2xl font-bold text-cyan-600">{enterpriseMetrics.crossOrgIssues}</p>
              </div>
              <Network className="w-6 h-6 text-cyan-600" />
            </div>
            <div className="mt-1 text-xs text-cyan-600">
              Environment drift
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedView('monitoring')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Temporal Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{enterpriseMetrics.temporalAnomalies}</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="mt-1 text-xs text-yellow-600">
              Time-based anomalies
            </div>
          </div>

          <div 
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedView('compliance')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Compliance</p>
                <p className="text-2xl font-bold text-green-600">{enterpriseMetrics.complianceScore}%</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="mt-1 text-xs text-green-600">
              Multi-framework
            </div>
          </div>
        </div>

        {/* Connected Organization Info */}
        {isConnected && connectedOrg && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{connectedOrg.name}</h3>
                  <p className="text-sm text-gray-600">{connectedOrg.instanceUrl}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{connectedOrg.riskScore}%</div>
                  <div className="text-xs text-gray-600">Risk Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{connectedOrg.vulnerabilityCount}</div>
                  <div className="text-xs text-gray-600">Vulnerabilities</div>
                </div>
                <button
                  onClick={handleStartSecurityScan}
                  disabled={isScanning || connectionStatus === 'connecting'}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard Content */}
        {selectedView === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Vulnerabilities by Severity */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleVulnerabilityTileClick('critical')}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                  Critical Vulnerabilities
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {vulnerabilities.filter(v => v.severity === 'critical').length} Found
                </span>
              </div>
              
              <div className="space-y-3">
                {vulnerabilities
                  .filter(v => v.severity === 'critical')
                  .slice(0, 3)
                  .map(vuln => (
                    <div key={vuln.id} className="p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{vuln.title}</h4>
                        <span className="text-xs font-medium text-red-600">CVSS {vuln.cvssScore}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{vuln.location}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{format(vuln.discoveredAt, 'MMM dd, HH:mm')}</span>
                        <span className="text-blue-600 hover:underline">View Details</span>
                      </div>
                    </div>
                  ))}
                
                {vulnerabilities.filter(v => v.severity === 'critical').length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No critical vulnerabilities found</p>
                  </div>
                )}
                
                {vulnerabilities.filter(v => v.severity === 'critical').length > 3 && (
                  <div className="text-center mt-4">
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => handleVulnerabilityTileClick('critical')}
                    >
                      View All Critical Vulnerabilities
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* High Vulnerabilities */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleVulnerabilityTileClick('high')}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
                  High Vulnerabilities
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {vulnerabilities.filter(v => v.severity === 'high').length} Found
                </span>
              </div>
              
              <div className="space-y-3">
                {vulnerabilities
                  .filter(v => v.severity === 'high')
                  .slice(0, 3)
                  .map(vuln => (
                    <div key={vuln.id} className="p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{vuln.title}</h4>
                        <span className="text-xs font-medium text-orange-600">CVSS {vuln.cvssScore}</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{vuln.location}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{format(vuln.discoveredAt, 'MMM dd, HH:mm')}</span>
                        <span className="text-blue-600 hover:underline">View Details</span>
                      </div>
                    </div>
                  ))}
                
                {vulnerabilities.filter(v => v.severity === 'high').length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No high vulnerabilities found</p>
                  </div>
                )}
                
                {vulnerabilities.filter(v => v.severity === 'high').length > 3 && (
                  <div className="text-center mt-4">
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => handleVulnerabilityTileClick('high')}
                    >
                      View All High Vulnerabilities
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Medium/Low Vulnerabilities */}
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleVulnerabilityTileClick('medium')}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Info className="w-5 h-5 text-yellow-600 mr-2" />
                  Other Vulnerabilities
                </h3>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  {vulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'low').length} Found
                </span>
              </div>
              
              <div className="space-y-3">
                {vulnerabilities
                  .filter(v => v.severity === 'medium' || v.severity === 'low')
                  .slice(0, 3)
                  .map(vuln => (
                    <div key={vuln.id} className={`p-3 ${vuln.severity === 'medium' ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-green-50 hover:bg-green-100'} rounded-lg transition-colors`}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{vuln.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${vuln.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                          {vuln.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{vuln.location}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">{format(vuln.discoveredAt, 'MMM dd, HH:mm')}</span>
                        <span className="text-blue-600 hover:underline">View Details</span>
                      </div>
                    </div>
                  ))}
                
                {vulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'low').length === 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No medium/low vulnerabilities found</p>
                  </div>
                )}
                
                {vulnerabilities.filter(v => v.severity === 'medium' || v.severity === 'low').length > 3 && (
                  <div className="text-center mt-4">
                    <button 
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => handleVulnerabilityTileClick('medium')}
                    >
                      View All Other Vulnerabilities
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {enterpriseMetrics.lastUpdated.toLocaleString()}</p>
          <p className="mt-1">TrustHunt Enterprise Security Platform v1.0 | Powered by AI & Machine Learning</p>
          <p className="mt-1">
            Monitoring {enterpriseMetrics.totalOrganizations} organizations • 
            {enterpriseMetrics.totalVulnerabilities} vulnerabilities tracked • 
            {enterpriseMetrics.complianceScore}% compliance average
          </p>
        </div>
      </div>

      {/* Connection Modals */}
      <SalesforceConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handlePasswordConnect}
        isLoading={passwordAuth.isConnecting}
        error={passwordAuth.connectionError}
      />

      <SalesforceTokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onConnect={handleTokenConnect}
        isLoading={tokenAuth.isConnecting}
        error={tokenAuth.connectionError}
      />

      <OAuthTestModal
        isOpen={showOAuthTestModal}
        onClose={() => setShowOAuthTestModal(false)}
      />

      <AuthenticationGuide
        isOpen={showAuthGuide}
        onClose={() => setShowAuthGuide(false)}
      />
    </div>
  );
};