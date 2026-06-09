import React, { useState } from 'react';
import { Mountain, Map, ArrowRight, ChevronDown } from 'lucide-react';
import '../index.css';

const LandingPage = ({ onApply }) => {
  const [selectedMountain, setSelectedMountain] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  
  // Dummy data based on user request. In future can be dynamic.
  const mountains = ['Gunung Semeru'];
  const routes = ['Ranu Pane']; 

  const handleMountainChange = (e) => {
    setSelectedMountain(e.target.value);
    setSelectedRoute(''); // Reset route when mountain changes
  };

  return (
    <div className="landing-page">
      {/* Background Image & Overlay */}
      <div className="landing-bg" style={{ backgroundImage: `url('${import.meta.env.BASE_URL}img/landing_bg.png')` }}></div>
      <div className="landing-overlay"></div>
      
      <div className="landing-content">
        {/* Logo & Title */}
        <div className="landing-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <img src={`${import.meta.env.BASE_URL}img/Mandalagiri.png`} alt="Mandalagiri Logo" className="landing-logo" />
          <h1 style={{ 
            color: '#fff', fontSize: '1.8rem', margin: 0, fontWeight: '800', letterSpacing: '2px', 
            textTransform: 'uppercase', textShadow: '0 0 10px rgba(34, 211, 238, 0.5)'
          }}>
            Mandalagiri
          </h1>
        </div>
        
        {/* Description */}
        <p className="landing-desc">
          Experience the next-generation 3D interactive map for your mountaineering adventures. 
          Explore majestic trails, analyze elevations, and simulate your navigation in real-time.
        </p>

        {/* Configuration Panel */}
        <div className="landing-glass-panel">
          <div className="landing-panel-header">
            <h3 className="landing-title">Configure Expedition</h3>
            <div className="landing-title-line"></div>
          </div>
          
          <div className="landing-input-group">
            <label><Mountain size={16} /> Mountain</label>
            <div className="landing-select-wrapper" style={{ position: 'relative', width: '100%' }}>
              <select value={selectedMountain} onChange={handleMountainChange} className="landing-select">
                <option value="" disabled>Select Mountain...</option>
                {mountains.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          <div className="landing-input-group">
            <label><Map size={16} /> Route</label>
            <div className="landing-select-wrapper" style={{ position: 'relative', width: '100%' }}>
              <select 
                value={selectedRoute} 
                onChange={(e) => setSelectedRoute(e.target.value)} 
                className="landing-select"
                disabled={!selectedMountain}
              >
                <option value="" disabled>Select Route...</option>
                {selectedMountain === 'Gunung Semeru' && routes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            </div>
          </div>

          <button 
            className={`landing-btn ${(!selectedMountain || !selectedRoute) ? 'disabled' : ''}`}
            disabled={!selectedMountain || !selectedRoute}
            onClick={() => onApply(selectedMountain, selectedRoute)}
          >
            Start Expedition <ArrowRight size={18} />
          </button>
        </div>
        
        <div className="landing-footer">
          <p>Powered by Mandalagiri Engine & MapLibre GL JS</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
