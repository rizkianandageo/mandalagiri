import React, { useEffect, useState } from 'react';
import MapComponent from './components/MapComponent';
import ElevationProfile from './components/ElevationProfile';
import LandingPage from './components/LandingPage';
import { Mountain, Map, Target, CloudRain, Sun, Wind, Cloud, Play, Square, Rewind, FastForward, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import './index.css';

function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [profileData, setProfileData] = useState([]);
  const [poiList, setPoiList] = useState([]);
  const [startPoi, setStartPoi] = useState(null);
  const [endPoi, setEndPoi] = useState(null);
  const [slicedProfileData, setSlicedProfileData] = useState([]);
  
  const [jalurData, setJalurData] = useState([]);
  const [mountains, setMountains] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedMountain, setSelectedMountain] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [isDescMinimized, setIsDescMinimized] = useState(isMobile);
  const [isWeatherMinimized, setIsWeatherMinimized] = useState(isMobile);
  const [isLiveSituationMinimized, setIsLiveSituationMinimized] = useState(isMobile);
  
  const [segmentStats, setSegmentStats] = useState({
    jarakTempuh: "0.0",
    waktuTempuhStr: "0m",
    diffMain: "Loading...",
    diffSub: "",
    difficultyColor: "#10b981"
  });

  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState(null);
  const [hoverTelemetry, setHoverTelemetry] = useState(null);
  const [isOutsideBounds, setIsOutsideBounds] = useState(false);

  // Dummy user location
  const [userLocation, setUserLocation] = useState({
    lat: -8.0311,
    lng: 112.9230,
    alt: 2389
  });

  useEffect(() => {
    // Muat data rute & POI secara paralel
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/profile.json`).then(res => res.json()),
      fetch(`${base}data/poi.geojson`).then(res => res.json()),
      fetch(`${base}data/jalur.geojson`).then(res => res.json())
    ])
      .then(([profileJson, poiGeojson, jalurGeojson]) => {
        setProfileData(profileJson);
        
        if (jalurGeojson && jalurGeojson.features) {
          setJalurData(jalurGeojson.features);
          const uniqueMountains = [...new Set(jalurGeojson.features.map(f => f.properties.Keterangan).filter(Boolean))];
          setMountains(uniqueMountains);
          if (uniqueMountains.length > 0) setSelectedMountain(uniqueMountains[0]);
          
          const uniqueRoutes = [...new Set(jalurGeojson.features.map(f => f.properties.Nama).filter(Boolean))];
          setRoutes(uniqueRoutes);
          if (uniqueRoutes.length > 0) setSelectedRoute(uniqueRoutes[0]);
        }
        
        // Petakan POI ke index terdekat di profileJson
        const mappedPois = poiGeojson.features.map(f => {
          const [lng, lat] = f.geometry.coordinates;
          let minDiff = Infinity;
          let closestIdx = 0;
          profileJson.forEach((pt, i) => {
            const diff = Math.pow(pt.lng - lng, 2) + Math.pow(pt.lat - lat, 2);
            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
          });
          return { name: f.properties.Nama, index: closestIdx, lng, lat };
        });
        
        mappedPois.sort((a, b) => a.index - b.index);
        setPoiList(mappedPois);
        setStartPoi(mappedPois[0]);
        setEndPoi(mappedPois[mappedPois.length - 1]);
        
        setLiveTelemetry({
          elevation: profileJson[0].elevation,
          distance: 0,
          slope: profileJson[0].slope,
          cumulative_time: 0,
          vam: profileJson[0].vam,
          lat: profileJson[0].lat,
          lng: profileJson[0].lng
        });
      })
      .catch(err => console.error("Gagal load data rute/POI:", err));

    // Cek GPS aktual dari perangkat
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const alt = position.coords.altitude || 0;
          
          setUserLocation({ lat, lng, alt });
          
          // Cek apakah di luar bounds Gunung Semeru (toleransi kasar)
          const outside = lng < 112.8 || lng > 113.1 || lat < -8.2 || lat > -7.9;
          setIsOutsideBounds(outside);
          
          // Jika elevasi GPS ada nilainya, update default elevation di HUD
          if (alt > 0 && !outside) {
            setLiveTelemetry(prev => prev ? { ...prev, elevation: alt } : null);
          }
        },
        (error) => console.warn("GPS tidak dapat diakses:", error),
        { enableHighAccuracy: true }
      );
    }
    
    // Fungsi simulasi lokasi (dikontrol lewat browser developer console)
    // Contoh penggunaan: window.setFakeLocation(-8.011, 112.945, 2111)
    window.setFakeLocation = (lat, lng, alt = 2100) => {
      setUserLocation({ lat, lng, alt });
      const outside = lng < 112.8 || lng > 113.1 || lat < -8.2 || lat > -7.9;
      setIsOutsideBounds(outside);
      if (alt > 0 && !outside) {
        setLiveTelemetry(prev => prev ? { ...prev, elevation: alt } : null);
      }
      console.log(`%c[GPS Override]%c Posisi dipalsukan ke: ${lat}, ${lng} | Alt: ${alt}m`, 'color: #38bdf8; font-weight: bold;', 'color: inherit;');
      if (!outside && window.mapConsole && window.mapConsole.setCamera) {
         window.mapConsole.setCamera(lng, lat, 15.5, 65, 0);
      }
    };

    // Ambil data cuaca dari Open-Meteo
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-8.1078&longitude=112.9221&current_weather=true&hourly=temperature_2m,weathercode&timezone=Asia%2FJakarta')
      .then(res => res.json())
      .then(data => {
        if(data && data.current_weather) {
          setWeather(data.current_weather);
        }
        if(data && data.hourly) {
          const todayPrefix = data.current_weather.time.split('T')[0];
          const targetHours = [
            { label: 'Morning', time: `${todayPrefix}T06:00` },
            { label: 'Noon', time: `${todayPrefix}T12:00` },
            { label: 'Afternoon', time: `${todayPrefix}T16:00` },
            { label: 'Night', time: `${todayPrefix}T20:00` }
          ];

          const dailyForecasts = targetHours.map(target => {
            const index = data.hourly.time.indexOf(target.time);
            if(index !== -1) {
              return {
                label: target.label,
                temp: Math.round(data.hourly.temperature_2m[index]),
                code: data.hourly.weathercode[index]
              };
            }
            return null;
          }).filter(f => f !== null);
          setForecast(dailyForecasts);
        }
      })
      .catch(err => console.error("Gagal load cuaca:", err));

    // Listener untuk Live Telemetry dan Hover dari MapComponent
    const handleSimulationTick = (e) => {
      if (e.detail) {
        setLiveTelemetry(e.detail);
      }
    };
    const handleHover = (e) => {
      setHoverTelemetry(e.detail);
    };
    window.addEventListener('simulation-tick', handleSimulationTick);
    window.addEventListener('profile-hover', handleHover);
    
    return () => {
      window.removeEventListener('simulation-tick', handleSimulationTick);
      window.removeEventListener('profile-hover', handleHover);
    };
  }, []);

  // Update dropdown routes berdasarkan gunung yang dipilih
  useEffect(() => {
    if (!selectedMountain || !jalurData.length) return;
    const filteredRoutes = [...new Set(jalurData.filter(f => f.properties.Keterangan === selectedMountain).map(f => f.properties.Nama).filter(Boolean))];
    setRoutes(filteredRoutes);
    if (filteredRoutes.length > 0 && !filteredRoutes.includes(selectedRoute)) {
      setSelectedRoute(filteredRoutes[0]);
    }
  }, [selectedMountain, jalurData]);

  // Effect untuk menghitung ulang metrik setiap kali segment berubah
  useEffect(() => {
    if (profileData.length === 0 || !startPoi || !endPoi) return;

    let sIdx = startPoi.index;
    let eIdx = endPoi.index;
    if (sIdx > eIdx) {
      const temp = sIdx; sIdx = eIdx; eIdx = temp;
    }

    const sliced = profileData.slice(sIdx, eIdx + 1);
    const startDist = sliced[0].distance;
    const startCumulativeTime = sliced[0].cumulative_time;

    // Reset distance dan cumulative_time ke 0 untuk segment ini
    const offsetSliced = sliced.map(pt => ({
      ...pt,
      originalDistance: pt.distance,
      distance: pt.distance - startDist,
      cumulative_time: pt.cumulative_time - startCumulativeTime
    }));
    
    setSlicedProfileData(offsetSliced);

    // Hitung Statistik
    const totalDist = offsetSliced[offsetSliced.length - 1].distance;
    const timeDelta = offsetSliced[offsetSliced.length - 1].cumulative_time;
    
    let hardCount = 0;
    offsetSliced.forEach(pt => { if (pt.slope_cat === 'hard') hardCount++; });
    const hardRatio = hardCount / offsetSliced.length;
    
    let diffMain = "Easy";
    let diffSub = "(Mostly flat)";
    let diffCol = "#10b981";
    
    if (hardRatio > 0.4) { diffMain = "Very Steep"; diffSub = "(>40% steep sections)"; diffCol = "#b91c1c"; }
    else if (hardRatio > 0.25) { diffMain = "Steep"; diffSub = "(25-40% steep sections)"; diffCol = "#ef4444"; }
    else if (hardRatio > 0.10) { diffMain = "Moderate"; diffSub = "(10-25% steep sections)"; diffCol = "#f97316"; }
    else { diffMain = "Easy"; diffSub = "(Mostly flat/downhill)"; diffCol = "#eab308"; }

    const jam = Math.floor(timeDelta / 60);
    const menit = Math.floor(timeDelta % 60);

    setSegmentStats({
      jarakTempuh: totalDist.toFixed(1),
      waktuTempuhStr: jam > 0 ? `${jam}h ${menit}m` : `${menit}m`,
      diffMain,
      diffSub,
      difficultyColor: diffCol
    });

    if (!isSimulating) {
      setLiveTelemetry({
        elevation: offsetSliced[0].elevation,
        distance: offsetSliced[0].distance,
        slope: offsetSliced[0].slope,
        cumulative_time: offsetSliced[0].cumulative_time,
        vam: offsetSliced[0].vam,
        lat: offsetSliced[0].lat,
        lng: offsetSliced[0].lng
      });
    }
  }, [startPoi, endPoi, profileData]);

  // Telemetry aktif untuk di-render di HUD
  const activeTelemetry = hoverTelemetry || liveTelemetry;

  const toggleSimulation = () => {
    if(!isSimulating) {
      if(window.mapConsole && window.mapConsole.startFlyThrough) {
        const s = startPoi ? startPoi.index : 0;
        const e = endPoi ? endPoi.index : profileData.length - 1;
        window.mapConsole.startFlyThrough(s, e);
        setIsSimulating(true);
      }
    } else {
      if(window.mapConsole && window.mapConsole.stopFlyThrough) {
        window.mapConsole.stopFlyThrough();
        setIsSimulating(false);
      }
    }
  };

  const getWeatherIcon = (code, size = 20) => {
    if (code <= 3) return <Sun size={size} color="#22d3ee" />;
    if (code <= 48) return <Cloud size={size} color="#a1a1aa" />;
    return <CloudRain size={size} color="#38bdf8" />;
  };

  // Kalkulasi jarak dan waktu yang DINAMIS berdasarkan hover/live telemetry
  const safeDistance = activeTelemetry?.distance || 0;
  const dynJarakTempuh = safeDistance.toFixed(1);
  
  const dynWaktuMenit = activeTelemetry?.cumulative_time || 0;
  const dynJam = Math.floor(dynWaktuMenit / 60);
  const dynMenit = Math.floor(dynWaktuMenit % 60);
  const dynWaktuStr = dynJam > 0 ? `${dynJam}h ${dynMenit}m` : `${dynMenit}m`;

  const getDisplayElevation = () => {
    if (hoverTelemetry) return Math.round(hoverTelemetry.elevation);
    if (isSimulating && liveTelemetry) return Math.round(liveTelemetry.elevation);
    
    // Default: ikuti GPS Location
    if (isOutsideBounds) return '---';
    return Math.round(userLocation.alt);
  };

  const getDisplayCoordinates = () => {
    if (hoverTelemetry) return `${hoverTelemetry.lat.toFixed(5)}, ${hoverTelemetry.lng.toFixed(5)}`;
    if (isSimulating && liveTelemetry) return `${liveTelemetry.lat.toFixed(5)}, ${liveTelemetry.lng.toFixed(5)}`;
    
    // Default: Puncak Semeru (koordinat terakhir di jalur)
    if (profileData && profileData.length > 0) {
      const puncak = profileData[profileData.length - 1];
      return `${puncak.lat.toFixed(5)}, ${puncak.lng.toFixed(5)}`;
    }
    return '---';
  };

  if (!hasStarted) {
    return (
      <LandingPage 
        onApply={(mountain, route) => {
          setSelectedMountain(mountain);
          setSelectedRoute(route);
          setHasStarted(true);
        }} 
      />
    );
  }

  return (
    <>
      <MapComponent 
          userLocation={userLocation} 
          isOutsideBounds={isOutsideBounds} 
          startPoi={startPoi} 
          endPoi={endPoi} 
          slicedProfileData={slicedProfileData}
          poiList={poiList}
        />
      
      {/* HUD: Top Bar */}
      <div className="hud-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ 
            color: '#fff', fontSize: '1.2rem', margin: 0, fontWeight: '800', letterSpacing: '2px', 
            textTransform: 'uppercase', textShadow: '0 0 10px rgba(34, 211, 238, 0.5)',
            display: 'flex', alignItems: 'center'
          }}>
            <img src={`${import.meta.env.BASE_URL}img/Mandalagiri.png`} alt="Mandalagiri Logo" style={{ width: '28px', height: '28px', marginRight: '8px', objectFit: 'contain' }} />
            Mandalagiri
          </h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            {/* Switch Mountain Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Mountain size={14} className="topbar-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#000', zIndex: 2 }} />
              <select 
                value={selectedMountain}
                onChange={e => setSelectedMountain(e.target.value)}
                style={{ 
                  background: 'var(--accent)', color: '#000', border: 'none', 
                  padding: '8px 32px 8px 32px', borderRadius: '6px', fontWeight: 'bold',
                  fontSize: '0.75rem', cursor: 'pointer', outline: 'none',
                  boxShadow: '0 0 10px rgba(34, 211, 238, 0.4)',
                  appearance: 'none', WebkitAppearance: 'none',
                  fontFamily: 'inherit',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <option value="" disabled>Switch Mountain</option>
                {mountains.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            {/* Switch Route Dropdown */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Map size={14} className="topbar-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#000', zIndex: 2 }} />
              <select 
                value={selectedRoute}
                onChange={e => setSelectedRoute(e.target.value)}
                style={{ 
                  background: 'var(--accent)', color: '#000', border: 'none', 
                  padding: '8px 32px 8px 32px', borderRadius: '6px', fontWeight: 'bold',
                  fontSize: '0.75rem', cursor: 'pointer', outline: 'none',
                  boxShadow: '0 0 10px rgba(34, 211, 238, 0.4)',
                  appearance: 'none', WebkitAppearance: 'none',
                  fontFamily: 'inherit',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                <option value="" disabled>Switch Route</option>
                {routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* HUD: Left Panel - Description */}
      <div className="hud-left-container">
        {selectedMountain === 'Gunung Semeru' && (
          <div className="hud-panel" style={{ position: 'static', width: '100%', padding: '16px' }}>
            <div className="hud-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isDescMinimized ? '0' : '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mountain size={14} /> Mountain Info
              </div>
              <button 
                onClick={() => setIsDescMinimized(!isDescMinimized)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                {isDescMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
            
            {!isDescMinimized && (
              <div className="mountain-info-content" style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                <h3 className="text-gradient-primary mountain-info-title" style={{ fontSize: '1.1rem', marginBottom: '8px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Mt. Semeru</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr', gap: '4px 8px', alignItems: 'start' }}>
                  <div className="text-muted font-mono">Location</div><div className="text-muted font-mono">:</div><div>East Java, Indonesia</div>
                  <div className="text-muted font-mono">Elevation</div><div className="text-muted font-mono">:</div><div>3,676 meters (12,060 ft)</div>
                  <div className="text-muted font-mono">Type</div><div className="text-muted font-mono">:</div><div>Active Stratovolcano</div>
                  <div className="text-muted font-mono">National Park</div><div className="text-muted font-mono">:</div><div>Bromo Tengger Semeru</div>
                  <div className="text-muted font-mono">Highest Peak</div><div className="text-muted font-mono">:</div><div>Mahameru</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HUD: Right Panel Group (Live Situation + Weather) */}
      <div className="hud-right-container">
        
        {/* Card 1: Live Situation */}
        <div className="hud-panel" style={{ position: 'static', width: '100%', padding: '16px' }}>
          <div className="hud-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isLiveSituationMinimized ? '0' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={14} /> Live Situation
            </div>
            <button 
              onClick={() => setIsLiveSituationMinimized(!isLiveSituationMinimized)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {isLiveSituationMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
          
          {!isLiveSituationMinimized && (
            <div className="live-situation-content">
          
          <div className="telemetry-row">
            <span className="telemetry-label">Elevation</span>
            <span className="telemetry-value-lg text-accent font-mono">
              {getDisplayElevation()}
              <span className="telemetry-unit">MASL</span>
            </span>
          </div>

          <div className="telemetry-row">
            <span className="telemetry-label">Coordinates Profile</span>
            <span className="font-mono text-muted" style={{ fontSize: '0.85rem' }}>
              {getDisplayCoordinates()}
            </span>
          </div>

          <div className="telemetry-row" style={{ marginTop: '8px', paddingBottom: '12px', borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="telemetry-label">My Location (GPS)</span>
            <button 
              onClick={() => {
                if(!isOutsideBounds && window.mapConsole && window.mapConsole.setCamera) {
                  window.mapConsole.setCamera(userLocation.lng, userLocation.lat, 15.5, 65, 0);
                }
              }}
              disabled={isOutsideBounds}
              style={{
                background: isOutsideBounds ? 'rgba(255,255,255,0.05)' : 'rgba(34, 211, 238, 0.1)', 
                border: isOutsideBounds ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent)', 
                color: isOutsideBounds ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', cursor: isOutsideBounds ? 'not-allowed' : 'pointer', 
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
              <Target size={12} /> Fly to GPS
            </button>
          </div>
          <div className="font-mono text-main live-sit-coords-box" style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '8px' }}>
            {isOutsideBounds ? (
              <span className="live-sit-outside" style={{ color: '#ef4444', fontSize: '0.8rem' }}>Outside mountain area.</span>
            ) : (
              <span className="live-sit-coords">{`${Math.abs(userLocation.lat).toFixed(4)}° S, ${userLocation.lng.toFixed(4)}° E`}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <div className="telemetry-row" style={{ flex: 1 }}>
            <span className="telemetry-label">Grade</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div className="grade-bar">
                <div className="grade-fill" style={{ height: `${Math.min(100, Math.abs(liveTelemetry?.slope || 0))}%` }}></div>
              </div>
              <span className="telemetry-value font-mono live-sit-grade-val" style={{ marginLeft: '8px', fontSize: '1.2rem', fontWeight: 'bold', color: activeTelemetry?.slope > 15 ? '#ef4444' : 'var(--text-primary)' }}>{activeTelemetry?.slope?.toFixed(1) || '0.0'} <span className="telemetry-unit">%</span></span>
            </div>
          </div>
          
            <div className="telemetry-row" style={{ flex: 1 }}>
              <span className="telemetry-label live-sit-weather-lbl">Weather (Current)</span>
              <span className="telemetry-value-lg font-mono live-sit-weather-val" style={{ fontSize: '1.4rem' }}>
                {weather ? weather.temperature : '...'}<span className="telemetry-unit">°C</span>
              </span>
              {weather && (
                <div className="font-mono text-muted live-sit-weather-desc" style={{ fontSize: '0.65rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Wind size={12} /> {weather.windspeed}KM/H
                </div>
              )}
            </div>
          </div>
          </div>
          )}
        </div>

        {/* Card 2: Weather Forecast */}
        <div className="hud-panel" style={{ position: 'static', width: '100%', padding: '16px' }}>
          <div className="hud-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isWeatherMinimized ? '0' : '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CloudRain size={14} /> Weather Forecast
            </div>
            <button 
              onClick={() => setIsWeatherMinimized(!isWeatherMinimized)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {isWeatherMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
          
          {!isWeatherMinimized && (
            forecast && forecast.length > 0 ? (
              <div className="weather-grid">
                {forecast.map((f, i) => (
                  <div key={i} className="weather-box">
                    <span style={{ fontSize: '0.65rem' }}>{f.label}</span>
                    {getWeatherIcon(f.code, 20)}
                    <span className="font-mono" style={{ fontSize: '0.85rem' }}>{f.temp}°C</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading weather data...</div>
            )
          )}
        </div>
      </div>

      {/* HUD: Bottom Panel - Route Profile & Controls */}
      <div className="hud-panel hud-bottom">
        
        {/* Kiri: Sisa Jarak & ETA */}
        <div className="segment-profile-col" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="hud-panel-title" style={{ marginBottom: '8px' }}>
            <Activity size={14} /> Segment Profile
          </div>
          
          <div className="segment-stats-container">
            <div className="segment-stat-item" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="telemetry-label">Distance</span>
              <span className="font-mono text-accent stat-val-dist" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>
                {dynJarakTempuh} <span className="telemetry-unit text-accent">KM</span>
              </span>
            </div>
            
            <div className="segment-stat-item" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="telemetry-label">Estimated Time</span>
              <span className="font-mono stat-val-time" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '8px' }}>
                {dynWaktuStr}
              </span>
            </div>

            <div className="segment-stat-item" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="telemetry-label">Route</span>
              <div className="font-mono trail-char-box" style={{ 
                color: segmentStats.difficultyColor,
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                border: `1px solid ${segmentStats.difficultyColor}`,
                marginTop: '2px',
                display: 'inline-flex',
                flexDirection: 'column',
                width: 'max-content'
              }}>
                <span className="trail-char-main" style={{ fontSize: '0.85rem', fontWeight: 700 }}>{segmentStats.diffMain}</span>
                {segmentStats.diffSub && <span className="trail-char-sub" style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '2px' }}>{segmentStats.diffSub}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tengah: Grafik Elevasi & Dropdown POI */}
        <div className="elevation-profile-col" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="route-select-row" style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="telemetry-label" style={{ margin: 0 }}>Start:</span>
              <select 
                value={startPoi?.index ?? ''}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  const poi = poiList.find(p => p.index === idx);
                  if (poi) setStartPoi(poi);
                }}
                className="font-mono"
                style={{ background: 'rgba(15,23,42,0.8)', color: '#fff', border: '1px solid var(--accent)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                {poiList.map((poi, i) => (
                  <option key={i} value={poi.index} disabled={endPoi && poi.index >= endPoi.index}>{poi.name}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="telemetry-label" style={{ margin: 0 }}>Destination:</span>
              <select 
                value={endPoi?.index ?? ''}
                onChange={(e) => {
                  const idx = parseInt(e.target.value);
                  const poi = poiList.find(p => p.index === idx);
                  if (poi) setEndPoi(poi);
                }}
                className="font-mono"
                style={{ background: 'rgba(15,23,42,0.8)', color: '#fff', border: '1px solid var(--accent)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem', outline: 'none', cursor: 'pointer' }}
              >
                {poiList.map((poi, i) => (
                  <option key={i} value={poi.index} disabled={startPoi && poi.index <= startPoi.index}>{poi.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
             <ElevationProfile data={slicedProfileData} currentDistance={activeTelemetry?.distance} />
          </div>
        </div>

        {/* Kanan: Kontrol Simulasi */}
        <div className="simulation-controls-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '120px', position: 'relative' }}>
          
          <div className="simulation-ornament-container" style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Ornamen HUD */}
            <div className="sci-fi-ornament" style={{ borderColor: isSimulating ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 211, 238, 0.4)' }}></div>
            <div className="sci-fi-ornament-2" style={{ 
              borderColor: isSimulating ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 238, 0.1)' 
            }}>
              <div style={{ 
                position: 'absolute', top: '-4px', left: '50%', transform: 'translateX(-50%)', 
                width: '4px', height: '8px', background: isSimulating ? '#ef4444' : 'var(--accent)',
                boxShadow: isSimulating ? '0 0 8px #ef4444' : '0 0 8px var(--accent)'
              }}></div>
              <div style={{ 
                position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%)', 
                width: '4px', height: '8px', background: isSimulating ? '#ef4444' : 'var(--accent)',
                boxShadow: isSimulating ? '0 0 8px #ef4444' : '0 0 8px var(--accent)'
              }}></div>
              <div style={{ 
                position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)', 
                width: '8px', height: '4px', background: isSimulating ? '#ef4444' : 'var(--accent)',
                boxShadow: isSimulating ? '0 0 8px #ef4444' : '0 0 8px var(--accent)'
              }}></div>
              <div style={{ 
                position: 'absolute', right: '-4px', top: '50%', transform: 'translateY(-50%)', 
                width: '8px', height: '4px', background: isSimulating ? '#ef4444' : 'var(--accent)',
                boxShadow: isSimulating ? '0 0 8px #ef4444' : '0 0 8px var(--accent)'
              }}></div>
            </div>

            {/* Main Button */}
            <button 
              className="sim-play-btn"
              onClick={toggleSimulation}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: isSimulating ? '#ef4444' : 'var(--accent)',
                color: isSimulating ? '#fff' : '#000',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSimulating ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 20px rgba(34, 211, 238, 0.6)',
                transition: 'all 0.3s',
                position: 'relative',
                zIndex: 2
              }}
            >
              {isSimulating ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: '4px' }} />}
            </button>
          </div>

          <div style={{ 
            fontFamily: '"Share Tech Mono", "Courier New", monospace',
            fontSize: '0.65rem', 
            fontWeight: 700, 
            color: isSimulating ? '#ef4444' : 'var(--accent)', 
            letterSpacing: '1px', 
            textAlign: 'center', 
            lineHeight: '1.4',
            textTransform: 'uppercase',
            textShadow: isSimulating ? '0 0 8px rgba(239,68,68,0.5)' : '0 0 8px rgba(34,211,238,0.5)',
            marginTop: '8px'
          }}>
            {isSimulating ? <>Stop<br/>Simulation</> : <>Navigation<br/>Simulation</>}
          </div>
        </div>

      </div>
    </>
  );
}

export default App;
