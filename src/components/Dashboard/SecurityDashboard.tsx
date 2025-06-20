import React, { useEffect, useState } from 'react';
import { useSecurityStore } from '../../store/useSecurityStore';
import { useSalesforceConnection } from '../../hooks/useSalesforceConnection';
import { MetricsOverview } from './MetricsOverview';
import { VulnerabilityChart } from './VulnerabilityChart';
import { AISecurityMonitor } from './AISecurityMonitor';
import { CrossOrgAnalysisView } from './CrossOrgAnalysisView';
import { TemporalRiskView } from './TemporalRiskView';
import { ActiveScansView } from './ActiveScansView';
import { DASTEngineView } from './DASTEngineView';
import { NavigationHeader } from './NavigationHeader';
import { AlertsPanel } from './AlertsPanel';
import { QuickActions } from './QuickActions';
import { SystemStatus } from './SystemStatus';
import { SalesforceConnectionModal } from './SalesforceConnectionModal';
import { ConnectedOrganizations } from './ConnectedOrganizations';
import { Plus, Zap, Shield, CheckCircle, Settings, Code, Loader, User, ExternalLink } from 'lucide-react';

export const SecurityDashboard: React.FC = () => {
  const [selectedView, setSelectedView] = useState<'overview' | 'vulnerabilities' | 'scans' | 'reports'>('overview');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  
  const {
    vulnerabilities,
    aiSecurityEvents,
    crossOrgAnalyses,
    temporalRiskEvents,
    activeScans,
    dashboardMetrics,
    isLoading,
    organizations
  } = useSecurityStore();

  const {
    connect,
    disconnect,
    performSecurityScan,
    isConnecting,
    connectionError,
    clearError,
    connectedOrganizations
  } = useSalesforceConnection();

  const connectedOrg = connectedOrganizations[0]; // Use first connected org
  const isConnected = connectedOrganizations.length > 0;

  const handleConnect = async () => {
    try {
      await connect();
      setShowConnectionModal(false);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleStartScan = async (orgId: string) => {
    try {
      await performSecurityScan(orgId);
    } catch (error) {
      console.error('Scan failed:', error);
    }
  };

  const handleStartDASTScan = (config: any) => {
    console.log('Starting DAST scan with config:', config);
  };

  const handleStopDASTScan = (scanId: string) => {
    console.log('Stopping DAST scan:', scanId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initializing SecureForce Pro</h2>
          <p className="text-gray-600">Loading security data and establishing connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <NavigationHeader 
        selectedView={selectedView} 
        onViewChange={setSelectedView}
      />

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* System Status Bar */}
        <SystemStatus />

        {/* Connection Status & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            {isConnected && connectedOrg ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{connectedOrg.name}</h3>
                      <p className="text-sm text-gray-600">{connectedOrg.instanceUrl}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartScan(connectedOrg.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Start Scan</span>
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Type</span>
                    <div className="font-medium text-gray-900 capitalize">{connectedOrg.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Risk Score</span>
                    <div className="font-medium text-gray-900">{connectedOrg.riskScore}%</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Vulnerabilities</span>
                    <div className="font-medium text-gray-900">{vulnerabilities.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status</span>
                    <div className="font-medium text-green-600">Connected</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  {isConnecting ? (
                    <Loader className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <ExternalLink className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {isConnecting ? 'Connecting to Salesforce...' : 'Connect to Your Salesforce Org'}
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  {isConnecting 
                    ? 'Establishing secure OAuth connection with Salesforce...'
                    : 'Use OAuth 2.0 to securely connect to your Salesforce org and start comprehensive security analysis.'
                  }
                </p>
                
                {!isConnecting && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setShowConnectionModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-2 mx-auto shadow-lg hover:shadow-xl"
                    >
                      <ExternalLink className="w-5 h-5" />
                      <span>Connect with OAuth 2.0</span>
                    </button>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
                      <div className="flex items-start space-x-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-left">
                          <h4 className="text-sm font-medium text-blue-900">Secure OAuth Authentication</h4>
                          <p className="text-xs text-blue-800 mt-1">
                            Uses industry-standard OAuth 2.0 flow for secure authentication. 
                            No passwords are stored or transmitted directly.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>OAuth 2.0</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>Auto-Scan</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span>Real-Time Analysis</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <AlertsPanel />
          </div>
        </div>

        {/* Only show dashboard content if we have a connected organization */}
        {isConnected && connectedOrg && (
          <>
            {selectedView === 'overview' && (
              <>
                {/* Metrics Overview */}
                <MetricsOverview metrics={dashboardMetrics} />

                {/* DAST Engine - Featured */}
                <div className="mb-8">
                  <DASTEngineView 
                    scans={[]}
                    vulnerabilities={[]}
                    onStartScan={handleStartDASTScan}
                    onStopScan={handleStopDASTScan}
                  />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                  {/* Vulnerability Chart */}
                  <VulnerabilityChart vulnerabilities={vulnerabilities} />
                  
                  {/* AI Security Monitor */}
                  <AISecurityMonitor events={aiSecurityEvents} />
                </div>

                {/* Secondary Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Cross-Org Analysis */}
                  <CrossOrgAnalysisView analyses={crossOrgAnalyses} />
                  
                  {/* Temporal Risk View */}
                  <TemporalRiskView events={temporalRiskEvents} />
                  
                  {/* Active Scans */}
                  <ActiveScansView scans={activeScans} />
                </div>
              </>
            )}

            {selectedView === 'vulnerabilities' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2">
                  <VulnerabilityChart vulnerabilities={vulnerabilities} />
                </div>
                <div>
                  <AISecurityMonitor events={aiSecurityEvents} />
                </div>
              </div>
            )}

            {selectedView === 'scans' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <DASTEngineView 
                  scans={[]}
                  vulnerabilities={[]}
                  onStartScan={handleStartDASTScan}
                  onStopScan={handleStopDASTScan}
                />
                <ActiveScansView scans={activeScans} />
              </div>
            )}

            {selectedView === 'reports' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CrossOrgAnalysisView analyses={crossOrgAnalyses} />
                <TemporalRiskView events={temporalRiskEvents} />
              </div>
            )}
          </>
        )}

        {/* Empty State for No Connection */}
        {!isConnected && !isLoading && !isConnecting && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Salesforce Connection</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Connect to your Salesforce org using OAuth 2.0 to start comprehensive security analysis and monitoring.
            </p>
          </div>
        )}
      </div>

      {/* Connection Modal */}
      <SalesforceConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnect}
        isConnecting={isConnecting}
        error={connectionError}
      />

      {/* Connection Error Display */}
      {connectionError && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-md">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">Connection Error</h4>
              <p className="text-sm mt-1">{connectionError}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-4 text-red-700 hover:text-red-900 flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};