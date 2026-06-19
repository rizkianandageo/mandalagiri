import re
with open('src/components/ActivityBanner.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will just write a python script to replace the <div className="activity-banner-content"> to the end of charts

start_idx = content.find('<div className="activity-banner-content">')
end_idx = content.find('</div>\n      </div>\n    </div>\n  );\n};')

# We need to construct the new block
new_content = '''<div className="activity-banner-content">
          {activeTab === 'stats' && (
            <div className="stats-main-grid">
              {isMobile ? (
                <>
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
                    <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? ${stats.avgHrPct}% Max •  z : null} />
                    <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? ${stats.maxHrPct}% Max •  z : null} />
                    
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
                </>
              ) : (
                <>
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
                    <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? ${stats.avgHrPct}% Max •  z : null} />
                    <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? ${stats.maxHrPct}% Max •  z : null} />
                    
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
                </>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="charts-section" style={{ marginTop: 0 }}>
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
                        <YAxis domain={['auto', 'auto']} hide />
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
                </div>
              ) : (
                <div className="no-data-message" style={{ color: '#9ca3af', textAlign: 'center', padding: '40px 0' }}>
                  No chart data available for this activity.
                </div>
              )}
            </div>
          )}
        </div>'''

final_content = content[:start_idx] + new_content + content[end_idx:]

with open('src/components/ActivityBanner.jsx', 'w', encoding='utf-8') as f:
    f.write(final_content)
