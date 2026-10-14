import React from 'react';
import { Clock } from 'lucide-react';

export default function KpiCards({ kpis }) {
  const formatMoney = (val) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const formatNumber = (val) => {
    return new Intl.NumberFormat('es-MX').format(val || 0);
  };

  return (
    <div className="kpi-grid">
      {/* Card 1: Ingreso Total (Orange) */}
      <div className="kpi-card card-orange">
        <div className="kpi-top">
          <div>
            <div className="kpi-value">{formatMoney(kpis?.ingreso_total)}</div>
            <div className="kpi-title">Ingresos Totales (Pagados)</div>
          </div>
          <div className="mini-bars">
            <div className="bar" style={{ height: '40%' }}></div>
            <div className="bar" style={{ height: '70%' }}></div>
            <div className="bar" style={{ height: '50%' }}></div>
            <div className="bar" style={{ height: '90%' }}></div>
            <div className="bar" style={{ height: '100%' }}></div>
          </div>
        </div>
        <div className="kpi-footer">
          <Clock size={13} />
          <span>Regla 1 & 5: Solo boletos pagados</span>
        </div>
      </div>

      {/* Card 2: Boletos Pagados (Green) */}
      <div className="kpi-card card-green">
        <div className="kpi-top">
          <div>
            <div className="kpi-value">{formatNumber(kpis?.boletos_pagados)}</div>
            <div className="kpi-title">Boletos Pagados</div>
          </div>
          <div className="mini-bars">
            <div className="bar" style={{ height: '30%' }}></div>
            <div className="bar" style={{ height: '60%' }}></div>
            <div className="bar" style={{ height: '85%' }}></div>
            <div className="bar" style={{ height: '75%' }}></div>
            <div className="bar" style={{ height: '100%' }}></div>
          </div>
        </div>
        <div className="kpi-footer">
          <Clock size={13} />
          <span>{kpis?.aforo_promedio_pct != null ? `${kpis.aforo_promedio_pct}% del aforo emitido` : 'Aforo por partido'}</span>
        </div>
      </div>

      {/* Card 3: Cortesías (Red) */}
      <div className="kpi-card card-red">
        <div className="kpi-top">
          <div>
            <div className="kpi-value">{formatNumber(kpis?.boletos_cortesias)}</div>
            <div className="kpi-title">Cortesías (Sin Costo)</div>
          </div>
          <div className="mini-bars">
            <div className="bar" style={{ height: '80%' }}></div>
            <div className="bar" style={{ height: '45%' }}></div>
            <div className="bar" style={{ height: '65%' }}></div>
            <div className="bar" style={{ height: '35%' }}></div>
            <div className="bar" style={{ height: '55%' }}></div>
          </div>
        </div>
        <div className="kpi-footer">
          <Clock size={13} />
          <span>Regla 1 & 2: Reportadas estrictamente aparte</span>
        </div>
      </div>

      {/* Card 4: Ticket Promedio (Cyan) */}
      <div className="kpi-card card-cyan">
        <div className="kpi-top">
          <div>
            <div className="kpi-value">
              {new Intl.NumberFormat('es-MX', {
                style: 'currency',
                currency: 'MXN',
                minimumFractionDigits: 2
              }).format(kpis?.ticket_promedio || 0)}
            </div>
            <div className="kpi-title">Ticket Promedio</div>
          </div>
          <div className="mini-bars">
            <div className="bar" style={{ height: '50%' }}></div>
            <div className="bar" style={{ height: '75%' }}></div>
            <div className="bar" style={{ height: '90%' }}></div>
            <div className="bar" style={{ height: '65%' }}></div>
            <div className="bar" style={{ height: '100%' }}></div>
          </div>
        </div>
        <div className="kpi-footer">
          <Clock size={13} />
          <span>{formatNumber(kpis?.total_ordenes)} órdenes únicas</span>
        </div>
      </div>
    </div>
  );
}
