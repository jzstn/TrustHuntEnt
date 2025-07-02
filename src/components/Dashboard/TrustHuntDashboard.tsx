import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSecurityStore } from '../../store/useSecurityStore';
import { useSalesforcePasswordAuth } from '../../hooks/useSalesforcePasswordAuth';
import { useSalesforceTokenAuth } from '../../hooks/useSalesforceTokenAuth';
import { SalesforceConnectionModal } from './SalesforceConnectionModal';
import { SalesforceTokenModal } from './SalesforceTokenModal';
import { OAuthTestModal } from './OAuthTestModal';
import { AuthenticationGuide } from './AuthenticationGuide';
import { ScanResultsView } from './ScanResultsView';
import { VulnerabilityReportsView } from './VulnerabilityReportsView';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp, 
  Clock, 
  Users, 
  Building2,
  Zap,
  Target,
  CheckCircle,
  XCircle,
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
  Info,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

export const TrustHuntDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedView, setSelectedView] = useState<'overview' | 'vulnerabilities' | 'scan_results'>('overview');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showOAuthTestModal, setShowOAuthTestModal] = useState(false);
  const [showAuthGuide, setShowAuthGuide] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isScanning, setIsScanning] = useState(false);
  const [scanCompleted, setScanCompleted] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  const {
    organizations,
    vulnerabilities,
    aiSecurityEvents,
    crossOrgAnalyses,
    temporalRiskEvents,
    activeScans,
    dashboardMetrics,
    isLoading
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

  const handleStartSecurityScan = async () => {
    if (connectedOrganizations.length === 0) {
      alert('Please connect to a Salesforce organization first.');
      return;
    }

    const connectedOrg = connectedOrganizations[0];
    
    try {
      setIsScanning(true);
      console.log(`🚀 Starting security scan for ${connectedOrg.name}...`);
      
      // Generate a unique scan ID
      const scanId = `scan-${Date.now()}`;
      setCurrentScanId(scanId);
      
      // Simulate scan delay
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await performSecurityScan(connectedOrg.id);
      
      console.log('✅ Security scan completed successfully!');
      setScanCompleted(true);
      setIsScanning(false);
      
      // Switch to scan results view
      setSelectedView('scan_results');
      
    } catch (error) {
      console.error('❌ Security scan failed:', error);
      alert(`Security scan failed: ${error.message}`);
      setIsScanning(false);
    }
  };

  const handleTokenConnect = async (credentials: any) => {
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
    }
  };

  const handlePasswordConnect = async (credentials: any) => {
    try {
      setConnectionStatus('connecting');
      passwordAuth.clearError();
      await passwordAuth.login(credentials);
      setShowConnectionModal(false);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Password connection failed:', error);
      setConnectionStatus('error');
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

  // Show scan results view
  if (selectedView === 'scan_results') {
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
          <ScanResultsView 
            onBack={() => setSelectedView('overview')}
            scanId={currentScanId || undefined}
          />
        </div>
      </div>
    );
  }

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
                { id: 'scan_results', label: 'Scan Results', icon: Search }
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
              onClick={() => setSelectedView('vulnerabilities')}
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
                        <span className="text-gray-500">{format(new Date(vuln.discoveredAt), 'MMM dd, HH:mm')}</span>
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
                      onClick={() => setSelectedView('vulnerabilities')}
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
              onClick={() => setSelectedView('vulnerabilities')}
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
                        <span className="text-gray-500">{format(new Date(vuln.discoveredAt), 'MMM dd, HH:mm')}</span>
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
                      onClick={() => setSelectedView('vulnerabilities')}
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
              onClick={() => setSelectedView('vulnerabilities')}
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
                        <span className="text-gray-500">{format(new Date(vuln.discoveredAt), 'MMM dd, HH:mm')}</span>
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
                      onClick={() => setSelectedView('vulnerabilities')}
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
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p className="mt-1">TrustHunt Enterprise Security Platform v1.0 | Powered by AI & Machine Learning</p>
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