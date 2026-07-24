import { useState, useEffect } from 'react'
import { getResumen, getVentasSemana, getTopProductos } from '../services/estadisticas'
import { getReportes } from '../services/proveedores'
import { getResumenOrdenes } from '../services/ordenes'
import { getAlertasLotes } from '../services/lotes'
import { useNavigate } from 'react-router-dom'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'
import GraficoTendenciaVentas from '../components/GraficoTendenciaVentas'

function Home() {
    const [resumen, setResumen] = useState(null)
    const [ventasSemana, setVentasSemana] = useState([])
    const [topProductos, setTopProductos] = useState([])
    const [reportesProveedores, setReportesProveedores] = useState(null)
    const [ordenesResumen, setOrdenesResumen] = useState(null)
    const [alertasLotes, setAlertasLotes] = useState({ proximos_vencer: [], vencidos: [] })
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const navigate = useNavigate()
    const { darkMode } = useApp()
    const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuario') || '{}') } catch { return {} } })()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        barColor: darkMode ? '#4f46e5' : '#1a1a2e',
    }

    useEffect(() => {
        cargarDatos()
        const intervalo = setInterval(cargarDatos, 30000)
        return () => clearInterval(intervalo)
    }, [])

    async function cargarDatos() {
        try {
            const [res, semana, top, reportes, ordenes, alertas] = await Promise.all([
                getResumen(),
                getVentasSemana(),
                getTopProductos(),
                getReportes({ periodo: 'mes' }).catch(() => null),
                getResumenOrdenes().catch(() => null),
                getAlertasLotes(60).catch(() => ({ proximos_vencer: [], vencidos: [] }))
            ])
            setResumen(res)
            setVentasSemana(Array.isArray(semana) ? semana : [])
            setTopProductos(Array.isArray(top) ? top : [])
            setReportesProveedores(reportes)
            setOrdenesResumen(ordenes)
            setAlertasLotes(alertas || { proximos_vencer: [], vencidos: [] })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos del resumen.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function formatearGs(numero) { return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}` }

    const proximasVencer = reportesProveedores?.proximas_vencer || []
    const facturasVencidas = reportesProveedores?.vencidas || []

    function diasParaVencer(fecha) {
        if (!fecha) return null
        return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
    }

    // Urgencia real, no solo el mismo amarillo para todo: vence hoy/mañana pesa
    // distinto que vence en 10 días, aunque las dos esten en la misma lista.
    function colorUrgencia(dias) {
        if (dias <= 1) return { bg: darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2', text: '#ef4444' }
        if (dias <= 4) return { bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', text: '#b45309' }
        return { bg: darkMode ? 'rgba(100,116,139,0.15)' : '#f1f5f9', text: s.textMuted }
    }
    function etiquetaDias(dias) {
        if (dias <= 0) return 'Hoy'
        if (dias === 1) return 'Mañana'
        return `En ${dias}d`
    }

    const tarjetas = [
        { label: 'Ventas del día', valor: formatearGs(resumen?.ventas_hoy?.total || 0), sub: `${resumen?.ventas_hoy?.cantidad || 0} transacciones`, extra: resumen?.ventas_hoy?.ganancia > 0 ? `Ganancia: ${formatearGs(resumen.ventas_hoy.ganancia)}` : null, color: '#10b981', accentBg: darkMode ? '#052e16' : '#f0fdf4', accentText: '#10b981', icono: 'trend', ruta: '/dashboard/ventas' },
        { label: 'Pendientes de pago', valor: resumen?.pendientes || 0, sub: 'requieren confirmación', color: '#f59e0b', accentBg: darkMode ? '#451a03' : '#fffbeb', accentText: '#f59e0b', icono: 'clock', ruta: '/dashboard/ventas?estado=pendiente_pago' },
        { label: 'Ordenes pendientes', valor: ordenesResumen?.pendientes ?? '—', sub: 'sin confirmar', color: ordenesResumen?.pendientes > 0 ? '#f59e0b' : '#10b981', accentBg: ordenesResumen?.pendientes > 0 ? (darkMode ? '#451a03' : '#fffbeb') : (darkMode ? '#052e16' : '#f0fdf4'), accentText: ordenesResumen?.pendientes > 0 ? '#f59e0b' : '#10b981', icono: 'bag', ruta: '/dashboard/ordenes' },
        { label: 'Deliveries activos', valor: resumen?.deliveries || 0, sub: 'en proceso', color: '#3b82f6', accentBg: darkMode ? '#0c1a3a' : '#eff6ff', accentText: '#3b82f6', icono: 'truck', ruta: '/dashboard/delivery' },
        { label: 'Chats esperando', valor: resumen?.esperando_agente || 0, sub: 'requieren atención', color: '#ef4444', accentBg: darkMode ? '#450a0a' : '#fef2f2', accentText: '#ef4444', icono: 'chat', ruta: '/dashboard/chat' },
    ]

    if (cargando) return (
        <div style={{ padding: '32px', background: s.bg, color: s.text, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: s.textMuted }}>Cargando panel...</p>
        </div>
    )

    return (
        <div className="page-scroll" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div className="home-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <p style={{ fontSize: '12px', color: s.textFaint, marginBottom: '6px', textTransform: 'capitalize' }}>
                        {new Date().toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <h2 style={{ fontSize: '26px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>
                        Bienvenido{usuario.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''}
                    </h2>
                    <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px', fontWeight: '400' }}>
                        Este es el resumen de actividad de hoy.
                    </p>
                </div>
                <button onClick={cargarDatos}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                    ↻ Actualizar
                </button>
            </div>

            {/* Alertas facturas proveedores */}
            {(facturasVencidas.length > 0 || proximasVencer.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Vencidas */}
                    {facturasVencidas.length > 0 && (
                        <div style={{ background: darkMode ? 'rgba(239,68,68,0.1)' : '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#ef4444', display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></span>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#991b1b' }}>
                                        {facturasVencidas.length} factura{facturasVencidas.length !== 1 ? 's' : ''} vencida{facturasVencidas.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button onClick={() => navigate('/dashboard/proveedores')}
                                    style={{ fontSize: '12px', fontWeight: '600', color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Ver todas →
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {facturasVencidas.slice(0, 3).map(f => (
                                    <div key={f.id} onClick={() => navigate('/dashboard/proveedores')}
                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: darkMode ? 'rgba(239,68,68,0.08)' : 'white', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fca5a5' }}
                                        onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'}
                                        onMouseLeave={e => e.currentTarget.style.background = darkMode ? 'rgba(239,68,68,0.08)' : 'white'}>
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{f.proveedor_nombre} — {f.numero_factura}</p>
                                            <p style={{ fontSize: '11px', color: '#ef4444' }}>Venció el {formatearSoloFecha(f.fecha_vencimiento)} · {f.dias_vencida} día{f.dias_vencida !== 1 ? 's' : ''} vencida</p>
                                        </div>
                                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#ef4444', flexShrink: 0 }}>Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                    </div>
                                ))}
                                {facturasVencidas.length > 3 && (
                                    <p style={{ fontSize: '11px', color: '#ef4444', textAlign: 'center', fontWeight: '600' }}>
                                        +{facturasVencidas.length - 3} más vencidas
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Próximas a vencer */}
                    {proximasVencer.length > 0 && (
                        <div style={{ background: darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '14px 18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#f59e0b', display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#92400e' }}>
                                        {proximasVencer.length} factura{proximasVencer.length !== 1 ? 's' : ''} próxima{proximasVencer.length !== 1 ? 's' : ''} a vencer
                                    </p>
                                </div>
                                <button onClick={() => navigate('/dashboard/proveedores')}
                                    style={{ fontSize: '12px', fontWeight: '600', color: '#92400e', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Ver todas →
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {proximasVencer.slice(0, 3).map(f => {
                                    const dias = diasParaVencer(f.fecha_vencimiento)
                                    const urgencia = colorUrgencia(dias)
                                    return (
                                        <div key={f.id} onClick={() => navigate('/dashboard/proveedores')}
                                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: darkMode ? 'rgba(245,158,11,0.08)' : 'white', borderRadius: '8px', cursor: 'pointer', border: '1px solid #fde68a' }}
                                            onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7'}
                                            onMouseLeave={e => e.currentTarget.style.background = darkMode ? 'rgba(245,158,11,0.08)' : 'white'}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: '800', padding: '3px 8px', borderRadius: '20px', background: urgencia.bg, color: urgencia.text, whiteSpace: 'nowrap' }}>
                                                    {etiquetaDias(dias)}
                                                </span>
                                                <div style={{ minWidth: 0 }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p style={{ fontSize: '11px', color: '#f59e0b' }}>Vence el {formatearSoloFecha(f.fecha_vencimiento)}</p>
                                                </div>
                                            </div>
                                            <p style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', flexShrink: 0, marginLeft: '10px' }}>Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                        </div>
                                    )
                                })}
                                {proximasVencer.length > 3 && (
                                    <p style={{ fontSize: '11px', color: '#f59e0b', textAlign: 'center', fontWeight: '600' }}>
                                        +{proximasVencer.length - 3} más próximas a vencer
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tarjetas métricas */}
            <div className="home-tarjetas" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                {tarjetas.map((t, i) => (
                    <div key={i} onClick={() => navigate(t.ruta)}
                        style={{ background: s.surface, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.accentText }}>
                                {t.icono === 'trend' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
                                {t.icono === 'clock' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                                {t.icono === 'bag' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                                {t.icono === 'truck' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                                {t.icono === 'chat' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
                            </div>
                            {t.extra && (
                                <span style={{ fontSize: '11px', fontWeight: '600', color: t.accentText, background: t.accentBg, padding: '2px 8px', borderRadius: '20px' }}>
                                    {t.extra.replace('Ganancia: ', '+')}
                                </span>
                            )}
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{t.label}</p>
                        <p style={{ fontSize: '26px', fontWeight: '800', color: t.color, letterSpacing: '-0.5px' }}>{t.valor}</p>
                        <p style={{ fontSize: '12px', color: s.textFaint, marginTop: '4px' }}>{t.sub}</p>
                    </div>
                ))}
            </div>

            {/* Gráfico + Alertas inventario */}
            <div className="home-charts" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

                {/* Gráfico barras */}
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Ventas recientes</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.barColor }} />
                            <span style={{ fontSize: '11px', color: s.textMuted }}>Últimos 7 días</span>
                        </div>
                    </div>
                    {ventasSemana.length === 0 ? (
                        <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textMuted, fontSize: '13px' }}>Sin datos</div>
                    ) : (
                        <GraficoTendenciaVentas datos={ventasSemana} colorLinea={s.barColor} colorTexto={s.text} colorTextoMuted={s.textMuted} colorGrid={s.border} colorFondo={s.surface} maxEtiquetas={ventasSemana.length} resaltarHoy />
                    )}
                </div>

                {/* Alertas de inventario */}
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Alertas de inventario</h3>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {resumen?.stock_bajo?.length > 0 && (
                                <span style={{ padding: '2px 10px', background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: '800', borderRadius: '20px', textTransform: 'uppercase' }}>
                                    {resumen.stock_bajo.length} sin stock
                                </span>
                            )}
                            {alertasLotes.vencidos.length > 0 && (
                                <span style={{ padding: '2px 10px', background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: '800', borderRadius: '20px', textTransform: 'uppercase' }}>
                                    {alertasLotes.vencidos.length} vencidos
                                </span>
                            )}
                            {alertasLotes.proximos_vencer.length > 0 && (
                                <span style={{ padding: '2px 10px', background: '#fffbeb', color: '#92400e', fontSize: '10px', fontWeight: '800', borderRadius: '20px', textTransform: 'uppercase' }}>
                                    {alertasLotes.proximos_vencer.length} a vencer
                                </span>
                            )}
                        </div>
                    </div>

                    {!resumen?.stock_bajo?.length && !alertasLotes.proximos_vencer.length && !alertasLotes.vencidos.length ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textMuted, fontSize: '13px', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>✅</span>
                            <p>Todo el inventario en orden</p>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', maxHeight: '280px' }}>
                            {/* Stock bajo */}
                            {resumen?.stock_bajo?.length > 0 && (
                                <>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Stock bajo</p>
                                    {resumen.stock_bajo.map((item, i) => (
                                        <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid transparent`, transition: 'all 0.15s', background: s.surfaceLow }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = darkMode ? '#1e3a5f20' : '#f0f4ff' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = s.surfaceLow }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.stock === 0 ? '#fee2e2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: item.stock === 0 ? '#ef4444' : '#f59e0b' }}>
                                                {item.stock === 0
                                                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                }
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</p>
                                                <p style={{ fontSize: '11px', color: s.textMuted }}>{item.presentacion}</p>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: item.stock === 0 ? '#ef4444' : '#f59e0b', flexShrink: 0 }}>
                                                {item.stock === 0 ? 'Sin stock' : `${item.stock} ud.`}
                                            </span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Lotes vencidos */}
                            {alertasLotes.vencidos.length > 0 && (
                                <>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: resumen?.stock_bajo?.length ? '8px' : '0', marginBottom: '2px' }}>Lotes vencidos</p>
                                    {alertasLotes.vencidos.map((lote, i) => (
                                        <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid transparent`, transition: 'all 0.15s', background: s.surfaceLow }}
                                            onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = darkMode ? '#1e3a5f20' : '#f0f4ff' }}
                                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = s.surfaceLow }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#fee2e220', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#ef4444' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '12px', fontWeight: '600', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lote.producto_nombre}</p>
                                                <p style={{ fontSize: '11px', color: s.textMuted }}>{lote.presentacion_nombre} · {lote.stock_actual} ud. · Vencido hace {lote.dias_vencido}d</p>
                                            </div>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', flexShrink: 0 }}>Vencido</span>
                                        </div>
                                    ))}
                                </>
                            )}

                            {/* Lotes próximos a vencer */}
                            {alertasLotes.proximos_vencer.length > 0 && (
                                <>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: (resumen?.stock_bajo?.length || alertasLotes.vencidos.length) ? '8px' : '0', marginBottom: '2px' }}>Próximos a vencer</p>
                                    {alertasLotes.proximos_vencer.map((lote, i) => {
                                        const dias = parseInt(lote.dias_para_vencer)
                                        const color = dias <= 7 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#6366f1'
                                        return (
                                            <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid transparent`, transition: 'all 0.15s', background: s.surfaceLow }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = darkMode ? '#1e3a5f20' : '#f0f4ff' }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = s.surfaceLow }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lote.producto_nombre}</p>
                                                    <p style={{ fontSize: '11px', color: s.textMuted }}>{lote.presentacion_nombre} · {lote.stock_actual} ud.{lote.numero_lote ? ` · Lote ${lote.numero_lote}` : ''}</p>
                                                </div>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                    {dias === 0 ? 'Hoy' : `${dias}d`}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </>
                            )}
                        </div>
                    )}

                    <button onClick={() => navigate('/dashboard/inventario')}
                        style={{ marginTop: '16px', padding: '10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        Ver inventario completo
                    </button>
                </div>
            </div>

            {/* Top productos */}
            <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Productos más vendidos del mes</h3>
                    <button onClick={() => navigate('/dashboard/reportes')}
                        style={{ fontSize: '13px', color: '#4f46e5', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Ver reportes
                    </button>
                </div>

                {topProductos.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: s.textMuted, fontSize: '13px' }}>Sin datos para mostrar.</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: s.surfaceLow }}>
                                {['#', 'Producto', 'Vendidos', 'Total', 'Ganancia'].map((h, i) => (
                                    <th key={i} style={{ padding: '12px 24px', textAlign: i >= 2 ? 'right' : 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {topProductos.map((prod, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${s.border}`, transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 24px' }}>
                                        <span style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fde8d8' : s.surfaceLow, color: i === 0 ? '#92400e' : i === 1 ? '#475569' : i === 2 ? '#9a3412' : s.textMuted, fontSize: '11px', fontWeight: '800' }}>
                                            {i + 1}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 16px' }}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{prod.producto}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{prod.presentacion}</p>
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '700', color: s.text }}>{prod.cantidad_vendida}</td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: '13px', color: s.text }}>{formatearGs(prod.total_generado)}</td>
                                    <td style={{ padding: '14px 24px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#10b981' }}>
                                        {prod.ganancia_generada > 0 ? formatearGs(prod.ganancia_generada) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

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

export default Home