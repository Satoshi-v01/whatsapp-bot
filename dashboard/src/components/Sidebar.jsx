import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Sidebar({ usuario, onLogout }) {
    const [expandido, setExpandido] = useState(true)
    const location = useLocation()

    function esActivo(path) {
        return location.pathname === path
    }

    return (
        <nav style={{
            width: expandido ? '220px' : '60px',
            minHeight: '100vh',
            background: '#1a1a2e',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.25s ease',
            overflow: 'hidden',
            flexShrink: 0
        }}>
            {/* Header con botón toggle */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: expandido ? 'space-between' : 'center',
                padding: '20px 16px',
                borderBottom: '1px solid #2a2a4e'
            }}>
                {expandido && (
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '16px', whiteSpace: 'nowrap' }}>
                        Sosa Bulls
                    </span>
                )}
                <button
                    onClick={() => setExpandido(!expandido)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#a0a0c0',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'background 0.2s'
                    }}
                >
                    {expandido ? '✕' : '☰'}
                </button>
            </div>

            {/* Links de navegación */}
            <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>

                <Link to="/" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: esActivo('/') ? '#2a2a4e' : 'transparent',
                        color: esActivo('/') ? 'white' : '#a0a0c0',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>🏠</span>
                        {expandido && <span style={{ fontSize: '14px' }}>Inicio</span>}
                    </div>
                </Link>

                <Link to="/chat" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: esActivo('/chat') ? '#2a2a4e' : 'transparent',
                        color: esActivo('/chat') ? 'white' : '#a0a0c0',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>💬</span>
                        {expandido && <span style={{ fontSize: '14px' }}>Chat</span>}
                    </div>
                </Link>

                <Link to="/ventas" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: esActivo('/ventas') ? '#2a2a4e' : 'transparent',
                        color: esActivo('/ventas') ? 'white' : '#a0a0c0',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>🛒</span>
                        {expandido && <span style={{ fontSize: '14px' }}>Ventas</span>}
                    </div>
                </Link>

                <Link to="/delivery" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', borderRadius: '8px',
                        background: esActivo('/delivery') ? '#2a2a4e' : 'transparent',
                        color: esActivo('/delivery') ? 'white' : '#a0a0c0',
                        transition: 'background 0.2s', cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>🚚</span>
                        {expandido && <span style={{ fontSize: '14px' }}>Delivery</span>}
                    </div>
                </Link>

                <Link to="/inventario" style={{ textDecoration: 'none' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: esActivo('/inventario') ? '#2a2a4e' : 'transparent',
                        color: esActivo('/inventario') ? 'white' : '#a0a0c0',
                        transition: 'background 0.2s',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                    }}>
                        <span style={{ fontSize: '18px', flexShrink: 0 }}>📦</span>
                        {expandido && <span style={{ fontSize: '14px' }}>Inventario</span>}
                    </div>
                </Link>

            </div>

        </nav>
    )
}

export default Sidebar