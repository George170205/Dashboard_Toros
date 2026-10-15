import React from 'react';
import { Download, Info, ShieldCheck } from 'lucide-react';

export default function ProjectRiskGauge({ kpis, seasonName, onDownloadReport }) {
  const score = kpis?.gauge_score != null ? kpis.gauge_score : 0;
  const aforoPct = kpis?.aforo_promedio_pct != null ? kpis.aforo_promedio_pct : 0;

  // Calculate arc stroke dashoffset for gauge (radius 50, semi-circle length ~ 157)
  const radius = 55;
  const circumference = Math.PI * radius; // ~172.7
  // score is 0 to 10
  const progressRatio = Math.min(Math.max(score / 10, 0), 1);
  const strokeDashoffset = circumference * (1 - progressRatio);

  return (
    <div className="content-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <h3>Nivel de Ocupación</h3>
          <div className="card-subtitle">Indicador de aforo promedio por juego</div>
        </div>
      </div>

      <div className="gauge-card-content">
        <div className="gauge-svg-wrapper">
          <svg viewBox="0 0 140 85" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="gaugeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fe9365" />
                <stop offset="60%" stopColor="#fe5d70" />
                <stop offset="100%" stopColor="#0ac282" />
              </linearGradient>
            </defs>

            {/* Background Track (Dashed) */}
            <path
              d="M 15 75 A 55 55 0 0 1 125 75"
              fill="none"
              stroke="#e9edf2"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="4 6"
            />

            {/* Animated Active Arc */}
            <path
              d="M 15 75 A 55 55 0 0 1 125 75"
              fill="none"
              stroke="url(#gaugeGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>

          {/* Centered Big Value */}
          <div className="gauge-score-center">
            {score.toFixed(1)}
          </div>
        </div>

        <div className="gauge-label">
          {score >= 7 ? 'Excelente Demanda' : score >= 4 ? 'Aforo Balanceado' : 'Aforo Moderado'}
        </div>
        <div className="gauge-sublink">
          Promedio: {aforoPct}% de capacidad
        </div>

        {/* Meta Row */}
        <div className="gauge-meta-row">
          <div className="gauge-meta-item">
            <span>Sede</span>
            <span>Estadio Chevron</span>
          </div>
          <div className="gauge-meta-item">
            <span>Capacidad</span>
            <span>{kpis?.capacidad_estadio ? `${kpis.capacidad_estadio.toLocaleString()} Asientos` : '17,000 Asientos'}</span>
          </div>
          <div className="gauge-meta-item">
            <span>Total Juegos</span>
            <span>{kpis?.total_eventos ? `${kpis.total_eventos} Partidos` : 'Partidos de Temporada'}</span>
          </div>
        </div>

        {/* CTA Button matching Adminty */}
        <button 
          className="btn-cta-orange" 
          onClick={onDownloadReport}
          title="Descargar resumen de temporada en CSV"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Download size={16} />
            <span>Descargar Reporte General</span>
          </div>
        </button>
      </div>
    </div>
  );
}
