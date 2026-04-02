import { useState, useEffect, useRef } from 'react'
import { getNotificaciones } from '../services/estadisticas'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../App'

const PAGE_TITLES = {
    '/dashboard/inicio':       'Inicio',
    '/dashboard/caja':         'Caja',
    '/dashboard/ordenes':      'Órdenes',
    '/dashboard/chat':         'Chat',
    '/dashboard/delivery':     'Delivery',
    '/dashboard/ventas':       'Ventas',
    '/dashboard/inventario':   'Inventario',
    '/dashboard/proveedores':  'Proveedores',
    '/dashboard/clientes':     'Clientes',
    '/dashboard/reportes':     'Reportes',
    '/dashboard/auditoria':    'Auditoría',
    '/dashboard/configuracion':'Configuración',
}

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

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil]       = useState(false)
    const [menuNotif, setMenuNotif]         = useState(false)
    const [notificaciones, setNotificaciones] = useState([])
    const [chatsEsperando, setChatsEsperando] = useState(0)
    const [leidas, setLeidas]               = useState(() => {
        try { return JSON.parse(localStorage.getItem('notif_leidas') || '[]') } catch { return [] }
    })
    const [popupAgente, setPopupAgente]     = useState(null)
    const navigate                          = useNavigate()
    const location                          = useLocation()
    const prevChatsEsperando                = useRef(0)
    const prevNotifCount                    = useRef(0)
    const audioCtxRef                       = useRef(null)
    const { darkMode, toggleDarkMode, toggleMobileSidebar } = useApp()

    useEffect(() => {
        cargarNotificaciones()
        const intervalo = setInterval(cargarNotificaciones, 10000)
        return () => clearInterval(intervalo)
    }, [])

    useEffect(() => {
        if (popupAgente) {
            const timer = setTimeout(() => setPopupAgente(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [popupAgente])

    async function cargarNotificaciones() {
        try {
            const datos   = await getNotificaciones()
            const lista   = datos.notificaciones || []
            const chats   = datos.chats_esperando || 0

            if (chats > prevChatsEsperando.current) {
                const nuevoChat = lista.find(n => n.tipo === 'agente')
                if (nuevoChat) { setPopupAgente(nuevoChat); reproducirSonido('agente') }
            } else if (lista.length > prevNotifCount.current) {
                reproducirSonido('normal')
            }

            prevChatsEsperando.current = chats
            prevNotifCount.current     = lista.length
            setNotificaciones(lista)
            setChatsEsperando(chats)
            // Limpiar leidas obsoletas (notificaciones que ya no existen)
            const claves = new Set(lista.map(n => `${n.tipo}-${n.mensaje}`))
            setLeidas(prev => {
                const limpias = prev.filter(k => claves.has(k))
                if (limpias.length !== prev.length) {
                    try { localStorage.setItem('notif_leidas', JSON.stringify(limpias)) } catch {}
                }
                return limpias
            })
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
            } else {
                osc.frequency.value = 660
                gain.gain.setValueAtTime(0.2, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
                osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3)
            }
        } catch (e) {}
    }

    function marcarLeida(notif) {
        setLeidas(prev => {
            const nueva = [...prev, `${notif.tipo}-${notif.mensaje}`]
            try { localStorage.setItem('notif_leidas', JSON.stringify(nueva)) } catch {}
            return nueva
        })
    }
    function handleClickNotif(notif) {
        marcarLeida(notif)
        setMenuNotif(false)
        if (notif.tipo === 'agente') navigate('/chat')
        else if (notif.tipo === 'stock') navigate('/inventario')
    }
    function marcarTodasLeidas() {
        setLeidas(prev => {
            const nueva = [...new Set([...prev, ...notificaciones.map(n => `${n.tipo}-${n.mensaje}`)])]
            try { localStorage.setItem('notif_leidas', JSON.stringify(nueva)) } catch {}
            return nueva
        })
    }

    const sinLeer = notificaciones.filter(n => !leidas.includes(`${n.tipo}-${n.mensaje}`)).length

    function iconoTipo(tipo) {
        const base = { width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }
        const color = tipo === 'agente' ? '#ef4444' : tipo === 'stock' ? '#f59e0b' : 'var(--text-muted)'
        if (tipo === 'agente') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        )
        if (tipo === 'stock') return (
            <svg {...base} viewBox="0 0 24 24" style={{ color }}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
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

    const paginaTitulo = PAGE_TITLES[location.pathname] || 'Dashboard'

    return (
        <>
            {/* Popup urgente de agente */}
            {popupAgente && (
                <div className="agent-popup">
                    <style>{`@keyframes pulseRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}50%{box-shadow:0 0 0 6px rgba(239,68,68,0)}}`}</style>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulseRed 1.2s infinite' }} />
                            <p style={{ fontSize: '12px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Chat necesita agente
                            </p>
                        </div>
                        <button onClick={() => setPopupAgente(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 0 0 8px' }}>✕</button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '14px', lineHeight: 1.5 }}>
                        {popupAgente.mensaje}
                    </p>
                    <button
                        onClick={() => { setPopupAgente(null); navigate('/chat') }}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700', fontFamily: 'var(--font-ui)' }}>
                        Ir al chat →
                    </button>
                </div>
            )}

            <header className="topbar">

                {/* Hamburger — solo mobile */}
                <button
                    className="tb-btn tb-hamburger"
                    onClick={toggleMobileSidebar}
                    aria-label="Abrir menú"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="6"  x2="21" y2="6"/>
                        <line x1="3" y1="12" x2="21" y2="12"/>
                        <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                </button>

                {/* Título de página — izquierda */}
                <div className="tb-page-title">
                    <span className="tb-page-name">{paginaTitulo}</span>
                </div>

                {/* Acciones — derecha */}
                <div className="tb-actions">

                {/* Toggle dark mode */}
                <button
                    className="tb-btn"
                    onClick={toggleDarkMode}
                    title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                >
                    {darkMode ? <IcoSun /> : <IcoMoon />}
                </button>

                {/* Campana de notificaciones */}
                <div style={{ position: 'relative' }}>
                    <button
                        className="tb-btn"
                        onClick={() => { setMenuNotif(!menuNotif); setMenuPerfil(false) }}
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
                                        const key      = `${notif.tipo}-${notif.mensaje}`
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
                <div style={{ position: 'relative' }}>
                    <button
                        className="tb-profile-btn"
                        onClick={() => { setMenuPerfil(!menuPerfil); setMenuNotif(false) }}
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

                </div>{/* .tb-actions */}
            </header>
        </>
    )
}

export default TopBar
