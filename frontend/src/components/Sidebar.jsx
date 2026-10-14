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
  Sparkles,
  X
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  setView, 
  temporadas = [], 
  activeTemporada, 
  setActiveTemporada,
  onOpenCreateSeason,
  isOpen,
  onClose,
  currentUser
}) {
  const handleNavClick = (viewName) => {
    setView(viewName);
    if (onClose) onClose();
  };

  const handleSeasonClick = (temp) => {
    setActiveTemporada(temp);
    setView('dashboard');
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header with Close button for mobile */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo-icon">T</div>
          <div>
            <div className="sidebar-brand-name">Toros de Tijuana</div>
            <div className="sidebar-brand-sub">Sales Analytics</div>
          </div>
        </div>

        {/* Mobile Close Button */}
        <button 
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Cerrar menú"
          title="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Navegación</div>
        <div 
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard')}
        >
          <div className="nav-item-content">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>
          <span className="nav-badge badge-hot">HOT</span>
        </div>

        <div 
          className={`nav-item ${currentView === 'asistente' ? 'active' : ''}`}
          onClick={() => handleNavClick('asistente')}
        >
          <div className="nav-item-content">
            <Sparkles size={18} style={{ color: currentView === 'asistente' ? '#fe9365' : '#a855f7' }} />
            <span style={{ fontWeight: 600 }}>Asistente IA</span>
          </div>
          <span 
            className="nav-badge" 
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)', 
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            GEMINI
          </span>
        </div>

        <div className="nav-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Temporadas</span>
          <span 
            style={{ cursor: 'pointer', color: '#fe9365', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenCreateSeason && onOpenCreateSeason();
              if (onClose) onClose();
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
              onClick={() => handleSeasonClick(temp)}
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
          onClick={() => {
            onOpenCreateSeason && onOpenCreateSeason();
            if (onClose) onClose();
          }}
        >
          <div className="nav-item-content">
            <span style={{ fontSize: '1rem', fontWeight: 700 }}>+</span>
            <span style={{ fontWeight: 600 }}>Crear Temporada</span>
          </div>
        </div>

        <div className="nav-section-title">Análisis & Comparativas</div>
        <div 
          className={`nav-item ${currentView === 'comparativa' ? 'active' : ''}`}
          onClick={() => handleNavClick('comparativa')}
        >
          <div className="nav-item-content">
            <Layers size={18} />
            <span>Comparar Temporadas</span>
          </div>
          <span className="nav-badge badge-new">PRO</span>
        </div>

        <div 
          className={`nav-item ${currentView === 'canales' ? 'active' : ''}`}
          onClick={() => handleNavClick('canales')}
        >
          <div className="nav-item-content">
            <PieChart size={18} />
            <span>Canales & Zonas</span>
          </div>
        </div>

        <div className="nav-section-title">Gestión de Datos</div>
        <div 
          className={`nav-item ${currentView === 'cargas' ? 'active' : ''}`}
          onClick={() => handleNavClick('cargas')}
        >
          <div className="nav-item-content">
            <UploadCloud size={18} />
            <span>Cargas & Archivos</span>
          </div>
          <span className="nav-badge badge-count">CSV</span>
        </div>

        <div 
          className={`nav-item ${currentView === 'reglas' ? 'active' : ''}`}
          onClick={() => handleNavClick('reglas')}
        >
          <div className="nav-item-content">
            <ShieldCheck size={18} />
            <span>Reglas de Negocio</span>
          </div>
        </div>
      </nav>

      {/* Footer Info with User */}
      <div className="sidebar-footer">
        <div 
          className="avatar" 
          style={{ 
            width: 28, 
            height: 28, 
            fontSize: '0.72rem',
            background: currentUser?.avatar_color || '#fe9365' 
          }}
        >
          {currentUser?.nombre ? currentUser.nombre.split(' ').map(n => n[0]).slice(0, 2).join('') : 'TJ'}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#8e9bb0', overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
            {currentUser?.nombre || 'Usuario Autorizado'}
          </div>
          <div style={{ color: '#0ac282', fontSize: '0.7rem' }}>● {currentUser?.rol || 'Sesión Activa'}</div>
        </div>
      </div>
    </aside>
  );
}
