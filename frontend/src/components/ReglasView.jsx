import React from 'react';
import { ShieldCheck, CheckCircle2, FileSpreadsheet, Lock, AlertCircle } from 'lucide-react';

export default function ReglasView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="content-card">
        <div className="card-header-row">
          <div className="card-title-group">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={20} color="#fe5d70" />
              Reglas de Negocio Implementadas
            </h3>
            <div className="card-subtitle">
              Basadas en las especificaciones del plan de trabajo y validadas con los 335,233 boletos
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fe5d70', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span>Regla 1: Separación Estricta</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Cortesías y boletos pagados son conceptos distintos y <strong>nunca se suman en un mismo indicador</strong> de ingresos ni ticket promedio.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0ac282', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span>Regla 2: Cortesías ($0)</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Incluye <code>Cortesía</code>, <code>Damas Gratis</code>, <code>Canje</code> y <code>Canje Juego Cancelado</code>. Se conserva su tipo original para desglose detallado.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#01a9ac', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span>Regla 3: Boletos Pagados</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Incluye <code>Adulto</code>, <code>50% Niños</code>, <code>50% 3ra edad</code>, <code>Empresas 30%</code>, <code>Torogrill</code>, <code>Acompañante</code> y <code>Upgrade</code>.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span>Regla 4: Verificación Aritmética</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              En el 100% de las filas: <code>Precio − Descuento = Subtotal</code> y <code>Subtotal + Comisión = Total</code>. Cortesia = Total $0; Pagado = Total mayor a $0.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6366f1', fontWeight: 700, marginBottom: 6 }}>
              <CheckCircle2 size={16} />
              <span>Regla 5: Llave Única Compuesta</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Identificador único para evitar duplicados: <code>Orden + Evento + Zona + Sección + Asiento</code>. Cero filas duplicadas durante la carga.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: 18, borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ec4899', fontWeight: 700, marginBottom: 6 }}>
              <Lock size={16} />
              <span>Privacidad de Datos Personales</span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#475569' }}>
              Nombre, correo, teléfono de clientes y usuarios son descartados en la memoria durante la lectura del CSV. <strong>Nunca se guardan en la base de datos</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
