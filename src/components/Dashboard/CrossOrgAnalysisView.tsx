import React from 'react';
import { Network, GitCompare, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { CrossOrgAnalysis } from '../../types';
import { format } from 'date-fns';

interface CrossOrgAnalysisViewProps {
  analyses: CrossOrgAnalysis[];
}

export const CrossOrgAnalysisView: React.FC<CrossOrgAnalysisViewProps> = ({ analyses }) => {
  const getAnalysisTypeColor = (type: string) => {
    switch (type) {
      case 'permission_drift': return 'text-orange-600 bg-orange-100';
      case 'data_leakage': return 'text-red-600 bg-red-100';
      case 'user_access_variance': return 'text-blue-600 bg-blue-100';
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

  const averageDrift = analyses.reduce((sum, analysis) => sum + analysis.driftPercentage, 0) / analyses.length || 0;
  const highRiskAnalyses = analyses.filter(a => a.riskScore > 7);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Network className="w-5 h-5 text-purple-600 mr-2" />
            Cross-Org Analysis
          </h3>
          <p className="text-sm text-gray-600">Multi-environment security correlation</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-purple-600">
          <TrendingUp className="w-4 h-4" />
          <span>Market First</span>
        </div>
      </div>

      {/* Cross-Org Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{averageDrift.toFixed(1)}%</div>
          <div className="text-xs text-orange-600">Avg Drift</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{highRiskAnalyses.length}</div>
          <div className="text-xs text-red-600">High Risk</div>
        </div>
      </div>

      {/* Recent Cross-Org Analyses */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <GitCompare className="w-4 h-4 text-purple-600 mr-2" />
          Recent Analyses
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {analyses.slice(0, 4).map((analysis) => (
            <div key={analysis.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAnalysisTypeColor(analysis.analysisType)}`}>
                  {analysis.analysisType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <div className="flex items-center text-xs text-gray-500">
                  <span>Risk: {analysis.riskScore.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center text-sm text-gray-600">
                  <span>Org 1</span>
                  <ArrowRight className="w-3 h-3 mx-2" />
                  <span>Org 2</span>
                </div>
                <span className="text-sm font-medium text-orange-600">
                  {analysis.driftPercentage.toFixed(1)}% drift
                </span>
              </div>

              <p className="text-xs text-gray-500 mb-2">
                {format(analysis.analyzedAt, 'MMM dd, HH:mm')}
              </p>

              {analysis.findings.length > 0 && (
                <div className="space-y-1">
                  {analysis.findings.slice(0, 2).map((finding, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700">{finding.description}</p>
                        <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${getSeverityColor(finding.severity)}`}>
                          {finding.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                  {analysis.findings.length > 2 && (
                    <p className="text-xs text-gray-500">+{analysis.findings.length - 2} more findings</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cross-Org Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Cross-Org Insights</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
            <span className="text-sm text-purple-800">Permission Synchronization</span>
            <span className="text-xs text-purple-600">85% aligned</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <span className="text-sm text-blue-800">Data Classification</span>
            <span className="text-xs text-blue-600">3 variances</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-green-50 rounded">
            <span className="text-sm text-green-800">Security Posture</span>
            <span className="text-xs text-green-600">Improving</span>
          </div>
        </div>
      </div>
    </div>
  );
};