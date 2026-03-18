import { useState, useEffect, useRef } from 'react'
import { getNotificaciones } from '../services/estadisticas'
import { useNavigate } from 'react-router-dom'

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil] = useState(false)
    const [menuNotif, setMenuNotif] = useState(false)
    const [notificaciones, setNotificaciones] = useState([])
    const [leidas, setLeidas] = useState([])
    const navigate = useNavigate()
    const sonidoRef = useRef(null)
    const prevNotifCount = useRef(0)

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
        } catch (err) {
            console.error('Error cargando notificaciones:', err)
        }
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
        const key = `${notif.tipo}-${notif.mensaje}`
        setLeidas(prev => [...prev, key])
    }

    function handleClickNotif(notif) {
        marcarLeida(notif)
        setMenuNotif(false)
        if (notif.tipo === 'chat') {
            navigate('/chat')
        } else if (notif.tipo === 'stock') {
            navigate('/inventario')
        }
    }

    function marcarTodasLeidas() {
        const keys = notificaciones.map(n => `${n.tipo}-${n.mensaje}`)
        setLeidas(prev => [...new Set([...prev, ...keys])])
    }

    const sinLeer = notificaciones.filter(n => !leidas.includes(`${n.tipo}-${n.mensaje}`)).length

    function iconoTipo(tipo) {
        if (tipo === 'chat') return '💬'
        if (tipo === 'stock') return '📦'
        if (tipo === 'vencimiento') return '⚠️'
        return '🔔'
    }

    function tiempoRelativo(fecha) {
        const diff = (new Date() - new Date(fecha)) / 1000
        if (diff < 60) return 'hace un momento'
        if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
        return `hace ${Math.floor(diff / 86400)} d`
    }

    return (
        <div style={{
            height: '56px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            gap: '8px',
            position: 'relative',
            zIndex: 100
        }}>

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
                        width: '340px', background: 'white', borderRadius: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Notificaciones</span>
                            {sinLeer > 0 && (
                                <button
                                    onClick={marcarTodasLeidas}
                                    style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    Marcar todas como leídas
                                </button>
                            )}
                        </div>

                        {notificaciones.length === 0 ? (
                            <p style={{ padding: '20px', fontSize: '13px', color: '#888', textAlign: 'center' }}>
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
                                                borderBottom: '1px solid #f9f9f9',
                                                background: esLeida ? 'white' : '#f0f4ff',
                                                display: 'flex', gap: '10px',
                                                alignItems: 'flex-start',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#e8f0fe'}
                                            onMouseLeave={e => e.currentTarget.style.background = esLeida ? 'white' : '#f0f4ff'}
                                        >
                                            <span style={{ fontSize: '16px', flexShrink: 0 }}>{iconoTipo(notif.tipo)}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', color: '#333', lineHeight: '1.5' }}>{notif.mensaje}</p>
                                                <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{tiempoRelativo(notif.tiempo)}</p>
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
                        background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer',
                        padding: '6px 12px', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '13px', color: '#333'
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
                    <span style={{ fontSize: '10px', color: '#888' }}>▼</span>
                </button>

                {menuPerfil && (
                    <div style={{
                        position: 'absolute', top: '48px', right: '0',
                        width: '180px', background: 'white', borderRadius: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb', overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                            <p style={{ fontSize: '13px', fontWeight: '500' }}>{usuario?.nombre}</p>
                            <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{usuario?.email}</p>
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