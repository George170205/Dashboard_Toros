import React, { useState } from 'react';
import { Calendar, Plus, X } from 'lucide-react';

export default function CreateSeasonModal({ isOpen, onClose, onCreateSeason }) {
  const [nombre, setNombre] = useState('Temporada 2027');
  const [ano, setAno] = useState(2027);
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('El nombre de la temporada es obligatorio');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onCreateSeason({ nombre, ano: Number(ano), descripcion });
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear la temporada');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2c3e50', fontSize: '1.1rem' }}>
            <Calendar size={20} color="#fe9365" />
            Crear Nueva Temporada
          </h3>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#78909c' }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Nombre de la Temporada
            </label>
            <input 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Temporada 2027"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Año
            </label>
            <input 
              type="number" 
              value={ano} 
              onChange={(e) => setAno(e.target.value)}
              min="2020"
              max="2035"
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Descripción (Opcional)
            </label>
            <input 
              type="text" 
              value={descripcion} 
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Venta regular y playoffs LMB"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-cta-orange" 
              style={{ width: 'auto', padding: '8px 18px' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Crear Temporada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
