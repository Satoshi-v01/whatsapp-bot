import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getMarcas, getCategorias } from '../services/productos'
import { getReporte } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'
import { getMetricas, getVentasPorDia, getVentasPorCanal, getRankingProductos, getTopClientes, getDeliveryZonas, getComparativas, getClientesRetencion, getRentabilidad } from '../services/estadisticas'

function Reportes() {
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const { darkMode } = useApp()
    const [comparativas, setComparativas] = useState(null)
    const [retencion, setRetencion] = useState(null)
    const [rentabilidad, setRentabilidad] = useState(null)
    const [agruparRentabilidad, setAgruparRentabilidad] = useState('producto')

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
    const [statsDesde, setStatsDesde] = useState('')
    const [statsHasta, setStatsHasta] = useState('')
    const [exportandoStats, setExportandoStats] = useState(false)
    const [deliveryZonas, setDeliveryZonas] = useState({ por_zona: [], clientes_por_zona: [], total_delivery_periodo: 0 })

    useEffect(() => { cargarFiltros() }, [])
    useEffect(() => { cargarDatos() }, [periodo, canal, marcaId, categoriaId])
    useEffect(() => {
        if (rentabilidad) {
            getRentabilidad({ periodo, agrupar: agruparRentabilidad }).then(setRentabilidad).catch(() => {})
        }
    }, [agruparRentabilidad])

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
            const [met, dias, canales, ranking, clientes, delZonas, comp, ret, rent] = await Promise.all([
                getMetricas(params), getVentasPorDia({ periodo, canal }),
                getVentasPorCanal({ periodo }), getRankingProductos({ periodo }),
                getTopClientes({ periodo }), getDeliveryZonas({ periodo }),
                getComparativas({ periodo }), getClientesRetencion({ periodo }),
                getRentabilidad({ periodo, agrupar: agruparRentabilidad })
            ])
            setMetricas(met); setVentasPorDia(dias); setVentasPorCanal(canales)
            setRankingProductos(ranking); setTopClientes(clientes); setDeliveryZonas(delZonas)
            setComparativas(comp); setRetencion(ret); setRentabilidad(rent)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

        async function handleExportarEstadisticas() {
        if (!statsDesde || !statsHasta) {
            setModalConfirmar({ titulo: 'Falta el período', mensaje: 'Seleccioná la fecha desde y hasta.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        try {
            setExportandoStats(true)

            const params = { periodo: 'personalizado', fecha_desde: statsDesde, fecha_hasta: statsHasta }
            const [met, comp, ranking, clientes, canales, delZonas] = await Promise.all([
                getMetricas({ ...params }),
                getComparativas({ periodo: 'mes' }),
                getRankingProductos({ ...params }),
                getTopClientes({ ...params }),
                getVentasPorCanal({ ...params }),
                getDeliveryZonas({ ...params })
            ])

            const wb = XLSX.utils.book_new()

            // Hoja 1 — Resumen general
            const wsResumen = XLSX.utils.json_to_sheet([
                { 'Métrica': 'Total vendido (Gs.)', 'Valor': parseInt(met.total || 0) },
                { 'Métrica': 'Cantidad de ventas', 'Valor': parseInt(met.cantidad || 0) },
                { 'Métrica': 'Ganancia neta (Gs.)', 'Valor': parseInt(met.ganancia || 0) },
                { 'Métrica': 'IVA generado (Gs.)', 'Valor': parseInt(met.iva_total || 0) },
                { 'Métrica': 'Ticket promedio (Gs.)', 'Valor': parseInt(met.ticket_promedio || 0) },
            ])
            wsResumen['!cols'] = [{ wch: 30 }, { wch: 20 }]
            XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

            // Hoja 2 — Comparativas
            const wsComp = XLSX.utils.json_to_sheet([
                { 'Comparativa': 'Ventas período actual (Gs.)', 'Actual': parseInt(comp.ventas.actual.total), 'Anterior': parseInt(comp.ventas.anterior.total), 'Variación %': comp.ventas.pct_total },
                { 'Comparativa': 'Cantidad ventas', 'Actual': comp.ventas.actual.cantidad, 'Anterior': comp.ventas.anterior.cantidad, 'Variación %': comp.ventas.pct_cantidad },
                { 'Comparativa': 'Nuevos clientes (primera compra)', 'Actual': comp.nuevos_clientes.actual, 'Anterior': comp.nuevos_clientes.anterior, 'Variación %': comp.nuevos_clientes.pct },
                { 'Comparativa': 'Ventas hoy (Gs.)', 'Actual': parseInt(comp.dia_vs_promedio.hoy), 'Anterior': parseInt(comp.dia_vs_promedio.promedio_diario), 'Variación %': comp.dia_vs_promedio.pct },
            ])
            wsComp['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 14 }]
            XLSX.utils.book_append_sheet(wb, wsComp, 'Comparativas')

            // Hoja 3 — Top productos
            const wsTop = XLSX.utils.json_to_sheet(
                ranking.top.map((p, i) => ({
                    '#': i + 1,
                    'Producto': p.nombre,
                    'Presentación': p.presentacion,
                    'Unidades vendidas': parseInt(p.cantidad_vendida),
                    'Total (Gs.)': parseInt(p.total_ventas),
                    'Ganancia (Gs.)': parseInt(p.ganancia || 0)
                }))
            )
            wsTop['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]
            XLSX.utils.book_append_sheet(wb, wsTop, 'Top Productos')

            // Hoja 4 — Menos vendidos
            const wsBottom = XLSX.utils.json_to_sheet(
                ranking.bottom.map((p, i) => ({
                    '#': i + 1,
                    'Producto': p.nombre,
                    'Presentación': p.presentacion,
                    'Unidades vendidas': parseInt(p.cantidad_vendida),
                    'Total (Gs.)': parseInt(p.total_ventas),
                }))
            )
            wsBottom['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 16 }]
            XLSX.utils.book_append_sheet(wb, wsBottom, 'Menos Vendidos')

            // Hoja 5 — Top clientes
            const wsClientes = XLSX.utils.json_to_sheet(
                clientes.map((c, i) => ({
                    '#': i + 1,
                    'Cliente': c.cliente,
                    'Compras': parseInt(c.cantidad_compras),
                    'Total comprado (Gs.)': parseInt(c.total_comprado)
                }))
            )
            wsClientes['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 10 }, { wch: 22 }]
            XLSX.utils.book_append_sheet(wb, wsClientes, 'Top Clientes')

            // Hoja 6 — Ventas por canal
            const wsCanales = XLSX.utils.json_to_sheet(
                canales.map(c => ({
                    'Canal': labelCanal(c.canal),
                    'Ventas': parseInt(c.cantidad),
                    'Total (Gs.)': parseInt(c.total)
                }))
            )
            wsCanales['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }]
            XLSX.utils.book_append_sheet(wb, wsCanales, 'Por Canal')

            // Hoja 7 — Delivery por zonas
            if (delZonas.por_zona?.length > 0) {
                const wsZonas = XLSX.utils.json_to_sheet(
                    delZonas.por_zona.map(z => ({
                        'Zona': z.zona,
                        'Pedidos': parseInt(z.cantidad_pedidos),
                        'Costo delivery (Gs.)': parseInt(z.total_delivery),
                        'Total ventas (Gs.)': parseInt(z.total_ventas)
                    }))
                )
                wsZonas['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 22 }, { wch: 20 }]
                XLSX.utils.book_append_sheet(wb, wsZonas, 'Delivery por Zonas')
            }

            XLSX.writeFile(wb, `estadisticas_${statsDesde}_${statsHasta}.xlsx`)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo generar el reporte de estadísticas.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportandoStats(false) }
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
    function iniciales(n) { if (!n) return 'CF'; return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2) }
    function labelCanal(c) {
        return {
            bot: 'WhatsApp Bot',
            tienda: 'Tienda / Presencial',
            delivery: 'Delivery',
            web: 'Pagina Web',
            otro: 'Otro'
        }[c] || c
    }
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
        <div className="page-scroll" style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', background: s.bg, minHeight: '100%' }}>

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
                            <option value="bot">WhatsApp Bot</option>
                            <option value="tienda">Tienda / Presencial</option>
                            <option value="delivery">Delivery</option>
                            <option value="web">Pagina Web</option>
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

            {/* Comparativas */}
            {comparativas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>

                    {/* Ventas período actual vs anterior */}
                    {(() => {
                        const pct = comparativas.ventas.pct_total
                        const subida = pct >= 0
                        const labelPeriodo = periodo === 'semana' ? 'semana anterior' : periodo === 'anual' ? 'año anterior' : 'mes anterior'
                        return (
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ventas vs {labelPeriodo}</p>
                                    <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: subida ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'), color: subida ? '#10b981' : '#ef4444' }}>
                                        {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>Este período</p>
                                        <p style={{ fontSize: '20px', fontWeight: '800', color: s.text }}>{formatearGs(comparativas.ventas.actual.total)}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{comparativas.ventas.actual.cantidad} ventas</p>
                                    </div>
                                    <div style={{ borderLeft: `1px solid ${s.border}`, paddingLeft: '20px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>{labelPeriodo}</p>
                                        <p style={{ fontSize: '20px', fontWeight: '800', color: s.textMuted }}>{formatearGs(comparativas.ventas.anterior.total)}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{comparativas.ventas.anterior.cantidad} ventas</p>
                                    </div>
                                </div>
                                <div style={{ height: '6px', background: s.barTrack, borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(Math.abs(pct), 100)}%`, background: subida ? '#10b981' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s' }} />
                                </div>
                                <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '6px' }}>
                                    {subida ? `+${formatearGs(comparativas.ventas.actual.total - comparativas.ventas.anterior.total)} más que el ${labelPeriodo}` : `${formatearGs(comparativas.ventas.anterior.total - comparativas.ventas.actual.total)} menos que el ${labelPeriodo}`}
                                </p>
                            </div>
                        )
                    })()}

                    {/* Nuevos clientes */}
                    {(() => {
                        const pct = comparativas.nuevos_clientes.pct
                        const subida = pct >= 0
                        const labelPeriodo = periodo === 'semana' ? 'semana anterior' : periodo === 'anual' ? 'año anterior' : 'mes anterior'
                        return (
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nuevos clientes vs {labelPeriodo}</p>
                                    <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: subida ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'), color: subida ? '#10b981' : '#ef4444' }}>
                                        {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>Este período</p>
                                        <p style={{ fontSize: '40px', fontWeight: '800', color: '#3b82f6', lineHeight: 1 }}>{comparativas.nuevos_clientes.actual}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>primera compra</p>
                                    </div>
                                    <div style={{ borderLeft: `1px solid ${s.border}`, paddingLeft: '20px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>{labelPeriodo}</p>
                                        <p style={{ fontSize: '40px', fontWeight: '800', color: s.textMuted, lineHeight: 1 }}>{comparativas.nuevos_clientes.anterior}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>primera compra</p>
                                    </div>
                                </div>
                                <div style={{ height: '6px', background: s.barTrack, borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(Math.abs(pct), 100)}%`, background: subida ? '#3b82f6' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s' }} />
                                </div>
                                <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '6px' }}>
                                    {subida
                                        ? `${comparativas.nuevos_clientes.actual - comparativas.nuevos_clientes.anterior} más que el ${labelPeriodo}`
                                        : `${comparativas.nuevos_clientes.anterior - comparativas.nuevos_clientes.actual} menos que el ${labelPeriodo}`}
                                </p>
                            </div>
                        )
                    })()}

                    {/* Hoy vs promedio diario */}
                    {(() => {
                        const pct = comparativas.dia_vs_promedio.pct
                        const subida = pct >= 0
                        return (
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '22px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hoy vs promedio diario</p>
                                    <span style={{ fontSize: '12px', fontWeight: '800', padding: '3px 10px', borderRadius: '20px', background: subida ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2'), color: subida ? '#10b981' : '#ef4444' }}>
                                        {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '20px', marginBottom: '14px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>Hoy</p>
                                        <p style={{ fontSize: '20px', fontWeight: '800', color: s.text }}>{formatearGs(comparativas.dia_vs_promedio.hoy)}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{comparativas.dia_vs_promedio.cantidad_hoy} ventas</p>
                                    </div>
                                    <div style={{ borderLeft: `1px solid ${s.border}`, paddingLeft: '20px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, marginBottom: '4px' }}>Promedio diario</p>
                                        <p style={{ fontSize: '20px', fontWeight: '800', color: s.textMuted }}>{formatearGs(comparativas.dia_vs_promedio.promedio_diario)}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{comparativas.dia_vs_promedio.promedio_cantidad} ventas/día</p>
                                    </div>
                                </div>
                                <div style={{ height: '6px', background: s.barTrack, borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(Math.abs(pct), 100)}%`, background: subida ? '#10b981' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s' }} />
                                </div>
                                <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '6px' }}>
                                    {subida
                                        ? `Por encima del promedio del período`
                                        : `Por debajo del promedio del período`}
                                </p>
                            </div>
                        )
                    })()}
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
                <RankingTable titulo="Top 10 Productos" datos={rankingProductos.top} />
                <RankingTable titulo="Menos vendidos" datos={rankingProductos.bottom} colorVentas="#ef4444" />

                {/* Top clientes */}
                <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.borderLight}` }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: s.text }}>Top Clientes</h3>
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

            {/* Retención de clientes */}
            {retencion && (
                <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: s.text, marginBottom: '16px' }}>Retención de clientes</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 1.5fr', gap: '16px' }}>
                        {[
                            { label: 'Clientes activos', valor: retencion.activos, color: '#3b82f6', desc: 'compraron este período' },
                            { label: 'Clientes retenidos', valor: retencion.retenidos, color: '#10b981', desc: 'volvieron a comprar' },
                            { label: 'Clientes nuevos', valor: retencion.nuevos, color: '#8b5cf6', desc: 'primera compra' },
                            { label: 'Clientes perdidos', valor: retencion.perdidos, color: '#ef4444', desc: 'no volvieron' },
                        ].map((m, i) => (
                            <div key={i} style={{ background: s.surface, borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                                <div style={{ marginBottom: '12px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                                </div>
                                <p style={{ fontSize: '36px', fontWeight: '800', color: m.color, lineHeight: 1 }}>{m.valor}</p>
                                <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '6px' }}>{m.desc}</p>
                            </div>
                        ))}

                        {/* Tasa de retención */}
                        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Tasa de retención</p>
                            <p style={{ fontSize: '52px', fontWeight: '800', color: retencion.tasa_retencion >= 50 ? '#10b981' : retencion.tasa_retencion >= 25 ? '#f59e0b' : '#ef4444', lineHeight: 1 }}>
                                {retencion.tasa_retencion}%
                            </p>
                            <div style={{ width: '100%', height: '6px', background: '#1e293b', borderRadius: '3px', overflow: 'hidden', marginTop: '12px' }}>
                                <div style={{ height: '100%', width: `${retencion.tasa_retencion}%`, background: retencion.tasa_retencion >= 50 ? '#10b981' : retencion.tasa_retencion >= 25 ? '#f59e0b' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s' }} />
                            </div>
                            <p style={{ fontSize: '11px', color: '#475569', marginTop: '8px', textAlign: 'center' }}>
                                {retencion.tasa_retencion >= 50 ? 'Buena retención' : retencion.tasa_retencion >= 25 ? 'Retención moderada' : 'Retención baja'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Rentabilidad */}
            {rentabilidad && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: s.text }}>Rentabilidad</h2>
                            <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>
                                Margen promedio: <strong style={{ color: s.text }}>{rentabilidad.resumen?.margen_promedio_pct}%</strong> —
                                Ganancia total: <strong style={{ color: '#10b981' }}>{formatearGs(rentabilidad.resumen?.ganancia_total)}</strong>
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {[
                                { val: 'producto', label: 'Por producto' },
                                { val: 'marca', label: 'Por marca' },
                                { val: 'categoria', label: 'Por categoría' },
                            ].map(o => (
                                <button key={o.val} onClick={() => setAgruparRentabilidad(o.val)}
                                    style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: agruparRentabilidad === o.val ? '#1a1a2e' : s.surfaceLow, color: agruparRentabilidad === o.val ? 'white' : s.textMuted, borderColor: agruparRentabilidad === o.val ? '#1a1a2e' : s.border }}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.borderLight}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: s.surfaceLow }}>
                                    {['#', 'Nombre', 'Unidades', 'Ingresos', 'Costo', 'Ganancia', 'Margen'].map(h => (
                                        <th key={h} style={{ padding: '10px 16px', textAlign: h === '#' ? 'center' : 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rentabilidad.detalle?.length === 0 ? (
                                    <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: s.textFaint }}>Sin datos</td></tr>
                                ) : rentabilidad.detalle?.slice(0, 15).map((r, i) => {
                                    const margen = parseFloat(r.margen_pct || 0)
                                    const colorMargen = margen >= 30 ? '#10b981' : margen >= 10 ? '#f59e0b' : '#ef4444'
                                    return (
                                        <tr key={i} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                            onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                            onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                            <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '11px', color: s.textFaint }}>{i + 1}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: '600', color: s.text, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nombre}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', color: s.textMuted }}>{r.unidades_vendidas}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', fontWeight: '600', color: s.text }}>{formatearGs(r.ingresos)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '12px', color: '#ef4444' }}>{formatearGs(r.costo)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', fontWeight: '800', color: '#10b981' }}>{formatearGs(r.ganancia)}</td>
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ flex: 1, height: '6px', background: s.barTrack, borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                                                        <div style={{ height: '100%', width: `${Math.min(margen, 100)}%`, background: colorMargen, borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: colorMargen, minWidth: '40px' }}>{margen}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Exportar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* Exportar contable */}
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '4px' }}>Exportar reporte contable</h3>
                    <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '16px' }}>Detalle de ventas por transacción para contabilidad.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div><label style={labelStyle}>Desde</label><input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Hasta</label><input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)} style={inputStyle} /></div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Canal (opcional)</label>
                            <select value={exportCanal} onChange={e => setExportCanal(e.target.value)} style={inputStyle}>
                                <option value="">Todos los canales</option>
                                <option value="bot">WhatsApp Bot</option>
                                <option value="tienda">Tienda / Presencial</option>
                                <option value="delivery">Delivery</option>
                                <option value="web">Pagina Web</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleExportarExcel} disabled={exportando}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: exportando ? '#94a3b8' : '#10b981', color: 'white', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {exportando ? 'Generando...' : 'Exportar Excel contable'}
                    </button>
                    <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '10px' }}>
                        Incluye: fecha, cliente, RUC, producto, cantidad, monto, IVA 10%, canal y método de pago.
                    </p>
                </div>

                {/* Exportar estadísticas */}
                <div style={{ background: s.surface, borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: `1px solid ${s.borderLight}` }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '4px' }}>Exportar estadísticas</h3>
                    <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '16px' }}>Métricas, comparativas, top productos y canales.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <div><label style={labelStyle}>Desde</label><input type="date" value={statsDesde} onChange={e => setStatsDesde(e.target.value)} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Hasta</label><input type="date" value={statsHasta} onChange={e => setStatsHasta(e.target.value)} style={inputStyle} /></div>
                    </div>
                    <button onClick={handleExportarEstadisticas} disabled={exportandoStats}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: exportandoStats ? '#94a3b8' : '#4f46e5', color: 'white', cursor: exportandoStats ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {exportandoStats ? 'Generando...' : 'Exportar estadísticas'}
                    </button>
                    <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '10px' }}>
                        Incluye: resumen general, comparativas, top productos, ventas por canal y delivery por zonas.
                    </p>
                </div>
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