import React from 'react';
import { UserCheck, ShoppingBag, Globe, Smartphone, Clock, Award } from 'lucide-react';

export default function ActivityFeed({ activities = [] }) {
  const getIcon = (canal, esCortesia) => {
    if (esCortesia) return <Award size={18} color="#fe5d70" />;
    if (canal?.includes('Taquilla')) return <ShoppingBag size={18} color="#0ac282" />;
    if (canal?.includes('Web')) return <Globe size={18} color="#4099ff" />;
    if (canal?.includes('App') || canal?.includes('iOS') || canal?.includes('Android')) {
      return <Smartphone size={18} color="#01a9ac" />;
    }
    return <UserCheck size={18} color="#fe9365" />;
  };

  return (
    <div className="content-card">
      <div className="card-header-row">
        <div className="card-title-group">
          <h3>Actividad Reciente</h3>
          <div className="card-subtitle">Vendedores y canales activos en tiempo real</div>
        </div>
      </div>

      <div className="activity-feed">
        {activities.slice(0, 6).map((item, idx) => {
          const isCortesia = item.es_cortesia === 1;

          return (
            <div className="activity-item" key={idx}>
              <div className="activity-avatar">
                {getIcon(item.canal_normalizado, isCortesia)}
              </div>
              <div className="activity-content">
                <div className="activity-name">{item.vendido_por || 'Venta en Línea'}</div>
                <div className="activity-desc">
                  {isCortesia ? (
                    <span style={{ color: '#fe5d70' }}>
                      🎁 Asignó {item.boletos_lote} cortesías vía {item.canal_normalizado}
                    </span>
                  ) : (
                    <span>
                      🎟️ {item.boletos_lote} boletos pagados ({new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        maximumFractionDigits: 0
                      }).format(item.monto_lote)}) vía {item.canal_normalizado}
                    </span>
                  )}
                </div>
                <div className="activity-time">
                  <Clock size={11} />
                  <span>{item.fecha || 'Reciente'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
