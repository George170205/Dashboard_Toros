import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Layers, BarChart2 } from 'lucide-react';
import { API_URL } from '../config';

export default function ComparativaView({ temporadas = [], activeTemporada }) {
  const [temp1Id, setTemp1Id] = useState(temporadas[0]?.id || 1);
  const [temp2Id, setTemp2Id] = useState(temporadas[1]?.id || temporadas[0]?.id || 1);
  const [comparativa, setComparativa] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (temp1Id && temp2Id) {
      fetchComparativa();
    }
  }, [temp1Id, temp2Id]);

  const fetchComparativa = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/comparativa?t1_id=${temp1Id}&t2_id=${temp2Id}`);
      if (res.ok) {
        const data = await res.json();
        setComparativa(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const renderDelta = (abs, pct, isMoney = false) => {
    const isPositive = abs >= 0;
    const formattedAbs = isMoney ? formatMoney(abs) : abs?.toLocaleString();
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 2, 
        color: isPositive ? '#0ac282' : '#fe5d70',
        fontWeight: 600,
        fontSize: '0.85rem'
      }}>
        {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        {isPositive ? '+' : ''}{pct}% ({formattedAbs})
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Card */}
      <div className="content-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <h3>Comparador Multitemporada</h3>
            <div className="card-subtitle">
              Analiza el desempeño de dos temporadas lado a lado según la Regla de Negocio #1 (cortesías y pagados separados)
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <div className="season-selector">
              <span style={{ fontSize: '0.75rem', color: '#78909c' }}>Base:</span>
              <select value={temp1Id} onChange={(e) => setTemp1Id(Number(e.target.value))}>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
            <div className="season-selector">
              <span style={{ fontSize: '0.75rem', color: '#78909c' }}>Comparar con:</span>
              <select value={temp2Id} onChange={(e) => setTemp2Id(Number(e.target.value))}>
                {temporadas.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Comparison Metrics Grid */}
        {comparativa && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
            {/* Metric 1 */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>INGRESOS TOTALES (PAGADOS)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                {formatMoney(comparativa.temporada_comparada.kpis.ingreso)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                vs {formatMoney(comparativa.temporada_base.kpis.ingreso)} (Base)
              </div>
              <div style={{ marginTop: 8 }}>
                {renderDelta(comparativa.diferencias.ingreso.absoluto, comparativa.diferencias.ingreso.porcentaje, true)}
              </div>
            </div>

            {/* Metric 2 */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>BOLETOS PAGADOS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                {comparativa.temporada_comparada.kpis.pagados.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                vs {comparativa.temporada_base.kpis.pagados.toLocaleString()} (Base)
              </div>
              <div style={{ marginTop: 8 }}>
                {renderDelta(comparativa.diferencias.pagados.absoluto, comparativa.diferencias.pagados.porcentaje)}
              </div>
            </div>

            {/* Metric 3 */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>CORTESÍAS EMITIDAS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                {comparativa.temporada_comparada.kpis.cortesias.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                vs {comparativa.temporada_base.kpis.cortesias.toLocaleString()} (Base)
              </div>
              <div style={{ marginTop: 8 }}>
                {renderDelta(comparativa.diferencias.cortesias.absoluto, comparativa.diferencias.cortesias.porcentaje)}
              </div>
            </div>

            {/* Metric 4 */}
            <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>TICKET PROMEDIO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                ${comparativa.temporada_comparada.kpis.ticket_promedio.toFixed(2)}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 2 }}>
                vs ${comparativa.temporada_base.kpis.ticket_promedio.toFixed(2)} (Base)
              </div>
              <div style={{ marginTop: 8 }}>
                {renderDelta(comparativa.diferencias.ticket_promedio.absoluto, comparativa.diferencias.ticket_promedio.porcentaje, true)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-side Table */}
      {comparativa && (
        <div className="content-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <h3>Tabla Comparativa Detallada</h3>
              <div className="card-subtitle">Desglose comparativo entre {comparativa.temporada_base.temporada.nombre} y {comparativa.temporada_comparada.temporada.nombre}</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Concepto / Indicador</th>
                  <th>{comparativa.temporada_base.temporada.nombre} (Base)</th>
                  <th>{comparativa.temporada_comparada.temporada.nombre}</th>
                  <th>Diferencia Absoluta</th>
                  <th>Variación Relativa</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>Ingresos Totales (Pagados)</td>
                  <td>{formatMoney(comparativa.temporada_base.kpis.ingreso)}</td>
                  <td>{formatMoney(comparativa.temporada_comparada.kpis.ingreso)}</td>
                  <td style={{ fontWeight: 600 }}>{formatMoney(comparativa.diferencias.ingreso.absoluto)}</td>
                  <td>{renderDelta(comparativa.diferencias.ingreso.absoluto, comparativa.diferencias.ingreso.porcentaje, true)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Boletos Pagados (Adultos, Niños, etc.)</td>
                  <td>{comparativa.temporada_base.kpis.pagados.toLocaleString()}</td>
                  <td>{comparativa.temporada_comparada.kpis.pagados.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{comparativa.diferencias.pagados.absoluto.toLocaleString()}</td>
                  <td>{renderDelta(comparativa.diferencias.pagados.absoluto, comparativa.diferencias.pagados.porcentaje)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Boletos Cortesías (Sin costo)</td>
                  <td>{comparativa.temporada_base.kpis.cortesias.toLocaleString()}</td>
                  <td>{comparativa.temporada_comparada.kpis.cortesias.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{comparativa.diferencias.cortesias.absoluto.toLocaleString()}</td>
                  <td>{renderDelta(comparativa.diferencias.cortesias.absoluto, comparativa.diferencias.cortesias.porcentaje)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Ticket Promedio por Boleto Pagado</td>
                  <td>${comparativa.temporada_base.kpis.ticket_promedio.toFixed(2)}</td>
                  <td>${comparativa.temporada_comparada.kpis.ticket_promedio.toFixed(2)}</td>
                  <td style={{ fontWeight: 600 }}>${comparativa.diferencias.ticket_promedio.absoluto.toFixed(2)}</td>
                  <td>{renderDelta(comparativa.diferencias.ticket_promedio.absoluto, comparativa.diferencias.ticket_promedio.porcentaje, true)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Órdenes Totales</td>
                  <td>{comparativa.temporada_base.kpis.total_ordenes.toLocaleString()}</td>
                  <td>{comparativa.temporada_comparada.kpis.total_ordenes.toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{(comparativa.temporada_comparada.kpis.total_ordenes - comparativa.temporada_base.kpis.total_ordenes).toLocaleString()}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
