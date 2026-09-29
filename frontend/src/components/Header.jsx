import React from 'react';
import { Search, Maximize2, Bell, MessageSquare, ChevronDown, Menu } from 'lucide-react';

export default function Header({ searchTerm, setSearchTerm, onToggleSidebar }) {
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
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
            placeholder="Buscar eventos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button className="icon-btn desktop-only" onClick={toggleFullscreen} title="Pantalla Completa">
          <Maximize2 size={18} />
        </button>
      </div>

      <div className="header-right">
        {/* Notification Bell */}
        <button className="icon-btn" title="Notificaciones">
          <Bell size={19} />
          <span className="notification-dot dot-red">5</span>
        </button>

        {/* Messages */}
        <button className="icon-btn" title="Mensajes">
          <MessageSquare size={19} />
          <span className="notification-dot dot-green">3</span>
        </button>

        {/* User Profile */}
        <div className="user-profile">
          <div className="avatar">AT</div>
          <div className="user-info">
            <span className="user-name">Admin Toros</span>
            <span className="user-status">
              <span className="user-status-dot"></span> Online
            </span>
          </div>
          <ChevronDown size={14} color="#78909c" />
        </div>
      </div>
    </header>
  );
}
