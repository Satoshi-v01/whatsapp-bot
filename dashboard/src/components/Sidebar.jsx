import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../App'

/* ── SVG Icon primitives ── */
function Ico({ size = 18, children }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.75"
            strokeLinecap="round" strokeLinejoin="round">
            {children}
        </svg>
    )
}

const ICONS = {
    home: <Ico><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></Ico>,
    caja: <Ico><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></Ico>,
    ordenes: <Ico><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="12" y2="16"/></Ico>,
    chat: <Ico><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></Ico>,
    delivery: <Ico><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></Ico>,
    ventas: <Ico><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Ico>,
    inventario: <Ico><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Ico>,
    proveedores: <Ico><path d="M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18z"/><path d="M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h2"/><path d="M18 9h2a2 2 0 012 2v9a2 2 0 01-2 2h-2"/><rect x="10" y="6" width="4" height="4"/><rect x="10" y="14" width="4" height="4"/></Ico>,
    clientes: <Ico><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></Ico>,
    reportes: <Ico><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ico>,
    auditoria: <Ico><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ico>,
    configuracion: <Ico><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></Ico>,
}

function Sidebar() {
    const [expandido, setExpandido] = useState(() => {
        const guardado = localStorage.getItem('sidebar_expandido')
        if (guardado !== null) return guardado === 'true'
        return window.innerWidth > 1280
    })
    const location = useLocation()
    const { puedo } = useApp()

    function esActivo(path) { return location.pathname === path }

    function toggleSidebar() {
        const nuevo = !expandido
        setExpandido(nuevo)
        localStorage.setItem('sidebar_expandido', String(nuevo))
    }

    const links = [
        { to: '/dashboard/inicio',        icono: 'home',          label: 'Inicio',        modulo: 'home' },
        { to: '/dashboard/caja',           icono: 'caja',          label: 'Caja',          modulo: 'ventas' },
        { to: '/dashboard/ordenes',        icono: 'ordenes',       label: 'Ordenes',       modulo: 'ordenes' },
        { to: '/dashboard/chat',           icono: 'chat',          label: 'Chat',          modulo: 'chat' },
        { to: '/dashboard/delivery',       icono: 'delivery',      label: 'Delivery',      modulo: 'delivery' },
        { divider: true },
        { to: '/dashboard/ventas',         icono: 'ventas',        label: 'Ventas',        modulo: 'ventas' },
        { to: '/dashboard/inventario',     icono: 'inventario',    label: 'Inventario',    modulo: 'inventario' },
        { to: '/dashboard/proveedores',    icono: 'proveedores',   label: 'Proveedores',   modulo: 'proveedores' },
        { to: '/dashboard/clientes',       icono: 'clientes',      label: 'Clientes',      modulo: 'clientes' },
        { divider: true },
        { to: '/dashboard/reportes',       icono: 'reportes',      label: 'Reportes',      modulo: 'reportes' },
        { to: '/dashboard/auditoria',      icono: 'auditoria',     label: 'Auditoría',     modulo: 'auditoria', soloAdmin: true },
        { to: '/dashboard/configuracion',  icono: 'configuracion', label: 'Configuración', modulo: 'configuracion' },
    ]

    const linksFiltrados = links.filter(l => {
        if (l.divider) return true
        return l.modulo === null || puedo(l.modulo, 'ver')
    })

    return (
        <nav className={`sb${expandido ? '' : ' collapsed'}`}>
            {/* Header */}
            <div className="sb-header">
                <div className="sb-logo">SB</div>
                <span className="sb-brand">Sosa Bulls</span>
                <button
                    className="sb-toggle"
                    onClick={toggleSidebar}
                    title={expandido ? 'Colapsar menú' : 'Expandir menú'}
                    aria-label="Toggle sidebar"
                >
                    {expandido ? (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    )}
                </button>
            </div>

            {/* Nav links */}
            <div className="sb-nav">
                {linksFiltrados.map((link, idx) => {
                    if (link.divider) return <div key={`div-${idx}`} className="sb-divider" />
                    const activo = esActivo(link.to)
                    return (
                        <Link key={link.to} to={link.to} className="sb-link">
                            <div
                                className={`sb-item${activo ? ' active' : ''}`}
                                title={!expandido ? link.label : undefined}
                            >
                                <span className="sb-icon">{ICONS[link.icono]}</span>
                                <span className="sb-label">{link.label}</span>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default Sidebar
