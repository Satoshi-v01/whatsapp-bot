import { useState } from 'react'

function TopBar({ usuario, onLogout }) {
    const [menuPerfil, setMenuPerfil] = useState(false)
    const [menuNotif, setMenuNotif] = useState(false)

    const notificaciones = [
        { id: 1, tipo: 'chat', mensaje: 'Chat 595982211934 requiere un agente', tiempo: 'hace 2 min', leida: false },
        { id: 2, tipo: 'stock', mensaje: 'CIBAU Adulto Maxi 15kg — stock bajo (2 unidades)', tiempo: 'hace 10 min', leida: false },
        { id: 3, tipo: 'stock', mensaje: 'Royal Canin Indoor 2kg — stock bajo (1 unidad)', tiempo: 'hace 30 min', leida: true },
    ]

    const sinLeer = notificaciones.filter(n => !n.leida).length

    function iconoTipo(tipo) {
        if (tipo === 'chat') return '💬'
        if (tipo === 'stock') return '📦'
        if (tipo === 'vencimiento') return '⚠️'
        return '🔔'
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

            {/* Campana de notificaciones */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => { setMenuNotif(!menuNotif); setMenuPerfil(false) }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '20px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    🔔
                    {sinLeer > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '16px',
                            height: '16px',
                            background: '#ef4444',
                            borderRadius: '50%',
                            fontSize: '10px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600'
                        }}>
                            {sinLeer}
                        </span>
                    )}
                </button>

                {menuNotif && (
                    <div style={{
                        position: 'absolute',
                        top: '48px',
                        right: '0',
                        width: '320px',
                        background: 'white',
                        borderRadius: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>Notificaciones</span>
                            {sinLeer > 0 && (
                                <span style={{ fontSize: '11px', color: '#888' }}>{sinLeer} sin leer</span>
                            )}
                        </div>

                        {notificaciones.length === 0 ? (
                            <p style={{ padding: '16px', fontSize: '13px', color: '#888', textAlign: 'center' }}>Sin notificaciones</p>
                        ) : (
                            notificaciones.map(notif => (
                                <div key={notif.id} style={{
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f9f9f9',
                                    background: notif.leida ? 'white' : '#f0f4ff',
                                    display: 'flex',
                                    gap: '10px',
                                    alignItems: 'flex-start'
                                }}>
                                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{iconoTipo(notif.tipo)}</span>
                                    <div>
                                        <p style={{ fontSize: '12px', color: '#333', lineHeight: '1.5' }}>{notif.mensaje}</p>
                                        <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{notif.tiempo}</p>
                                    </div>
                                    {!notif.leida && (
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: '4px' }} />
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Perfil del usuario */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => { setMenuPerfil(!menuPerfil); setMenuNotif(false) }}
                    style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '13px',
                        color: '#333'
                    }}
                >
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#1a1a2e',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        flexShrink: 0
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
                        position: 'absolute',
                        top: '48px',
                        right: '0',
                        width: '180px',
                        background: 'white',
                        borderRadius: '10px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                            <p style={{ fontSize: '13px', fontWeight: '500' }}>{usuario?.nombre}</p>
                            <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{usuario?.email}</p>
                        </div>
                        <button
                            onClick={() => { setMenuPerfil(false); onLogout() }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: '#ef4444',
                                textAlign: 'left',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
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