import React, { useState } from 'react';
import { 
  Building2, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Trash2,
  Play,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Organization } from '../../types';
import { format } from 'date-fns';

interface ConnectedOrganizationsProps {
  organizations: Organization[];
  onRefresh: (orgId: string) => void;
  onDisconnect: (orgId: string) => void;
  onStartScan: (orgId: string) => void;
}

export const ConnectedOrganizations: React.FC<ConnectedOrganizationsProps> = ({
  organizations,
  onRefresh,
  onDisconnect,
  onStartScan
}) => {
  const [refreshingOrgs, setRefreshingOrgs] = useState<Set<string>>(new Set());

  const handleRefresh = async (orgId: string) => {
    setRefreshingOrgs(prev => new Set(prev).add(orgId));
    try {
      await onRefresh(orgId);
    } finally {
      setRefreshingOrgs(prev => {
        const newSet = new Set(prev);
        newSet.delete(orgId);
        return newSet;
      });
    }
  };

  const getOrgTypeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-red-100 text-red-800';
      case 'sandbox': return 'bg-yellow-100 text-yellow-800';
      case 'developer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (organizations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Organizations Connected</h3>
        <p className="text-gray-600 mb-4">
          Connect your Salesforce organizations to start security analysis
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Building2 className="w-5 h-5 text-blue-600 mr-2" />
          Connected Organizations
        </h3>
        <span className="text-sm text-gray-600">
          {organizations.length} organization{organizations.length !== 1 ? 's' : ''} connected
        </span>
      </div>

      <div className="space-y-4">
        {organizations.map((org) => (
          <div key={org.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{org.name}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOrgTypeColor(org.type)}`}>
                    {org.type.charAt(0).toUpperCase() + org.type.slice(1)}
                  </span>
                  {org.isConnected ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                
                <p className="text-xs text-gray-600 mb-3">{org.instanceUrl}</p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Risk Score</span>
                    <div className={`font-medium ${getRiskScoreColor(org.riskScore)}`}>
                      {org.riskScore}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Vulnerabilities</span>
                    <div className="font-medium text-gray-900">{org.vulnerabilityCount}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Scan</span>
                    <div className="font-medium text-gray-900">
                      {org.lastScanDate ? format(org.lastScanDate, 'MMM dd') : 'Never'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Status</span>
                    <div className={`font-medium ${org.isConnected ? 'text-green-600' : 'text-red-600'}`}>
                      {org.isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onStartScan(org.id)}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                  title="Start Security Scan"
                >
                  <Play className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => handleRefresh(org.id)}
                  disabled={refreshingOrgs.has(org.id)}
                  className="p-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh Connection"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshingOrgs.has(org.id) ? 'animate-spin' : ''}`} />
                </button>
                
                <button
                  onClick={() => onDisconnect(org.id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-green-600">
              {organizations.filter(o => o.riskScore >= 80).length}
            </div>
            <div className="text-xs text-gray-600">Low Risk</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-600">
              {organizations.filter(o => o.riskScore >= 60 && o.riskScore < 80).length}
            </div>
            <div className="text-xs text-gray-600">Medium Risk</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-600">
              {organizations.filter(o => o.riskScore < 60).length}
            </div>
            <div className="text-xs text-gray-600">High Risk</div>
          </div>
        </div>
      </div>
    </div>
  );
};