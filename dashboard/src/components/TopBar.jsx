import { useState, useEffect, useRef } from 'react'
import { getNotificaciones } from '../services/estadisticas'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil] = useState(false)
    const [menuNotif, setMenuNotif] = useState(false)
    const [notificaciones, setNotificaciones] = useState([])
    const [leidas, setLeidas] = useState([])
    const navigate = useNavigate()
    const prevNotifCount = useRef(0)
    const { darkMode, toggleDarkMode } = useApp()

    useEffect(() => {
        cargarNotificaciones()
        const intervalo = setInterval(cargarNotificaciones, 10000)
        return () => clearInterval(intervalo)
    }, [])

    async function cargarNotificaciones() {
        try {
            const datos = await getNotificaciones()
            const nuevas = datos.filter(n => !leidas.includes(`${n.tipo}-${n.mensaje}`))
            if (nuevas.length > prevNotifCount.current) {
                reproducirSonido()
            }
            prevNotifCount.current = nuevas.length
            setNotificaciones(datos)
        } catch (err) {}
    }

    function reproducirSonido() {
        try {
            const ctx = new AudioContext()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.frequency.value = 880
            gain.gain.setValueAtTime(0.3, ctx.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.4)
        } catch (e) {}
    }

    function marcarLeida(notif) {
        setLeidas(prev => [...prev, `${notif.tipo}-${notif.mensaje}`])
    }

    function handleClickNotif(notif) {
        marcarLeida(notif)
        setMenuNotif(false)
        if (notif.tipo === 'chat') navigate('/chat')
        else if (notif.tipo === 'stock') navigate('/inventario')
    }

    function marcarTodasLeidas() {
        setLeidas(prev => [...new Set([...prev, ...notificaciones.map(n => `${n.tipo}-${n.mensaje}`)])])
    }

    const sinLeer = notificaciones.filter(n => !leidas.includes(`${n.tipo}-${n.mensaje}`)).length

    function iconoTipo(tipo) {
        if (tipo === 'chat') return '💬'
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
        <div style={{
            height: '56px',
            background: bg,
            borderBottom: `1px solid ${border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            gap: '8px',
            position: 'relative',
            zIndex: 100,
            transition: 'background 0.2s, border-color 0.2s'
        }}>

            {/* Toggle modo oscuro */}
            <button
                onClick={toggleDarkMode}
                title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                style={{
                    background: darkMode ? '#334155' : '#f1f5f9',
                    border: 'none', cursor: 'pointer',
                    padding: '6px 10px', borderRadius: '8px',
                    fontSize: '16px', display: 'flex', alignItems: 'center',
                    gap: '6px', color: text, transition: 'all 0.2s'
                }}
            >
                {darkMode ? '☀️' : '🌙'}
            </button>

            {/* Campana */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => { setMenuNotif(!menuNotif); setMenuPerfil(false) }}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '8px', borderRadius: '8px', fontSize: '20px',
                        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    🔔
                    {sinLeer > 0 && (
                        <span style={{
                            position: 'absolute', top: '4px', right: '4px',
                            width: '16px', height: '16px', background: '#ef4444',
                            borderRadius: '50%', fontSize: '10px', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '600'
                        }}>
                            {sinLeer}
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
                            <span style={{ fontSize: '14px', fontWeight: '600', color: text }}>Notificaciones</span>
                            {sinLeer > 0 && (
                                <button onClick={marcarTodasLeidas} style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Marcar todas como leídas
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
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => handleClickNotif(notif)}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: `1px solid ${border}`,
                                                background: esLeida ? menuBg : darkMode ? '#1e3a5f' : '#f0f4ff',
                                                display: 'flex', gap: '10px',
                                                alignItems: 'flex-start',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = hoverBg}
                                            onMouseLeave={e => e.currentTarget.style.background = esLeida ? menuBg : darkMode ? '#1e3a5f' : '#f0f4ff'}
                                        >
                                            <span style={{ fontSize: '16px', flexShrink: 0 }}>{iconoTipo(notif.tipo)}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', color: text, lineHeight: '1.5' }}>{notif.mensaje}</p>
                                                <p style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{tiempoRelativo(notif.tiempo)}</p>
                                            </div>
                                            {!esLeida && (
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px' }} />
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
                    onClick={() => { setMenuPerfil(!menuPerfil); setMenuNotif(false) }}
                    style={{
                        background: 'none', border: `1px solid ${border}`, cursor: 'pointer',
                        padding: '6px 12px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '13px', color: text
                    }}
                >
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: '#1a1a2e', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: '600', flexShrink: 0
                    }}>
                        {usuario?.nombre?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {usuario?.nombre}
                    </span>
                    <span style={{ fontSize: '10px', color: textMuted }}>▼</span>
                </button>

                {menuPerfil && (
                    <div style={{
                        position: 'absolute', top: '48px', right: '0',
                        width: '200px', background: menuBg, borderRadius: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                        border: `1px solid ${menuBorder}`, overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${border}` }}>
                            <p style={{ fontSize: '13px', fontWeight: '500', color: text }}>{usuario?.nombre}</p>
                            <p style={{ fontSize: '11px', color: textMuted, marginTop: '2px' }}>{usuario?.email}</p>
                        </div>
                        <button
                            onClick={() => { setMenuPerfil(false); onLogout() }}
                            style={{
                                width: '100%', padding: '12px 16px',
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '13px', color: '#ef4444',
                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px'
                            }}
                        >
                            🚪 Cerrar sesión
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default TopBar