import { useState, useEffect, useRef } from 'react'
import api from '../services/api'
import { getSesiones, tomarSesion, responderSesion, devolverBot, cerrarConversacion } from '../services/sesiones'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

function Chat() {
    const [sesiones, setSesiones] = useState([])
    const [sesionActiva, setSesionActiva] = useState(null)
    const [mensaje, setMensaje] = useState('')
    const [cargando, setCargando] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [mensajes, setMensajes] = useState([])
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [buscar, setBuscar] = useState('')
    const inputRef = useRef(null)
    const mensajesRef = useRef(null)
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0b141a' : '#f8fafc',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        inputBg: darkMode ? '#0f172a' : '#f1f5f9',
        rowActive: darkMode ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)',
        rowBorder: darkMode ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.2)',
        msgCliente: darkMode ? '#1e293b' : 'white',
        msgClienteText: darkMode ? '#f1f5f9' : '#1e293b',
        msgBot: darkMode ? 'rgba(99,102,241,0.25)' : '#e7e7ff',
        msgBotText: darkMode ? '#a5b4fc' : '#3730a3',
        headerBg: darkMode ? '#1e293b' : 'white',
        chatBg: darkMode ? '#0b141a' : '#f8fafc',
    }

    useEffect(() => {
        cargarSesiones()
        const intervalo = setInterval(cargarSesiones, 5000)
        return () => clearInterval(intervalo)
    }, [])

    useEffect(() => {
        if (sesionActiva) {
            const actualizada = sesiones.find(s => s.cliente_numero === sesionActiva.cliente_numero)
            if (actualizada) setSesionActiva(actualizada)
        }
    }, [sesiones])

    useEffect(() => {
        if (!sesionActiva) return
        cargarMensajes(sesionActiva.cliente_numero)
        const intervalo = setInterval(() => cargarMensajes(sesionActiva.cliente_numero), 3000)
        return () => clearInterval(intervalo)
    }, [sesionActiva?.cliente_numero])

    async function cargarSesiones() {
        try {
            const datos = await getSesiones()
            setSesiones(datos)
            setCargando(false)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar las conversaciones.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function cargarMensajes(numero) {
        try {
            const res = await api.get(`/sesiones/${numero}/mensajes`)
            setMensajes(res.data)
            setTimeout(() => mensajesRef.current?.scrollTo({ top: mensajesRef.current.scrollHeight, behavior: 'smooth' }), 100)
        } catch (err) {}
    }

    async function handleTomarControl(numero) {
        try {
            await tomarSesion(numero, 1)
            await cargarSesiones()
            await cargarMensajes(numero)
            inputRef.current?.focus()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo tomar el control.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleDevolverBot(numero) {
        try {
            await devolverBot(numero)
            await cargarSesiones()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo devolver el control al bot.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleCerrarConversacion(numero) {
        setModalConfirmar({
            titulo: 'Cerrar conversación',
            mensaje: `¿Cerrar la conversación con ${numero}? El cliente podrá volver a escribir desde cero.`,
            textoBoton: 'Cerrar conversación',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await cerrarConversacion(numero)
                    setModalConfirmar(null)
                    setSesionActiva(null)
                    await cargarSesiones()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cerrar la conversación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    async function handleEnviar() {
        if (!mensaje.trim() || !sesionActiva) return
        try {
            setEnviando(true)
            await responderSesion(sesionActiva.cliente_numero, mensaje)
            setMensaje('')
            await cargarMensajes(sesionActiva.cliente_numero)
            inputRef.current?.focus()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo enviar el mensaje.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviando(false) }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
    }

    const modoConfig = {
        bot: { label: 'Bot', color: '#10b981', bg: darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7', textColor: '#065f46' },
        esperando_agente: { label: 'Esperando', color: '#f59e0b', bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', textColor: '#92400e' },
        humano: { label: 'Con agente', color: '#3b82f6', bg: darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe', textColor: '#1d4ed8' },
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    function formatearHora(fecha) {
        return new Date(fecha).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
    }

    // Pasos del bot
    const pasosOrden = ['inicio', 'buscando_producto', 'eligiendo_producto', 'eligiendo_presentacion', 'confirmando', 'factura', 'eligiendo_envio', 'datos_delivery', 'venta_registrada']
    function indexPaso(paso) { return pasosOrden.findIndex(p => paso?.includes(p.replace('_', ''))) }

    const sesionesFiltradas = sesiones.filter(s =>
        s.cliente_numero.includes(buscar) || s.paso?.toLowerCase().includes(buscar.toLowerCase())
    )

    if (cargando) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: s.bg, color: s.textMuted, fontSize: '14px' }}>
            Cargando conversaciones...
        </div>
    )

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

            {/* Lista conversaciones */}
            <aside style={{ width: '340px', flexShrink: 0, borderRight: `1px solid ${s.border}`, background: s.surface, display: 'flex', flexDirection: 'column' }}>
                {/* Buscador */}
                <div style={{ padding: '14px 16px', borderBottom: `1px solid ${s.border}` }}>
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: s.textFaint }}>🔍</span>
                        <input
                            placeholder="Buscar conversaciones..."
                            value={buscar}
                            onChange={e => setBuscar(e.target.value)}
                            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: '12px', border: 'none', background: s.inputBg, color: s.text, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <div style={{ padding: '12px' }}>
                        <p style={{ fontSize: '10px', fontWeight: '800', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', paddingLeft: '8px' }}>
                            Conversaciones activas ({sesionesFiltradas.length})
                        </p>

                        {sesionesFiltradas.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: s.textMuted }}>
                                <p style={{ fontSize: '24px', marginBottom: '8px' }}>💬</p>
                                <p style={{ fontSize: '13px' }}>No hay conversaciones activas.</p>
                            </div>
                        ) : (
                            sesionesFiltradas.map(sesion => {
                                const activa = sesionActiva?.cliente_numero === sesion.cliente_numero
                                const cfg = modoConfig[sesion.modo] || modoConfig.bot
                                return (
                                    <div key={sesion.cliente_numero} onClick={() => setSesionActiva(sesion)}
                                        style={{ padding: '14px', borderRadius: '16px', marginBottom: '4px', cursor: 'pointer', background: activa ? s.rowActive : 'transparent', border: `1px solid ${activa ? s.rowBorder : 'transparent'}`, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { if (!activa) e.currentTarget.style.background = s.surfaceLow }}
                                        onMouseLeave={e => { if (!activa) e.currentTarget.style.background = 'transparent' }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: darkMode ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0, fontWeight: '700', color: s.textMuted }}>
                                                    {sesion.cliente_numero.slice(-2)}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{sesion.cliente_numero}</p>
                                                    <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '1px' }}>Paso: {sesion.paso}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>{formatearFecha(sesion.ultimo_mensaje)}</p>
                                                <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: cfg.bg, color: cfg.textColor }}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </aside>

            {/* Panel chat */}
            <section style={{ flex: 1, display: 'flex', flexDirection: 'column', background: s.chatBg, minWidth: 0 }}>
                {!sesionActiva ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: s.textMuted }}>
                        <span style={{ fontSize: '48px' }}>💬</span>
                        <p style={{ fontSize: '15px', fontWeight: '500' }}>Seleccioná una conversación</p>
                        <p style={{ fontSize: '13px', color: s.textFaint }}>para ver los mensajes y gestionar la atención</p>
                    </div>
                ) : (
                    <>
                        {/* Header chat */}
                        <div style={{ height: '72px', background: s.headerBg, borderBottom: `1px solid ${s.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: darkMode ? '#334155' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: s.textMuted }}>
                                    {sesionActiva.cliente_numero.slice(-2)}
                                </div>
                                <div>
                                    <p style={{ fontSize: '15px', fontWeight: '700', color: s.text, lineHeight: 1 }}>{sesionActiva.cliente_numero}</p>
                                    <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '3px' }}>
                                        Estado: <span style={{ color: '#4f46e5', fontWeight: '600' }}>{sesionActiva.paso}</span> · Modo: <span style={{ fontStyle: 'italic' }}>{modoConfig[sesionActiva.modo]?.label || sesionActiva.modo}</span>
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {sesionActiva.modo !== 'humano' ? (
                                    <button onClick={() => handleTomarControl(sesionActiva.cliente_numero)}
                                        style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#1a1a2e', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        👤 Tomar control
                                    </button>
                                ) : (
                                    <button onClick={() => handleDevolverBot(sesionActiva.cliente_numero)}
                                        style={{ padding: '9px 16px', borderRadius: '10px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                        🤖 Devolver al bot
                                    </button>
                                )}
                                <button onClick={() => handleCerrarConversacion(sesionActiva.cliente_numero)}
                                    style={{ padding: '9px 16px', borderRadius: '10px', border: '1px solid rgba(239,68,68,0.3)', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                                    Cerrar conversación
                                </button>
                            </div>
                        </div>

                        {/* Mensajes */}
                        <div ref={mensajesRef} style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {mensajes.length === 0 ? (
                                <p style={{ color: s.textMuted, fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>No hay mensajes aún.</p>
                            ) : (
                                mensajes.map((msg, i) => {
                                    const esCliente = msg.origen === 'cliente'
                                    const esBot = msg.origen === 'bot'
                                    const esAgente = msg.origen === 'agente'
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: esCliente ? 'flex-start' : 'flex-end', maxWidth: '80%', alignSelf: esCliente ? 'flex-start' : 'flex-end' }}>
                                            <div style={{
                                                padding: '10px 14px', borderRadius: esCliente ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
                                                fontSize: '13px', lineHeight: '1.5',
                                                background: esCliente ? s.msgCliente : esBot ? s.msgBot : '#1a1a2e',
                                                color: esAgente ? 'white' : esBot ? s.msgBotText : s.msgClienteText,
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                                border: esCliente ? `1px solid ${s.borderLight}` : esBot ? `1px solid rgba(99,102,241,0.2)` : 'none'
                                            }}>
                                                <p>{msg.texto}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '4px' }}>
                                                    <span style={{ fontSize: '10px', opacity: 0.5 }}>{formatearHora(msg.created_at)}</span>
                                                    {!esCliente && <span style={{ fontSize: '10px', opacity: 0.6 }}>✓✓</span>}
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '10px', color: s.textFaint, marginTop: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em', padding: '0 4px' }}>
                                                {msg.origen}
                                            </span>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* Barra de contexto/stepper */}
                        <div style={{ padding: '10px 20px', background: darkMode ? 'rgba(245,158,11,0.08)' : '#fffbeb', borderTop: `1px solid ${darkMode ? 'rgba(245,158,11,0.2)' : '#fde68a'}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
                                    {['inicio', 'eligiendo', 'confirmando', 'envio', 'completado'].map((paso, i) => {
                                        const pasoActual = sesionActiva.paso || ''
                                        const completado = i < 2
                                        const activo = pasoActual.includes(paso) || (i === 1 && pasoActual.includes('presentac'))
                                        return (
                                            <div key={paso} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: activo ? '4px 10px' : '4px 8px', borderRadius: '20px', background: activo ? (darkMode ? 'rgba(99,102,241,0.2)' : '#e0e7ff') : 'transparent', border: activo ? `1px solid rgba(99,102,241,0.3)` : '1px solid transparent' }}>
                                                    <span style={{ fontSize: '10px', color: activo ? (darkMode ? '#a5b4fc' : '#4338ca') : s.textFaint, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {activo ? '●' : completado ? '✓'  : '○'} {paso}
                                                    </span>
                                                </div>
                                                {i < 4 && <div style={{ width: '12px', height: '1px', background: s.border, flexShrink: 0 }} />}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', padding: '4px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, flexShrink: 0 }}>
                                    <span style={{ fontSize: '10px', fontFamily: 'monospace', color: s.textMuted, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {JSON.stringify(sesionActiva.datos)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Input */}
                        <div style={{ padding: '16px 20px', background: s.headerBg, borderTop: `1px solid ${s.border}` }}>
                            {sesionActiva.modo === 'humano' ? (
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                    <textarea
                                        ref={inputRef}
                                        value={mensaje}
                                        onChange={e => setMensaje(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Escribí tu mensaje... (Enter para enviar)"
                                        rows={3}
                                        style={{ flex: 1, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${s.border}`, fontSize: '13px', resize: 'none', fontFamily: 'sans-serif', background: s.inputBg, color: s.text, outline: 'none' }}
                                    />
                                    <button onClick={handleEnviar} disabled={enviando || !mensaje.trim()}
                                        style={{ padding: '12px 20px', borderRadius: '12px', border: 'none', background: enviando || !mensaje.trim() ? '#94a3b8' : '#1a1a2e', color: 'white', fontSize: '13px', fontWeight: '700', cursor: enviando || !mensaje.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                                        {enviando ? '...' : '↑ Enviar'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: s.textMuted, fontSize: '13px', padding: '8px 0' }}>
                                    <span style={{ fontSize: '18px' }}>🤖</span>
                                    <span>El bot está manejando esta conversación. Hacé clic en <strong style={{ color: '#4f46e5', cursor: 'pointer' }} onClick={() => handleTomarControl(sesionActiva.cliente_numero)}>Tomar control</strong> para intervenir.</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </section>

            {modalConfirmar && (
                <ModalConfirmar
                    titulo={modalConfirmar.titulo}
                    mensaje={modalConfirmar.mensaje}
                    textoBoton={modalConfirmar.textoBoton}
                    colorBoton={modalConfirmar.colorBoton}
                    onConfirmar={modalConfirmar.onConfirmar}
                    onCancelar={() => setModalConfirmar(null)}
                />
            )}
        </div>
    )
}

export default Chat