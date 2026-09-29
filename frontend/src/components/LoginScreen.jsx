import React, { useState, useEffect } from 'react';
import { Lock, User, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { API_URL } from '../config';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickUsers, setQuickUsers] = useState([]);

  useEffect(() => {
    // Fetch available user profiles for quick selection
    fetch(`${API_URL}/api/auth/users`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setQuickUsers(data);
      })
      .catch(() => {});
  }, []);

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

  const selectQuickUser = (u) => {
    setUsername(u.username);
    setPassword('toros2026');
    setError('');
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
        maxWidth: '440px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden'
      }}>
        {/* Header Branding */}
        <div style={{
          background: 'linear-gradient(135deg, #222b40 0%, #1e2638 100%)',
          padding: '32px 28px',
          textAlign: 'center',
          borderBottom: '3px solid #fe5d70',
          color: '#ffffff'
        }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fe9365 0%, #fe5d70 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: 800,
            margin: '0 auto 12px',
            boxShadow: '0 6px 18px rgba(254, 93, 112, 0.4)'
          }}>
            T
          </div>
          <h2 style={{ fontFamily: 'Poppins, sans-serif', fontSize: '1.45rem', fontWeight: 700, letterSpacing: '0.5px' }}>
            Toros de Tijuana
          </h2>
          <div style={{ fontSize: '0.82rem', color: '#fe9365', fontWeight: 600, marginTop: 4 }}>
            Control de Ventas & Análisis Financiero
          </div>
          <div style={{ fontSize: '0.74rem', color: '#8e9bb0', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ShieldCheck size={14} color="#0ac282" />
            <span>Acceso Privado Restringido</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px' }}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              marginBottom: '18px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
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
                  placeholder="ej. jorge.ruiz o juan.vega"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
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
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '8px',
                boxShadow: '0 4px 14px rgba(254, 93, 112, 0.35)',
                transition: 'transform 0.2s, opacity 0.2s'
              }}
            >
              <span>{loading ? 'Verificando...' : 'Ingresar al Dashboard'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Quick Profile Selector for the 3 authorized users */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              Perfiles Autorizados (Clic para seleccionar):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quickUsers.map(u => (
                <div 
                  key={u.id}
                  onClick={() => selectQuickUser(u)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: username === u.username ? '#fff7ed' : '#f8fafc',
                    border: `1px solid ${username === u.username ? '#fe9365' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: u.avatar_color || '#fe9365',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {u.nombre.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{u.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{u.rol}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#fe5d70', fontWeight: 600 }}>Seleccionar</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
