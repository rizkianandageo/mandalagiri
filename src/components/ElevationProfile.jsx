import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

const CHART_HEIGHT = 160;
const MARGIN = { top: 12, right: 20, left: -20, bottom: 0 };
const YAXIS_WIDTH = 70;

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        padding: '8px 12px',
        borderRadius: '8px',
        color: '#f8fafc',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        fontSize: '0.75rem',
        pointerEvents: 'none'
      }}>
        <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: '#10b981' }}>
          ⛰️ {d.elevation} MASL
        </p>
        <p style={{ margin: 0, color: '#94a3b8' }}>Distance: {d.distance} km</p>
      </div>
    );
  }
  return null;
};

const ElevationProfile = ({ data = [], currentDistance }) => {
  const [chartWidth, setChartWidth] = useState(0);
  const [hoverIdx, setHoverIdx] = useState(null);
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (data.length === 0 || !containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setChartWidth(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [data.length]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || data.length === 0 || chartWidth === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const plotLeft = MARGIN.left + YAXIS_WIDTH;
    const plotRight = chartWidth - MARGIN.right;
    const plotWidth = plotRight - plotLeft;

    if (mouseX < plotLeft || mouseX > plotRight) return;
    const ratio = (mouseX - plotLeft) / plotWidth;
    const idx = Math.max(0, Math.min(Math.round(ratio * (data.length - 1)), data.length - 1));

    if (idx !== hoverIdx) {
      setHoverIdx(idx);
      const d = data[idx];
      window.dispatchEvent(new CustomEvent('profile-hover', {
        detail: d
      }));
    }
  }, [data, chartWidth, hoverIdx]);

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    window.dispatchEvent(new CustomEvent('profile-hover', { detail: null }));
  }, []);

  if (data.length === 0) return <div ref={containerRef} className="chart-container"></div>;

  let activeX = null;
  if (currentDistance !== undefined && currentDistance !== null) {
    activeX = currentDistance;
  } else if (hoverIdx !== null) {
    activeX = data[hoverIdx]?.distance;
  }

  // Kalkulasi Ticks Sumbu Y
  const minElev = Math.floor(Math.min(...data.map(d => d.elevation)) / 100) * 100 - 100;
  const yTicks = [2000, 2600, 3200, 3800]; // Bisa dinamis jika mau, tapi biarkan fix agar proporsional
  
  // Kalkulasi Ticks Sumbu X
  const maxDist = data[data.length - 1].distance;
  const xTicks = [0];
  let step = 2;
  if (maxDist <= 2) step = 0.5;
  else if (maxDist <= 5) step = 1;
  
  for (let i = step; i <= Math.floor(maxDist); i += step) {
    xTicks.push(i);
  }
  if (maxDist > xTicks[xTicks.length - 1] && maxDist > 0) {
    xTicks.push(maxDist);
  }

  return (
    <div
      ref={containerRef}
      className="chart-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {chartWidth > 0 && (
        <AreaChart
          width={chartWidth}
          height={window.innerWidth <= 768 ? 120 : CHART_HEIGHT}
          data={data}
          margin={MARGIN}
        >
          <defs>
            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="distance"
            type="number"
            domain={[0, 'dataMax']}
            ticks={xTicks}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v === 0 ? '' : `${v % 1 !== 0 ? v.toFixed(2) : v} km`}
          />
          <YAxis
            domain={[2000, 3800]}
            ticks={yTicks}
            tick={{ fill: '#64748b', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} m`}
            width={YAXIS_WIDTH}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          
          {activeX !== null && (
            <ReferenceLine
              x={activeX}
              stroke="rgba(251, 191, 36, 0.8)"
              strokeWidth={2}
              strokeDasharray="3 3"
            />
          )}

          <Area
            type="monotone"
            dataKey="elevation"
            stroke="#10b981"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorElev)"
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      )}
    </div>
  );
};

export default ElevationProfile;
