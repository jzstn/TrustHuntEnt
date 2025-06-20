import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Zap, 
  Shield, 
  AlertTriangle, 
  Play, 
  Pause, 
  Settings, 
  FileText,
  TrendingUp,
  Clock,
  Target,
  Bug,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { DASTScan, DASTVulnerability, CrawledEndpoint } from '../../types/dast';
import { format } from 'date-fns';

interface DASTEngineViewProps {
  scans: DASTScan[];
  vulnerabilities: DASTVulnerability[];
  onStartScan: (config: any) => void;
  onStopScan: (scanId: string) => void;
}

export const DASTEngineView: React.FC<DASTEngineViewProps> = ({
  scans,
  vulnerabilities,
  onStartScan,
  onStopScan
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'scans' | 'vulnerabilities' | 'crawler'>('overview');
  const [selectedScan, setSelectedScan] = useState<DASTScan | null>(null);

  const runningScans = scans.filter(s => ['queued', 'crawling', 'testing', 'verifying'].includes(s.status));
  const completedScans = scans.filter(s => s.status === 'completed');
  const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
  const highVulns = vulnerabilities.filter(v => v.severity === 'high');

  const getScanStatusColor = (status: string) => {
    switch (status) {
      case 'queued': return 'text-gray-600 bg-gray-100';
      case 'crawling': return 'text-blue-600 bg-blue-100';
      case 'testing': return 'text-orange-600 bg-orange-100';
      case 'verifying': return 'text-purple-600 bg-purple-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Search className="w-5 h-5 text-purple-600 mr-2" />
            DAST Engine
          </h3>
          <p className="text-sm text-gray-600">Dynamic Application Security Testing for Salesforce</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onStartScan({})}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Start Scan</span>
          </button>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{runningScans.length}</div>
          <div className="text-xs text-blue-600">Active Scans</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{criticalVulns.length}</div>
          <div className="text-xs text-red-600">Critical</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{highVulns.length}</div>
          <div className="text-xs text-orange-600">High Risk</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{completedScans.length}</div>
          <div className="text-xs text-green-600">Completed</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'scans', label: 'Scans', icon: Target },
          { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Bug },
          { id: 'crawler', label: 'Crawler', icon: Search }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Recent Scan Activity */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Clock className="w-4 h-4 text-purple-600 mr-2" />
              Recent Scan Activity
            </h4>
            <div className="space-y-3">
              {scans.slice(0, 3).map((scan) => (
                <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScanStatusColor(scan.status)}`}>
                      {scan.status.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{scan.scanType.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-xs text-gray-600">Org: {scan.orgId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{scan.vulnerabilitiesFound} vulns</p>
                    <p className="text-xs text-gray-600">{format(scan.startedAt, 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Critical Vulnerabilities */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
              Critical Vulnerabilities
            </h4>
            <div className="space-y-3">
              {criticalVulns.slice(0, 3).map((vuln) => (
                <div key={vuln.id} className="flex items-start space-x-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{vuln.title}</p>
                    <p className="text-xs text-gray-600 mt-1">{vuln.endpoint}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                        CVSS {vuln.cvssScore}
                      </span>
                      <span className="text-xs text-gray-500">{format(vuln.discoveredAt, 'MMM dd')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Scan History</h4>
            <button
              onClick={() => onStartScan({})}
              className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition-colors"
            >
              New Scan
            </button>
          </div>
          
          <div className="space-y-3">
            {scans.map((scan) => (
              <div key={scan.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScanStatusColor(scan.status)}`}>
                      {scan.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {scan.scanType.replace('_', ' ').toUpperCase()} Scan
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {scan.status === 'running' && (
                      <button
                        onClick={() => onStopScan(scan.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    )}
                    <button className="text-gray-600 hover:text-gray-700">
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Organization</p>
                    <p className="font-medium">{scan.orgId}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">URLs Crawled</p>
                    <p className="font-medium">{scan.crawledUrls}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Vulnerabilities</p>
                    <p className="font-medium text-red-600">{scan.vulnerabilitiesFound}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Started</p>
                    <p className="font-medium">{format(scan.startedAt, 'MMM dd, HH:mm')}</p>
                  </div>
                </div>
                
                {scan.status !== 'completed' && scan.status !== 'failed' && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{scan.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${scan.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'vulnerabilities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Discovered Vulnerabilities</h4>
            <div className="flex items-center space-x-2">
              <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                <option>All Severities</option>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-3">
            {vulnerabilities.map((vuln) => (
              <div key={vuln.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">CVSS {vuln.cvssScore}</span>
                      {vuln.verificationStatus === 'verified' && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <h5 className="text-sm font-medium text-gray-900 mb-1">{vuln.title}</h5>
                    <p className="text-xs text-gray-600 mb-2">{vuln.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Endpoint: {vuln.endpoint}</span>
                      <span>Discovered: {format(vuln.discoveredAt, 'MMM dd, HH:mm')}</span>
                      {vuln.cweId && <span>CWE: {vuln.cweId}</span>}
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-100 rounded p-2 text-xs">
                  <p className="text-gray-600 mb-1">Payload:</p>
                  <code className="text-gray-800 font-mono">{vuln.payload}</code>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">Business Impact:</span>
                    <span className="text-xs text-gray-800">{vuln.businessImpact.substring(0, 50)}...</span>
                  </div>
                  <button className="text-purple-600 hover:text-purple-700 text-xs font-medium">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'crawler' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Web Crawler Status</h4>
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
              <span>Active</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">247</div>
              <div className="text-xs text-blue-600">Lightning Pages</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">89</div>
              <div className="text-xs text-green-600">Visualforce</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">156</div>
              <div className="text-xs text-purple-600">API Endpoints</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">45</div>
              <div className="text-xs text-orange-600">Components</div>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-3">Crawling Progress</h5>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Lightning Experience</span>
                  <span>85%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Visualforce Pages</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>API Discovery</span>
                  <span>78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};