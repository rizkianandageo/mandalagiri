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
                    elevation: record.altitude || null,
                    heartRate: record.heart_rate || null,
                    speed: record.speed || null,
                    cadence: record.cadence || null
                  });
                }
              });
            }

            const sessions = data.sessions || [];
            const session = sessions[0] || {};
            
            // Calculate detailed stats
            const distanceNum = session.total_distance || 0;
            const durationSec = session.total_elapsed_time || 0;
            const movingTimeSec = session.total_timer_time || session.total_elapsed_time || 0;
            const hMoving = Math.floor(movingTimeSec / 3600);
            const mMoving = Math.floor((movingTimeSec % 3600) / 60);
            const sMoving = Math.floor(movingTimeSec % 60);
            const movingTimeStr = hMoving > 0 ? `${hMoving}:${mMoving.toString().padStart(2, '0')}:${sMoving.toString().padStart(2, '0')}` : `${mMoving.toString().padStart(2, '0')}:${sMoving.toString().padStart(2, '0')}`;
            
            const hElapsed = Math.floor(durationSec / 3600);
            const mElapsed = Math.floor((durationSec % 3600) / 60);
            const sElapsed = Math.floor(durationSec % 60);
            const elapsedStr = hElapsed > 0 ? `${hElapsed}:${mElapsed.toString().padStart(2, '0')}:${sElapsed.toString().padStart(2, '0')}` : `${mElapsed.toString().padStart(2, '0')}:${sElapsed.toString().padStart(2, '0')}`;

            const avgPaceSecPerKm = distanceNum > 0 ? movingTimeSec / distanceNum : 0;
            const pM = Math.floor(avgPaceSecPerKm / 60);
            const pS = Math.floor(avgPaceSecPerKm % 60);
            const avgPaceStr = distanceNum > 0 ? `${pM}:${pS.toString().padStart(2,'0')} /km` : '--';

            const stats = {
              distance: distanceNum ? distanceNum.toFixed(2) : '0.00',
              duration: durationSec, 
              movingTimeStr: movingTimeStr,
              elapsedTimeStr: elapsedStr,
              avgPace: avgPaceStr,
              avgSpeed: session.avg_speed ? session.avg_speed.toFixed(1) : (distanceNum / (movingTimeSec / 3600)).toFixed(1),
              maxSpeed: session.max_speed ? session.max_speed.toFixed(1) : null,
              avgHeartRate: session.avg_heart_rate || (heartRates.length ? Math.round(heartRates.reduce((a, b) => a + b, 0) / heartRates.length) : null),
              maxHeartRate: session.max_heart_rate || (heartRates.length ? Math.max(...heartRates) : null),
              calories: session.total_calories || null,
              elevationGain: session.total_ascent || null,
              totalDescent: session.total_descent || null,
              minElevation: session.min_altitude || null,
              maxElevation: session.max_altitude || null,
              avgCadence: session.avg_cadence || null,
              maxCadence: session.max_cadence || null,
              totalSteps: session.total_cycles || null,
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
