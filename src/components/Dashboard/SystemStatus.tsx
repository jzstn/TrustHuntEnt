import React from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Zap, 
  Shield, 
  Activity,
  TrendingUp
} from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const systemComponents = [
    {
      name: 'DAST Engine',
      status: 'operational',
      icon: Zap,
      metrics: '2 active scans'
    },
    {
      name: 'AI Security Monitor',
      status: 'operational',
      icon: Shield,
      metrics: '12 events/hour'
    },
    {
      name: 'Cross-Org Analysis',
      status: 'operational',
      icon: TrendingUp,
      metrics: '3 environments'
    },
    {
      name: 'Temporal Risk Engine',
      status: 'warning',
      icon: Clock,
      metrics: '1 anomaly detected'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertTriangle;
      default: return Activity;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 text-green-600 mr-2" />
          System Status
        </h3>
        <div className="flex items-center space-x-2 text-sm text-green-600">
          <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
          <span>Live Monitoring</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemComponents.map((component, index) => {
          const StatusIcon = getStatusIcon(component.status);
          return (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className={`p-2 rounded-lg ${getStatusColor(component.status)}`}>
                <component.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{component.name}</p>
                <p className="text-xs text-gray-600">{component.metrics}</p>
              </div>
              <StatusIcon className={`w-4 h-4 ${component.status === 'operational' ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
};