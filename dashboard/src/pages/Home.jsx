import { useState, useEffect } from 'react'
import { getResumen, getVentasSemana, getTopProductos } from '../services/estadisticas'
import { useNavigate } from 'react-router-dom'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

function Home() {
    const [resumen, setResumen] = useState(null)
    const [ventasSemana, setVentasSemana] = useState([])
    const [topProductos, setTopProductos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const navigate = useNavigate()
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        barColor: darkMode ? '#4f46e5' : '#1a1a2e',
        barHover: darkMode ? '#6366f1' : '#2a2a4e',
    }

    useEffect(() => {
        cargarDatos()
        const intervalo = setInterval(cargarDatos, 30000)
        return () => clearInterval(intervalo)
    }, [])

    async function cargarDatos() {
        try {
            const [res, semana, top] = await Promise.all([getResumen(), getVentasSemana(), getTopProductos()])
            setResumen(res); setVentasSemana(semana); setTopProductos(top)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos del resumen.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function formatearGs(numero) { return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}` }
    function formatearFecha(fecha) { return new Date(fecha).toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: '2-digit' }) }
    function alturaBar(valor, max) { return max === 0 ? 0 : Math.max((valor / max) * 100, 2) }
    const maxVenta = Math.max(...ventasSemana.map(v => parseInt(v.total)), 1)

    const tarjetas = [
        { label: 'Ventas del día', valor: formatearGs(resumen?.ventas_hoy?.total || 0), sub: `${resumen?.ventas_hoy?.cantidad || 0} transacciones`, extra: resumen?.ventas_hoy?.ganancia > 0 ? `Ganancia: ${formatearGs(resumen.ventas_hoy.ganancia)}` : null, color: '#10b981', accentBg: darkMode ? '#052e16' : '#f0fdf4', accentText: '#10b981', icono: '📈', ruta: '/ventas' },
        { label: 'Pendientes de pago', valor: resumen?.pendientes || 0, sub: 'requieren confirmación', color: '#f59e0b', accentBg: darkMode ? '#451a03' : '#fffbeb', accentText: '#f59e0b', icono: '⏳', ruta: '/ventas?estado=pendiente_pago' },
        { label: 'Deliveries activos', valor: resumen?.deliveries || 0, sub: 'en proceso', color: '#3b82f6', accentBg: darkMode ? '#0c1a3a' : '#eff6ff', accentText: '#3b82f6', icono: '🚚', ruta: '/delivery' },
        { label: 'Chats esperando', valor: resumen?.esperando_agente || 0, sub: 'requieren atención', color: '#ef4444', accentBg: darkMode ? '#450a0a' : '#fef2f2', accentText: '#ef4444', icono: '💬', ruta: '/chat' },
    ]

    if (cargando) return (
        <div style={{ padding: '32px', background: s.bg, color: s.text, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: s.textMuted }}>Cargando panel...</p>
        </div>
    )

    return (
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Resumen de Actividad</h2>
                    <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px' }}>
                        {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={cargarDatos}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}
                >
                    ↻ Actualizar
                </button>
            </div>

            {/* Tarjetas métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {tarjetas.map((t, i) => (
                    <div key={i} onClick={() => navigate(t.ruta)}
                        style={{ background: s.surface, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                                {t.icono}
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

            {/* Gráfico + Alertas */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>

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
                        <>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '180px' }}>
                                {ventasSemana.map((dia, i) => {
                                    const esHoy = i === ventasSemana.length - 1
                                    return (
                                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                            <p style={{ fontSize: '9px', color: s.textFaint, textAlign: 'center' }}>
                                                {formatearGs(dia.total).replace('Gs. ', '')}
                                            </p>
                                            <div
                                                style={{ width: '100%', height: `${alturaBar(parseInt(dia.total), maxVenta)}%`, background: esHoy ? s.barColor : `${s.barColor}40`, borderRadius: '4px 4px 0 0', minHeight: '4px', transition: 'height 0.3s ease, background 0.2s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = s.barColor}
                                                onMouseLeave={e => e.currentTarget.style.background = esHoy ? s.barColor : `${s.barColor}40`}
                                                title={`${formatearGs(dia.total)} — ${dia.cantidad} ventas`}
                                            />
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                {ventasSemana.map((dia, i) => (
                                    <span key={i} style={{ flex: 1, fontSize: '10px', color: i === ventasSemana.length - 1 ? s.text : s.textFaint, textAlign: 'center', fontWeight: i === ventasSemana.length - 1 ? '700' : '400' }}>
                                        {formatearFecha(dia.fecha).split(',')[0].toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Alertas de inventario */}
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Alertas de inventario</h3>
                        {resumen?.stock_bajo?.length > 0 && (
                            <span style={{ padding: '2px 10px', background: '#fee2e2', color: '#991b1b', fontSize: '10px', fontWeight: '800', borderRadius: '20px', textTransform: 'uppercase' }}>
                                {resumen.stock_bajo.length} críticos
                            </span>
                        )}
                    </div>

                    {!resumen?.stock_bajo?.length ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textMuted, fontSize: '13px', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '24px' }}>✅</span>
                            <p>Todo el stock en orden</p>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '220px' }}>
                            {resumen.stock_bajo.map((item, i) => (
                                <div key={i} onClick={() => navigate('/inventario')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', border: `1px solid transparent`, transition: 'all 0.15s', background: s.surfaceLow }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = darkMode ? '#1e3a5f20' : '#f0f4ff' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = s.surfaceLow }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: item.stock === 0 ? '#fee2e2' : '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>
                                        {item.stock === 0 ? '🚫' : '⚠️'}
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
                        </div>
                    )}

                    <button onClick={() => navigate('/inventario')}
                        style={{ marginTop: '16px', padding: '10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        Ver inventario completo
                    </button>
                </div>
            </div>

            {/* Top productos */}
            <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Productos más vendidos del mes</h3>
                    <button onClick={() => navigate('/reportes')}
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
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendidos</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ganancia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProductos.map((prod, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${s.border}`, transition: 'background 0.1s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '14px 24px' }}>
                                        <span style={{
                                            width: '28px', height: '28px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fde8d8' : s.surfaceLow,
                                            color: i === 0 ? '#92400e' : i === 1 ? '#475569' : i === 2 ? '#9a3412' : s.textMuted,
                                            fontSize: '11px', fontWeight: '800'
                                        }}>
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