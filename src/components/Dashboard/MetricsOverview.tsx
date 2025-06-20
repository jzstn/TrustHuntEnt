import React from 'react';
import { Shield, AlertTriangle, Zap, Network, Clock, TrendingUp, Activity, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { DashboardMetrics } from '../../types';

interface MetricsOverviewProps {
  metrics: DashboardMetrics;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Total Organizations',
      value: metrics.totalOrgs,
      icon: <Network className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      change: '+2 this month',
      trend: 'up'
    },
    {
      title: 'Total Vulnerabilities',
      value: metrics.totalVulnerabilities,
      icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      change: '-5 from last week',
      trend: 'down'
    },
    {
      title: 'Critical Issues',
      value: metrics.criticalVulnerabilities,
      icon: <Shield className="w-6 h-6 text-orange-600" />,
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      change: '-2 resolved today',
      trend: 'down'
    },
    {
      title: 'Security Score',
      value: `${metrics.averageRiskScore}%`,
      icon: <TrendingUp className="w-6 h-6 text-green-600" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      change: '+3% improvement',
      trend: 'up'
    },
    {
      title: 'Active Scans',
      value: metrics.activeScans,
      icon: <Activity className="w-6 h-6 text-purple-600" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      change: '2 in progress',
      trend: 'neutral'
    },
    {
      title: 'AI Security Events',
      value: metrics.aiSecurityEvents,
      icon: <Zap className="w-6 h-6 text-indigo-600" />,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      change: '+4 today',
      trend: 'up'
    },
    {
      title: 'Cross-Org Issues',
      value: metrics.crossOrgIssues,
      icon: <Network className="w-6 h-6 text-cyan-600" />,
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-600',
      change: '3 drift detected',
      trend: 'neutral'
    },
    {
      title: 'Temporal Anomalies',
      value: metrics.temporalAnomalies,
      icon: <Clock className="w-6 h-6 text-yellow-600" />,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      change: '2 after-hours',
      trend: 'neutral'
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-3 h-3 text-green-600" />;
      case 'down': return <ArrowDown className="w-3 h-3 text-red-600" />;
      default: return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricCards.map((metric, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${metric.bgColor} group-hover:scale-105 transition-transform`}>
              {metric.icon}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{metric.value}</p>
              <p className="text-sm text-gray-500 mt-1">{metric.title}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className={`flex items-center space-x-1 text-sm font-medium ${getTrendColor(metric.trend)}`}>
              {getTrendIcon(metric.trend)}
              <span>{metric.change}</span>
            </div>
            <Eye className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  );
};