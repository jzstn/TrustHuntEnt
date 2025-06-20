import React from 'react';
import { Clock, AlertTriangle, MapPin, Timer, TrendingUp } from 'lucide-react';
import { TemporalRiskEvent } from '../../types';
import { format } from 'date-fns';

interface TemporalRiskViewProps {
  events: TemporalRiskEvent[];
}

export const TemporalRiskView: React.FC<TemporalRiskViewProps> = ({ events }) => {
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'after_hours_access': return 'text-orange-600 bg-orange-100';
      case 'privilege_escalation': return 'text-red-600 bg-red-100';
      case 'bulk_operation': return 'text-purple-600 bg-purple-100';
      case 'unusual_login_time': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 8) return 'text-red-600 bg-red-100';
    if (score >= 6) return 'text-orange-600 bg-orange-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const businessHoursViolations = events.filter(e => e.businessHoursViolation);
  const geographicAnomalies = events.filter(e => e.geographicAnomaly);
  const averageRiskScore = events.reduce((sum, event) => sum + event.riskScore, 0) / events.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            Temporal Risk Engine
          </h3>
          <p className="text-sm text-gray-600">Time-based anomaly detection</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-yellow-600">
          <TrendingUp className="w-4 h-4" />
          <span>Innovative</span>
        </div>
      </div>

      {/* Temporal Risk Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">{businessHoursViolations.length}</div>
          <div className="text-xs text-orange-600">After Hours</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{geographicAnomalies.length}</div>
          <div className="text-xs text-red-600">Geo Anomalies</div>
        </div>
      </div>

      {/* Recent Temporal Events */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
          Recent Temporal Events
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {events.slice(0, 4).map((event) => (
            <div key={event.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.eventType)}`}>
                  {event.eventType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskScoreColor(event.riskScore)}`}>
                  Risk: {event.riskScore.toFixed(1)}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">User: {event.userId}</span>
                <span className="text-xs text-gray-500">
                  {format(event.timestamp, 'MMM dd, HH:mm')}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs">
                {event.businessHoursViolation && (
                  <span className="flex items-center text-orange-600">
                    <Clock className="w-3 h-3 mr-1" />
                    After Hours
                  </span>
                )}
                {event.geographicAnomaly && (
                  <span className="flex items-center text-red-600">
                    <MapPin className="w-3 h-3 mr-1" />
                    Geo Anomaly
                  </span>
                )}
                {event.sessionDurationAnomaly && (
                  <span className="flex items-center text-purple-600">
                    <Timer className="w-3 h-3 mr-1" />
                    Long Session
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Temporal Risk Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Temporal Insights</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
            <span className="text-sm text-yellow-800">Average Risk Score</span>
            <span className="text-xs text-yellow-600">{averageRiskScore.toFixed(1)}/10</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
            <span className="text-sm text-orange-800">Peak Risk Hours</span>
            <span className="text-xs text-orange-600">2-4 AM</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
            <span className="text-sm text-blue-800">Pattern Detection</span>
            <span className="text-xs text-blue-600">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};