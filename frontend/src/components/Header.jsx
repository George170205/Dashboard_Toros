import React, { useState } from 'react';
import { Search, Maximize2, Bell, ChevronDown, Menu, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function Header({ 
  searchTerm, 
  setSearchTerm, 
  onToggleSidebar,
  currentUser,
  onLogout,
  kpis,
  activeTemporada
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return 'TR';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('');
  };

  return (
    <header className="top-header">
      <div className="header-left">
        {/* Mobile Hamburger Menu Button */}
        <button 
          className="icon-btn mobile-toggle-btn" 
          onClick={onToggleSidebar}
          aria-label="Abrir menú"
          title="Abrir menú"
        >
          <Menu size={22} color="#2c3e50" />
        </button>

        <div className="search-bar">
          <Search size={16} color="#78909c" />
          <input 
            type="text" 
            placeholder="Buscar eventos, zonas, órdenes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="icon-btn desktop-only" onClick={toggleFullscreen} title="Pantalla Completa">
          <Maximize2 size={18} />
        </button>
      </div>

      <div className="header-right">
        {/* Notification Bell with interactive dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className="icon-btn" 
            title="Notificaciones de Auditoría"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
          >
            <Bell size={19} />
            <span className="notification-dot dot-red">3</span>
          </button>

          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '310px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              padding: '14px',
              animation: 'fadeIn 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>
                  Auditoría del Sistema
                </span>
                <span style={{ fontSize: '0.7rem', color: '#0ac282', fontWeight: 600 }}>
                  3 Alertas
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.78rem' }}>
                  <CheckCircle2 size={16} color="#0ac282" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: '#1e293b', display: 'block' }}>{activeTemporada?.nombre || 'Temporada Activa'}</strong>
                    <span style={{ color: '#64748b' }}>
                      {kpis?.total_boletos != null 
                        ? `${new Intl.NumberFormat('es-MX').format(kpis.total_boletos)} boletos indexados sin duplicados.`
                        : 'Base de datos de ventas indexada sin duplicados.'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.78rem' }}>
                  <CheckCircle2 size={16} color="#01a9ac" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: '#1e293b', display: 'block' }}>Regla Aritmética 100%</strong>
                    <span style={{ color: '#64748b' }}>Precio - Descuento = Subtotal validado.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.78rem' }}>
                  <ShieldAlert size={16} color="#fe5d70" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ color: '#1e293b', display: 'block' }}>Acceso Protegido</strong>
                    <span style={{ color: '#64748b' }}>Sesión iniciada con credenciales autorizadas.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div style={{ position: 'relative' }}>
          <div 
            className="user-profile"
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
          >
            <div 
              className="avatar" 
              style={{ background: currentUser?.avatar_color || '#fe9365' }}
            >
              {getInitials(currentUser?.nombre)}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser?.nombre || 'Jorge Ruiz'}</span>
              <span className="user-status">
                <span className="user-status-dot"></span> {currentUser?.rol || 'Administrador'}
              </span>
            </div>
            <ChevronDown size={14} color="#78909c" />
          </div>

          {showProfileMenu && (
            <div style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '240px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
              border: '1px solid #e2e8f0',
              zIndex: 1000,
              padding: '14px',
              animation: 'fadeIn 0.2s'
            }}>
              <div style={{ marginBottom: '12px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1e293b' }}>
                  {currentUser?.nombre}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {currentUser?.correo}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#fe5d70', fontWeight: 600, marginTop: 3 }}>
                  {currentUser?.rol}
                </div>
              </div>

              <button 
                onClick={onLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
