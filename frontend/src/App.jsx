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
import { Calendar, RefreshCw } from 'lucide-react';
import { API_URL } from './config';

export default function App() {
  const [currentView, setView] = useState('dashboard');
  const [temporadas, setTemporadas] = useState([]);
  const [activeTemporada, setActiveTemporada] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
        if (data.length > 0 && !activeTemporada) {
          setActiveTemporada(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching temporadas:', err);
    }
  };

  // Fetch dashboard data when active temporada changes
  useEffect(() => {
    if (activeTemporada?.id) {
      fetchDashboardData(activeTemporada.id);
    }
  }, [activeTemporada?.id]);

  const fetchDashboardData = async (temporadaId) => {
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

  // Upload handler
  const handleUploadFile = async (file) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('temporada_id', activeTemporada.id);
    formData.append('file', file);

    const res = await fetch(`${API_URL}/api/cargas/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      setIsLoading(false);
      throw new Error(err.detail || 'Error procesando el archivo CSV');
    }

    const json = await res.json();
    await fetchDashboardData(activeTemporada.id);
    await fetchTemporadas();
    setIsLoading(false);
    return json.result;
  };

  // Reset handler (requested by user to test re-uploading!)
  const handleResetTemporada = async () => {
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
      const res = await fetch(`${API_URL}/api/temporadas/${activeTemporada.id}/reload-initial`, {
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
      {/* Sidebar matching Adminty theme */}
      <Sidebar 
        currentView={currentView}
        setView={setView}
        temporadas={temporadas}
        activeTemporada={activeTemporada}
        setActiveTemporada={setActiveTemporada}
      />

      {/* Main Wrapper */}
      <div className="main-wrapper">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        <main className="content-body">
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
                {activeTemporada?.nombre} • Toros de Tijuana (Liga Mexicana de Béisbol)
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
                  {temporadas.map(t => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>

              <button 
                className="icon-btn" 
                title="Actualizar datos"
                onClick={() => fetchDashboardData(activeTemporada.id)}
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
    </div>
  );
}
