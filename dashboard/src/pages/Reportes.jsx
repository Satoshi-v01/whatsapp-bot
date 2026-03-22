import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getMarcas, getCategorias } from '../services/productos'
import { getReporte } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'
import { getMetricas, getVentasPorDia, getVentasPorCanal, getRankingProductos, getTopClientes, getDeliveryZonas } from '../services/estadisticas'
import { useApp } from '../App'

function Reportes() {
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#334155' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        inputBg: darkMode ? '#0f172a' : 'white',
        rowHover: darkMode ? '#1a2536' : '#f8fafc',
        barColor: darkMode ? '#4f46e5' : '#1a1a2e',
        barTrack: darkMode ? '#334155' : '#f1f5f9',
    }

    const [periodo, setPeriodo] = useState('mes')
    const [canal, setCanal] = useState('')
    const [marcaId, setMarcaId] = useState('')
    const [categoriaId, setCategoriaId] = useState('')
    const [marcas, setMarcas] = useState([])
    const [categorias, setCategorias] = useState([])
    const [exportDesde, setExportDesde] = useState('')
    const [exportHasta, setExportHasta] = useState('')
    const [exportCanal, setExportCanal] = useState('')
    const [exportando, setExportando] = useState(false)
    const [metricas, setMetricas] = useState(null)
    const [ventasPorDia, setVentasPorDia] = useState([])
    const [ventasPorCanal, setVentasPorCanal] = useState([])
    const [rankingProductos, setRankingProductos] = useState({ top: [], bottom: [] })
    const [topClientes, setTopClientes] = useState([])
    const [deliveryZonas, setDeliveryZonas] = useState({ por_zona: [], clientes_por_zona: [], total_delivery_periodo: 0 })

    useEffect(() => { cargarFiltros() }, [])
    useEffect(() => { cargarDatos() }, [periodo, canal, marcaId, categoriaId])

    async function cargarFiltros() {
        try {
            const [mrcs, cats] = await Promise.all([getMarcas(), getCategorias()])
            setMarcas(mrcs); setCategorias(cats)
        } catch (err) {}
    }

    async function cargarDatos() {
        try {
            setCargando(true)
            const params = { periodo }
            if (canal) params.canal = canal
            if (marcaId) params.marca_id = marcaId
            if (categoriaId) params.categoria_id = categoriaId
            const [met, dias, canales, ranking, clientes, delZonas] = await Promise.all([
                getMetricas(params), getVentasPorDia({ periodo, canal }),
                getVentasPorCanal({ periodo }), getRankingProductos({ periodo }),
                getTopClientes({ periodo }), getDeliveryZonas({ periodo })
            ])
            setMetricas(met); setVentasPorDia(dias); setVentasPorCanal(canales)
            setRankingProductos(ranking); setTopClientes(clientes); setDeliveryZonas(delZonas)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function handleExportarExcel() {
        if (!exportDesde || !exportHasta) {
            setModalConfirmar({ titulo: 'Falta el período', mensaje: 'Seleccioná la fecha desde y hasta para exportar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        try {
            setExportando(true)
            const params = { fecha_desde: exportDesde, fecha_hasta: exportHasta + 'T23:59:59' }
            if (exportCanal) params.canal = exportCanal
            const datos = await getReporte(params)
            if (datos.length === 0) {
                setModalConfirmar({ titulo: 'Sin datos', mensaje: 'No hay ventas en el período seleccionado.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                return
            }
            const filas = datos.map(v => ({
                'Fecha': new Date(v.fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                'Cliente': v.cliente || 'Cliente', 'RUC': v.ruc || '', 'Teléfono': v.telefono || '',
                'Marca': v.marca || '', 'Producto': v.producto || '', 'Presentación': v.presentacion || '',
                'Cantidad': v.cantidad, 'Monto (Gs.)': parseInt(v.monto), 'IVA 10% (Gs.)': parseInt(v.iva),
                'Canal': v.canal || '', 'Método de pago': v.metodo_pago || '', 'Estado': v.estado || ''
            }))
            filas.push({ 'Presentación': 'TOTAL', 'Cantidad': datos.reduce((s, v) => s + parseInt(v.cantidad), 0), 'Monto (Gs.)': datos.reduce((s, v) => s + parseInt(v.monto), 0), 'IVA 10% (Gs.)': datos.reduce((s, v) => s + parseInt(v.iva), 0) })
            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(filas)
            ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 15 }, { wch: 16 }, { wch: 12 }]
            XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
            XLSX.writeFile(wb, `reporte_ventas_${exportDesde}_${exportHasta}.xlsx`)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo generar el reporte.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportando(false) }
    }

    function formatearGs(n) { return `Gs. ${parseInt(n || 0).toLocaleString('es-PY')}` }
    function formatearFecha(f) { return new Date(f).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }) }
    function iniciales(n) { if (!n) return 'CF'; return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
    function labelCanal(c) { return { en_tienda: '🏪 Tienda', whatsapp_bot: '🤖 WA Bot', whatsapp: '💬 WhatsApp', whatsapp_delivery: '🚚 Delivery', pagina_web: '🌐 Web', presencial: '🏪 Presencial', otro: '📋 Otro' }[c] || c }

    const coloresCanal = ['#1a1a2e', '#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#94a3b8']
    const maxVenta = Math.max(...ventasPorDia.map(v => parseInt(v.total)), 1)
    const totalCanal = ventasPorCanal.reduce((sum, c) => sum + parseInt(c.total), 0)
    const periodos = [{ valor: 'hoy', label: 'Hoy' }, { valor: 'semana', label: 'Semana' }, { valor: 'mes', label: 'Mes' }, { valor: 'anual', label: 'Año' }]

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }

    const RankingTable = ({ titulo, datos, colorVentas }) => (
        <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.borderLight}` }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: colorVentas || s.text }}>{titulo}</h3>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: s.surfaceLow }}>
                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Producto</th>
                            <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Ventas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {datos.map((p, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {colorVentas ? (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fca5a5', flexShrink: 0 }} />
                                        ) : (
                                            <span style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fde8d8' : s.surfaceLow, color: i === 0 ? '#92400e' : i === 1 ? '#475569' : i === 2 ? '#9a3412' : s.textFaint, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>{i + 1}</span>
                                        )}
                                        <div>
                                            <p style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{p.marca && `${p.marca} — `}{p.producto}</p>
                                            <p style={{ fontSize: '10px', color: s.textFaint }}>{p.presentacion}</p>
                                        </div>
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: colorVentas || s.text }}>{p.cantidad_vendida}</td>
                            </tr>
                        ))}
                        {datos.length === 0 && <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: s.textFaint, fontSize: '13px' }}>Sin datos</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    )

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', background: s.bg, minHeight: '100%' }}>

            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Reportes de Operación</h1>
                <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px' }}>Análisis detallado de rendimiento comercial y financiero.</p>
            </div>

            {/* Filtros */}
            <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div>
                        <label style={labelStyle}>Período</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {periodos.map(p => (
                                <button key={p.valor} onClick={() => setPeriodo(p.valor)}
                                    style={{ flex: 1, padding: '6px 4px', borderRadius: '8px', border: '1px solid', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: periodo === p.valor ? '#1a1a2e' : s.inputBg, color: periodo === p.valor ? 'white' : s.textMuted, borderColor: periodo === p.valor ? '#1a1a2e' : s.border }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={labelStyle}>Canal</label>
                        <select value={canal} onChange={e => setCanal(e.target.value)} style={inputStyle}>
                            <option value="">Todos los canales</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Marca</label>
                        <select value={marcaId} onChange={e => setMarcaId(e.target.value)} style={inputStyle}>
                            <option value="">Todas las marcas</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Categoría</label>
                        <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} style={inputStyle}>
                            <option value="">Todas las categorías</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Métricas */}
            {metricas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Total vendido', valor: formatearGs(metricas.total), sub: `${metricas.cantidad} transacciones`, color: s.text, accent: '#1a1a2e' },
                        { label: 'Ganancia neta', valor: formatearGs(metricas.ganancia), sub: 'margen estimado', color: '#10b981' },
                        { label: 'IVA generado', valor: formatearGs(metricas.iva_total), sub: 'Total ÷ 11', color: s.text },
                        { label: 'Ticket promedio', valor: formatearGs(metricas.ticket_promedio), sub: 'por transacción', color: s.text },
                        { label: 'Ventas', valor: metricas.cantidad, sub: 'transacciones totales', color: s.text },
                    ].map((m, i) => (
                        <div key={i} style={{ background: s.surface, padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: i === 0 ? '4px solid #1a1a2e' : 'none' }}>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{m.label}</p>
                            <p style={{ fontSize: '22px', fontWeight: '800', color: m.color || s.text }}>{m.valor}</p>
                            <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '4px' }}>{m.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '24px' }}>Ventas por día</h3>
                    {ventasPorDia.length === 0 ? (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textFaint, fontSize: '13px' }}>Sin datos en este período</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '200px' }}>
                            {ventasPorDia.map((dia, i) => {
                                const altura = Math.max((parseInt(dia.total) / maxVenta) * 100, 2)
                                return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                        <div style={{ fontSize: '9px', color: s.textFaint, textAlign: 'center' }}>{formatearGs(dia.total).replace('Gs. ', '')}</div>
                                        <div style={{ width: '100%', height: `${altura}%`, background: s.barColor, borderRadius: '4px 4px 0 0', minHeight: '4px', transition: 'height 0.3s ease' }} title={`${formatearGs(dia.total)} — ${dia.cantidad} ventas`} />
                                        <p style={{ fontSize: '9px', color: s.textMuted, textAlign: 'center' }}>{formatearFecha(dia.fecha)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '20px' }}>Ventas por canal</h3>
                    {ventasPorCanal.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textFaint, fontSize: '13px', height: '150px' }}>Sin datos</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ventasPorCanal.map((c, i) => {
                                const pct = totalCanal > 0 ? Math.round((parseInt(c.total) / totalCanal) * 100) : 0
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '12px', color: s.text, fontWeight: '500' }}>{labelCanal(c.canal)}</span>
                                            <span style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>{pct}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: s.barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${pct}%`, background: coloresCanal[i % coloresCanal.length], borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                        </div>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '2px' }}>{formatearGs(c.total)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Rankings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <RankingTable titulo="⭐ Top 10 Productos" datos={rankingProductos.top} />
                <RankingTable titulo="📉 Menos vendidos" datos={rankingProductos.bottom} colorVentas="#ef4444" />

                {/* Top clientes */}
                <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.borderLight}` }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: s.text }}>👤 Top Clientes</h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: s.surfaceLow }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Cliente</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topClientes.map((c, i) => (
                                    <tr key={i} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                        onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                        onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                                                    {iniciales(c.cliente)}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{c.cliente}</p>
                                                    <p style={{ fontSize: '10px', color: s.textFaint }}>{c.cantidad_compras} compras</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: s.text }}>{formatearGs(c.total_comprado)}</td>
                                    </tr>
                                ))}
                                {topClientes.length === 0 && <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: s.textFaint, fontSize: '13px' }}>Sin datos</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Sección Delivery */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '800', color: s.text }}>Delivery por zonas</h2>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>
                            Total recaudado en costos de delivery: <strong style={{ color: s.text }}>{formatearGs(deliveryZonas.total_delivery_periodo)}</strong>
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* Pedidos y recaudación por zona */}
                    <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${s.borderLight}` }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: s.text }}>Pedidos por zona</h3>
                            <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>Cantidad de deliveries y recaudacion por zona</p>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: '360px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: s.surfaceLow }}>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Zona</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Pedidos</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Delivery</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Ventas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryZonas.por_zona.length === 0 ? (
                                        <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: s.textFaint, fontSize: '13px' }}>Sin datos en este período</td></tr>
                                    ) : deliveryZonas.por_zona.map((z, i) => (
                                        <tr key={i} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                            onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: coloresCanal[i % coloresCanal.length], flexShrink: 0 }} />
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{z.zona}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: s.text }}>{z.cantidad_pedidos}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#10b981' }}>{formatearGs(z.total_delivery)}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', color: s.textMuted }}>{formatearGs(z.total_ventas)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Clientes por zona */}
                    <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${s.borderLight}` }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: s.text }}>Clientes por zona</h3>
                            <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>Distribucion de clientes activos e inactivos por ciudad</p>
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: '360px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: s.surfaceLow }}>
                                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Ciudad</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Total</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Activos</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase' }}>Inactivos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryZonas.clientes_por_zona.length === 0 ? (
                                        <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: s.textFaint, fontSize: '13px' }}>Sin datos de ciudades</td></tr>
                                    ) : deliveryZonas.clientes_por_zona.map((z, i) => {
                                        const pctActivos = z.total_clientes > 0 ? Math.round((z.clientes_activos / z.total_clientes) * 100) : 0
                                        return (
                                            <tr key={i} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                                onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{z.zona}</p>
                                                    <div style={{ marginTop: '4px', height: '4px', background: s.barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pctActivos}%`, background: '#10b981', borderRadius: '4px' }} />
                                                    </div>
                                                    <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '2px' }}>{pctActivos}% activos</p>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '800', color: s.text }}>{z.total_clientes}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#10b981' }}>{z.clientes_activos}</td>
                                                <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>{z.clientes_inactivos}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exportar */}
            <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '16px' }}>📊 Exportar reporte contable</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                    <div><label style={labelStyle}>Desde</label><input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Hasta</label><input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)} style={inputStyle} /></div>
                    <div>
                        <label style={labelStyle}>Canal (opcional)</label>
                        <select value={exportCanal} onChange={e => setExportCanal(e.target.value)} style={inputStyle}>
                            <option value="">Todos</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <button onClick={handleExportarExcel} disabled={exportando}
                        style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: exportando ? '#94a3b8' : '#10b981', color: 'white', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {exportando ? 'Generando...' : '⬇ Exportar Excel'}
                    </button>
                </div>
                <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '12px' }}>
                    El reporte incluye: fecha, cliente, RUC, producto, presentación, cantidad, monto, IVA 10%, canal y método de pago.
                </p>
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

export default Reportes