import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Database, 
  AlertCircle, 
  Trash2, 
  Copy, 
  Check, 
  RefreshCw,
  HelpCircle,
  TrendingUp,
  Ticket,
  Calendar,
  Layers
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

export default function AiAssistantView({ activeTemporada, authFetch, API_URL }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      rol: 'assistant',
      texto: `¡Hola! Soy el **Asistente de Inteligencia de Negocio y Mercado** de los **Toros de Tijuana**.\n\nPuedo responder tus dudas analíticas consultando directamente los datos reales de la **${activeTemporada?.nombre || 'Temporada Activa'}** mediante herramientas de solo lectura sobre nuestra base de datos SQLite.\n\n*Recuerda que todas las cifras están en Pesos Mexicanos (MXN) y los boletos de cortesía se analizan siempre por separado de los boletos pagados.*`,
      herramientas: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const quickPrompts = [
    {
      title: 'Zonas más vendidas',
      prompt: '¿Cuáles son las 3 zonas o secciones con mayor ingreso y boletos pagados en esta temporada?'
    },
    {
      title: 'Simular aumento +20%',
      prompt: '¿Qué impacto tendría en el ingreso bruto y neto subir 20% el precio de los boletos pagados?'
    },
    {
      title: 'Eventos con mayor recaudación',
      prompt: '¿Cuáles son los 5 partidos o eventos con mayor venta e ingreso bruto?'
    },
    {
      title: 'Ventas por Canal',
      prompt: '¿Cómo se distribuyen las ventas entre Taquilla, Web y otros canales?'
    },
    {
      title: 'Resumen de Cortesías',
      prompt: '¿Cuál es la proporción de boletos de cortesía respecto al total de boletos emitidos?'
    }
  ];

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    setErrorBanner(null);
    setInputPrompt('');

    const userMessage = {
      id: 'user-' + Date.now(),
      rol: 'user',
      texto: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build history excluding welcome and current
      const historial = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          rol: m.rol === 'assistant' ? 'model' : 'user',
          texto: m.texto
        }));

      const res = await authFetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pregunta: query,
          temporada_id: activeTemporada?.id || 1,
          historial: historial
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 503 && errorData.detail?.includes('falta GEMINI_API_KEY')) {
          setErrorBanner({
            tipo: 'config',
            mensaje: 'El asistente no está configurado: falta GEMINI_API_KEY en las variables de entorno del servidor. Agrega tu API key en Render o en tu .env local.'
          });
        } else if (res.status === 429) {
          setErrorBanner({
            tipo: 'quota',
            mensaje: errorData.detail || 'Límite de cuota alcanzado en la API de Gemini. Por favor espera a que se restablezca el límite diario o revisa tu plan en Google AI Studio.'
          });
        } else {
          setErrorBanner({
            tipo: 'error',
            mensaje: errorData.detail || 'Ocurrió un error al procesar tu pregunta con el Asistente IA.'
          });
        }
        return;
      }

      const data = await res.json();
      const botMessage = {
        id: 'bot-' + Date.now(),
        rol: 'assistant',
        texto: data.respuesta || 'No se recibió respuesta explicativa.',
        herramientas: data.herramientas_usadas || [],
        modelo: data.modelo || 'Gemini',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error enviando mensaje al chat:', err);
      setErrorBanner({
        tipo: 'network',
        mensaje: 'Error de conexión con el servidor. Revisa tu conexión a internet o el estado del backend.'
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-' + Date.now(),
        rol: 'assistant',
        texto: `Conversación reiniciada. Estoy listo para responder consultas sobre la **${activeTemporada?.nombre || 'Temporada Activa'}**.`,
        herramientas: [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setErrorBanner(null);
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="ai-assistant-container">
      {/* Top Header Card */}
      <div className="ai-chat-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="ai-bot-avatar-header">
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2c3e50', margin: 0 }}>
                Asistente IA de Mercado
              </h2>
              <span className="ai-badge-live">
                <span className="ai-pulse-dot"></span>
                Gemini 3.8 Flash • Function Calling
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#78909c', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Database size={13} color="#0ac282" />
              Conectado a SQLite: <strong>{activeTemporada?.nombre || 'Temporada Activa'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            className="btn-secondary"
            onClick={handleResetChat}
            title="Reiniciar conversación"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <Trash2 size={14} />
            Nueva Conversación
          </button>
        </div>
      </div>

      {/* Error / Warning Banner */}
      {errorBanner && (
        <div className={`ai-alert-banner ${errorBanner.tipo}`}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, fontSize: '0.85rem' }}>
            <strong>{errorBanner.tipo === 'config' ? 'Configuración Requerida' : 'Aviso del Asistente'}: </strong>
            {errorBanner.mensaje}
          </div>
        </div>
      )}

      {/* Chat Messages Stream */}
      <div className="ai-chat-stream">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`ai-message-row ${msg.rol === 'user' ? 'user-row' : 'bot-row'}`}
          >
            {msg.rol === 'assistant' && (
              <div className="ai-msg-avatar bot">
                <Bot size={18} color="#ffffff" />
              </div>
            )}

            <div className={`ai-message-bubble ${msg.rol === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
              <div className="ai-bubble-header">
                <span className="ai-bubble-sender">
                  {msg.rol === 'user' ? 'Tú (Analista)' : 'Asistente Toros IA'}
                </span>
                <span className="ai-bubble-time">{msg.timestamp}</span>
              </div>

              {/* Message Body */}
              <div className="ai-bubble-text">
                <MarkdownRenderer content={msg.texto} isUser={msg.rol === 'user'} />
              </div>

              {/* Tool Execution Badges */}
              {msg.herramientas && msg.herramientas.length > 0 && (
                <div className="ai-tools-used-container">
                  <div className="ai-tools-used-label">
                    <Database size={11} /> Datos reales consultados en SQLite:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {msg.herramientas.map((tool, tIdx) => (
                      <span key={tIdx} className="ai-tool-pill" title={`Argumentos: ${JSON.stringify(tool.argumentos)}`}>
                        <Check size={12} color="#0ac282" />
                        <code>{tool.nombre}</code>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy Action */}
              {msg.rol === 'assistant' && msg.id !== 'welcome' && (
                <div className="ai-bubble-actions">
                  <button 
                    className="ai-action-btn"
                    onClick={() => handleCopyText(msg.id, msg.texto)}
                    title="Copiar respuesta"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={12} color="#0ac282" />
                        <span style={{ color: '#0ac282' }}>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.rol === 'user' && (
              <div className="ai-msg-avatar user">
                TJ
              </div>
            )}
          </div>
        ))}

        {/* Loading / Thinking Indicator */}
        {isLoading && (
          <div className="ai-message-row bot-row">
            <div className="ai-msg-avatar bot">
              <Bot size={18} color="#ffffff" />
            </div>
            <div className="ai-message-bubble bot-bubble loading-bubble">
              <div className="ai-thinking-row">
                <span className="ai-pulse-dot thinking"></span>
                <span>Consultando herramientas y analizando datos con Gemini...</span>
              </div>
              <div className="ai-typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts / Chips */}
      <div className="ai-quick-prompts-wrapper">
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#78909c', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={13} color="#fe9365" /> Preguntas sugeridas de análisis:
        </div>
        <div className="ai-chips-scroll">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              className="ai-prompt-chip"
              onClick={() => handleSend(qp.prompt)}
              disabled={isLoading}
              title={qp.prompt}
            >
              <TrendingUp size={12} color="#fe5d70" />
              <span>{qp.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="ai-input-wrapper">
        <textarea
          ref={inputRef}
          className="ai-chat-textarea"
          placeholder="Escribe tu pregunta sobre ventas, aforo, zonas o simulación de precios... (Enter para enviar)"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          disabled={isLoading}
        />
        <button
          className="ai-btn-send"
          onClick={() => handleSend()}
          disabled={isLoading || !inputPrompt.trim()}
          title="Enviar consulta"
        >
          {isLoading ? (
            <RefreshCw size={18} className="spin" color="#ffffff" />
          ) : (
            <Send size={18} color="#ffffff" />
          )}
        </button>
      </div>

      {/* Footer Disclaimer */}
      <div className="ai-footer-disclaimer">
        <span>Nota: El Asistente IA consulta funciones fijas de solo lectura sobre la base de datos de los Toros de Tijuana. Las cortesías no se computan en ingresos y los valores monetarios son en MXN.</span>
      </div>
    </div>
  );
}
