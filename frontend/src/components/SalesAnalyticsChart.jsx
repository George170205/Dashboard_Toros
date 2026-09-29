import React, { useState, useMemo } from 'react';
import { Maximize2, RotateCw, TrendingUp } from 'lucide-react';

export default function SalesAnalyticsChart({ dailyData = [] }) {
  const [metricMode, setMetricMode] = useState('ingreso'); // 'ingreso' | 'boletos'
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Group or sample points to fit chart cleanly (e.g. 30-40 points across season)
  const sampledData = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return [];
    if (dailyData.length <= 40) return dailyData;
    
    // Sample evenly across the array
    const step = Math.ceil(dailyData.length / 40);
    const result = [];
    for (let i = 0; i < dailyData.length; i += step) {
      result.push(dailyData[i]);
    }
    // Always include last
    if (result[result.length - 1] !== dailyData[dailyData.length - 1]) {
      result.push(dailyData[dailyData.length - 1]);
    }
    return result;
  }, [dailyData]);

  // SVG dimensions
  const width = 760;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;

  const { points1, points2, path1, path2, area1, maxVal1, maxVal2 } = useMemo(() => {
    if (sampledData.length === 0) {
      return { points1: [], points2: [], path1: '', path2: '', area1: '', maxVal1: 1, maxVal2: 1 };
    }

    const max1 = Math.max(...sampledData.map(d => d.ingreso), 1);
    const max2 = Math.max(...sampledData.map(d => d.pagados), 1);

    const pts1 = sampledData.map((d, i) => {
      const x = paddingX + (i / (sampledData.length - 1)) * chartW;
      const y = paddingY + chartH - (d.ingreso / max1) * chartH;
      return { x, y, data: d };
    });

    const pts2 = sampledData.map((d, i) => {
      const x = paddingX + (i / (sampledData.length - 1)) * chartW;
      const y = paddingY + chartH - (d.pagados / max2) * chartH;
      return { x, y, data: d };
    });

    // Helper for smooth bezier curve
    const buildBezier = (pts) => {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2 >= pts.length ? pts.length - 1 : i + 2];

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;

        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    };

    const p1Path = buildBezier(pts1);
    const p2Path = buildBezier(pts2);

    const areaPath = p1Path 
      ? `${p1Path} L ${pts1[pts1.length - 1].x} ${paddingY + chartH} L ${pts1[0].x} ${paddingY + chartH} Z`
      : '';

    return {
      points1: pts1,
      points2: pts2,
      path1: p1Path,
      path2: p2Path,
      area1: areaPath,
      maxVal1: max1,
      maxVal2: max2
    };
  }, [sampledData, chartW, chartH]);

  const activeHoverData = hoveredIndex !== null && sampledData[hoveredIndex] ? sampledData[hoveredIndex] : null;

  return (
    <div className="content-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <h3>Sales Analytics</h3>
          <div className="card-subtitle">Evolución de ventas por fecha de partido y cortes de taquilla</div>
        </div>

        <div className="card-actions">
          <button 
            className={`pill-btn ${metricMode === 'ingreso' ? 'active' : ''}`}
            onClick={() => setMetricMode('ingreso')}
          >
            Ingresos ($ MXN)
          </button>
          <button 
            className={`pill-btn ${metricMode === 'boletos' ? 'active' : ''}`}
            onClick={() => setMetricMode('boletos')}
          >
            Boletos
          </button>
        </div>
      </div>

      {/* SVG Multi-curve Chart */}
      <div className="chart-container" style={{ position: 'relative' }}>
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fe5d70" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#fe5d70" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradOrange" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fe9365" />
              <stop offset="100%" stopColor="#fe5d70" />
            </linearGradient>
            <linearGradient id="lineGradCyan" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#01a9ac" />
              <stop offset="100%" stopColor="#01dbdf" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + chartH * ratio;
            return (
              <g key={idx}>
                <line 
                  x1={paddingX} 
                  y1={y} 
                  x2={width - paddingX} 
                  y2={y} 
                  stroke="#f0f3f6" 
                  strokeDasharray="4 4" 
                />
              </g>
            );
          })}

          {/* Fill Area for primary metric */}
          {area1 && <path d={area1} fill="url(#areaGradient)" />}

          {/* Cyan Line: Boletos / Pagados */}
          {path2 && (
            <path 
              d={path2} 
              fill="none" 
              stroke="url(#lineGradCyan)" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
            />
          )}

          {/* Orange/Red Line: Ingresos ($) */}
          {path1 && (
            <path 
              d={path1} 
              fill="none" 
              stroke="url(#lineGradOrange)" 
              strokeWidth="3.2" 
              strokeLinecap="round" 
            />
          )}

          {/* Interactive Dots and hover trigger */}
          {points1.map((pt, i) => {
            const isHovered = hoveredIndex === i;
            return (
              <g 
                key={i} 
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Invisible hover area */}
                <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />
                {/* Visible dot */}
                {(isHovered || i % 6 === 0) && (
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHovered ? 6 : 4} 
                    fill="#ffffff" 
                    stroke="#fe5d70" 
                    strokeWidth="2.5" 
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {activeHoverData && (
          <div style={{
            position: 'absolute',
            top: 10,
            right: 20,
            background: 'rgba(34, 43, 64, 0.95)',
            color: '#fff',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: '0.8rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            pointerEvents: 'none'
          }}>
            <div style={{ fontWeight: 600, color: '#fe9365', marginBottom: 2 }}>
              📅 Fecha: {activeHoverData.dia}
            </div>
            <div>💰 Ingreso: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(activeHoverData.ingreso)}</div>
            <div>🎟️ Boletos Pagados: {activeHoverData.pagados.toLocaleString()}</div>
            <div>🎁 Cortesías: {activeHoverData.cortesias.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12, fontSize: '0.78rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 4, background: '#fe5d70', borderRadius: 2 }}></span>
          <span style={{ color: '#555', fontWeight: 600 }}>Ingreso Recaudado ($ MXN)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 4, background: '#01a9ac', borderRadius: 2 }}></span>
          <span style={{ color: '#555', fontWeight: 600 }}>Volumen de Boletos Pagados</span>
        </div>
      </div>
    </div>
  );
}
