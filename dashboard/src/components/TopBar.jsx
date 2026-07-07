import { useState, useEffect, useRef } from 'react'
import { getNotificaciones } from '../services/estadisticas'
import { getResumenOrdenes } from '../services/ordenes'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'

/* ── Micro SVG icons ── */
function IcoSun() {
    return (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
        </svg>
    )
}
function IcoMoon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
    )
}
function IcoBell() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    )
}
function IcoChevronDown() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
        </svg>
    )
}
function IcoLogout() {
    return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
    )
}

const POPUP_STACK_HEIGHT = 196

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil]       = useState(false)
    const [menuNotif, setMenuNotif]         = useState(false)
    const [notificaciones, setNotificaciones] = useState([])
    const [chatsEsperando, setChatsEsperando] = useState(0)
    const [leidas, setLeidas]               = useState(() => {
        try { return JSON.parse(localStorage.getItem('notif_leidas') || '[]') } catch { return [] }
    })
    const [popupsAgente, setPopupsAgente]    = useState([])
    const [popupsMensaje, setPopupsMensaje]  = useState([])
    const [popupOrden, setPopupOrden]       = useState(null)
    const navigate                          = useNavigate()
    const prevNumerosEsperando              = useRef(new Set())
    const prevMensajeIds                    = useRef(new Set())
    const yaHizoPrimeraCarga                = useRef(false)
    const prevNotifCount                    = useRef(0)
    const prevOrdenesCount                  = useRef(null)
    const audioCtxRef                       = useRef(null)
    const popupTimersRef                    = useRef([])
    const notifRef                          = useRef(null)
    const perfilRef                         = useRef(null)
    const { darkMode, toggleDarkMode }      = useApp()

    // Cerrar dropdowns al hacer click fuera
    useEffect(() => {
        function handleOutside(e) {
            if (menuNotif && notifRef.current && !notifRef.current.contains(e.target)) {
                setMenuNotif(false)
            }
            if (menuPerfil && perfilRef.current && !perfilRef.current.contains(e.target)) {
                setMenuPerfil(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [menuNotif, menuPerfil])

    useEffect(() => {
        cargarNotificaciones()
        const intervalo = setInterval(cargarNotificaciones, 60000)
        return () => {
            clearInterval(intervalo)
            popupTimersRef.current.forEach(clearTimeout)
        }
    }, [])

    function cerrarPopupAgente(id) {
        setPopupsAgente(prev => prev.filter(p => p.id !== id))
    }

    function agregarPopupAgente(notif) {
        const id = `${notif.numero}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        setPopupsAgente(prev => [...prev, { ...notif, id }])
        const timer = setTimeout(() => cerrarPopupAgente(id), 8000)
        popupTimersRef.current.push(timer)
    }

    function cerrarPopupMensaje(id) {
        setPopupsMensaje(prev => prev.filter(p => p.id !== id))
    }

    function agregarPopupMensaje(notif) {
        const id = `msg-${notif.id}`
        setPopupsMensaje(prev => [...prev, { ...notif, id }])
        const timer = setTimeout(() => cerrarPopupMensaje(id), 8000)
        popupTimersRef.current.push(timer)
    }

    useEffect(() => {
        if (popupOrden) {
            const timer = setTimeout(() => setPopupOrden(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [popupOrden])

    async function cargarNotificaciones() {
        try {
            const [datos, ordenStats] = await Promise.all([
                getNotificaciones(),
                getResumenOrdenes().catch(() => null)
            ])
            const lista   = datos.notificaciones || []
            const chats   = datos.chats_esperando || 0
            const pendientes = ordenStats?.pendientes || 0

            const chatsAgente   = lista.filter(n => n.tipo === 'agente')
            const mensajesNuevosLista = lista.filter(n => n.tipo === 'mensaje')
            const numerosActuales = new Set(chatsAgente.map(n => n.numero))
            const idsMensajesActuales = new Set(mensajesNuevosLista.map(n => n.id))
            const esPrimeraCarga = !yaHizoPrimeraCarga.current
            yaHizoPrimeraCarga.current = true
            const nuevosChats = esPrimeraCarga ? [] : chatsAgente.filter(n => !prevNumerosEsperando.current.has(n.numero))
            const nuevosMensajes = esPrimeraCarga ? [] : mensajesNuevosLista.filter(n => !prevMensajeIds.current.has(n.id))

            if (nuevosChats.length > 0) {
                nuevosChats.forEach(agregarPopupAgente)
                reproducirSonido('agente')
            } else if (nuevosMensajes.length > 0) {
                nuevosMensajes.forEach(agregarPopupMensaje)
                reproducirSonido('normal')
            } else if (lista.length > prevNotifCount.current) {
                reproducirSonido('normal')
            }

            if (prevOrdenesCount.current !== null && pendientes > prevOrdenesCount.current) {
                const nuevas = pendientes - prevOrdenesCount.current
                setPopupOrden({ cantidad: nuevas, total: pendientes })
                reproducirSonido('orden')
            }

            prevNumerosEsperando.current = numerosActuales
            prevMensajeIds.current     = idsMensajesActuales
            prevNotifCount.current     = lista.length
            prevOrdenesCount.current   = pendientes
            setNotificaciones(lista)
            setChatsEsperando(chats)
        } catch (err) {}
    }

    function reproducirSonido(tipo = 'normal') {
        try {
            if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
            const ctx  = audioCtxRef.current
            if (ctx.state === 'suspended') ctx.resume()
            const osc  = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            if (tipo === 'agente') {
                osc.frequency.setValueAtTime(880, ctx.currentTime)
                osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)
                gain.gain.setValueAtTime(0.4, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
            } else if (tipo === 'orden') {
                osc.frequency.setValueAtTime(523, ctx.currentTime)
                osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12)
                osc.frequency.setValueAtTime(784, ctx.currentTime + 0.24)
                gain.gain.setValueAtTime(0.35, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45)
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45)
            } else {
                osc.frequency.value = 660
                gain.gain.setValueAtTime(0.2, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
            }
        } catch (e) {}
    }

    function claveNotif(notif) {
        return notif.id !== undefined ? `${notif.tipo}-${notif.id}` : `${notif.tipo}-${notif.mensaje}`
    }
    function marcarLeida(notif) {
        setLeidas(prev => {
            const next = [...prev, claveNotif(notif)]
            localStorage.setItem('notif_leidas', JSON.stringify(next))
            return next
        })
    }
    function handleClickNotif(notif) {
        marcarLeida(notif)
        setMenuNotif(false)
        if (notif.tipo === 'agente' || notif.tipo === 'producto_ausente' || notif.tipo === 'mensaje') {
            navigate(notif.numero ? `/dashboard/chat?numero=${encodeURIComponent(notif.numero)}` : '/dashboard/chat')
        } else if (notif.tipo === 'stock') navigate('/dashboard/inventario')
        else if (notif.tipo === 'orden') navigate('/dashboard/ordenes')
    }
    function marcarTodasLeidas() {
        setLeidas(prev => {
            const next = [...new Set([...prev, ...notificaciones.map(claveNotif)])]
            localStorage.setItem('notif_leidas', JSON.stringify(next))
            return next
        })
    }

    const sinLeer = notificaciones.filter(n => !leidas.includes(claveNotif(n))).length

    function iconoTipo(tipo) {
        const base = { width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }
        const color = tipo === 'agente' ? '#ef4444' : tipo === 'stock' ? '#f59e0b' : 'var(--text-muted)'
        if (tipo === 'agente') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        )
        if (tipo === 'mensaje') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color: '#3b82f6' }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        )
        if (tipo === 'stock') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color }}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        )
        if (tipo === 'producto_ausente') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color: '#8b5cf6' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="16" x2="11.01" y2="16"/></svg>
        )
        if (tipo === 'orden') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color: '#f59e0b' }}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        )
        return (
            <svg {...base} viewBox="0 0 24 24" style={{ color }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        )
    }
    function tiempoRelativo(fecha) {
        const diff = (new Date() - new Date(fecha)) / 1000
        if (diff < 60)    return 'hace un momento'
        if (diff < 3600)  return `hace ${Math.floor(diff / 60)} min`
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
        return `hace ${Math.floor(diff / 86400)} d`
    }

    return (
        <>
            <style>{`
                @keyframes pulseRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}
                @keyframes pulseAmber{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.5)}50%{box-shadow:0 0 0 6px rgba(245,158,11,0)}}
            `}</style>

            {/* Popups urgentes de agente — uno por cada chat nuevo */}
            {popupsAgente.map((popup, idx) => (
                <div key={popup.id} className="agent-popup" style={{ bottom: `${24 + idx * POPUP_STACK_HEIGHT}px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulseRed 1.2s infinite' }} />
                        <p style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Chat necesita agente
                        </p>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '14px', lineHeight: 1.5 }}>
                        {popup.mensaje}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => { cerrarPopupAgente(popup.id); navigate(`/dashboard/chat?numero=${encodeURIComponent(popup.numero)}`) }}
                            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                            Ir al chat →
                        </button>
                        <button
                            onClick={() => cerrarPopupAgente(popup.id)}
                            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                            Cerrar ventana
                        </button>
                    </div>
                </div>
            ))}

            {/* Popups de mensaje nuevo — uno por cada mensaje entrante de cliente */}
            {popupsMensaje.map((popup, idx) => (
                <div key={popup.id} className="agent-popup" style={{ borderLeftColor: '#3b82f6', bottom: `${24 + (popupsAgente.length + idx) * POPUP_STACK_HEIGHT}px` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                        <p style={{ fontSize: '12px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Mensaje nuevo
                        </p>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '14px', lineHeight: 1.5 }}>
                        {popup.mensaje}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => { cerrarPopupMensaje(popup.id); navigate(`/dashboard/chat?numero=${encodeURIComponent(popup.numero)}`) }}
                            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                            Ir al chat →
                        </button>
                        <button
                            onClick={() => cerrarPopupMensaje(popup.id)}
                            style={{ flex: 1, padding: '9px', borderRadius: '8px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                            Cerrar ventana
                        </button>
                    </div>
                </div>
            ))}

            {/* Popup nueva orden */}
            {popupOrden && (
                <div className="agent-popup" style={{ borderLeftColor: '#f59e0b', bottom: `${24 + (popupsAgente.length + popupsMensaje.length) * POPUP_STACK_HEIGHT}px` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulseAmber 1.2s infinite' }} />
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                {popupOrden.cantidad === 1 ? 'Nueva orden' : `${popupOrden.cantidad} nuevas ordenes`}
                            </p>
                        </div>
                        <button onClick={() => setPopupOrden(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 8px' }}>✕</button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '14px', lineHeight: 1.5 }}>
                        {popupOrden.cantidad === 1
                            ? 'Hay una nueva orden de compra pendiente de confirmacion.'
                            : `Hay ${popupOrden.cantidad} nuevas ordenes pendientes de confirmacion.`}
                        {' '}Total pendientes: <strong style={{ color: '#fde68a' }}>{popupOrden.total}</strong>
                    </p>
                    <button
                        onClick={() => { setPopupOrden(null); navigate('/dashboard/ordenes') }}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', background: '#f59e0b', color: '#1a1a2e', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                        Ver ordenes →
                    </button>
                </div>
            )}

            <header className="topbar">

                {/* Toggle dark mode — izquierda */}
                <button
                    className="tb-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                >
                    {darkMode ? <IcoSun /> : <IcoMoon />}
                </button>

                {/* Grupo derecho: campana + perfil */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>

                    {/* Campana de notificaciones */}
                    <div ref={notifRef} style={{ position: 'relative' }}>
                        <button
                            className="tb-btn"
                            onClick={() => { setMenuNotif(v => !v); setMenuPerfil(false) }}
                            title="Notificaciones"
                        >
                            <IcoBell />
                            {sinLeer > 0 && (
                                <span className="tb-badge">{sinLeer > 9 ? '9+' : sinLeer}</span>
                            )}
                        </button>

                        {menuNotif && (
                            <div className="tb-dropdown" style={{ width: '340px' }}>
                                <div className="tb-dropdown-header tb-dropdown-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'var(--text)' }}>Notificaciones</span>
                                        {chatsEsperando > 0 && (
                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: 'var(--r-full)', background: '#fee2e2', color: '#ef4444' }}>
                                                {chatsEsperando} chat{chatsEsperando > 1 ? 's' : ''} esperando
                                            </span>
                                        )}
                                    </div>
                                    {sinLeer > 0 && (
                                        <button onClick={marcarTodasLeidas}
                                            style={{ fontSize: '11px', color: 'var(--accent-blue)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: '500' }}>
                                            Marcar todas leídas
                                        </button>
                                    )}
                                </div>

                                {notificaciones.length === 0 ? (
                                    <p style={{ padding: '24px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                                        Sin notificaciones pendientes
                                    </p>
                                ) : (
                                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                        {notificaciones.map((notif, i) => {
                                            const key      = claveNotif(notif)
                                            const esLeida  = leidas.includes(key)
                                            const esAgente = notif.tipo === 'agente'
                                            return (
                                                <div key={i}
                                                    className={`notif-item${!esLeida ? (esAgente ? ' urgent' : ' unread') : ''}`}
                                                    onClick={() => handleClickNotif(notif)}
                                                >
                                                    <span style={{ flexShrink: 0, marginTop: '2px', display: 'flex', alignItems: 'center' }}>{iconoTipo(notif.tipo)}</span>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p style={{ fontSize: '12.5px', color: 'var(--text)', lineHeight: '1.5', fontWeight: esAgente ? '600' : '400' }}>
                                                            {notif.mensaje}
                                                        </p>
                                                        <p style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '3px' }}>
                                                            {tiempoRelativo(notif.tiempo)}
                                                        </p>
                                                    </div>
                                                    {!esLeida && (
                                                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: esAgente ? '#ef4444' : 'var(--accent-blue)', flexShrink: 0, marginTop: '5px' }} />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Perfil */}
                    <div ref={perfilRef} style={{ position: 'relative' }}>
                        <button
                            className="tb-profile-btn"
                            onClick={() => { setMenuPerfil(v => !v); setMenuNotif(false) }}
                        >
                            <div className="tb-avatar">
                                {usuario?.nombre?.charAt(0).toUpperCase()}
                            </div>
                            <span className="tb-name">{usuario?.nombre}</span>
                            <span className="tb-chevron"><IcoChevronDown /></span>
                        </button>

                        {menuPerfil && (
                            <div className="tb-dropdown tb-profile-dropdown">
                                <div className="tb-profile-info">
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>{usuario?.nombre}</p>
                                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{usuario?.email}</p>
                                    {usuario?.rol_nombre && (
                                        <span className="tb-role-badge">{usuario.rol_nombre}</span>
                                    )}
                                </div>
                                <button
                                    className="tb-logout-btn"
                                    onClick={() => { setMenuPerfil(false); onLogout() }}
                                >
                                    <IcoLogout />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>

                </div>
            </header>
        </>
    )
}

export default TopBar
