import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

const MapComponent = ({ userLocation, isOutsideBounds, startPoi, endPoi, poiList, showTrailLayer = true, showPoiLayer = true, importedRoute }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const activePopupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [profileData, setProfileData] = useState([]);
  const poiListRef = useRef(poiList);

  useEffect(() => {
    poiListRef.current = poiList;
  }, [poiList]);

  // Efek untuk menyembunyikan/menampilkan layer jalur
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const trailLayers = ['jalur-slope-line', 'jalur-slope-glow'];
    trailLayers.forEach(layer => {
      if (map.current.getLayer(layer)) {
        map.current.setLayoutProperty(layer, 'visibility', showTrailLayer ? 'visible' : 'none');
      }
    });
  }, [showTrailLayer]);

  // Efek untuk menyembunyikan/menampilkan layer POI
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    if (map.current.getLayer('poi-layer')) {
      map.current.setLayoutProperty('poi-layer', 'visibility', showPoiLayer ? 'visible' : 'none');
    }
  }, [showPoiLayer]);

  // Efek untuk menggambar rute yang di-import
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !importedRoute) return;

    const sourceId = 'imported-route-source';
    const layerGlowId = 'imported-route-glow';
    const layerLineId = 'imported-route-line';

    if (map.current.getSource(sourceId)) {
      map.current.getSource(sourceId).setData(importedRoute.geojson);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: importedRoute.geojson
      });

      map.current.addLayer({
        id: layerGlowId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 10,
          'line-opacity': 0.4,
          'line-blur': 6
        }
      });

      map.current.addLayer({
        id: layerLineId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#38bdf8',
          'line-width': 4
        }
      });
    }

    try {
      const bbox = turf.bbox(importedRoute.geojson);
      map.current.fitBounds(bbox, {
        padding: { top: 50, bottom: 350, left: 50, right: 50 },
        pitch: 60,
        bearing: 0,
        duration: 2000
      });
    } catch (err) {
      console.error('Fit bounds error:', err);
    }
  }, [importedRoute]);

  // useEffect TERPISAH khusus untuk event listener profile hover
  useEffect(() => {
    const handleProfileHover = (e) => {
      const coord = e.detail;
      if (!map.current) return;

      const src = map.current.getSource('hover-source');
      if (!src) return;

      if (coord) {
        src.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [coord.lng, coord.lat] }
          }]
        });
      } else {
        src.setData({ type: 'FeatureCollection', features: [] });
      }
    };

    window.addEventListener('profile-hover', handleProfileHover);
    return () => window.removeEventListener('profile-hover', handleProfileHover);
  }, []);

  // Batas data DEM & Satelit (baru, dilebarkan)
  const dataBounds = [112.7821, -8.1944, 113.0839, -7.8904];

  const cameraBounds = [
    [112.795, -8.180], // Southwest (inner)
    [113.070, -7.905]  // Northeast (inner)
  ];

  // Efek untuk menggambar dan mengupdate marker GPS User secara real-time
  useEffect(() => {
    if (!map.current || isOutsideBounds || !userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.background = '#3b82f6'; // Biru Google Maps
      el.style.border = '3px solid white';
      el.style.borderRadius = '50%';
      el.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.8)';
      
      userMarkerRef.current = new maplibregl.Marker({ element: el, pitchAlignment: 'map' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, isOutsideBounds]);

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            bounds: dataBounds,
            maxzoom: 19
          },
          'semeru-terrain': {
            type: 'raster-dem',
            tiles: [
              window.location.origin + import.meta.env.BASE_URL + 'data/terrain/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            encoding: 'mapbox',
            bounds: dataBounds,
            maxzoom: 14
          },
          'jalur': {
            type: 'geojson',
            data: import.meta.env.BASE_URL + 'data/jalur.geojson'
          },
          'poi': {
            type: 'geojson',
            data: import.meta.env.BASE_URL + 'data/poi.geojson'
          },
          'hover-source': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#0f172a' }
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            paint: {
              'raster-brightness-max': 0.85,
              'raster-fade-duration': 0
            }
          },
          // Layer jalur percabangan (jalur asli yang tidak dipakai di rute utama)
          {
            id: 'jalur-line-branches',
            type: 'line',
            source: 'jalur',
            paint: {
              'line-color': '#9ca3af', // Abu-abu
              'line-width': 2,
              'line-opacity': 0.7 // Opacity 70%
            },
            layout: { visibility: 'visible' }
          },
          {
            id: 'hover-layer',
            type: 'circle',
            source: 'hover-source',
            paint: {
              'circle-radius': 10,
              'circle-color': '#fbbf24',
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 1,
              'circle-blur': 0.1
            }
          }
        ],
        terrain: {
          source: 'semeru-terrain',
          exaggeration: 1.1
        }
      },
      center: window.innerWidth <= 768 ? [112.9625, -8.0303] : [112.9356, -8.0583],
      zoom: window.innerWidth <= 768 ? 11.92 : 12.26,
      pitch: 60.51,
      bearing: -129.54,
      minPitch: 0,
      maxPitch: 85,
      maxBounds: cameraBounds
    });

    // Add UI Controls
    map.current.addControl(new maplibregl.NavigationControl({
      showZoom: true,
      visualizePitch: true
    }), 'bottom-right');

    map.current.addControl(new maplibregl.ScaleControl({
      maxWidth: 150,
      unit: 'metric'
    }), 'bottom-left');

    // Helper Global untuk diakses lewat Developer Console
    window.mapConsole = {
      // Baca posisi kamera saat ini
      getCamera: () => {
        if (!map.current) return;
        const c = map.current.getCenter();
        const z = map.current.getZoom();
        const p = map.current.getPitch();
        const b = map.current.getBearing();
        console.log(`center: [${c.lng.toFixed(4)}, ${c.lat.toFixed(4)}]`);
        console.log(`zoom: ${z.toFixed(2)}`);
        console.log(`pitch: ${p.toFixed(2)}`);
        console.log(`bearing: ${b.toFixed(2)}`);
        return { lng: c.lng, lat: c.lat, zoom: z, pitch: p, bearing: b };
      },
      // Set kamera ke posisi baru dengan animasi
      setCamera: (lng, lat, zoom, pitch, bearing) => {
        if (!map.current) return;
        map.current.flyTo({
          center: [lng, lat],
          zoom: zoom,
          pitch: pitch,
          bearing: bearing,
          duration: 2000
        });
        console.log('Kamera dipindahkan!');
      }
    };

    map.current.on('load', () => {
      // PIN 3D WARNA BIRU (Canvas API)
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Bayangan pin
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Badan pin biru
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(32, 22, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(32, 60);
      ctx.lineTo(19, 30);
      ctx.lineTo(45, 30);
      ctx.fill();

      // Highlight (efek glossy 3D)
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(27, 17, 7, 0, Math.PI * 2);
      ctx.fill();

      // Lubang putih
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(32, 22, 5, 0, Math.PI * 2);
      ctx.fill();

      const imageData = ctx.getImageData(0, 0, size, size);
      map.current.addImage('custom-pin', imageData);

      // Layer POI
      map.current.addLayer({
        id: 'poi-layer',
        type: 'symbol',
        source: 'poi',
        layout: {
          'icon-image': 'custom-pin',
          'icon-size': 0.6,
          'icon-allow-overlap': true,
          'icon-pitch-alignment': 'viewport',
          'icon-anchor': 'bottom'
        }
      });

      const showPoiPopup = (name, jalur, coordinates) => {
        if (activePopupRef.current) {
          if (activePopupRef.current.poiName === name) return;
          activePopupRef.current.remove();
        }
        
        const popup = new maplibregl.Popup({ offset: [0, -25], closeButton: false })
          .setLngLat(coordinates)
          .setHTML(`
            <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(34, 211, 238, 0.3); border-radius: 12px; overflow: hidden; width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); font-family: Inter, sans-serif; backdrop-filter: blur(8px);">
              <div style="width: 100%; height: 120px; background: #1e293b url('${import.meta.env.BASE_URL}img/poi/${encodeURIComponent(name)}.jpg') center/cover no-repeat; position: relative;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(15, 23, 42, 1), transparent);"></div>
              </div>
              <div style="padding: 12px 16px;">
                <h3 style="margin: 0 0 4px 0; font-size: 16px; color: #fff; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">${name}</h3>
                <div style="display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 12px; margin-bottom: 8px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="min-width: 12px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Jalur ${jalur}
                </div>
                <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 8px;"></div>
                <div style="font-size: 11px; color: #22d3ee; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Point of Interest</div>
              </div>
            </div>
          `)
          .addTo(map.current);
          
        popup.poiName = name;
        activePopupRef.current = popup;
      };

      // Popup klik POI
      map.current.on('click', 'poi-layer', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const props = e.features[0].properties;

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        showPoiPopup(props.Nama, props.Jalur, coordinates);
      });

      map.current.on('mouseenter', 'poi-layer', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'poi-layer', () => {
        map.current.getCanvas().style.cursor = '';
      });

      // ==========================================
      // FITUR KESULITAN LERENG & FLY-THROUGH
      // ==========================================
      fetch(`${import.meta.env.BASE_URL}data/profile.json`)
        .then(res => res.json())
        .then(data => {
          setProfileData(data); // Simpan ke state untuk filter POI
          
          // Inisialisasi empty source, akan diisi oleh useEffect
          map.current.addSource('jalur-slope-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          // Layer Glow Warna Warni
          map.current.addLayer({
            id: 'jalur-slope-glow',
            type: 'line',
            source: 'jalur-slope-source',
            paint: {
              'line-color': [
                'match', ['get', 'slope_cat'],
                'easy', '#10b981',   // Hijau
                'medium', '#fbbf24', // Kuning/Amber
                'hard', '#ef4444',   // Merah
                'inactive', 'rgba(156, 163, 175, 0.2)', // Kelabu transparan
                '#10b981'            // Default
              ],
              'line-width': 8,
              'line-blur': 12,
              'line-opacity': [
                'match', ['get', 'slope_cat'],
                'inactive', 0.2,
                0.7
              ]
            }
          }, 'hover-layer'); // letakkan di bawah hover-layer

          // Layer Line Solid Warna Warni
          map.current.addLayer({
            id: 'jalur-slope-line',
            type: 'line',
            source: 'jalur-slope-source',
            paint: {
              'line-color': [
                'match', ['get', 'slope_cat'],
                'easy', '#34d399',
                'medium', '#fcd34d',
                'hard', '#f87171',
                'inactive', '#9ca3af', // Kelabu percabangan
                '#34d399'
              ],
              'line-width': 3
            }
          }, 'hover-layer');

          // Registrasi 3D Model (sudah dilakukan di awal Map Style)
          
          // Fungsi Fly-Through
          let flyAnimationId = null;
          let isFlying = false;
          let hikerMarker = null;

          window.mapConsole.startFlyThrough = (startIdx = 0, endIdx = data.length - 1) => {
            if (isFlying) {
              window.mapConsole.stopFlyThrough();
              return;
            }
            
            isFlying = true;
            let i = startIdx;
            let lastTime = 0;
            const speed = 25; // ms per langkah

            // Buat elemen kustom untuk marker pendaki
            const el = document.createElement('div');
            el.className = 'hiker-marker';
            el.style.width = '32px';
            el.style.height = '32px';
            el.style.background = '#ffffff';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid var(--accent)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.fontSize = '20px';
            el.style.boxShadow = '0 0 15px rgba(34, 211, 238, 0.6)';
            el.innerHTML = '🚶';

            hikerMarker = new maplibregl.Marker({ element: el })
              .setLngLat([data[startIdx].lng, data[startIdx].lat])
              .addTo(map.current);

            let currentBearing = map.current.getBearing();

            const animate = (time) => {
              if (!isFlying) return;
              if (i >= endIdx) {
                window.mapConsole.stopFlyThrough();
                return;
              }

              if (time - lastTime > speed) {
                const pt = data[i];
                const startPt = data[startIdx];
                const offsetPt = {
                  ...pt,
                  originalDistance: pt.distance,
                  distance: pt.distance - startPt.distance,
                  cumulative_time: pt.cumulative_time - startPt.cumulative_time
                };

                hikerMarker.setLngLat([pt.lng, pt.lat]);

                let targetBearing = currentBearing;
                const lookAheadIndex = Math.min(i + 20, data.length - 1);
                const nextPt = data[lookAheadIndex];
                
                if (nextPt) {
                  const pt1 = turf.point([pt.lng, pt.lat]);
                  const pt2 = turf.point([nextPt.lng, nextPt.lat]);
                  targetBearing = turf.bearing(pt1, pt2);
                }

                let diff = targetBearing - currentBearing;
                diff = ((diff + 180) % 360) - 180;
                currentBearing += diff * 0.1;

                map.current.jumpTo({
                  center: [pt.lng, pt.lat],
                  bearing: currentBearing,
                  pitch: 75,
                  zoom: 15.8,
                  padding: { bottom: 250 }
                });

                // Cek POI terdekat
                const currentPoiList = poiListRef.current;
                if (currentPoiList && currentPoiList.length > 0) {
                  const currentTurfPt = turf.point([pt.lng, pt.lat]);
                  let closestPoi = null;
                  let minDistance = 0.05; // Radius 50 meter (0.05 km)
                  
                  currentPoiList.forEach(poi => {
                    const poiTurfPt = turf.point([poi.lng, poi.lat]);
                    const dist = turf.distance(currentTurfPt, poiTurfPt, { units: 'kilometers' });
                    if (dist < minDistance) {
                      minDistance = dist;
                      closestPoi = poi;
                    }
                  });
                  
                  if (closestPoi) {
                    showPoiPopup(closestPoi.name, closestPoi.jalur || 'Ranu Pane', [closestPoi.lng, closestPoi.lat]);
                  } else {
                    if (activePopupRef.current) {
                      activePopupRef.current.remove();
                      activePopupRef.current = null;
                    }
                  }
                }

                // Kirim data telemetri real-time ke HUD
                window.dispatchEvent(new CustomEvent('simulation-tick', {
                  detail: offsetPt
                }));
                
                i++;
                lastTime = time;
              }
              flyAnimationId = requestAnimationFrame(animate);
            };
            flyAnimationId = requestAnimationFrame(animate);
          };
          
          window.mapConsole.stopFlyThrough = () => {
            if(flyAnimationId) cancelAnimationFrame(flyAnimationId);
            isFlying = false;
            if(hikerMarker) {
              hikerMarker.remove();
              hikerMarker = null;
            }
          };
        })
        .catch(err => console.error("Gagal load profile.json untuk jalur berwarna:", err));

    });

  }, []);

  // Efek untuk menggambar ulang segment yang di-slice
  useEffect(() => {
    if (!map.current || profileData.length === 0) return;
    
    // Pastikan source sudah ada
    const src = map.current.getSource('jalur-slope-source');
    if (!src) return;

    let sIdx = startPoi ? startPoi.index : 0;
    let eIdx = endPoi ? endPoi.index : profileData.length - 1;
    if (sIdx > eIdx) { const t = sIdx; sIdx = eIdx; eIdx = t; }

    const features = [];
    for (let i = 1; i < profileData.length; i++) {
      let cat = profileData[i].slope_cat;
      // Jika di luar segmen, jadikan "inactive"
      if (i <= sIdx || i > eIdx) {
        cat = 'inactive';
      }
      
      features.push({
        type: 'Feature',
        properties: { slope_cat: cat },
        geometry: {
          type: 'LineString',
          coordinates: [
            [profileData[i - 1].lng, profileData[i - 1].lat],
            [profileData[i].lng, profileData[i].lat]
          ]
        }
      });
    }

    src.setData({ type: 'FeatureCollection', features });
  }, [profileData, startPoi, endPoi]);

  return <div ref={mapContainer} className="map-container" />;
};

export default MapComponent;
