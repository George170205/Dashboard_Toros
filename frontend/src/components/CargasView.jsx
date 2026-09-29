import React, { useState } from 'react';
import { UploadCloud, FileCheck, AlertTriangle, RefreshCw, Trash2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function CargasView({ 
  cargas = [], 
  activeTemporada, 
  onUploadFile, 
  onResetTemporada, 
  onReloadInitial, 
  isLoading 
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (file) => {
    if (!file.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo con extensión .csv');
      return;
    }
    setSelectedFile(file);
    setUploadStatus({ state: 'uploading', message: `Procesando y validando ${file.name}...` });
    try {
      const res = await onUploadFile(file);
      setUploadStatus({ 
        state: 'success', 
        message: `¡Carga exitosa! ${res.filas_nuevas?.toLocaleString() || 'Boletos'} filas insertadas sin duplicados.` 
      });
      setSelectedFile(null);
    } catch (err) {
      setUploadStatus({ 
        state: 'error', 
        message: `Error al procesar archivo: ${err.message || 'Error desconocido'}` 
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Upload Box */}
      <div className="content-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <h3>Carga de Archivo CSV de Ventas</h3>
            <div className="card-subtitle">
              Sube reportes detallados para <strong>{activeTemporada?.nombre || 'Temporada'}</strong>.
              Validación aritmética y descarte de duplicados automático.
            </div>
          </div>
          <button 
            className="btn-secondary"
            onClick={onReloadInitial}
            disabled={isLoading}
            title="Recarga los 3 CSVs originales de la temporada 2026"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
              <span>Recargar 3 CSVs Iniciales</span>
            </div>
          </button>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          className={`dropzone-box ${dragActive ? 'dragging' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-upload-input').click()}
        >
          <input 
            type="file" 
            id="file-upload-input" 
            accept=".csv" 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
          />
          <UploadCloud size={44} color="#fe9365" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ color: '#2c3e50', fontSize: '1rem', marginBottom: 4 }}>
            Arrastra tu archivo CSV aquí o haz clic para examinar
          </h4>
          <p style={{ color: '#78909c', fontSize: '0.8rem' }}>
            Compatible con reportes detallados con bloque "FILTROS APLICADOS" al pie (formato Toros / Boletomóvil)
          </p>
        </div>

        {/* Status Message */}
        {uploadStatus && (
          <div style={{
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: uploadStatus.state === 'success' ? '#ecfdf5' : uploadStatus.state === 'error' ? '#fef2f2' : '#f0f9ff',
            color: uploadStatus.state === 'success' ? '#065f46' : uploadStatus.state === 'error' ? '#991b1b' : '#0369a1',
            border: `1px solid ${uploadStatus.state === 'success' ? '#a7f3d0' : uploadStatus.state === 'error' ? '#fecaca' : '#bae6fd'}`
          }}>
            {uploadStatus.state === 'success' && <CheckCircle2 size={18} />}
            {uploadStatus.state === 'error' && <AlertTriangle size={18} />}
            {uploadStatus.state === 'uploading' && <RefreshCw size={18} className="spin" />}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Validation Specs badges */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0ac282', background: '#ecfdf5', padding: '6px 12px', borderRadius: 4 }}>
            <CheckCircle2 size={14} />
            <span>Validación Aritmética: Precio − Descuento = Subtotal</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', background: '#f0f9ff', padding: '6px 12px', borderRadius: 4 }}>
            <CheckCircle2 size={14} />
            <span>Llave Única: Orden + Evento + Zona + Secc + Asiento</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', background: '#f5f3ff', padding: '6px 12px', borderRadius: 4 }}>
            <CheckCircle2 size={14} />
            <span>Protección: Datos personales no se almacenan</span>
          </div>
        </div>
      </div>

      {/* Uploads History Table */}
      <div className="content-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <h3>Historial de Archivos Cargados</h3>
            <div className="card-subtitle">Bitácora de auditoría y descarte de filas duplicadas</div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Fecha de Carga</th>
                <th>Filas Totales</th>
                <th>Filas Nuevas</th>
                <th>Duplicados</th>
                <th>Errores</th>
                <th>Boletos Pagados</th>
                <th>Cortesías</th>
                <th>Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {cargas.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '24px', color: '#9e9e9e' }}>
                    No hay archivos cargados en esta temporada todavía.
                  </td>
                </tr>
              ) : (
                cargas.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600, color: '#2c3e50' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileCheck size={16} color="#0ac282" />
                        <span>{c.nombre_archivo}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#78909c' }}>{c.fecha_carga}</td>
                    <td>{c.total_filas?.toLocaleString()}</td>
                    <td style={{ color: '#0ac282', fontWeight: 600 }}>{c.filas_nuevas?.toLocaleString()}</td>
                    <td style={{ color: c.filas_duplicadas > 0 ? '#f59e0b' : '#78909c' }}>
                      {c.filas_duplicadas?.toLocaleString()}
                    </td>
                    <td style={{ color: c.filas_error > 0 ? '#ef4444' : '#0ac282', fontWeight: 600 }}>
                      {c.filas_error || 0}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.total_boletos_pagados?.toLocaleString()}</td>
                    <td style={{ color: '#fe5d70', fontWeight: 600 }}>{c.total_cortesias?.toLocaleString()}</td>
                    <td style={{ fontWeight: 700, color: '#2c3e50' }}>
                      {new Intl.NumberFormat('es-MX', {
                        style: 'currency',
                        currency: 'MXN',
                        maximumFractionDigits: 0
                      }).format(c.total_monto || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Request from user to delete/wipe data to test re-uploading! */}
      <div className="danger-zone">
        <div className="danger-info">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldAlert size={20} color="#b91c1c" />
            <h4>Eliminar datos de esta temporada para pruebas de carga</h4>
          </div>
          <p>
            Permite limpiar todos los boletos, eventos y cargas de {activeTemporada?.nombre || 'esta temporada'} para probar el proceso de carga desde cero con tus archivos CSV.
          </p>
        </div>
        <button 
          className="btn-danger"
          onClick={() => setShowDeleteModal(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Trash2 size={16} />
            <span>Eliminar Datos</span>
          </div>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ color: '#b91c1c', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} />
              ¿Confirmas eliminar los datos?
            </h3>
            <p style={{ color: '#4a5568', fontSize: '0.88rem', marginBottom: 20 }}>
              Esta acción borrará los {cargas.reduce((acc, c) => acc + (c.total_filas || 0), 0).toLocaleString()} registros cargados para <strong>{activeTemporada?.nombre}</strong>. Podrás volver a cargarlos en cualquier momento arrastrando los archivos CSV o con el botón "Recargar 3 CSVs Iniciales".
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancelar
              </button>
              <button 
                className="btn-danger"
                onClick={async () => {
                  setShowDeleteModal(false);
                  await onResetTemporada();
                }}
              >
                Sí, Eliminar Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
