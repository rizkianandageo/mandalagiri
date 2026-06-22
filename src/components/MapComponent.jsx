import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { createHiker3DLayer } from './Hiker3DLayer';

const MapComponent = ({ userLocation, isOutsideBounds, startPoi, endPoi, poiList, showTrailLayer = true, showPoiLayer = true, importedRoute, importedPhotos = [] }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const activePopupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const photoMarkersRef = useRef([]);
  const importedPhotosRef = useRef(importedPhotos);
  const [profileData, setProfileData] = useState([]);
  const poiListRef = useRef(poiList);

  useEffect(() => {
    importedPhotosRef.current = importedPhotos;
  }, [importedPhotos]);

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

  // Efek untuk merender marker foto-foto yang diimpor
  useEffect(() => {
    if (!map.current) return;
    
    // Hapus marker lama
    photoMarkersRef.current.forEach(marker => marker.remove());
    photoMarkersRef.current = [];

    // Tambahkan marker baru
    importedPhotos.forEach(photo => {
      const el = document.createElement('div');
      el.className = 'imported-photo-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.border = '2px solid #6ee7b7';
      el.style.background = `#1e293b url('${photo.url}') center/cover no-repeat`;
      el.style.boxShadow = '0 0 10px rgba(110, 231, 183, 0.6)';
      el.style.cursor = 'pointer';

      // Klik marker foto -> tampilkan popup
      el.addEventListener('click', () => {
        if (window.mapConsole && window.mapConsole.showPhotoPopup) {
          window.mapConsole.showPhotoPopup(photo);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([photo.lng, photo.lat])
        .addTo(map.current);
        
      photoMarkersRef.current.push(marker);
    });
  }, [importedPhotos]);

  // Efek untuk menggambar rute yang di-import
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;

    const sourceId = 'imported-route-source';
    const layerGlowId = 'imported-route-glow';
    const layerLineId = 'imported-route-line';

    // Hentikan simulasi apapun jika rute berubah/dihapus
    if (window.mapConsole && window.mapConsole.stopFlyThrough) {
      window.mapConsole.stopFlyThrough();
    }

    if (!importedRoute) {
      if (window.mapConsole) window.mapConsole.importedSimulationData = null;
      if (map.current.getLayer(layerGlowId)) map.current.removeLayer(layerGlowId);
      if (map.current.getLayer(layerLineId)) map.current.removeLayer(layerLineId);
      if (map.current.getSource(sourceId)) map.current.removeSource(sourceId);
      return;
    }

    let displayGeojson = importedRoute.geojson;
    if (window.mapConsole) window.mapConsole.baseImportedGeojson = displayGeojson;

    // Generate simulasi navigasi dari rute resolusi penuh (agar mulus)
    if (window.mapConsole && importedRoute.geojson && importedRoute.geojson.features.length > 0) {
      const feature = importedRoute.geojson.features[0];
      const coords = feature.geometry.coordinates;
      const coordTimes = feature.properties?.coordTimes || [];
      const startTime = coordTimes.length > 0 ? new Date(coordTimes[0]).getTime() : 0;
      
      let totalDist = 0;
      let cumTime = 0;
      let lastValidTime = startTime;
      window.mapConsole.importedSimulationData = coords.map((c, idx) => {
        if (idx > 0) {
           const pt1 = turf.point(coords[idx-1]);
           const pt2 = turf.point(c);
           const distSegment = turf.distance(pt1, pt2, {units: 'kilometers'});
           totalDist += distSegment;
           
           if (coordTimes[idx] && lastValidTime) {
             let diffMins = (new Date(coordTimes[idx]).getTime() - lastValidTime) / 60000;
             if (diffMins < 0) diffMins = 0;
             // Batasi gap waktu maksimal 5 menit untuk mencegah lonjakan waktu jika jam di-pause lama
             if (diffMins > 5) diffMins = 5; 
             cumTime += diffMins;
             lastValidTime = new Date(coordTimes[idx]).getTime();
           } else {
             cumTime += distSegment * 12; // Fallback kecepatan mendaki 12 menit/km
           }
        }
        return {
          lng: c[0],
          lat: c[1],
          elevation: c[2] || 0,
          distance: totalDist,
          cumulative_time: cumTime
        };
      });
    }

    if (map.current.getSource(sourceId)) {
      map.current.getSource(sourceId).setData(displayGeojson);
    } else {
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: displayGeojson,
        tolerance: 0 // Matikan simplifikasi internal
      });

      map.current.addLayer({
        id: layerGlowId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 10,
          'line-opacity': 0.4,
          'line-blur': 4
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
      const bbox = turf.bbox(displayGeojson);
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
            data: import.meta.env.BASE_URL + 'data/jalur.geojson',
            tolerance: 0
          },
          'poi': {
            type: 'geojson',
            data: import.meta.env.BASE_URL + 'data/poi.geojson',
            tolerance: 0
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

      const showPhotoPopup = (photo) => {
        if (activePopupRef.current) {
          if (activePopupRef.current.photoId === photo.id) return;
          activePopupRef.current.remove();
        }
        
        const popup = new maplibregl.Popup({ offset: [0, -25], closeButton: false })
          .setLngLat([photo.lng, photo.lat])
          .setHTML(`
            <div style="background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(110, 231, 183, 0.4); border-radius: 12px; overflow: hidden; width: 220px; box-shadow: 0 10px 25px rgba(0,0,0,0.8); font-family: Inter, sans-serif; backdrop-filter: blur(8px);">
              <div style="width: 100%; height: 160px; background: #1e293b url('${photo.url}') center/cover no-repeat; position: relative;">
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 60%; background: linear-gradient(to top, rgba(15, 23, 42, 1), transparent);"></div>
              </div>
              <div style="padding: 12px 16px;">
                <h3 style="margin: 0 0 4px 0; font-size: 14px; color: #fff; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${photo.name}</h3>
                <div style="display: flex; align-items: center; gap: 6px; color: #94a3b8; font-size: 12px; margin-bottom: 8px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="min-width: 12px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  Moments
                </div>
                <div style="width: 100%; height: 1px; background: rgba(255,255,255,0.1); margin-bottom: 8px;"></div>
                <div style="font-size: 11px; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">${new Date(photo.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          `)
          .addTo(map.current);
          
        popup.photoId = photo.id;
        activePopupRef.current = popup;
      };
      
      if (!window.mapConsole) window.mapConsole = {};
      window.mapConsole.showPhotoPopup = showPhotoPopup;

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
            data: { type: 'FeatureCollection', features: [] },
            tolerance: 0
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
          let flyTimeoutId = null;
          let isFlying = false;
          let hikerMarker = null;

          window.mapConsole.startFlyThrough = (startIdx = 0, endIdx = null) => {
            const activeData = window.mapConsole.importedSimulationData || data;
            if (endIdx === null) endIdx = activeData.length - 1;

            if (isFlying) {
              window.mapConsole.stopFlyThrough();
              return;
            }
            
            isFlying = true;
            let i = startIdx; // i dijadikan float untuk interpolasi frame
            let lastTime = 0;
            const isImported = !!window.mapConsole.importedSimulationData;
            
            // PRE-FLY TO START (Beri waktu MapLibre meload tile terrain resolusi tinggi)
            const startPt = activeData[startIdx];
            map.current.flyTo({
              center: [startPt.lng, startPt.lat],
              zoom: 13.2,
              pitch: 45,
              bearing: map.current.getBearing(),
              duration: 1000
            });

            // Mulai simulasi setelah terbang selesai & tile dimuat
            flyTimeoutId = setTimeout(() => {
              // Hitung jarak rute yang disimulasikan agar kecepatan konstan berapapun jaraknya
              const startDist = activeData[startIdx]?.distance || 0;
              const endDist = activeData[endIdx]?.distance || activeData[activeData.length - 1].distance;
              const totalDistance = Math.abs(endDist - startDist);
              
              // Kecepatan referensi dari rute asli Mandalagiri (17.12 km dalam 15 detik)
              // Dengan rasio ini, semua simulasi navigasi dan data import akan berjalan pada tempo visual yang sama persis
              const referenceSpeedKmPerMs = 17.12 / 15000;
              let targetDurationMs = totalDistance / referenceSpeedKmPerMs;
              if (targetDurationMs < 3000) targetDurationMs = 3000; // Minimal 3 detik agar tidak terlalu instan
              
              // Frame-rate independent: Poin yang dilewati per ms
              const pointsPerMs = (endIdx - startIdx) / targetDurationMs;

              // Tambahkan Hiker 3D Layer
              if (!map.current.getLayer('hiker-3d-model')) {
                const hikerLayer = createHiker3DLayer(map.current, `${import.meta.env.BASE_URL}models/sierra_the_trailblazer.glb`);
                map.current.addLayer(hikerLayer);
              }
              window.mapConsole.isFlying = true;
              window.mapConsole.hiker3DPosition = [activeData[startIdx].lng, activeData[startIdx].lat];
              window.mapConsole.hiker3DRotation = map.current.getBearing();

              let currentBearing = map.current.getBearing();
              let lastTickTime = 0;
              let pausedUntil = 0;
              const shownItems = new Set();
              let lastAnimTime = null;

              const animate = (time) => {
                if (!isFlying) return;
                
                if (lastAnimTime === null) lastAnimTime = time;
                
                // Jeda animasi saat popup foto/checkpoint muncul
                if (time < pausedUntil) {
                  lastAnimTime = time; // Pastikan waktu terus jalan agar tidak melompat setelah pause
                  flyAnimationId = requestAnimationFrame(animate);
                  return;
                }

                if (Math.floor(i) >= endIdx) {
                  window.mapConsole.stopFlyThrough();
                  return;
                }

                // Hitung delta time asli (Frame-Rate Independent untuk 60Hz / 120Hz / 144Hz)
                const dt = time - lastAnimTime;
                lastAnimTime = time;
                
                // Batasi dt max 100ms agar saat tab background/lag tidak melompat jauh
                const safeDt = Math.min(dt, 100);

                if (safeDt > 0) {
                  i += pointsPerMs * safeDt;
                  
                  const currentIndex = Math.floor(i);
                  if (currentIndex >= activeData.length - 1) {
                    window.mapConsole.stopFlyThrough();
                    return;
                  }
                  const nextIndex = Math.min(currentIndex + 1, activeData.length - 1);
                  const frac = i - currentIndex;
                  
                  const pt1 = activeData[currentIndex];
                  const pt2 = activeData[nextIndex];
                  
                  // Interpolasi koordinat untuk pergerakan sangat halus (smooth cinematic)
                  const interpLng = pt1.lng + (pt2.lng - pt1.lng) * frac;
                  const interpLat = pt1.lat + (pt2.lat - pt1.lat) * frac;
                  const interpDistance = pt1.distance + (pt2.distance - pt1.distance) * frac;
                  const interpTime = pt1.cumulative_time + (pt2.cumulative_time - pt1.cumulative_time) * frac;

                  const startPt = activeData[startIdx];
                  const offsetPt = {
                    ...pt1, // Bawa elevasi & slope dari pt1
                    lng: interpLng,
                    lat: interpLat,
                    originalDistance: interpDistance,
                    distance: interpDistance - startPt.distance,
                    cumulative_time: interpTime - startPt.cumulative_time
                  };

                  window.mapConsole.hiker3DPosition = [interpLng, interpLat];

                  let targetBearing = currentBearing;
                  // Look-ahead menengah agar tidak terlalu lambat atau terlalu responsif
                  const lookAheadIndex = Math.min(currentIndex + 15, activeData.length - 1);
                  const nextPt = activeData[lookAheadIndex];
                  
                  if (nextPt) {
                    const p1 = turf.point([interpLng, interpLat]);
                    const p2 = turf.point([nextPt.lng, nextPt.lat]);
                    targetBearing = turf.bearing(p1, p2);
                  }

                  let diff = targetBearing - currentBearing;
                  diff = ((diff + 180) % 360) - 180;
                  // Smoothing rotasi kamera
                  currentBearing += diff * 0.05;
                  window.mapConsole.hiker3DRotation = currentBearing;

                  // Hitung padding dinamis berdasarkan panel UI yang terbuka agar icon pendaki tetap di tengah layar yang terlihat
                  let dynPadding = { top: 0, bottom: 0, left: 0, right: 0 };
                  try {
                    const isMobile = window.innerWidth <= 768;
                    const maxPadX = window.innerWidth * 0.4;
                    
                    if (!isMobile) {
                      const leftPanel = document.querySelector('.hud-left-container');
                      if (leftPanel) {
                        const rect = leftPanel.getBoundingClientRect();
                        dynPadding.left = Math.min(Math.max(0, rect.right), maxPadX);
                      }
                      const rightPanel = document.querySelector('.hud-right-container');
                      if (rightPanel) {
                        const rect = rightPanel.getBoundingClientRect();
                        dynPadding.right = Math.min(Math.max(0, window.innerWidth - rect.left), maxPadX);
                      }
                    }
                    
                    // VERTICAL OFFSET KOREKSI 3D:
                    // Karena rendering 3D selalu mendorong puncak terrain ke atas, kita beri sedikit 
                    // padding.top buatan untuk memaksa "center point" kamera turun sedikit ke bawah.
                    // Ini akan membuat icon pendaki turun dari bagian atas layar ke bagian tengah optikal.
                    dynPadding.top = window.innerHeight * 0.2;
                    dynPadding.bottom = 0;
                    
                  } catch (e) {
                    // Abaikan jika error saat query DOM
                  }

                  // Gunakan jumpTo pada 60fps dengan pitch dan zoom yang jauh lebih aman (Drone View Tinggi)
                  // Ini mencegah kamera menabrak (clipping) gunung 3D yang menyebabkan map/icon/popup hilang.
                  map.current.jumpTo({
                    center: [interpLng, interpLat],
                    bearing: currentBearing,
                    pitch: 45,
                    zoom: 13.2,
                    padding: dynPadding
                  });

                  // Cek POI terdekat (hanya untuk simulasi navigasi rute asli)
                  if (!window.mapConsole.importedSimulationData) {
                    const currentPoiList = poiListRef.current;
                    if (currentPoiList && currentPoiList.length > 0) {
                      const currentTurfPt = turf.point([offsetPt.lng, offsetPt.lat]);
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
                        if (!shownItems.has('poi_' + closestPoi.name)) {
                          shownItems.add('poi_' + closestPoi.name);
                          pausedUntil = time + 2500; // Pause 2.5s
                        }
                      } else {
                        if (activePopupRef.current && activePopupRef.current.poiName) {
                          activePopupRef.current.remove();
                          activePopupRef.current = null;
                        }
                      }
                    }
                  } else {
                    // Cek Foto terdekat (hanya untuk navigasi data/impor)
                    const photos = importedPhotosRef.current;
                    if (photos && photos.length > 0) {
                      const currentTurfPt = turf.point([offsetPt.lng, offsetPt.lat]);
                      let closestPhoto = null;
                      let minDistance = 0.05; // Radius 50 meter (0.05 km)
                      
                      photos.forEach(photo => {
                        const photoTurfPt = turf.point([photo.lng, photo.lat]);
                        const dist = turf.distance(currentTurfPt, photoTurfPt, { units: 'kilometers' });
                        if (dist < minDistance) {
                          minDistance = dist;
                          closestPhoto = photo;
                        }
                      });
                      
                      if (closestPhoto) {
                        showPhotoPopup(closestPhoto);
                        if (!shownItems.has('photo_' + closestPhoto.id)) {
                          shownItems.add('photo_' + closestPhoto.id);
                          pausedUntil = time + 2500; // Pause 2.5s
                        }
                      } else {
                        if (activePopupRef.current && activePopupRef.current.photoId) {
                          activePopupRef.current.remove();
                          activePopupRef.current = null;
                        }
                      }
                    }
                  }
                  
                  // JEJAK PENDAKI (TRAIL)
                  // Hapus rute asli dan gambar ulang secara progresif mengikuti icon
                  const isImported = !!window.mapConsole.importedSimulationData;
                  if (isImported) {
                    const src = map.current.getSource('imported-route-source');
                    const baseGeojson = window.mapConsole.baseImportedGeojson;
                    if (src && baseGeojson && baseGeojson.features && baseGeojson.features.length > 0) {
                      const coords = baseGeojson.features[0].geometry.coordinates;
                      const trailCoords = coords.slice(0, currentIndex + 1);
                      trailCoords.push([interpLng, interpLat]);
                      src.setData({
                        type: 'FeatureCollection',
                        features: [{
                          type: 'Feature',
                          properties: baseGeojson.features[0].properties || {},
                          geometry: { type: 'LineString', coordinates: trailCoords }
                        }]
                      });
                    }
                  } else {
                    const src = map.current.getSource('jalur-slope-source');
                    const baseFeatures = window.mapConsole.baseRouteFeatures;
                    if (src && baseFeatures) {
                      const trailFeatures = baseFeatures.slice(0, currentIndex);
                      if (currentIndex < baseFeatures.length && activeData[currentIndex]) {
                        trailFeatures.push({
                          type: 'Feature',
                          properties: { slope_cat: baseFeatures[currentIndex]?.properties?.slope_cat || 'easy' },
                          geometry: {
                            type: 'LineString',
                            coordinates: [
                              [activeData[currentIndex].lng, activeData[currentIndex].lat],
                              [interpLng, interpLat]
                            ]
                          }
                        });
                      }
                      src.setData({ type: 'FeatureCollection', features: trailFeatures });
                    }
                  }

                  // Kirim data telemetri real-time ke HUD (Throttled max 10fps agar tidak memblokir state React)
                  if (time - lastTickTime > 100) {
                    window.dispatchEvent(new CustomEvent('simulation-tick', {
                      detail: offsetPt
                    }));
                    lastTickTime = time;
                  }
                }
                flyAnimationId = requestAnimationFrame(animate);
              };
              flyAnimationId = requestAnimationFrame(animate);
            }, 1500);
          };
          
          window.mapConsole.stopFlyThrough = () => {
            if(flyTimeoutId) clearTimeout(flyTimeoutId);
            if(flyAnimationId) cancelAnimationFrame(flyAnimationId);
            isFlying = false;
              window.mapConsole.isFlying = false;
              if (map.current.getLayer('hiker-3d-model')) {
                map.current.removeLayer('hiker-3d-model');
              }
            
            // Kembalikan rute penuh saat simulasi dihentikan
            if (window.mapConsole.baseImportedGeojson) {
              const src = map.current.getSource('imported-route-source');
              if (src) src.setData(window.mapConsole.baseImportedGeojson);
            }
            if (window.mapConsole.baseRouteFeatures) {
              const src = map.current.getSource('jalur-slope-source');
              if (src) src.setData({ type: 'FeatureCollection', features: window.mapConsole.baseRouteFeatures });
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
    if (window.mapConsole) window.mapConsole.baseRouteFeatures = features;
  }, [profileData, startPoi, endPoi]);

  return <div ref={mapContainer} className="map-container" />;
};

export default MapComponent;
