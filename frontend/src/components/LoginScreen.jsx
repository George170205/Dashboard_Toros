import React, { useState } from 'react';
import { Lock, User, ShieldCheck, ArrowRight } from 'lucide-react';
import { API_URL } from '../config';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Credenciales incorrectas');
      }

      const data = await res.json();
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#1b2234',
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(254, 93, 112, 0.15) 0%, transparent 60%)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden'
      }}>
        {/* Header Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #222b40 0%, #1e2638 100%)',
          padding: '36px 28px',
          textAlign: 'center',
          borderBottom: '3px solid #fe5d70',
          color: '#ffffff'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fe9365 0%, #fe5d70 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.9rem',
            fontWeight: 800,
            margin: '0 auto 14px',
            boxShadow: '0 6px 18px rgba(254, 93, 112, 0.4)'
          }}>
            T
          </div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            Toros de Tijuana
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#fe9365', fontWeight: 600, marginTop: 4 }}>
            Control de Ventas & Análisis Financiero
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8e9bb0', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ShieldCheck size={14} color="#0ac282" />
            <span>Acceso Privado Restringido</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px 28px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Usuario o Correo
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                background: '#f8fafc'
              }}>
                <User size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input 
                  type="text"
                  placeholder="Tu usuario o correo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.9rem',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Contraseña
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '10px 14px',
                background: '#f8fafc'
              }}>
                <Lock size={18} color="#94a3b8" style={{ marginRight: '10px' }} />
                <input 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    width: '100%',
                    fontSize: '0.9rem',
                    color: '#1e293b'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #fe9365 0%, #fe5d70 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.94rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px',
                boxShadow: '0 4px 14px rgba(254, 93, 112, 0.35)',
                transition: 'transform 0.2s, opacity 0.2s'
              }}
            >
              <span>{loading ? 'Verificando credenciales...' : 'Ingresar al Dashboard'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '22px', fontSize: '0.75rem', color: '#94a3b8' }}>
            Acceso exclusivo para el personal directivo y analistas autorizados.
          </div>
        </div>
      </div>
    </div>
  );
}
