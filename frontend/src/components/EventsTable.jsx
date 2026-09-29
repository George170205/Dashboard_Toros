import React, { useState } from 'react';
import { Search, ChevronRight, CheckSquare, Square } from 'lucide-react';

export default function EventsTable({ events = [], searchTerm = '' }) {
  const [selectedEvents, setSelectedEvents] = useState({});
  const [faseFilter, setFaseFilter] = useState('ALL');

  const filteredEvents = events.filter((ev) => {
    const matchesSearch = 
      ev.evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.rival.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (faseFilter === 'ALL') return matchesSearch;
    return matchesSearch && ev.fase === faseFilter;
  });

  const toggleSelect = (name) => {
    setSelectedEvents(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const getFaseBadgeClass = (fase) => {
    if (fase.includes('Rey') || fase.includes('Campeonato')) return 'badge-final';
    if (fase.includes('Zona') || fase.includes('Playoff')) return 'badge-playoffs';
    return 'badge-regular';
  };

  // Sparkline builder
  const renderSparkline = (data = [], isGreen = true) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const w = 70;
    const h = 22;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * (h - 6) - 3;
      return `${x},${y}`;
    }).join(' ');

    const strokeColor = isGreen ? '#0ac282' : '#fe5d70';

    return (
      <svg className="sparkline-svg" viewBox={`0 0 ${w} ${h}`}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pts}
        />
      </svg>
    );
  };

  return (
    <div className="content-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <h3>Ventas por Partido & Evento</h3>
          <div className="card-subtitle">Desglose de boletos pagados, cortesías e ingresos por juego</div>
        </div>

        <div className="card-actions">
          <button 
            className={`pill-btn ${faseFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setFaseFilter('ALL')}
          >
            Todos
          </button>
          <button 
            className={`pill-btn ${faseFilter === 'Temporada Regular' ? 'active' : ''}`}
            onClick={() => setFaseFilter('Temporada Regular')}
          >
            Regular
          </button>
          <button 
            className={`pill-btn ${faseFilter === 'Serie de Zona' ? 'active' : ''}`}
            onClick={() => setFaseFilter('Serie de Zona')}
          >
            Playoffs / Zona
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}>Sel</th>
              <th>Evento / Partido</th>
              <th>Fecha</th>
              <th>Boletos Pagados</th>
              <th>Cortesías</th>
              <th>Tendencia</th>
              <th>Ticket Prom.</th>
              <th>Total Ingreso</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.slice(0, 15).map((ev, idx) => {
              const isSelected = !!selectedEvents[ev.evento];
              const isEven = idx % 2 === 0;

              return (
                <tr key={idx}>
                  <td>
                    <span 
                      style={{ cursor: 'pointer', color: isSelected ? '#fe5d70' : '#b0bec5' }}
                      onClick={() => toggleSelect(ev.evento)}
                    >
                      {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                    </span>
                  </td>
                  <td>
                    <div className="event-title">
                      <span>{ev.evento}</span>
                      <span className={`event-badge ${getFaseBadgeClass(ev.fase)}`}>
                        {ev.fase}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: '#78909c' }}>
                    {ev.fecha}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 600 }}>{ev.pagados.toLocaleString()}</span>
                      <div style={{ width: 70, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${Math.min(100, (ev.pagados / 12000) * 100)}%`, 
                            height: '100%', 
                            background: '#0ac282' 
                          }} 
                        />
                      </div>
                    </div>
                  </td>
                  <td style={{ color: '#fe5d70', fontWeight: 600 }}>
                    {ev.cortesias.toLocaleString()}
                  </td>
                  <td>
                    {renderSparkline(ev.sparkline, isEven)}
                  </td>
                  <td>
                    ${ev.ticket_promedio.toFixed(2)}
                  </td>
                  <td style={{ fontWeight: 700, color: '#2c3e50' }}>
                    {new Intl.NumberFormat('es-MX', {
                      style: 'currency',
                      currency: 'MXN',
                      maximumFractionDigits: 0
                    }).format(ev.ingreso)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredEvents.length > 15 && (
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: '0.8rem', color: '#78909c' }}>
          Mostrando 15 de {filteredEvents.length} partidos. Usa el buscador superior para filtrar rivales específicos.
        </div>
      )}
    </div>
  );
}
