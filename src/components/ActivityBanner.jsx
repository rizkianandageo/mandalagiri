import React from 'react';
import { X, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../index.css';

const ActivityBanner = ({ routeData, onClose }) => {
  if (!routeData) return null;

  const { stats, chartData } = routeData;

  const StatBlock = ({ label, value, unit, subtext }) => (
    <div className="stat-block">
      <div className="stat-value">
        {value} <span className="stat-unit">{unit}</span>
      </div>
      <div className="stat-label">{label}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  );

  return (
    <div className="activity-banner-overlay">
      <div className="activity-banner-container">
        {/* Header */}
        <div className="activity-banner-header">
          <div className="header-title">
            <Activity size={20} />
            <span>Activity Details</span>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="activity-banner-content">
          {/* Main Grid: Similar to Image 4 */}
          <div className="stats-main-grid">
            {/* Distance Column */}
            <div className="stats-column">
              <h3 className="column-title">Distance</h3>
              <StatBlock label="Distance" value={stats.distance} unit="km" />
              
              <h3 className="column-title" style={{ marginTop: '24px' }}>Calories</h3>
              <StatBlock label="Total Calories Burned" value={stats.calories || '--'} unit="" />
            </div>

            {/* Heart Rate Column */}
            <div className="stats-column">
              <h3 className="column-title">Heart Rate</h3>
              <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" />
              <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" />
              
              <h3 className="column-title" style={{ marginTop: '24px' }}>Timing</h3>
              <StatBlock label="Time" value={stats.elapsedTimeStr} unit="" />
              <StatBlock label="Moving Time" value={stats.movingTimeStr} unit="" />
            </div>

            {/* Elevation Column */}
            <div className="stats-column">
              <h3 className="column-title">Elevation</h3>
              <StatBlock label="Ascent" value={stats.elevationGain || '--'} unit="m" />
              <StatBlock label="Total Descent" value={stats.totalDescent || '--'} unit="m" />
              <StatBlock label="Min Elev" value={stats.minElevation || '--'} unit="m" />
              <StatBlock label="Max Elev" value={stats.maxElevation || '--'} unit="m" />
            </div>

            {/* Cadence & Pace Column */}
            <div className="stats-column">
              <h3 className="column-title">Cadence</h3>
              <StatBlock label="Avg Cadence" value={stats.avgCadence || '--'} unit="spm" />
              <StatBlock label="Max Cadence" value={stats.maxCadence || '--'} unit="spm" />
              <StatBlock label="Steps" value={stats.totalSteps || '--'} unit="" />
              
              <h3 className="column-title" style={{ marginTop: '24px' }}>Pace/Speed</h3>
              <StatBlock label="Avg Pace" value={stats.avgPace} unit="" />
              <StatBlock label="Avg Speed" value={stats.avgSpeed || '--'} unit="kph" />
              <StatBlock label="Max Speed" value={stats.maxSpeed || '--'} unit="kph" />
            </div>
          </div>

          <hr className="divider" />

          {/* Charts Section: Similar to Image 3 */}
          <div className="charts-section">
            <h3 className="section-title">Charts</h3>
            
            {chartData && chartData.length > 0 ? (
              <div className="charts-container">
                {/* Elevation Chart */}
                <div className="chart-wrapper">
                  <div className="chart-title">Elevation</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="elevation" stroke="#84cc16" fill="#84cc16" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Speed Chart */}
                <div className="chart-wrapper">
                  <div className="chart-title">Speed</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="speed" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Heart Rate Chart */}
                <div className="chart-wrapper">
                  <div className="chart-title">Heart Rate</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="heartRate" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Cadence Chart */}
                <div className="chart-wrapper">
                  <div className="chart-title">Cadence</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis hide />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} />
                      <Area type="monotone" dataKey="cadence" stroke="#f97316" fill="#f97316" fillOpacity={0.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                No time-series chart data available for this file.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityBanner;
