import { useState, useEffect, useRef } from 'react'
import { getNotificaciones } from '../services/estadisticas'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil] = useState(false)
    const [menuNotif, setMenuNotif] = useState(false)
    const [notificaciones, setNotificaciones] = useState([])
    const [chatsEsperando, setChatsEsperando] = useState(0)
    const [leidas, setLeidas] = useState([])
    const [popupAgente, setPopupAgente] = useState(null) // { mensaje, cliente_numero }
    const navigate = useNavigate()
    const prevChatsEsperando = useRef(0)
    const prevNotifCount = useRef(0)
    const audioCtxRef = useRef(null)
    const { darkMode, toggleDarkMode } = useApp()

    useEffect(() => {
        cargarNotificaciones()
        const intervalo = setInterval(cargarNotificaciones, 10000)
        return () => clearInterval(intervalo)
    }, [])

    // Cerrar popup de agente automáticamente después de 8 segundos
    useEffect(() => {
        if (popupAgente) {
            const timer = setTimeout(() => setPopupAgente(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [popupAgente])

    async function cargarNotificaciones() {
        try {
            const datos = await getNotificaciones()
            const lista = datos.notificaciones || []
            const chats = datos.chats_esperando || 0

            // Nuevo chat esperando agente → popup + sonido urgente
            if (chats > prevChatsEsperando.current) {
                const nuevoChat = lista.find(n => n.tipo === 'agente')
                if (nuevoChat) {
                    setPopupAgente(nuevoChat)
                    reproducirSonido('agente')
                }
            }
            // Nueva notificacion de stock → sonido suave
            else if (lista.length > prevNotifCount.current) {
                reproducirSonido('normal')
            }

            prevChatsEsperando.current = chats
            prevNotifCount.current = lista.length
            setNotificaciones(lista)
            setChatsEsperando(chats)
        } catch (err) {}
    }

    function reproducirSonido(tipo = 'normal') {
        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext()
            }
            const ctx = audioCtxRef.current
            if (ctx.state === 'suspended') ctx.resume()

            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)

            if (tipo === 'agente') {
                // Dos tonos — más urgente
                osc.frequency.setValueAtTime(880, ctx.currentTime)
                osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15)
                osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3)
                gain.gain.setValueAtTime(0.4, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
                osc.start(ctx.currentTime)
                osc.stop(ctx.currentTime + 0.5)
            } else {
                // Un tono suave
                osc.frequency.value = 660
                gain.gain.setValueAtTime(0.2, ctx.currentTime)
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
                osc.start(ctx.currentTime)
                osc.stop(ctx.currentTime + 0.3)
            }
        } catch (e) {}
    }

    function marcarLeida(notif) {
        setLeidas(prev => [...prev, `${notif.tipo}-${notif.mensaje}`])
    }

    function handleClickNotif(notif) {
        marcarLeida(notif)
        setMenuNotif(false)
        if (notif.tipo === 'agente') navigate('/chat')
        else if (notif.tipo === 'stock') navigate('/inventario')
    }

    function marcarTodasLeidas() {
        setLeidas(prev => [...new Set([...prev, ...notificaciones.map(n => `${n.tipo}-${n.mensaje}`)])])
    }

    const sinLeer = notificaciones.filter(n => !leidas.includes(`${n.tipo}-${n.mensaje}`)).length

    function iconoTipo(tipo) {
        if (tipo === 'agente') return '💬'
        if (tipo === 'stock') return '📦'
        return '🔔'
    }

    function tiempoRelativo(fecha) {
        const diff = (new Date() - new Date(fecha)) / 1000
        if (diff < 60) return 'hace un momento'
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
        return `hace ${Math.floor(diff / 86400)} d`
    }

    const bg = darkMode ? '#1e293b' : 'white'
    const border = darkMode ? '#334155' : '#e5e7eb'
    const text = darkMode ? '#f1f5f9' : '#333'
    const textMuted = darkMode ? '#94a3b8' : '#888'
    const menuBg = darkMode ? '#1e293b' : 'white'
    const menuBorder = darkMode ? '#334155' : '#e5e7eb'
    const hoverBg = darkMode ? '#334155' : '#f9f9f9'

    return (
        <>
            {/* Popup urgente de agente */}
            {popupAgente && (
                <div style={{
                    position: 'fixed', bottom: '24px', right: '24px',
                    background: '#1a1a2e', color: 'white',
                    borderRadius: '14px', padding: '16px 20px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    zIndex: 9999, maxWidth: '320px',
                    border: '1px solid #ef4444',
                    animation: 'slideIn 0.3s ease'
                }}>
                    <style>{`
                        @keyframes slideIn {
                            from { transform: translateY(20px); opacity: 0; }
                            to { transform: translateY(0); opacity: 1; }
                        }
                    `}</style>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
                            <p style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Chat necesita agente
                            </p>
                        </div>
                        <button onClick={() => setPopupAgente(null)}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>✕</button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '14px' }}>
                        {popupAgente.mensaje}
                    </p>
                    <button
                        onClick={() => { setPopupAgente(null); navigate('/chat') }}
                        style={{ width: '100%', padding: '9px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                        Ir al chat
                    </button>
                </div>
            )}

            <div style={{
                height: '56px', background: bg,
                borderBottom: `1px solid ${border}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '0 24px', gap: '8px',
                position: 'relative', zIndex: 100,
                transition: 'background 0.2s, border-color 0.2s'
            }}>

                {/* Toggle dark mode */}
                <button onClick={toggleDarkMode}
                    title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    style={{ background: darkMode ? '#334155' : '#f1f5f9', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px', color: text, transition: 'all 0.2s' }}>
                    {darkMode ? '☀️' : '🌙'}
                </button>

                {/* Campana */}
                <div style={{ position: 'relative' }}>
                    <button onClick={() => { setMenuNotif(!menuNotif); setMenuPerfil(false) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', fontSize: '20px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        🔔
                        {sinLeer > 0 && (
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px',
                                width: '16px', height: '16px', background: '#ef4444',
                                borderRadius: '50%', fontSize: '10px', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600'
                            }}>
                                {sinLeer > 9 ? '9+' : sinLeer}
                            </span>
                        )}
                    </button>

                    {menuNotif && (
                        <div style={{
                            position: 'absolute', top: '48px', right: '0',
                            width: '340px', background: menuBg, borderRadius: '10px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                            border: `1px solid ${menuBorder}`, overflow: 'hidden'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: text }}>Notificaciones</span>
                                    {chatsEsperando > 0 && (
                                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: '#fee2e2', color: '#ef4444' }}>
                                            {chatsEsperando} chat{chatsEsperando > 1 ? 's' : ''} esperando
                                        </span>
                                    )}
                                </div>
                                {sinLeer > 0 && (
                                    <button onClick={marcarTodasLeidas}
                                        style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        Marcar todas como leidas
                                    </button>
                                )}
                            </div>

                            {notificaciones.length === 0 ? (
                                <p style={{ padding: '20px', fontSize: '13px', color: textMuted, textAlign: 'center' }}>
                                    Sin notificaciones pendientes
                                </p>
                            ) : (
                                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                                    {notificaciones.map((notif, i) => {
                                        const key = `${notif.tipo}-${notif.mensaje}`
                                        const esLeida = leidas.includes(key)
                                        const esAgente = notif.tipo === 'agente'
                                        return (
                                            <div key={i} onClick={() => handleClickNotif(notif)}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: `1px solid ${border}`,
                                                    background: esLeida ? menuBg : esAgente ? (darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2') : (darkMode ? '#1e3a5f' : '#f0f4ff'),
                                                    display: 'flex', gap: '10px',
                                                    alignItems: 'flex-start', cursor: 'pointer',
                                                    borderLeft: esAgente ? '3px solid #ef4444' : '3px solid transparent'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                                                onMouseLeave={e => e.currentTarget.style.background = esLeida ? menuBg : esAgente ? (darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2') : (darkMode ? '#1e3a5f' : '#f0f4ff')}
                                            >
                                                <span style={{ fontSize: '16px', flexShrink: 0 }}>{iconoTipo(notif.tipo)}</span>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '12px', color: text, lineHeight: '1.5', fontWeight: esAgente ? '600' : '400' }}>{notif.mensaje}</p>
                                                    <p style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{tiempoRelativo(notif.tiempo)}</p>
                                                </div>
                                                {!esLeida && (
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: esAgente ? '#ef4444' : '#3b82f6', flexShrink: 0, marginTop: '4px' }} />
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
                    <button onClick={() => { setMenuPerfil(!menuPerfil); setMenuNotif(false) }}
                        style={{ background: 'none', border: `1px solid ${border}`, cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: text }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1a1a2e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', flexShrink: 0 }}>
                            {usuario?.nombre?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {usuario?.nombre}
                        </span>
                        <span style={{ fontSize: '10px', color: textMuted }}>▼</span>
                    </button>

                    {menuPerfil && (
                        <div style={{ position: 'absolute', top: '48px', right: '0', width: '200px', background: menuBg, borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', border: `1px solid ${menuBorder}`, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
                                <p style={{ fontSize: '13px', fontWeight: '500', color: text }}>{usuario?.nombre}</p>
                                <p style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{usuario?.email}</p>
                                {usuario?.rol_nombre && (
                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: darkMode ? '#334155' : '#f1f5f9', color: textMuted, display: 'inline-block', marginTop: '4px' }}>
                                        {usuario.rol_nombre}
                                    </span>
                                )}
                            </div>
                            <button onClick={() => { setMenuPerfil(false); onLogout() }}
                                style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#ef4444', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                🚪 Cerrar sesion
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export default TopBar