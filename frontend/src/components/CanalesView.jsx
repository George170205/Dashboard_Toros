import React from 'react';
import { ShoppingBag, Globe, Smartphone, MapPin, Tag } from 'lucide-react';

export default function CanalesView({ canales = [], zonas = [], tiposBoleto = [] }) {
  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getCanalIcon = (c) => {
    if (c.includes('Taquilla')) return <ShoppingBag size={18} color="#0ac282" />;
    if (c.includes('Web')) return <Globe size={18} color="#4099ff" />;
    return <Smartphone size={18} color="#01a9ac" />;
  };

  const totalIngresoCanales = canales.reduce((acc, c) => acc + (c.ingreso || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Canales Grid */}
      <div className="content-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <h3>Ventas por Canal de Compra (Normalizado)</h3>
            <div className="card-subtitle">
              Equivalencias unificadas (Taquilla, Web Boletomóvil, Apps Móviles Android e iOS)
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          {canales.map((c, i) => {
            const pct = totalIngresoCanales > 0 ? ((c.ingreso / totalIngresoCanales) * 100).toFixed(1) : 0;
            return (
              <div key={i} style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {getCanalIcon(c.canal)}
                  <strong style={{ color: '#2c3e50', fontSize: '0.9rem' }}>{c.canal}</strong>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                  {formatMoney(c.ingreso)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <span>{c.boletos_pagados?.toLocaleString()} boletos</span>
                  <span style={{ fontWeight: 600, color: '#01a9ac' }}>{pct}% del total</span>
                </div>
                <div style={{ width: '100%', height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: '#01a9ac' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zonas y Tipos Grid 1:1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Zonas Table */}
        <div className="content-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={18} color="#fe5d70" />
                Ventas por Zona del Estadio
              </h3>
              <div className="card-subtitle">Recaudación y boletos por zona física</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Boletos Pagados</th>
                  <th>Cortesías</th>
                  <th>Ingreso Total</th>
                </tr>
              </thead>
              <tbody>
                {zonas.map((z, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{z.zona}</td>
                    <td>{z.boletos_pagados?.toLocaleString()}</td>
                    <td style={{ color: '#fe5d70' }}>{z.boletos_cortesias?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#2c3e50' }}>{formatMoney(z.ingreso)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tipos de Boleto Table */}
        <div className="content-card">
          <div className="card-header-row">
            <div className="card-title-group">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag size={18} color="#0ac282" />
                Desglose por Tipo de Boleto
              </h3>
              <div className="card-subtitle">Clasificación Pagados vs Cortesías</div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Cantidad</th>
                  <th>Monto Total</th>
                </tr>
              </thead>
              <tbody>
                {tiposBoleto.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{t.tipo_boleto}</td>
                    <td>
                      <span className={`event-badge ${t.es_cortesia ? 'badge-final' : 'badge-regular'}`}>
                        {t.es_cortesia ? 'Cortesía ($0)' : 'Pagado'}
                      </span>
                    </td>
                    <td>{t.cantidad?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#2c3e50' }}>{formatMoney(t.total_monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
