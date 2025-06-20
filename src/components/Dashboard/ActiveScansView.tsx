import React from 'react';
import { Activity, Play, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { SecurityScan } from '../../types';
import { format } from 'date-fns';

interface ActiveScansViewProps {
  scans: SecurityScan[];
}

export const ActiveScansView: React.FC<ActiveScansViewProps> = ({ scans }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScanTypeColor = (type: string) => {
    switch (type) {
      case 'full': return 'text-purple-600 bg-purple-100';
      case 'incremental': return 'text-blue-600 bg-blue-100';
      case 'targeted': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const runningScans = scans.filter(s => s.status === 'running');
  const completedScans = scans.filter(s => s.status === 'completed');
  const totalVulnerabilities = scans.reduce((sum, scan) => sum + scan.vulnerabilitiesFound, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 text-green-600 mr-2" />
            Active Scans
          </h3>
          <p className="text-sm text-gray-600">Real-time security scanning</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <TrendingUp className="w-4 h-4" />
          <span>Live</span>
        </div>
      </div>

      {/* Scan Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{runningScans.length}</div>
          <div className="text-xs text-blue-600">Running</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{totalVulnerabilities}</div>
          <div className="text-xs text-green-600">Found</div>
        </div>
      </div>

      {/* Active Scans List */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Play className="w-4 h-4 text-green-600 mr-2" />
          Current Scans
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {scans.slice(0, 4).map((scan) => (
            <div key={scan.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(scan.status)}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getScanTypeColor(scan.scanType)}`}>
                    {scan.scanType.toUpperCase()}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(scan.status)}`}>
                  {scan.status.toUpperCase()}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Org: {scan.orgId}</span>
                <span className="text-xs text-gray-500">
                  {format(scan.startedAt, 'MMM dd, HH:mm')}
                </span>
              </div>

              {scan.status === 'running' && (
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{scan.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${scan.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  Vulnerabilities: {scan.vulnerabilitiesFound}
                </span>
                {scan.completedAt && (
                  <span className="text-green-600">
                    Completed: {format(scan.completedAt, 'HH:mm')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scan Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Scan Insights</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <span className="text-sm text-green-800">Scan Efficiency</span>
            <span className="text-xs text-green-600">92% success rate</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <span className="text-sm text-blue-800">Average Duration</span>
            <span className="text-xs text-blue-600">45 minutes</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
            <span className="text-sm text-purple-800">Next Scheduled</span>
            <span className="text-xs text-purple-600">Tonight 2 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
};