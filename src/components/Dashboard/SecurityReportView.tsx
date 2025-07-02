import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  ArrowLeft, 
  Download, 
  Filter, 
  Search, 
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Code,
  Eye,
  Lock,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useSecurityStore } from '../../store/useSecurityStore';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const SecurityReportView: React.FC = () => {
  const { vulnerabilities, organizations } = useSecurityStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Generate mock vulnerabilities if none exist
  useEffect(() => {
    if (vulnerabilities.length === 0) {
      const mockVulnerabilities = generateMockVulnerabilities();
      mockVulnerabilities.forEach(vuln => {
        useSecurityStore.getState().addVulnerability(vuln);
      });
    }
  }, [vulnerabilities.length]);

  // Group vulnerabilities by class/component
  const vulnerabilitiesByClass = React.useMemo(() => {
    const grouped = new Map<string, typeof vulnerabilities>();
    
    vulnerabilities.forEach(vuln => {
      const className = vuln.location.split('/').pop() || 'Unknown';
      if (!grouped.has(className)) {
        grouped.set(className, []);
      }
      grouped.get(className)?.push(vuln);
    });
    
    return grouped;
  }, [vulnerabilities]);

  // Get unique classes/components
  const uniqueClasses = React.useMemo(() => {
    return Array.from(vulnerabilitiesByClass.keys()).sort();
  }, [vulnerabilitiesByClass]);

  // Filter vulnerabilities
  const filteredVulnerabilities = React.useMemo(() => {
    return vulnerabilities.filter(vuln => {
      const matchesSeverity = selectedSeverity === 'all' || vuln.severity === selectedSeverity;
      const matchesType = selectedType === 'all' || vuln.type === selectedType;
      const matchesClass = selectedClass === 'all' || vuln.location.includes(selectedClass);
      const matchesSearch = !searchTerm || 
        vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vuln.location.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSeverity && matchesType && matchesClass && matchesSearch;
    });
  }, [vulnerabilities, selectedSeverity, selectedType, selectedClass, searchTerm]);

  // Get unique vulnerability types
  const vulnerabilityTypes = React.useMemo(() => {
    const types = new Set(vulnerabilities.map(v => v.type));
    return Array.from(types).map(type => ({
      value: type,
      label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
  }, [vulnerabilities]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const stats = {
      total: filteredVulnerabilities.length,
      critical: filteredVulnerabilities.filter(v => v.severity === 'critical').length,
      high: filteredVulnerabilities.filter(v => v.severity === 'high').length,
      medium: filteredVulnerabilities.filter(v => v.severity === 'medium').length,
      low: filteredVulnerabilities.filter(v => v.severity === 'low').length,
      avgCvss: filteredVulnerabilities.length > 0 
        ? filteredVulnerabilities.reduce((sum, v) => sum + v.cvssScore, 0) / filteredVulnerabilities.length 
        : 0
    };
    return stats;
  }, [filteredVulnerabilities]);

  // Toggle expanded details
  const toggleDetails = (id: string) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDetails(newExpanded);
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'soql_injection': return <Code className="w-4 h-4" />;
      case 'crud_fls_violation': return <Shield className="w-4 h-4" />;
      case 'data_exposure': return <Eye className="w-4 h-4" />;
      case 'permission_escalation': return <Lock className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Export report
  const exportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: summaryStats,
      vulnerabilities: filteredVulnerabilities.map(v => ({
        id: v.id,
        title: v.title,
        severity: v.severity,
        type: v.type,
        cvssScore: v.cvssScore,
        location: v.location,
        description: v.description,
        businessImpact: v.businessImpact,
        remediation: v.remediation,
        discoveredAt: v.discoveredAt
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBack = () => {
    navigate('/');
  };

  // Generate mock vulnerabilities for demo
  function generateMockVulnerabilities() {
    const mockVulnerabilities = [
      {
        id: 'vuln-1',
        orgId: 'demo-org',
        type: 'soql_injection',
        severity: 'critical',
        title: 'SOQL Injection in CustomController',
        description: 'Dynamic SOQL construction without proper sanitization detected',
        location: 'CustomController.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 9.1,
        businessImpact: 'Potential unauthorized data access and database compromise',
        remediation: 'Use parameterized queries and input validation',
        evidence: [{
          type: 'code_snippet',
          content: "String query = 'SELECT Id, Name FROM Account WHERE Name = \\'' + userInput + '\\'';",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-2',
        orgId: 'demo-org',
        type: 'crud_fls_violation',
        severity: 'high',
        title: 'Missing Sharing Declaration',
        description: 'Apex class without sharing declaration allows unauthorized data access',
        location: 'DataProcessor.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 7.5,
        businessImpact: 'Users may access records they should not have permission to view',
        remediation: 'Add "with sharing" to class declaration',
        evidence: [{
          type: 'code_snippet',
          content: "public class DataProcessor {\n  // Missing 'with sharing' declaration\n  public static void processData() {\n    // Data processing logic\n  }\n}",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-3',
        orgId: 'demo-org',
        type: 'data_exposure',
        severity: 'medium',
        title: 'Hardcoded Credentials in Apex',
        description: 'Sensitive credentials found hardcoded in source code',
        location: 'IntegrationService.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 6.8,
        businessImpact: 'Credentials may be exposed to unauthorized users',
        remediation: 'Use Custom Settings or Named Credentials',
        evidence: [{
          type: 'code_snippet',
          content: "private static final String API_KEY = 'a1b2c3d4e5f6g7h8i9j0';\nprivate static final String API_SECRET = 'secret_key_value_should_not_be_here';",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-4',
        orgId: 'demo-org',
        type: 'permission_escalation',
        severity: 'high',
        title: 'Excessive Profile Permissions',
        description: 'Custom profile has unnecessary administrative permissions',
        location: 'Profile: Sales Manager',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 8.2,
        businessImpact: 'Users may have excessive privileges leading to potential data breaches',
        remediation: 'Review and restrict profile permissions following least privilege principle',
        evidence: [{
          type: 'code_snippet',
          content: "Profile permissions include:\n- Modify All Data\n- View All Data\n- Manage Users\n- Assign Permission Sets",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-5',
        orgId: 'demo-org',
        type: 'xss',
        severity: 'medium',
        title: 'Reflected XSS in Visualforce Page',
        description: 'User input is reflected without proper encoding',
        location: 'AccountDetails.page',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 6.1,
        businessImpact: 'Potential cross-site scripting attacks against users',
        remediation: 'Use HTMLENCODE() or JSENCODE() functions',
        evidence: [{
          type: 'code_snippet',
          content: "<apex:outputText value=\"{!$Request.param}\" escape=\"false\"/>",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-6',
        orgId: 'demo-org',
        type: 'soql_injection',
        severity: 'critical',
        title: 'SOQL Injection in REST API',
        description: 'User-controlled input used directly in SOQL query',
        location: 'AccountRESTService.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 9.3,
        businessImpact: 'Complete data exposure and potential data manipulation',
        remediation: 'Use parameterized queries and input validation',
        evidence: [{
          type: 'code_snippet',
          content: "@RestResource(urlMapping='/accounts/*')\nglobal class AccountRESTService {\n  @HttpGet\n  global static List<Account> getAccounts() {\n    String filter = RestContext.request.params.get('filter');\n    return Database.query('SELECT Id, Name FROM Account WHERE ' + filter);\n  }\n}",
          timestamp: new Date()
        }]
      },
      {
        id: 'vuln-7',
        orgId: 'demo-org',
        type: 'data_exposure',
        severity: 'low',
        title: 'Debug Logs Containing PII',
        description: 'Personal identifiable information logged in debug statements',
        location: 'UserService.cls',
        discoveredAt: new Date(),
        status: 'open',
        cvssScore: 3.5,
        businessImpact: 'PII may be exposed in logs accessible to administrators',
        remediation: 'Remove or mask sensitive data in debug logs',
        evidence: [{
          type: 'code_snippet',
          content: "System.debug('User email: ' + user.Email);\nSystem.debug('SSN: ' + contact.SSN__c);",
          timestamp: new Date()
        }]
      }
    ];
    
    return mockVulnerabilities;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-6 h-6 text-red-600 mr-3" />
                Security Report
              </h2>
              <p className="text-gray-600 mt-1">
                Comprehensive security analysis results for your Salesforce organization
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportReport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{summaryStats.total}</div>
            <div className="text-xs text-gray-600">Total Issues</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{summaryStats.critical}</div>
            <div className="text-xs text-red-600">Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{summaryStats.high}</div>
            <div className="text-xs text-orange-600">High</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{summaryStats.medium}</div>
            <div className="text-xs text-yellow-600">Medium</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summaryStats.low}</div>
            <div className="text-xs text-green-600">Low</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{summaryStats.avgCvss.toFixed(1)}</div>
            <div className="text-xs text-blue-600">Avg CVSS</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vulnerabilities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-64"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {vulnerabilityTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>

            {/* Class/Component Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Classes/Components</option>
              {uniqueClasses.map(className => (
                <option key={className} value={className}>{className}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class/Component Matrix View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Issues by Class/Component</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class/Component
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Critical
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  High
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medium
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Low
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.from(vulnerabilitiesByClass.entries()).map(([className, vulns]) => {
                const criticalCount = vulns.filter(v => v.severity === 'critical').length;
                const highCount = vulns.filter(v => v.severity === 'high').length;
                const mediumCount = vulns.filter(v => v.severity === 'medium').length;
                const lowCount = vulns.filter(v => v.severity === 'low').length;
                const totalCount = vulns.length;
                
                // Calculate risk score (0-10)
                const riskScore = (criticalCount * 10 + highCount * 7 + mediumCount * 4 + lowCount * 1) / 
                                 (totalCount > 0 ? totalCount : 1);
                
                return (
                  <tr 
                    key={className} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedClass(className === selectedClass ? 'all' : className)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {className}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {criticalCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {criticalCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {highCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {highCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {mediumCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {mediumCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lowCount > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {lowCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {totalCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${
                              riskScore > 7 ? 'bg-red-600' : 
                              riskScore > 5 ? 'bg-orange-500' : 
                              riskScore > 3 ? 'bg-yellow-400' : 'bg-green-500'
                            }`} 
                            style={{ width: `${Math.min(100, riskScore * 10)}%` }}
                          ></div>
                        </div>
                        <span>{riskScore.toFixed(1)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Vulnerability List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Detailed Vulnerability Report ({filteredVulnerabilities.length} issues)
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredVulnerabilities.map((vulnerability) => (
            <div key={vulnerability.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start space-x-4 mb-3">
                    <div className={`p-2 rounded-lg ${getSeverityColor(vulnerability.severity)}`}>
                      {getSeverityIcon(vulnerability.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{vulnerability.title}</h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(vulnerability.severity)}`}>
                          {vulnerability.severity.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          CVSS {vulnerability.cvssScore}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          {getTypeIcon(vulnerability.type)}
                          <span>{vulnerability.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="w-4 h-4" />
                          <span>{vulnerability.location}</span>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{vulnerability.description}</p>
                    </div>
                  </div>

                  {/* Expandable Details */}
                  <div className="ml-12">
                    <button
                      onClick={() => toggleDetails(vulnerability.id)}
                      className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {expandedDetails.has(vulnerability.id) ? (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          <span>Hide Details</span>
                        </>
                      ) : (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <span>Show Details</span>
                        </>
                      )}
                    </button>

                    {expandedDetails.has(vulnerability.id) && (
                      <div className="mt-4 space-y-4">
                        {/* Business Impact */}
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h5 className="font-medium text-red-900 mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Business Impact
                          </h5>
                          <p className="text-sm text-red-800">{vulnerability.businessImpact}</p>
                        </div>

                        {/* Remediation */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <h5 className="font-medium text-green-900 mb-2 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Remediation
                          </h5>
                          <p className="text-sm text-green-800">{vulnerability.remediation}</p>
                        </div>

                        {/* Code Evidence */}
                        {vulnerability.evidence && vulnerability.evidence.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                              <Code className="w-4 h-4 mr-2" />
                              Code Evidence
                            </h5>
                            <div className="bg-gray-800 text-gray-100 p-4 rounded-md overflow-x-auto">
                              <pre className="text-sm font-mono">
                                {vulnerability.evidence[0].content}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State for Filtered Results */}
      {filteredVulnerabilities.length === 0 && vulnerabilities.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Filter className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Vulnerabilities Match Your Filters</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search criteria or filters to see more results.
          </p>
          <button
            onClick={() => {
              setSelectedSeverity('all');
              setSelectedType('all');
              setSelectedClass('all');
              setSearchTerm('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};