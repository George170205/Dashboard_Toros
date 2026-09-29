import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import SalesAnalyticsChart from './components/SalesAnalyticsChart';
import ProjectRiskGauge from './components/ProjectRiskGauge';
import EventsTable from './components/EventsTable';
import ActivityFeed from './components/ActivityFeed';
import CargasView from './components/CargasView';
import ComparativaView from './components/ComparativaView';
import CanalesView from './components/CanalesView';
import ReglasView from './components/ReglasView';
import CreateSeasonModal from './components/CreateSeasonModal';
import { Calendar, RefreshCw, PlusCircle, AlertCircle } from 'lucide-react';
import { API_URL } from './config';

export default function App() {
  const [currentView, setView] = useState('dashboard');
  const [temporadas, setTemporadas] = useState([]);
  const [activeTemporada, setActiveTemporada] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch seasons
  useEffect(() => {
    fetchTemporadas();
  }, []);

  const fetchTemporadas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/temporadas`);
      if (res.ok) {
        const data = await res.json();
        setTemporadas(data);
        if (data.length > 0) {
          // If no active season or current active is not in data, pick the first
          setActiveTemporada(prev => {
            if (!prev) return data[0];
            const found = data.find(t => t.id === prev.id);
            return found || data[0];
          });
        }
        return data;
      }
    } catch (err) {
      console.error('Error fetching temporadas:', err);
    }
    return [];
  };

  // Fetch dashboard data when active temporada changes
  useEffect(() => {
    if (activeTemporada?.id) {
      fetchDashboardData(activeTemporada.id);
    }
  }, [activeTemporada?.id]);

  const fetchDashboardData = async (temporadaId) => {
    if (!temporadaId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/dashboard/${temporadaId}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Create Season Handler
  const handleCreateSeason = async (seasonData) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/temporadas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seasonData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error creando temporada');
      }

      const newSeason = await res.json();
      const updatedTemps = await fetchTemporadas();
      const found = updatedTemps.find(t => t.id === newSeason.id);
      if (found) {
        setActiveTemporada(found);
      }
      setView('dashboard');
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Upload handler
  const handleUploadFile = async (file) => {
    setIsLoading(true);
    try {
      let targetId = activeTemporada?.id;
      // If no active season, auto create Temporada 2026 or pick first
      if (!targetId) {
        if (temporadas.length > 0) {
          targetId = temporadas[0].id;
        } else {
          // Initialize first
          const initRes = await fetch(`${API_URL}/api/init-2026`, { method: 'POST' });
          const initData = await initRes.json();
          const refreshed = await fetchTemporadas();
          targetId = refreshed[0]?.id || 1;
        }
      }

      const formData = new FormData();
      formData.append('temporada_id', targetId);
      formData.append('file', file);

      const res = await fetch(`${API_URL}/api/cargas/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Error procesando el archivo CSV');
      }

      const json = await res.json();
      await fetchDashboardData(targetId);
      await fetchTemporadas();
      return json.result;
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset handler (requested by user to test re-uploading!)
  const handleResetTemporada = async () => {
    if (!activeTemporada?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/temporadas/${activeTemporada.id}/reset`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchDashboardData(activeTemporada.id);
        await fetchTemporadas();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reload initial 2026 data
  const handleReloadInitial = async () => {
    setIsLoading(true);
    try {
      const url = activeTemporada?.id 
        ? `${API_URL}/api/temporadas/${activeTemporada.id}/reload-initial`
        : `${API_URL}/api/init-2026`;

      const res = await fetch(url, {
        method: 'POST',
      });
      
      const refreshedTemps = await fetchTemporadas();
      const currentId = activeTemporada?.id || refreshedTemps[0]?.id;
      if (currentId) {
        await fetchDashboardData(currentId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Download executive CSV report
  const handleDownloadReport = () => {
    if (!dashboardData?.events_table) return;

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Evento;Fase;Fecha;Boletos Pagados;Cortesias;Ticket Promedio;Ingreso Total\n';
    
    dashboardData.events_table.forEach((row) => {
      csvContent += `"${row.evento}";"${row.fase}";"${row.fecha}";${row.pagados};${row.cortesias};${row.ticket_promedio};${row.ingreso}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Ejecutivo_${activeTemporada?.nombre || 'Toros'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container">
      {/* Mobile Backdrop */}
      <div 
        className={`sidebar-backdrop ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar matching Adminty theme */}
      <Sidebar 
        currentView={currentView}
        setView={setView}
        temporadas={temporadas}
        activeTemporada={activeTemporada}
        setActiveTemporada={setActiveTemporada}
        onOpenCreateSeason={() => setShowCreateSeasonModal(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="content-body">
          {/* Empty Database Banner if no season exists yet */}
          {temporadas.length === 0 && (
            <div style={{
              background: '#fff9f5',
              border: '1px solid #fe9365',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <h3 style={{ color: '#2c3e50', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={20} color="#fe9365" />
                  Base de datos inicial lista
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: 4 }}>
                  No se detectaron temporadas cargadas en este servidor. Puedes inicializar la <strong>Temporada 2026</strong> con los 3 CSVs o crear una nueva temporada.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button 
                  className="btn-cta-orange" 
                  style={{ width: 'auto', padding: '8px 18px' }}
                  onClick={handleReloadInitial}
                  disabled={isLoading}
                >
                  <RefreshCw size={15} className={isLoading ? 'spin' : ''} style={{ marginRight: 6 }} />
                  Cargar Temporada 2026 (3 CSVs)
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setShowCreateSeasonModal(true)}
                >
                  + Crear Temporada
                </button>
              </div>
            </div>
          )}

          {/* Header Row with Title and Season Selector */}
          <div className="page-header-row">
            <div>
              <h1 className="page-title">
                {currentView === 'dashboard' && 'Dashboard de Ventas'}
                {currentView === 'comparativa' && 'Comparativa Multitemporada'}
                {currentView === 'canales' && 'Canales de Venta & Zonas'}
                {currentView === 'cargas' && 'Cargas & Auditoría de Archivos'}
                {currentView === 'reglas' && 'Reglas de Negocio del Sistema'}
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#78909c', marginTop: 4 }}>
                {activeTemporada?.nombre || 'Selecciona o crea una temporada'} • Toros de Tijuana (Liga Mexicana de Béisbol)
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="season-selector">
                <Calendar size={16} color="#fe9365" />
                <select 
                  value={activeTemporada?.id || ''} 
                  onChange={(e) => {
                    const found = temporadas.find(t => t.id === Number(e.target.value));
                    if (found) setActiveTemporada(found);
                  }}
                >
                  {temporadas.length === 0 && <option value="">Sin Temporadas</option>}
                  {temporadas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <button 
                className="btn-secondary" 
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowCreateSeasonModal(true)}
                title="Crear nueva temporada"
              >
                <PlusCircle size={15} color="#fe9365" />
                <span>Nueva</span>
              </button>

              <button 
                className="icon-btn" 
                title="Actualizar datos"
                onClick={() => activeTemporada?.id && fetchDashboardData(activeTemporada.id)}
              >
                <RefreshCw size={17} className={isLoading ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* VIEW: Dashboard */}
          {currentView === 'dashboard' && (
            <>
              {/* 4 KPI Cards */}
              <KpiCards kpis={dashboardData?.kpis} />

              {/* Mid Row: 2/3 Sales Analytics Chart + 1/3 Project Risk Gauge */}
              <div className="dashboard-grid-2-1">
                <SalesAnalyticsChart dailyData={dashboardData?.daily_sales} />
                <ProjectRiskGauge 
                  kpis={dashboardData?.kpis} 
                  seasonName={activeTemporada?.nombre}
                  onDownloadReport={handleDownloadReport}
                />
              </div>

              {/* Lower Row: 2/3 Events Table + 1/3 User Activity Feed */}
              <div className="dashboard-grid-2-1">
                <EventsTable 
                  events={dashboardData?.events_table} 
                  searchTerm={searchTerm}
                />
                <ActivityFeed activities={dashboardData?.activities} />
              </div>
            </>
          )}

          {/* VIEW: Comparativa */}
          {currentView === 'comparativa' && (
            <ComparativaView 
              temporadas={temporadas}
              activeTemporada={activeTemporada}
            />
          )}

          {/* VIEW: Canales & Zonas */}
          {currentView === 'canales' && (
            <CanalesView 
              canales={dashboardData?.canales}
              zonas={dashboardData?.zonas}
              tiposBoleto={dashboardData?.tipos_boleto}
            />
          )}

          {/* VIEW: Cargas */}
          {currentView === 'cargas' && (
            <CargasView 
              cargas={dashboardData?.cargas}
              activeTemporada={activeTemporada}
              onUploadFile={handleUploadFile}
              onResetTemporada={handleResetTemporada}
              onReloadInitial={handleReloadInitial}
              isLoading={isLoading}
            />
          )}

          {/* VIEW: Reglas de Negocio */}
          {currentView === 'reglas' && (
            <ReglasView />
          )}
        </main>
      </div>

      {/* Modal for creating a new season */}
      <CreateSeasonModal 
        isOpen={showCreateSeasonModal}
        onClose={() => setShowCreateSeasonModal(false)}
        onCreateSeason={handleCreateSeason}
      />
    </div>
  );
}
