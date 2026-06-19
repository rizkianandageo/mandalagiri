import React, { useState, useEffect } from 'react';
import { X, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import '../index.css';

const ActivityBanner = ({ routeData, onClose }) => {
  const [activeTab, setActiveTab] = useState('stats');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!routeData) return null;

  const { stats, chartData } = routeData;

  const StatBlock = ({ label, value, unit, subtext }) => {
    let displayValue = value;
    if (typeof value === 'number') {
      displayValue = value.toLocaleString('en-US');
    } else if (typeof value === 'string' && !value.includes(':') && !isNaN(value) && value.trim() !== '' && value !== '--') {
      const num = Number(value);
      const decimalPlaces = value.includes('.') ? value.split('.')[1].length : 0;
      displayValue = num.toLocaleString('en-US', { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
    }
    return (
      <div className="stat-block">
        <div className="stat-value">
          {displayValue} <span className="stat-unit">{unit}</span>
        </div>
        <div className="stat-label">{label}</div>
        {subtext && <div className="stat-subtext">{subtext}</div>}
      </div>
    );
  };

  return (
    <div className="activity-banner-overlay">
      <div className="activity-banner-container">
        {/* Header */}
        <div className="activity-banner-header">
          <div className="header-title">
            <Activity size={20} />
            <span>Activity Details</span>
          </div>
          <div className="banner-tabs">
            <button className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>Stats</button>
            <button className={`tab-button ${activeTab === 'charts' ? 'active' : ''}`} onClick={() => setActiveTab('charts')}>Charts</button>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="activity-banner-content">
          {/* Main Grid: Similar to Image 4 */}
          {activeTab === 'stats' && (
            isMobile ? (
            <div className="stats-main-grid">
              <div className="stats-column">
                <h3 className="column-title">Distance</h3>
                <StatBlock label="Distance" value={stats.distance} unit="km" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Calories & Hydration</h3>
                <StatBlock label="Resting Calories" value={stats.restingCalories || '--'} unit="" />
                <StatBlock label="Active Calories" value={stats.activeCalories || '--'} unit="" />
                <StatBlock label="Total Calories Burned" value={stats.calories || '--'} unit="" />
                <StatBlock label="Calories Consumed" value={stats.caloriesConsumed} unit="" />
                <StatBlock label="Calories Net" value={stats.caloriesNet} unit="" />
                <StatBlock label="Est. Sweat Loss" value={stats.estSweatLoss || '--'} unit="ml" />
                <StatBlock label="Fluid Consumed" value={stats.fluidConsumed} unit="ml" />
                <StatBlock label="Fluid Net" value={stats.fluidNet} unit="ml" />
              </div>
              <div className="stats-column">
                <h3 className="column-title">Heart Rate</h3>
                <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? `${stats.avgHrPct}% Max • ${stats.avgHrZone} z` : null} />
                <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? `${stats.maxHrPct}% Max • ${stats.maxHrZone} z` : null} />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Timing</h3>
                <StatBlock label="Time" value={stats.timerTimeStr || stats.elapsedTimeStr} unit="" />
                <StatBlock label="Moving Time" value={stats.movingTimeStr} unit="" />
                <StatBlock label="Elapsed Time" value={stats.elapsedTimeStr} unit="" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Pace/Speed</h3>
                <StatBlock label="Avg Pace" value={stats.avgPace} unit="" />
                <StatBlock label="Avg Moving Pace" value={stats.avgMovingPace} unit="" />
                <StatBlock label="Best Pace" value={stats.bestPace} unit="" />
                <StatBlock label="Avg Speed" value={stats.avgSpeed || '--'} unit="kph" />
                <StatBlock label="Avg Moving Speed" value={stats.avgMovingSpeed} unit="kph" />
                <StatBlock label="Max Speed" value={stats.maxSpeed || '--'} unit="kph" />
              </div>
              <div className="stats-column">
                <h3 className="column-title">Elevation</h3>
                <StatBlock label="Ascent" value={stats.elevationGain || '--'} unit="m" />
                <StatBlock label="Total Descent" value={stats.totalDescent || '--'} unit="m" />
                <StatBlock label="Min Elev" value={stats.minElevation || '--'} unit="m" />
                <StatBlock label="Max Elev" value={stats.maxElevation || '--'} unit="m" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Cadence</h3>
                <StatBlock label="Avg Cadence" value={stats.avgCadence || '--'} unit="spm" />
                <StatBlock label="Max Cadence" value={stats.maxCadence || '--'} unit="spm" />
                <StatBlock label="Steps" value={stats.totalSteps || '--'} unit="" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Intensity Minutes</h3>
                <StatBlock label="Moderate" value={stats.moderateIM} unit="min" />
                <StatBlock label="Vigorous" value={stats.vigorousIM} unit="min" />
                <StatBlock label="Total" value={stats.totalIM} unit="min" />
              </div>
            </div>
            ) : (
            <div className="stats-main-grid">
              <div className="stats-column">
                <h3 className="column-title">Distance</h3>
                <StatBlock label="Distance" value={stats.distance} unit="km" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Calories & Hydration</h3>
                <StatBlock label="Resting Calories" value={stats.restingCalories || '--'} unit="" />
                <StatBlock label="Active Calories" value={stats.activeCalories || '--'} unit="" />
                <StatBlock label="Total Calories Burned" value={stats.calories || '--'} unit="" />
                <StatBlock label="Calories Consumed" value={stats.caloriesConsumed} unit="" />
                <StatBlock label="Calories Net" value={stats.caloriesNet} unit="" />
                <StatBlock label="Est. Sweat Loss" value={stats.estSweatLoss || '--'} unit="ml" />
                <StatBlock label="Fluid Consumed" value={stats.fluidConsumed} unit="ml" />
                <StatBlock label="Fluid Net" value={stats.fluidNet} unit="ml" />
              </div>
              <div className="stats-column">
                <h3 className="column-title">Heart Rate</h3>
                <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? `${stats.avgHrPct}% Max • ${stats.avgHrZone} z` : null} />
                <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? `${stats.maxHrPct}% Max • ${stats.maxHrZone} z` : null} />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Timing</h3>
                <StatBlock label="Time" value={stats.timerTimeStr || stats.elapsedTimeStr} unit="" />
                <StatBlock label="Moving Time" value={stats.movingTimeStr} unit="" />
                <StatBlock label="Elapsed Time" value={stats.elapsedTimeStr} unit="" />
              </div>
              <div className="stats-column">
                <h3 className="column-title">Elevation</h3>
                <StatBlock label="Ascent" value={stats.elevationGain || '--'} unit="m" />
                <StatBlock label="Total Descent" value={stats.totalDescent || '--'} unit="m" />
                <StatBlock label="Min Elev" value={stats.minElevation || '--'} unit="m" />
                <StatBlock label="Max Elev" value={stats.maxElevation || '--'} unit="m" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Pace/Speed</h3>
                <StatBlock label="Avg Pace" value={stats.avgPace} unit="" />
                <StatBlock label="Avg Moving Pace" value={stats.avgMovingPace} unit="" />
                <StatBlock label="Best Pace" value={stats.bestPace} unit="" />
                <StatBlock label="Avg Speed" value={stats.avgSpeed || '--'} unit="kph" />
                <StatBlock label="Avg Moving Speed" value={stats.avgMovingSpeed} unit="kph" />
                <StatBlock label="Max Speed" value={stats.maxSpeed || '--'} unit="kph" />
              </div>
              <div className="stats-column">
                <h3 className="column-title">Cadence</h3>
                <StatBlock label="Avg Cadence" value={stats.avgCadence || '--'} unit="spm" />
                <StatBlock label="Max Cadence" value={stats.maxCadence || '--'} unit="spm" />
                <StatBlock label="Steps" value={stats.totalSteps || '--'} unit="" />
                <h3 className="column-title" style={{ marginTop: '24px' }}>Intensity Minutes</h3>
                <StatBlock label="Moderate" value={stats.moderateIM} unit="min" />
                <StatBlock label="Vigorous" value={stats.vigorousIM} unit="min" />
                <StatBlock label="Total" value={stats.totalIM} unit="min" />
              </div>
            </div>
            )
          )}

          {activeTab === 'charts' && (
            <div style={{ marginTop: 0 }}>
<div className="charts-section" style={{ marginTop: 0 }}>
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
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} m asl`, 'Elevation']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      />
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
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})} kph`, 'Speed']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      />
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
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toLocaleString('en-US', {maximumFractionDigits: 0})} bpm`, 'Heart Rate']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      />
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
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toLocaleString('en-US', {maximumFractionDigits: 0})} spm`, 'Cadence']}
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }} 
                      />
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
          )}
</div>
      </div>
    </div>
  );
};

export default ActivityBanner;
