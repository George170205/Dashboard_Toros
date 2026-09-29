import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  UploadCloud, 
  Layers, 
  PieChart, 
  FileText, 
  ShieldCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  setView, 
  temporadas = [], 
  activeTemporada, 
  setActiveTemporada,
  onOpenCreateSeason 
}) {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo-icon">T</div>
        <div>
          <div className="sidebar-brand-name">Toros de Tijuana</div>
          <div className="sidebar-brand-sub">Sales Analytics</div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Navegación</div>
        <div 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setView('dashboard')}
        >
          <div className="nav-item-content">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <span className="nav-badge badge-hot">HOT</span>
        </div>

        <div className="nav-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Temporadas</span>
          <span 
            style={{ cursor: 'pointer', color: '#fe9365', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCreateSeason && onOpenCreateSeason();
            }}
            title="Crear nueva temporada"
          >
            + Nueva
          </span>
        </div>
        {temporadas.length === 0 ? (
          <div style={{ padding: '8px 24px', fontSize: '0.8rem', color: '#78909c' }}>
            No hay temporadas aún.
          </div>
        ) : (
          temporadas.map((temp) => (
            <div 
              key={temp.id}
              className={`nav-item ${currentView === 'dashboard' && activeTemporada?.id === temp.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTemporada(temp);
                setView('dashboard');
              }}
            >
              <div className="nav-item-content">
                <Calendar size={18} />
                <span>{temp.nombre}</span>
              </div>
              {temp.ano === 2026 && <span className="nav-badge badge-new">ACTIVA</span>}
            </div>
          ))
        )}
        <div 
          className="nav-item"
          style={{ color: '#fe9365', cursor: 'pointer', borderLeft: 'none' }}
          onClick={() => onOpenCreateSeason && onOpenCreateSeason()}
        >
          <div className="nav-item-content">
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>+</span>
            <span style={{ fontWeight: 600 }}>Crear Temporada</span>
          </div>
        </div>

        <div className="nav-section-title">Análisis & Comparativas</div>
        <div 
          className={`nav-item ${currentView === 'comparativa' ? 'active' : ''}`}
          onClick={() => setView('comparativa')}
        >
          <div className="nav-item-content">
            <Layers size={18} />
            <span>Comparar Temporadas</span>
          </div>
          <span className="nav-badge badge-new">PRO</span>
        </div>

        <div 
          className={`nav-item ${currentView === 'canales' ? 'active' : ''}`}
          onClick={() => setView('canales')}
        >
          <div className="nav-item-content">
            <PieChart size={18} />
            <span>Canales & Zonas</span>
          </div>
        </div>

        <div className="nav-section-title">Gestión de Datos</div>
        <div 
          className={`nav-item ${currentView === 'cargas' ? 'active' : ''}`}
          onClick={() => setView('cargas')}
        >
          <div className="nav-item-content">
            <UploadCloud size={18} />
            <span>Cargas & Archivos</span>
          </div>
          <span className="nav-badge badge-count">CSV</span>
        </div>

        <div 
          className={`nav-item ${currentView === 'reglas' ? 'active' : ''}`}
          onClick={() => setView('reglas')}
        >
          <div className="nav-item-content">
            <ShieldCheck size={18} />
            <span>Reglas de Negocio</span>
          </div>
        </div>
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>TJ</div>
        <div style={{ fontSize: '0.75rem', color: '#8e9bb0' }}>
          <div>LMB Temporada</div>
          <div style={{ color: '#0ac282', fontWeight: 600 }}>● Sistema Operativo</div>
        </div>
      </div>
    </aside>
  );
}
