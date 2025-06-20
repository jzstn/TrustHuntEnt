import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  Building2,
  Zap,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useSecurityStore } from '../../store/useSecurityStore';

interface EnterpriseMetrics {
  totalOrganizations: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  averageRiskScore: number;
  activeScans: number;
  complianceScore: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastUpdated: Date;
}

interface ComplianceStatus {
  framework: string;
  status: 'compliant' | 'non_compliant' | 'partial';
  score: number;
  issues: number;
}

export const EnterpriseSecurityDashboard: React.FC = () => {
  const [enterpriseMetrics, setEnterpriseMetrics] = useState<EnterpriseMetrics>({
    totalOrganizations: 0,
    totalVulnerabilities: 0,
    criticalVulnerabilities: 0,
    averageRiskScore: 0,
    activeScans: 0,
    complianceScore: 0,
    systemHealth: 'healthy',
    lastUpdated: new Date()
  });

  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus[]>([
    { framework: 'SOC 2', status: 'compliant', score: 95, issues: 2 },
    { framework: 'GDPR', status: 'partial', score: 78, issues: 8 },
    { framework: 'HIPAA', status: 'compliant', score: 92, issues: 3 },
    { framework: 'PCI DSS', status: 'non_compliant', score: 65, issues: 12 }
  ]);

  const [realTimeAlerts, setRealTimeAlerts] = useState([
    {
      id: '1',
      severity: 'critical' as const,
      message: 'SOQL injection detected in production org',
      timestamp: new Date(),
      orgId: 'prod-org-1'
    },
    {
      id: '2',
      severity: 'high' as const,
      message: 'Privilege escalation vulnerability found',
      timestamp: new Date(Date.now() - 300000),
      orgId: 'staging-org-2'
    }
  ]);

  const { organizations, vulnerabilities, activeScans } = useSecurityStore();

  useEffect(() => {
    // Update enterprise metrics based on real data
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length;
    const avgRiskScore = organizations.length > 0 
      ? organizations.reduce((sum, org) => sum + org.riskScore, 0) / organizations.length 
      : 0;

    setEnterpriseMetrics({
      totalOrganizations: organizations.length,
      totalVulnerabilities: vulnerabilities.length,
      criticalVulnerabilities: criticalCount,
      averageRiskScore: Math.round(avgRiskScore),
      activeScans: activeScans.filter(s => s.status === 'running').length,
      complianceScore: Math.max(0, 100 - (criticalCount * 10)),
      systemHealth: criticalCount > 5 ? 'critical' : criticalCount > 2 ? 'warning' : 'healthy',
      lastUpdated: new Date()
    });
  }, [organizations, vulnerabilities, activeScans]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'non_compliant': return 'text-red-600 bg-red-100';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Security Command Center</h1>
            <p className="text-sm text-gray-600">Real-time security monitoring across all Salesforce environments</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(enterpriseMetrics.systemHealth)}`}>
              <Activity className="w-4 h-4" />
              <span>System {enterpriseMetrics.systemHealth}</span>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-6 py-6">
        {/* Enterprise Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Organizations</p>
                <p className="text-3xl font-bold text-gray-900">{enterpriseMetrics.totalOrganizations}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +2 this month
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vulnerabilities</p>
                <p className="text-3xl font-bold text-gray-900">{enterpriseMetrics.totalVulnerabilities}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <div className="mt-2 text-xs text-red-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +{enterpriseMetrics.totalVulnerabilities} new
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Issues</p>
                <p className="text-3xl font-bold text-red-600">{enterpriseMetrics.criticalVulnerabilities}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <div className="mt-2 text-xs text-red-600">
              Immediate attention required
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Risk Score</p>
                <p className="text-3xl font-bold text-gray-900">{enterpriseMetrics.averageRiskScore}%</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2 text-xs text-green-600">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +5% improvement
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Scans</p>
                <p className="text-3xl font-bold text-blue-600">{enterpriseMetrics.activeScans}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Real-time monitoring
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance</p>
                <p className="text-3xl font-bold text-gray-900">{enterpriseMetrics.complianceScore}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Across all frameworks
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Real-Time Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Zap className="w-5 h-5 text-red-600 mr-2" />
                Real-Time Alerts
              </h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                {realTimeAlerts.length} Active
              </span>
            </div>

            <div className="space-y-4">
              {realTimeAlerts.map((alert) => (
                <div key={alert.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{alert.orgId}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {alert.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                      Investigate
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All Alerts
              </button>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                Compliance Status
              </h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View Details
              </button>
            </div>

            <div className="space-y-4">
              {complianceStatus.map((compliance, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">{compliance.framework}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getComplianceColor(compliance.status)}`}>
                      {compliance.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-600">Compliance Score</span>
                    <span className="text-xs font-medium text-gray-900">{compliance.score}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className={`h-2 rounded-full ${
                        compliance.score >= 90 ? 'bg-green-600' :
                        compliance.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${compliance.score}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{compliance.issues} issues to resolve</span>
                    <button className="text-blue-600 hover:text-blue-700 font-medium">
                      Fix Issues
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Performance */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 text-blue-600 mr-2" />
                System Performance
              </h3>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* API Response Time */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">API Response Time</span>
                  <span className="text-sm font-medium text-gray-900">245ms</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <div className="text-xs text-green-600 mt-1">Excellent</div>
              </div>

              {/* Scan Throughput */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Scan Throughput</span>
                  <span className="text-sm font-medium text-gray-900">12 orgs/hour</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
                <div className="text-xs text-blue-600 mt-1">Above target</div>
              </div>

              {/* System Uptime */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">System Uptime</span>
                  <span className="text-sm font-medium text-gray-900">99.9%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '99%' }}></div>
                </div>
                <div className="text-xs text-green-600 mt-1">30 days</div>
              </div>

              {/* Error Rate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Error Rate</span>
                  <span className="text-sm font-medium text-gray-900">0.02%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '98%' }}></div>
                </div>
                <div className="text-xs text-green-600 mt-1">Well below threshold</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">2.4M</div>
                  <div className="text-xs text-gray-600">API Calls Today</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">156</div>
                  <div className="text-xs text-gray-600">Scans Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Insights */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            Enterprise Security Insights
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Risk Trend Analysis</h4>
              <p className="text-xs text-blue-800">
                Overall security posture has improved by 15% over the last 30 days. 
                Critical vulnerabilities decreased by 40% across all environments.
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-2">Compliance Improvement</h4>
              <p className="text-xs text-green-800">
                SOC 2 compliance increased to 95%. GDPR compliance needs attention 
                with 8 outstanding data protection issues.
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900 mb-2">AI Security Monitoring</h4>
              <p className="text-xs text-purple-800">
                Einstein GPT usage patterns show 23% increase. No unauthorized 
                AI data access detected in the last 7 days.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {enterpriseMetrics.lastUpdated.toLocaleString()}</p>
          <p className="mt-1">SecureForce Pro Enterprise Security Platform v1.0</p>
        </div>
      </div>
    </div>
  );
};