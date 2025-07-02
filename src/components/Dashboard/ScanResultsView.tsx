import React, { useState } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Download, 
  FileText, 
  Code, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';

interface ScanResultsViewProps {
  onBack?: () => void;
  scanId?: string;
}

// Comprehensive scan result format based on the requirements
interface ScanResult {
  generatedAt: string;
  scanMetadata: {
    scanType: string;
    coverage: {
      apexClasses: number;
      testClasses: number;
      visualforcePages: number;
      lightningComponents: number;
      profiles: number;
      users: number;
    }
  };
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    avgCvss: number;
    riskScore: number;
  };
  vulnerabilities: Array<{
    id: string;
    title: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: string;
    cvssScore: number;
    location: string;
    lineNumber?: number;
    description: string;
    businessImpact: string;
    remediation: string;
    cweId?: string;
    discoveredAt: string;
    evidence: string;
    severity_justification: string;
  }>;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
    compliance: string[];
  };
}

export const ScanResultsView: React.FC<ScanResultsViewProps> = ({ onBack, scanId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedVulns, setExpandedVulns] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'critical']));

  // Sample scan result data
  const scanResult: ScanResult = {
    generatedAt: new Date().toISOString(),
    scanMetadata: {
      scanType: "unified_comprehensive",
      coverage: {
        apexClasses: 156,
        testClasses: 87,
        visualforcePages: 42,
        lightningComponents: 68,
        profiles: 15,
        users: 124
      }
    },
    summary: {
      total: 28,
      critical: 3,
      high: 8,
      medium: 12,
      low: 5,
      avgCvss: 6.7,
      riskScore: 68
    },
    vulnerabilities: [
      {
        id: "SOQL-INJ-001",
        title: "SOQL Injection in AccountController.cls",
        severity: "critical",
        type: "soql_injection",
        cvssScore: 9.1,
        location: "classes/AccountController.cls",
        lineNumber: 42,
        description: "Dynamic SOQL query constructed with user input without proper sanitization",
        businessImpact: "Attackers could access unauthorized data, potentially exposing sensitive customer information",
        remediation: "Use parameterized queries with proper binding or apply String.escapeSingleQuotes() to user input",
        cweId: "CWE-89",
        discoveredAt: new Date().toISOString(),
        evidence: "String query = 'SELECT Id, Name FROM Account WHERE Name LIKE \\'' + searchTerm + '\\'';",
        severity_justification: "Critical due to direct exposure of customer data and potential for complete database access"
      },
      {
        id: "SHARING-001",
        title: "Missing Sharing Declaration in OpportunityService.cls",
        severity: "high",
        type: "crud_fls_violation",
        cvssScore: 7.5,
        location: "classes/OpportunityService.cls",
        lineNumber: 1,
        description: "Apex class does not specify sharing model, defaulting to 'without sharing'",
        businessImpact: "Users may access records they should not have permission to view or modify",
        remediation: "Add 'with sharing' to class declaration to enforce sharing rules",
        cweId: "CWE-732",
        discoveredAt: new Date().toISOString(),
        evidence: "public class OpportunityService {",
        severity_justification: "High severity due to potential data leakage across multiple records"
      },
      {
        id: "CRED-001",
        title: "Hardcoded API Key in IntegrationService.cls",
        severity: "critical",
        type: "data_exposure",
        cvssScore: 8.8,
        location: "classes/IntegrationService.cls",
        lineNumber: 24,
        description: "API key hardcoded in Apex class source code",
        businessImpact: "Credentials may be exposed to unauthorized users with code access",
        remediation: "Store sensitive credentials in Custom Settings or Named Credentials",
        cweId: "CWE-798",
        discoveredAt: new Date().toISOString(),
        evidence: "private static final String API_KEY = 'ak_live_51KdJkEFjx7pL8Jn5vVCizU7Fb';",
        severity_justification: "Critical due to exposure of production credentials that could lead to system compromise"
      },
      {
        id: "XSS-001",
        title: "Reflected XSS in AccountDetail.page",
        severity: "high",
        type: "xss",
        cvssScore: 6.5,
        location: "pages/AccountDetail.page",
        lineNumber: 37,
        description: "Visualforce page outputs URL parameter without encoding",
        businessImpact: "Attackers could inject malicious scripts executed in users' browsers",
        remediation: "Use HTMLENCODE() or JSENCODE() functions to encode user input",
        cweId: "CWE-79",
        discoveredAt: new Date().toISOString(),
        evidence: "<apex:outputText value=\"{!$Request.name}\" escape=\"false\"/>",
        severity_justification: "High severity due to potential for session hijacking and credential theft"
      },
      {
        id: "PERM-001",
        title: "Excessive System Administrator Profiles",
        severity: "high",
        type: "permission_escalation",
        cvssScore: 7.2,
        location: "Profile Configuration",
        description: "5 custom System Administrator profiles detected with full system access",
        businessImpact: "Increased attack surface and potential for privilege abuse",
        remediation: "Consolidate admin profiles and implement least privilege principle",
        cweId: "CWE-250",
        discoveredAt: new Date().toISOString(),
        evidence: "Custom Admin (5), Sales Admin (3), Marketing Admin (2), Support Admin (1), Integration Admin (4)",
        severity_justification: "High severity due to excessive administrative access across the organization"
      },
      {
        id: "CRUD-001",
        title: "Missing CRUD Checks in ContactController.cls",
        severity: "medium",
        type: "crud_fls_violation",
        cvssScore: 5.4,
        location: "classes/ContactController.cls",
        lineNumber: 78,
        description: "DML operations performed without checking CRUD permissions",
        businessImpact: "Users may perform operations they lack permission for",
        remediation: "Add CRUD permission checks using Schema.sObjectType.Contact.isUpdateable() before DML operations",
        cweId: "CWE-732",
        discoveredAt: new Date().toISOString(),
        evidence: "update contacts;",
        severity_justification: "Medium severity as it requires existing access to the application"
      },
      {
        id: "FLS-001",
        title: "Missing Field-Level Security Checks in LeadService.cls",
        severity: "medium",
        type: "crud_fls_violation",
        cvssScore: 5.2,
        location: "classes/LeadService.cls",
        lineNumber: 103,
        description: "Sensitive fields accessed without FLS checks",
        businessImpact: "Users may access field data they shouldn't have permission to view",
        remediation: "Add field-level security checks using Schema.sObjectType.Lead.fields.Email.isAccessible()",
        cweId: "CWE-732",
        discoveredAt: new Date().toISOString(),
        evidence: "Lead.Email, Lead.Phone, Lead.AnnualRevenue accessed without FLS checks",
        severity_justification: "Medium severity due to potential exposure of sensitive lead information"
      },
      {
        id: "INACT-001",
        title: "Inactive Users with Admin Access",
        severity: "medium",
        type: "permission_escalation",
        cvssScore: 6.2,
        location: "User Management",
        description: "3 inactive users with System Administrator profile",
        businessImpact: "Dormant accounts may be compromised without detection",
        remediation: "Deactivate or remove admin privileges from inactive user accounts",
        cweId: "CWE-16",
        discoveredAt: new Date().toISOString(),
        evidence: "Users inactive for 90+ days: admin1@example.com, integration.user@example.com, temp.admin@example.com",
        severity_justification: "Medium severity due to potential for account takeover"
      }
    ],
    recommendations: {
      immediate: [
        "Remove hardcoded API keys from IntegrationService.cls",
        "Fix SOQL injection vulnerability in AccountController.cls",
        "Add encoding to AccountDetail.page to prevent XSS"
      ],
      shortTerm: [
        "Implement 'with sharing' declarations in all Apex classes",
        "Add CRUD/FLS checks to all data operations",
        "Consolidate System Administrator profiles",
        "Deactivate or downgrade inactive admin users"
      ],
      longTerm: [
        "Implement a secure coding review process",
        "Establish regular security scanning in CI/CD pipeline",
        "Create a comprehensive security testing suite",
        "Develop organization-wide security standards"
      ],
      compliance: [
        "Document remediation for SOX compliance",
        "Update security controls documentation for GDPR",
        "Implement additional logging for compliance audits",
        "Establish quarterly security review process"
      ]
    }
  };

  // Filter vulnerabilities based on search and filters
  const filteredVulnerabilities = scanResult.vulnerabilities.filter(vuln => {
    const matchesSeverity = selectedSeverity === 'all' || vuln.severity === selectedSeverity;
    const matchesType = selectedType === 'all' || vuln.type === selectedType;
    const matchesSearch = searchTerm === '' || 
      vuln.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSeverity && matchesType && matchesSearch;
  });

  // Get unique vulnerability types
  const vulnerabilityTypes = [...new Set(scanResult.vulnerabilities.map(v => v.type))].map(type => ({
    value: type,
    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }));

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const toggleExpanded = (vulnId: string) => {
    const newExpanded = new Set(expandedVulns);
    if (newExpanded.has(vulnId)) {
      newExpanded.delete(vulnId);
    } else {
      newExpanded.add(vulnId);
    }
    setExpandedVulns(newExpanded);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(scanResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-scan-report-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Shield className="w-6 h-6 text-blue-600 mr-3" />
                Comprehensive Security Scan Results
              </h2>
              <p className="text-gray-600 mt-1">
                Scan completed on {format(new Date(scanResult.generatedAt), 'MMMM dd, yyyy HH:mm')}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{scanResult.summary.total}</div>
            <div className="text-xs text-gray-600">Total Issues</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{scanResult.summary.critical}</div>
            <div className="text-xs text-red-600">Critical</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{scanResult.summary.high}</div>
            <div className="text-xs text-orange-600">High</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{scanResult.summary.riskScore}</div>
            <div className="text-xs text-blue-600">Risk Score</div>
          </div>
        </div>

        {/* Scan Coverage */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Scan Coverage</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.apexClasses}</div>
              <div className="text-xs text-gray-600">Apex Classes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.testClasses}</div>
              <div className="text-xs text-gray-600">Test Classes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.visualforcePages}</div>
              <div className="text-xs text-gray-600">Visualforce Pages</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.lightningComponents}</div>
              <div className="text-xs text-gray-600">Lightning Components</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.profiles}</div>
              <div className="text-xs text-gray-600">Profiles</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{scanResult.scanMetadata.coverage.users}</div>
              <div className="text-xs text-gray-600">Users</div>
            </div>
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
          </div>
        </div>
      </div>

      {/* Critical Vulnerabilities Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div 
          className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('critical')}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Critical Vulnerabilities ({scanResult.summary.critical})
            </h3>
          </div>
          {expandedSections.has('critical') ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has('critical') && (
          <div className="divide-y divide-gray-200">
            {scanResult.vulnerabilities
              .filter(v => v.severity === 'critical')
              .map((vulnerability) => (
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
                              <Code className="w-4 h-4" />
                              <span>{vulnerability.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FileText className="w-4 h-4" />
                              <span>{vulnerability.location}</span>
                              {vulnerability.lineNumber && (
                                <span className="text-gray-500">Line {vulnerability.lineNumber}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(vulnerability.discoveredAt), 'MMM dd, yyyy')}</span>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-3">{vulnerability.description}</p>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <div className="ml-12">
                        <button
                          onClick={() => toggleExpanded(vulnerability.id)}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {expandedVulns.has(vulnerability.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span>
                            {expandedVulns.has(vulnerability.id) ? 'Hide Details' : 'Show Details'}
                          </span>
                        </button>

                        {expandedVulns.has(vulnerability.id) && (
                          <div className="mt-4 space-y-4">
                            {/* Evidence */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  <Code className="w-4 h-4 mr-2" />
                                  Evidence
                                </h5>
                                <button
                                  onClick={() => copyToClipboard(vulnerability.evidence)}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </button>
                              </div>
                              <pre className="text-xs text-gray-800 bg-white p-3 border border-gray-200 rounded overflow-x-auto">
                                {vulnerability.evidence}
                              </pre>
                            </div>

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

                            {/* Technical Details */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <h5 className="font-medium text-blue-900 mb-2">Technical Details</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {vulnerability.cweId && (
                                  <div>
                                    <span className="font-medium text-blue-800">CWE ID:</span>
                                    <a 
                                      href={`https://cwe.mitre.org/data/definitions/${vulnerability.cweId.replace('CWE-', '')}.html`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="ml-2 text-blue-600 hover:underline flex items-center"
                                    >
                                      {vulnerability.cweId}
                                      <ExternalLink className="w-3 h-3 ml-1" />
                                    </a>
                                  </div>
                                )}
                                <div>
                                  <span className="font-medium text-blue-800">Severity Justification:</span>
                                  <span className="ml-2 text-blue-700">{vulnerability.severity_justification}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* High Vulnerabilities Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div 
          className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('high')}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              High Vulnerabilities ({scanResult.summary.high})
            </h3>
          </div>
          {expandedSections.has('high') ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has('high') && (
          <div className="divide-y divide-gray-200">
            {scanResult.vulnerabilities
              .filter(v => v.severity === 'high')
              .map((vulnerability) => (
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
                              <Code className="w-4 h-4" />
                              <span>{vulnerability.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <FileText className="w-4 h-4" />
                              <span>{vulnerability.location}</span>
                              {vulnerability.lineNumber && (
                                <span className="text-gray-500">Line {vulnerability.lineNumber}</span>
                              )}
                            </div>
                          </div>
                          <p className="text-gray-700 mb-3">{vulnerability.description}</p>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      <div className="ml-12">
                        <button
                          onClick={() => toggleExpanded(vulnerability.id)}
                          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          {expandedVulns.has(vulnerability.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span>
                            {expandedVulns.has(vulnerability.id) ? 'Hide Details' : 'Show Details'}
                          </span>
                        </button>

                        {expandedVulns.has(vulnerability.id) && (
                          <div className="mt-4 space-y-4">
                            {/* Evidence */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-gray-900 flex items-center">
                                  <Code className="w-4 h-4 mr-2" />
                                  Evidence
                                </h5>
                                <button
                                  onClick={() => copyToClipboard(vulnerability.evidence)}
                                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy
                                </button>
                              </div>
                              <pre className="text-xs text-gray-800 bg-white p-3 border border-gray-200 rounded overflow-x-auto">
                                {vulnerability.evidence}
                              </pre>
                            </div>

                            {/* Remediation */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <h5 className="font-medium text-green-900 mb-2 flex items-center">
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Remediation
                              </h5>
                              <p className="text-sm text-green-800">{vulnerability.remediation}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Recommendations Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div 
          className="p-6 border-b border-gray-200 flex items-center justify-between cursor-pointer"
          onClick={() => toggleSection('recommendations')}
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Recommendations
            </h3>
          </div>
          {expandedSections.has('recommendations') ? (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>

        {expandedSections.has('recommendations') && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Immediate Actions */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-3">Immediate Actions</h4>
              <ul className="space-y-2">
                {scanResult.recommendations.immediate.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-red-800">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Short-Term Actions */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-3">Short-Term Actions (30 days)</h4>
              <ul className="space-y-2">
                {scanResult.recommendations.shortTerm.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-orange-800">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Long-Term Actions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3">Long-Term Improvements (90+ days)</h4>
              <ul className="space-y-2">
                {scanResult.recommendations.longTerm.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-blue-800">
                    <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compliance Considerations */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-3">Compliance Considerations</h4>
              <ul className="space-y-2">
                {scanResult.recommendations.compliance.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-green-800">
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Empty State for Filtered Results */}
      {filteredVulnerabilities.length === 0 && (
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