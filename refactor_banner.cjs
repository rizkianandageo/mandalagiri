const fs = require('fs');
let content = fs.readFileSync('src/components/ActivityBanner.jsx', 'utf8');

const startStats = content.indexOf('<div className="stats-main-grid">');
const endStats = content.indexOf('<hr className="divider" />');
const startCharts = content.indexOf('<div className="charts-section"');
const endContent = content.indexOf('</div>\n      </div>\n    </div>\n  );\n};');

const statsDesktop = `            <div className="stats-main-grid">
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
                <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? \`\${stats.avgHrPct}% Max • \${stats.avgHrZone} z\` : null} />
                <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? \`\${stats.maxHrPct}% Max • \${stats.maxHrZone} z\` : null} />
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
            </div>`;

const statsMobile = `            <div className="stats-main-grid">
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

                <h3 className="column-title" style={{ marginTop: '24px' }}>Elevation</h3>
                <StatBlock label="Ascent" value={stats.elevationGain || '--'} unit="m" />
                <StatBlock label="Total Descent" value={stats.totalDescent || '--'} unit="m" />
                <StatBlock label="Min Elev" value={stats.minElevation || '--'} unit="m" />
                <StatBlock label="Max Elev" value={stats.maxElevation || '--'} unit="m" />

                <h3 className="column-title" style={{ marginTop: '24px' }}>Cadence</h3>
                <StatBlock label="Avg Cadence" value={stats.avgCadence || '--'} unit="spm" />
                <StatBlock label="Max Cadence" value={stats.maxCadence || '--'} unit="spm" />
                <StatBlock label="Steps" value={stats.totalSteps || '--'} unit="" />

                <h3 className="column-title" style={{ marginTop: '24px' }}>Heart Rate</h3>
                <StatBlock label="Avg HR" value={stats.avgHeartRate || '--'} unit="bpm" subtext={stats.avgHrPct ? \`\${stats.avgHrPct}% Max • \${stats.avgHrZone} z\` : null} />
                <StatBlock label="Max HR" value={stats.maxHeartRate || '--'} unit="bpm" subtext={stats.maxHrPct ? \`\${stats.maxHrPct}% Max • \${stats.maxHrZone} z\` : null} />

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

                <h3 className="column-title" style={{ marginTop: '24px' }}>Intensity Minutes</h3>
                <StatBlock label="Moderate" value={stats.moderateIM} unit="min" />
                <StatBlock label="Vigorous" value={stats.vigorousIM} unit="min" />
                <StatBlock label="Total" value={stats.totalIM} unit="min" />
              </div>
            </div>`;

const chartsSection = content.substring(startCharts, endContent);

const replaced = content.substring(0, startStats) + `          {activeTab === 'stats' && (
            isMobile ? (
${statsMobile}
            ) : (
${statsDesktop}
            )
          )}

          {activeTab === 'charts' && (
            <div style={{ marginTop: 0 }}>
${chartsSection.replace('<div className="charts-section"', '<div className="charts-section" style={{ marginTop: 0 }}')}
            </div>
          )}
` + content.substring(endContent);

fs.writeFileSync('src/components/ActivityBanner.jsx', replaced, 'utf8');
