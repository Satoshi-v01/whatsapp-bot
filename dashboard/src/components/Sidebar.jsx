import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../App'

function Sidebar() {
    const [expandido, setExpandido] = useState(() => {
        const guardado = localStorage.getItem('sidebar_expandido')
        if (guardado !== null) return guardado === 'true'
        return window.innerWidth > 1280
    })
    const location = useLocation()
    const { puedo } = useApp()

    function esActivo(path) {
        return location.pathname === path
    }

    function toggleSidebar() {
        const nuevo = !expandido
        setExpandido(nuevo)
        localStorage.setItem('sidebar_expandido', String(nuevo))
    }

    const links = [
    { to: '/', icono: '🏠', label: 'Inicio', modulo: 'home' },      
    { to: '/caja', icono: '🧾', label: 'Caja', modulo: 'ventas' },
    { to: '/chat', icono: '💬', label: 'Chat', modulo: 'chat' },
    { to: '/delivery', icono: '🚚', label: 'Delivery', modulo: 'delivery' },
    { to: '/ventas', icono: '🛒', label: 'Ventas', modulo: 'ventas' },
    { to: '/inventario', icono: '📦', label: 'Inventario', modulo: 'inventario' },
    { to: '/clientes', icono: '👥', label: 'Clientes', modulo: 'clientes' },
    { to: '/reportes', icono: '📊', label: 'Reportes', modulo: 'reportes' },
    { to: '/configuracion', icono: '⚙️', label: 'Configuración', modulo: 'configuracion' },
]

    // Filtrar links según permisos — null = siempre visible (Home)
    const linksFiltrados = links.filter(l => l.modulo === null || puedo(l.modulo, 'ver'))

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
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: expandido ? 'space-between' : 'center',
                padding: '20px 16px',
                borderBottom: '1px solid #2a2a4e'
            }}>
                {expandido && (
                    <span style={{ color: 'white', fontWeight: '700', fontSize: '16px', whiteSpace: 'nowrap' }}>
                        Sosa Bulls
                    </span>
                )}
                <button
                    onClick={toggleSidebar}
                    style={{
                        background: 'none', border: 'none', color: '#a0a0c0',
                        cursor: 'pointer', fontSize: '18px', padding: '4px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '6px', transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#2a2a4e'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                    {expandido ? '✕' : '☰'}
                </button>
            </div>

            {/* Links */}
            <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {linksFiltrados.map(link => {
                    const activo = esActivo(link.to)
                    return (
                        <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                            <div
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 12px', borderRadius: '8px',
                                    background: activo ? '#2a2a4e' : 'transparent',
                                    color: activo ? 'white' : '#a0a0c0',
                                    transition: 'background 0.2s, color 0.2s',
                                    cursor: 'pointer', whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={e => { if (!activo) e.currentTarget.style.background = '#252545' }}
                                onMouseLeave={e => { if (!activo) e.currentTarget.style.background = 'transparent' }}
                            >
                                <span style={{ fontSize: '18px', flexShrink: 0 }}>{link.icono}</span>
                                {expandido && <span style={{ fontSize: '14px' }}>{link.label}</span>}
                            </div>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default Sidebar