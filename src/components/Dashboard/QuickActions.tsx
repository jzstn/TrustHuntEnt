import React from 'react';
import { 
  Play, 
  Search, 
  FileText, 
  Settings, 
  Download,
  Zap,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useSecurityStore } from '../../store/useSecurityStore';

export const QuickActions: React.FC = () => {
  const { organizations, activeScans, clearAllData } = useSecurityStore();

  const quickActions = [
    {
      title: 'Start DAST Scan',
      description: 'Launch comprehensive security testing',
      icon: Search,
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => console.log('Starting DAST scan'),
      disabled: organizations.length === 0
    },
    {
      title: 'AI Security Check',
      description: 'Analyze Einstein GPT usage patterns',
      icon: Zap,
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => console.log('Starting AI security check'),
      disabled: organizations.length === 0
    },
    {
      title: 'Cross-Org Analysis',
      description: 'Compare security across environments',
      icon: Shield,
      color: 'bg-green-600 hover:bg-green-700',
      action: () => console.log('Starting cross-org analysis'),
      disabled: organizations.length < 2
    },
    {
      title: 'Generate Report',
      description: 'Create executive security summary',
      icon: FileText,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      action: () => console.log('Generating report'),
      disabled: organizations.length === 0
    }
  ];

  // Generate recent activity from real data
  const getRecentActivity = () => {
    const activities = [];
    
    if (activeScans.length > 0) {
      const latestScan = activeScans[activeScans.length - 1];
      activities.push({
        text: `${latestScan.scanType} scan ${latestScan.status}`,
        time: 'Active now'
      });
    }
    
    if (organizations.length > 0) {
      activities.push({
        text: `${organizations.length} organization${organizations.length > 1 ? 's' : ''} connected`,
        time: 'Current'
      });
    }
    
    if (activities.length === 0) {
      activities.push({
        text: 'No recent activity',
        time: 'Connect an organization to start'
      });
    }
    
    return activities.slice(0, 3);
  };

  const recentActivity = getRecentActivity();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Play className="w-5 h-5 text-blue-600 mr-2" />
          Quick Actions
        </h3>
        {organizations.length > 0 && (
          <button
            onClick={clearAllData}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
            title="Clear all data"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            disabled={action.disabled}
            className={`flex items-start space-x-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${
              action.disabled ? 'hover:bg-gray-50' : ''
            }`}
          >
            <div className={`p-3 rounded-lg text-white ${action.color} ${
              action.disabled ? 'opacity-50' : 'group-hover:scale-105'
            } transition-transform`}>
              <action.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <h4 className={`text-sm font-medium ${
                action.disabled ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'
              } transition-colors`}>
                {action.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1">{action.description}</p>
              {action.disabled && (
                <p className="text-xs text-orange-600 mt-1">
                  {action.title === 'Cross-Org Analysis' 
                    ? 'Requires 2+ organizations' 
                    : 'Connect organization first'
                  }
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <Clock className="w-4 h-4 text-gray-500 mr-2" />
          Recent Activity
        </h4>
        <div className="space-y-2">
          {recentActivity.map((activity, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{activity.text}</span>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};