import FitParser from 'fit-file-parser';
import { gpx, tcx } from '@tmcw/togeojson';

export const parseActivityFile = async (file) => {
  return new Promise((resolve, reject) => {
    const extension = file.name.split('.').pop().toLowerCase();

    const reader = new FileReader();

    if (extension === 'fit') {
      reader.onload = (e) => {
        const fitParser = new FitParser({
          force: true,
          speedUnit: 'km/h',
          lengthUnit: 'km',
          temperatureUnit: 'celsius',
          elapsedRecordField: true,
          mode: 'list'
        });

        fitParser.parse(e.target.result, (error, data) => {
          if (error) {
            reject(error);
          } else {
            // Process FIT data into a unified format
            let coordinates = [];
            let timestamps = [];
            let heartRates = [];
            let chartData = [];
            
            if (data.records && data.records.length > 0) {
              let startTimestamp = data.records[0].timestamp ? new Date(data.records[0].timestamp).getTime() : 0;
              data.records.forEach(record => {
                if (record.position_lat && record.position_long) {
                  coordinates.push([record.position_long, record.position_lat]);
                  timestamps.push(record.timestamp);
                  if (record.heart_rate) heartRates.push(record.heart_rate);
                  
                  let timeStr = "";
                  if (record.timestamp) {
                     const diffSecs = Math.floor((new Date(record.timestamp).getTime() - startTimestamp) / 1000);
                     const h = Math.floor(diffSecs / 3600);
                     const m = Math.floor((diffSecs % 3600) / 60);
                     const s = diffSecs % 60;
                     timeStr = h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                  }

                  chartData.push({
                    time: timeStr,
                    distance: record.distance || 0, // usually km or m depending on parser options
                    elevation: (record.enhanced_altitude ?? record.altitude) != null ? (record.enhanced_altitude ?? record.altitude) * 1000 : null,
                    heartRate: record.heart_rate ?? null,
                    speed: record.enhanced_speed ?? record.speed ?? null,
                    cadence: record.cadence ? record.cadence * 2 : null
                  });
                }
              });
            }

            const sessions = data.sessions || [];
            const session = sessions[0] || {};
            
            // Hitung Moving Time sendiri (threshold speed ~1.0 km/h)
            let calcMovingTimeSec = 0;
            if (data.records && data.records.length > 1) {
              for (let i = 1; i < data.records.length; i++) {
                const prev = data.records[i - 1];
                const curr = data.records[i];
                const speed = curr.enhanced_speed ?? curr.speed ?? 0;
                if (speed > 1.0) {
                  const deltaSec = (new Date(curr.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
                  if (deltaSec > 0 && deltaSec < 120) calcMovingTimeSec += deltaSec;
                }
              }
            }

            const distanceNum = session.total_distance || 0;
            const durationSec = session.total_elapsed_time || 0;
            const movingTimeSec = calcMovingTimeSec > 0 ? calcMovingTimeSec : (session.total_timer_time || session.total_elapsed_time || 0);
            
            const hMoving = Math.floor(movingTimeSec / 3600);
            const mMoving = Math.floor((movingTimeSec % 3600) / 60);
            const sMoving = Math.floor(movingTimeSec % 60);
            const movingTimeStr = hMoving > 0 ? `${hMoving}:${mMoving.toString().padStart(2, '0')}:${sMoving.toString().padStart(2, '0')}` : `${mMoving.toString().padStart(2, '0')}:${sMoving.toString().padStart(2, '0')}`;
            
            const hElapsed = Math.floor(durationSec / 3600);
            const mElapsed = Math.floor((durationSec % 3600) / 60);
            const sElapsed = Math.floor(durationSec % 60);
            const elapsedStr = hElapsed > 0 ? `${hElapsed}:${mElapsed.toString().padStart(2, '0')}:${sElapsed.toString().padStart(2, '0')}` : `${mElapsed.toString().padStart(2, '0')}:${sElapsed.toString().padStart(2, '0')}`;

            // Avg Pace = total_timer_time / distance
            const timerTimeSec = session.total_timer_time || durationSec;
            const avgPaceSecPerKm = distanceNum > 0 ? timerTimeSec / distanceNum : 0;
            const pM = Math.floor(avgPaceSecPerKm / 60);
            const pS = Math.floor(avgPaceSecPerKm % 60);
            const avgPaceStr = distanceNum > 0 ? `${pM}:${pS.toString().padStart(2,'0')} /km` : '--';

            // Avg Moving Pace
            const avgMovingPaceSecPerKm = distanceNum > 0 ? movingTimeSec / distanceNum : 0;
            const pMMov = Math.floor(avgMovingPaceSecPerKm / 60);
            const pSMov = Math.floor(avgMovingPaceSecPerKm % 60);
            const avgMovingPaceStr = distanceNum > 0 ? `${pMMov}:${pSMov.toString().padStart(2,'0')} /km` : '--';

            // Best Pace
            const maxSpeedKph = session.enhanced_max_speed ?? session.max_speed ?? 0;
            let bestPaceStr = '--';
            if (maxSpeedKph > 0) {
              const bestPaceSec = 3600 / maxSpeedKph;
              const bpM = Math.floor(bestPaceSec / 60);
              const bpS = Math.floor(bestPaceSec % 60);
              bestPaceStr = `${bpM}:${bpS.toString().padStart(2,'0')} /km`;
            }

            let calcMinElev = null;
            let calcMaxElev = null;
            if (chartData.length > 0) {
              const elevs = chartData.map(d => d.elevation).filter(e => e !== null);
              if (elevs.length > 0) {
                calcMinElev = elevs.reduce((min, e) => e < min ? e : min, elevs[0]).toFixed(0);
                calcMaxElev = elevs.reduce((max, e) => e > max ? e : max, elevs[0]).toFixed(0);
              }
            }

            const avgHeartRate = session.avg_heart_rate || (heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null);
            const maxHeartRate = session.max_heart_rate || (heartRates.length ? Math.max(...heartRates) : null);

            const userProfile = (data.user_profiles && data.user_profiles.length > 0) ? data.user_profiles[0] : (data.user_profile && data.user_profile.length > 0 ? data.user_profile[0] : {});
            const zonesTarget = (data.zones_targets && data.zones_targets.length > 0) ? data.zones_targets[0] : (data.zones_target && data.zones_target.length > 0 ? data.zones_target[0] : {});
            
            const maxHrLimit = zonesTarget.max_heart_rate || userProfile.max_heart_rate || 192;
            const avgHrPct = avgHeartRate ? Math.round((avgHeartRate / maxHrLimit) * 100) : null;
            const maxHrPct = maxHeartRate ? Math.round((maxHeartRate / maxHrLimit) * 100) : null;
            
            const timeInZoneMsg = (data.time_in_zones && data.time_in_zones.length > 0) 
                ? (data.time_in_zones.find(t => t.reference_mesg === 18) || data.time_in_zones[data.time_in_zones.length - 1])
                : (data.time_in_zone && data.time_in_zone.length > 0 ? (data.time_in_zone.find(t => t.reference_mesg === 18) || data.time_in_zone[data.time_in_zone.length - 1]) : null);
            
            const hrBoundaries = timeInZoneMsg?.hr_zone_high_boundary || [96, 115, 134, 154, 173, 192];
            const getHrZone = (hr) => {
               if (!hr) return null;
               for (let i = 0; i < hrBoundaries.length; i++) {
                 if (hr <= hrBoundaries[i]) {
                    const lower = i === 0 ? 0 : hrBoundaries[i-1];
                    const range = hrBoundaries[i] - lower;
                    const pct = (hr - lower) / range;
                    return (i + pct).toFixed(1);
                 }
               }
               return '5.0';
            };
            const avgHrZone = getHrZone(avgHeartRate);
            const maxHrZone = getHrZone(maxHeartRate);

            let moderateIM = '--';
            let vigorousIM = '--';
            let totalIM = '--';
            if (timeInZoneMsg && timeInZoneMsg.time_in_hr_zone) {
              const z2 = timeInZoneMsg.time_in_hr_zone[1] || 0; // Moderate
              const z3 = timeInZoneMsg.time_in_hr_zone[2] || 0; // Vigorous part 1
              const z4 = timeInZoneMsg.time_in_hr_zone[3] || 0; // Vigorous part 2
              moderateIM = Math.round(z2 / 60);
              vigorousIM = Math.round((z3 + z4) / 60);
              totalIM = moderateIM + (vigorousIM * 2);
            }

            const stats = {
              distance: distanceNum ? distanceNum.toFixed(2) : '0.00',
              duration: durationSec, 
              movingTimeStr: movingTimeStr,
              elapsedTimeStr: elapsedStr,
              timerTimeStr: elapsedStr, // Fallback if we want to show exact Timer Time later
              avgPace: avgPaceStr,
              avgMovingPace: avgMovingPaceStr,
              bestPace: bestPaceStr,
              avgSpeed: session.enhanced_avg_speed ? session.enhanced_avg_speed.toFixed(1) : (session.avg_speed ? session.avg_speed.toFixed(1) : (distanceNum / (movingTimeSec / 3600)).toFixed(1)),
              avgMovingSpeed: distanceNum > 0 && movingTimeSec > 0 ? (distanceNum / (movingTimeSec / 3600)).toFixed(1) : '--',
              maxSpeed: maxSpeedKph > 0 ? maxSpeedKph.toFixed(1) : null,
              avgHeartRate: avgHeartRate,
              maxHeartRate: maxHeartRate,
              avgHrPct: avgHrPct,
              maxHrPct: maxHrPct,
              avgHrZone: avgHrZone,
              maxHrZone: maxHrZone,
              moderateIM: moderateIM,
              vigorousIM: vigorousIM,
              totalIM: totalIM,
              calories: session.total_calories || null,
              caloriesConsumed: '--',
              caloriesNet: session.total_calories ? `-${session.total_calories}` : '--',
              restingCalories: session.resting_calories || null,
              activeCalories: session.total_calories && session.resting_calories ? session.total_calories - session.resting_calories : null,
              estSweatLoss: session.est_sweat_loss || null,
              fluidConsumed: '--',
              fluidNet: session.est_sweat_loss ? `-${session.est_sweat_loss}` : '--',
              elevationGain: session.total_ascent != null ? Math.round(session.total_ascent * 1000) : null,
              totalDescent: session.total_descent != null ? Math.round(session.total_descent * 1000) : null,
              minElevation: session.min_altitude != null ? Math.round(session.min_altitude * 1000) : calcMinElev,
              maxElevation: session.max_altitude != null ? Math.round(session.max_altitude * 1000) : calcMaxElev,
              avgCadence: session.avg_cadence ? session.avg_cadence * 2 : null,
              maxCadence: session.max_cadence ? session.max_cadence * 2 : null,
              totalSteps: session.total_cycles ? session.total_cycles * 2 : null,
              startTime: session.start_time || (timestamps.length ? timestamps[0] : new Date())
            };

            const geojson = {
              type: 'FeatureCollection',
              features: [{
                type: 'Feature',
                properties: { ...stats },
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates
                }
              }]
            };

            resolve({ geojson, stats, chartData, type: 'fit' });
          }
        });
      };
      reader.readAsArrayBuffer(file);
    } else if (extension === 'gpx' || extension === 'tcx') {
      reader.onload = (e) => {
        try {
          const dom = new DOMParser().parseFromString(e.target.result, 'text/xml');
          let parsedGeoJson;
          
          if (extension === 'gpx') {
            parsedGeoJson = gpx(dom);
          } else {
            parsedGeoJson = tcx(dom);
          }

          // Extract coordinates and basic stats
          let coordinates = [];
          if (parsedGeoJson.features && parsedGeoJson.features.length > 0) {
            const track = parsedGeoJson.features.find(f => f.geometry && f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
            if (track) {
              if (track.geometry.type === 'LineString') {
                coordinates = track.geometry.coordinates;
              } else if (track.geometry.type === 'MultiLineString') {
                coordinates = track.geometry.coordinates.flat();
              }
            }
          }

          // Simple distance calculation from GeoJSON coordinates (Haversine approximation)
          let totalDist = 0;
          for (let i = 1; i < coordinates.length; i++) {
            const p1 = coordinates[i-1];
            const p2 = coordinates[i];
            const R = 6371; // Earth's radius in km
            const dLat = (p2[1] - p1[1]) * Math.PI / 180;
            const dLon = (p2[0] - p1[0]) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(p1[1] * Math.PI / 180) * Math.cos(p2[1] * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            totalDist += R * c;
          }

          const stats = {
            distance: totalDist.toFixed(2),
            duration: null, // GPX/TCX might not easily provide total duration without parsing timestamps manually
            avgHeartRate: null,
            maxHeartRate: null,
            calories: null,
            elevationGain: null,
            startTime: new Date()
          };

          resolve({ geojson: parsedGeoJson, stats, type: extension });
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    } else {
      reject(new Error('Format file tidak didukung. Harap gunakan .fit, .gpx, atau .tcx'));
    }
  });
};
