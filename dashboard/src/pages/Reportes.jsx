import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getMarcas, getCategorias } from '../services/productos'
import { getReporte } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { getMetricas, getVentasPorDia, getVentasPorCanal, getRankingProductos, getTopClientes, getDeliveryZonas, getComparativas, getClientesRetencion, getRentabilidad, getTransferenciasPorCuenta } from '../services/estadisticas'
import GraficoTendenciaVentas from '../components/GraficoTendenciaVentas'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const inputCls = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-slate-900/10 dark:focus:ring-slate-100/10'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

function Reportes() {
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const { darkMode } = useApp()
    const [comparativas, setComparativas] = useState(null)
    const [retencion, setRetencion] = useState(null)
    const [rentabilidad, setRentabilidad] = useState(null)
    const [agruparRentabilidad, setAgruparRentabilidad] = useState('producto')

    // Colores literales solo para el grafico SVG (no puede leer clases de Tailwind)
    const colores = {
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        borderLight: darkMode ? '#334155' : '#f1f5f9',
        surface: darkMode ? '#1e293b' : 'white',
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
    const [transferenciasPorCuenta, setTransferenciasPorCuenta] = useState([])
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
            const [met, dias, canales, ranking, clientes, delZonas, comp, ret, rent, transfCuentas] = await Promise.all([
                getMetricas(params), getVentasPorDia({ periodo, canal }),
                getVentasPorCanal({ periodo }), getRankingProductos({ periodo }),
                getTopClientes({ periodo }), getDeliveryZonas({ periodo }),
                getComparativas({ periodo }), getClientesRetencion({ periodo }),
                getRentabilidad({ periodo, agrupar: agruparRentabilidad }),
                getTransferenciasPorCuenta({ periodo })
            ])
            setMetricas(met); setVentasPorDia(dias); setVentasPorCanal(canales)
            setRankingProductos(ranking); setTopClientes(clientes); setDeliveryZonas(delZonas)
            setComparativas(comp); setRetencion(ret); setRentabilidad(rent)
            setTransferenciasPorCuenta(transfCuentas)
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
                    'Unidades vendidas': Number(p.cantidad_vendida),
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
                    'Unidades vendidas': Number(p.cantidad_vendida),
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
                    'Compras': Number(c.cantidad_compras),
                    'Total comprado (Gs.)': parseInt(c.total_comprado)
                }))
            )
            wsClientes['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 10 }, { wch: 22 }]
            XLSX.utils.book_append_sheet(wb, wsClientes, 'Top Clientes')

            // Hoja 6 — Ventas por canal
            const wsCanales = XLSX.utils.json_to_sheet(
                canales.map(c => ({
                    'Canal': labelCanal(c.canal),
                    'Ventas': Number(c.cantidad),
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
                        'Pedidos': Number(z.cantidad_pedidos),
                        'Total ventas (Gs.)': parseInt(z.total_ventas)
                    }))
                )
                wsZonas['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 20 }]
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
                'Fecha': new Date(v.fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' }),
                'Cliente': v.cliente || 'Cliente', 'RUC': v.ruc || '', 'Teléfono': v.telefono || '',
                'Marca': v.marca || '', 'Producto': v.producto || '', 'Presentación': v.presentacion || '',
                'Cantidad': v.cantidad, 'Monto (Gs.)': parseInt(v.monto), 'IVA 10% (Gs.)': parseInt(v.iva),
                'Canal': v.canal || '', 'Método de pago': v.metodo_pago || '', 'Estado': v.estado || ''
            }))
            filas.push({ 'Presentación': 'TOTAL', 'Cantidad': datos.reduce((s, v) => s + Number(v.cantidad), 0), 'Monto (Gs.)': datos.reduce((s, v) => s + parseInt(v.monto), 0), 'IVA 10% (Gs.)': datos.reduce((s, v) => s + parseInt(v.iva), 0) })
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
    const totalCanal = ventasPorCanal.reduce((sum, c) => sum + parseInt(c.total), 0)
    const periodos = [{ valor: 'hoy', label: 'Hoy' }, { valor: 'semana', label: 'Semana' }, { valor: 'mes', label: 'Mes' }, { valor: 'anual', label: 'Año' }]

    const RankingTable = ({ titulo, datos, colorVentas }) => (
        <Card className="py-0 gap-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-700 py-4 px-5">
                <CardTitle className={colorVentas ? '' : 'text-slate-900 dark:text-slate-100'} style={colorVentas ? { color: colorVentas } : undefined}>{titulo}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Producto</TableHead>
                            <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Ventas</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {datos.map((p, i) => (
                            <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                <TableCell className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                        {colorVentas ? (
                                            <div className="h-2 w-2 shrink-0 rounded-full bg-red-300" />
                                        ) : (
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>{i + 1}</span>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">{p.marca && `${p.marca} — `}{p.producto}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{p.presentacion}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right text-[13px] font-bold py-3 px-4" style={{ color: colorVentas || undefined }}>
                                    <span className={colorVentas ? '' : 'text-slate-900 dark:text-slate-100'}>{p.cantidad_vendida}</span>
                                </TableCell>
                            </TableRow>
                        ))}
                        {datos.length === 0 && <TableRow><TableCell colSpan={2} className="py-5 text-center text-sm text-slate-400 dark:text-slate-500">Sin datos</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:mx-auto lg:max-w-[1400px] lg:p-8">

            <div className="mb-6 sm:mb-7">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Reportes de Operación</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Análisis detallado de rendimiento comercial y financiero.</p>
            </div>

            {/* Filtros */}
            <Card className="mb-6">
                <CardContent>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className={labelCls}>Período</label>
                            <div className="flex gap-1">
                                {periodos.map(p => (
                                    <button key={p.valor} onClick={() => setPeriodo(p.valor)}
                                        className={`flex-1 rounded-lg border px-1 py-1.5 text-[11px] font-semibold transition-colors ${periodo === p.valor ? 'border-slate-900 bg-slate-900 text-white dark:border-indigo-500 dark:bg-indigo-500' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Canal</label>
                            <select value={canal} onChange={e => setCanal(e.target.value)} className={inputCls}>
                                <option value="">Todos los canales</option>
                                <option value="bot">WhatsApp Bot</option>
                                <option value="tienda">Tienda / Presencial</option>
                                <option value="delivery">Delivery</option>
                                <option value="web">Pagina Web</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Marca</label>
                            <select value={marcaId} onChange={e => setMarcaId(e.target.value)} className={inputCls}>
                                <option value="">Todas las marcas</option>
                                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Categoría</label>
                            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} className={inputCls}>
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Métricas */}
            {metricas && (
                <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
                    {[
                        { label: 'Total vendido', valor: formatearGs(metricas.total), sub: `${metricas.cantidad} transacciones`, color: undefined, primero: true },
                        { label: 'Ganancia neta', valor: formatearGs(metricas.ganancia), sub: 'margen estimado', color: '#10b981' },
                        { label: 'IVA generado', valor: formatearGs(metricas.iva_total), sub: 'Total ÷ 11', color: undefined },
                        { label: 'Ticket promedio', valor: formatearGs(metricas.ticket_promedio), sub: 'por transacción', color: undefined },
                        { label: 'Ventas', valor: metricas.cantidad, sub: 'transacciones totales', color: undefined },
                    ].map((m, i) => (
                        <Card key={i} className={`transition-all hover:-translate-y-0.5 hover:shadow-md ${m.primero ? 'border-l-4 border-l-slate-900 dark:border-l-indigo-500' : ''}`}>
                            <CardContent>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{m.label}</p>
                                <p className="text-xl font-extrabold sm:text-[22px]" style={{ color: m.color }}>
                                    <span className={m.color ? '' : 'text-slate-900 dark:text-slate-100'}>{m.valor}</span>
                                </p>
                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{m.sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Comparativas */}
            {comparativas && (
                <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">

                    {/* Ventas período actual vs anterior */}
                    {(() => {
                        const pct = comparativas.ventas.pct_total
                        const subida = pct >= 0
                        const labelPeriodo = periodo === 'semana' ? 'semana anterior' : periodo === 'anual' ? 'año anterior' : 'mes anterior'
                        return (
                            <Card>
                                <CardContent>
                                    <div className="mb-4 flex items-start justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ventas vs {labelPeriodo}</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${subida ? 'bg-green-100 text-green-600 dark:bg-green-500/15' : 'bg-red-100 text-red-500 dark:bg-red-500/15'}`}>
                                            {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                        </span>
                                    </div>
                                    <div className="mb-3.5 flex gap-5">
                                        <div>
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">Este período</p>
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">{formatearGs(comparativas.ventas.actual.total)}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{comparativas.ventas.actual.cantidad} ventas</p>
                                        </div>
                                        <div className="border-l border-slate-200 pl-5 dark:border-slate-700">
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">{labelPeriodo}</p>
                                            <p className="text-lg font-extrabold text-slate-500 dark:text-slate-400 sm:text-xl">{formatearGs(comparativas.ventas.anterior.total)}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{comparativas.ventas.anterior.cantidad} ventas</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div className={`h-full rounded-full transition-all ${subida ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs(pct), 100)}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                        {subida ? `+${formatearGs(comparativas.ventas.actual.total - comparativas.ventas.anterior.total)} más que el ${labelPeriodo}` : `${formatearGs(comparativas.ventas.anterior.total - comparativas.ventas.actual.total)} menos que el ${labelPeriodo}`}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                    })()}

                    {/* Nuevos clientes */}
                    {(() => {
                        const pct = comparativas.nuevos_clientes.pct
                        const subida = pct >= 0
                        const labelPeriodo = periodo === 'semana' ? 'semana anterior' : periodo === 'anual' ? 'año anterior' : 'mes anterior'
                        return (
                            <Card>
                                <CardContent>
                                    <div className="mb-4 flex items-start justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nuevos clientes vs {labelPeriodo}</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${subida ? 'bg-green-100 text-green-600 dark:bg-green-500/15' : 'bg-red-100 text-red-500 dark:bg-red-500/15'}`}>
                                            {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                        </span>
                                    </div>
                                    <div className="mb-3.5 flex gap-5">
                                        <div>
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">Este período</p>
                                            <p className="text-3xl font-extrabold leading-none text-blue-500 sm:text-4xl">{comparativas.nuevos_clientes.actual}</p>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">primera compra</p>
                                        </div>
                                        <div className="border-l border-slate-200 pl-5 dark:border-slate-700">
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">{labelPeriodo}</p>
                                            <p className="text-3xl font-extrabold leading-none text-slate-400 dark:text-slate-500 sm:text-4xl">{comparativas.nuevos_clientes.anterior}</p>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">primera compra</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div className={`h-full rounded-full transition-all ${subida ? 'bg-blue-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs(pct), 100)}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                        {subida
                                            ? `${comparativas.nuevos_clientes.actual - comparativas.nuevos_clientes.anterior} más que el ${labelPeriodo}`
                                            : `${comparativas.nuevos_clientes.anterior - comparativas.nuevos_clientes.actual} menos que el ${labelPeriodo}`}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                    })()}

                    {/* Hoy vs promedio diario */}
                    {(() => {
                        const pct = comparativas.dia_vs_promedio.pct
                        const subida = pct >= 0
                        return (
                            <Card>
                                <CardContent>
                                    <div className="mb-4 flex items-start justify-between">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Hoy vs promedio diario</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${subida ? 'bg-green-100 text-green-600 dark:bg-green-500/15' : 'bg-red-100 text-red-500 dark:bg-red-500/15'}`}>
                                            {subida ? '↑' : '↓'} {Math.abs(pct)}%
                                        </span>
                                    </div>
                                    <div className="mb-3.5 flex gap-5">
                                        <div>
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">Hoy</p>
                                            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100 sm:text-xl">{formatearGs(comparativas.dia_vs_promedio.hoy)}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{comparativas.dia_vs_promedio.cantidad_hoy} ventas</p>
                                        </div>
                                        <div className="border-l border-slate-200 pl-5 dark:border-slate-700">
                                            <p className="mb-1 text-[10px] text-slate-400 dark:text-slate-500">Promedio diario</p>
                                            <p className="text-lg font-extrabold text-slate-500 dark:text-slate-400 sm:text-xl">{formatearGs(comparativas.dia_vs_promedio.promedio_diario)}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{comparativas.dia_vs_promedio.promedio_cantidad} ventas/día</p>
                                        </div>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                        <div className={`h-full rounded-full transition-all ${subida ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs(pct), 100)}%` }} />
                                    </div>
                                    <p className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                                        {subida ? 'Por encima del promedio del período' : 'Por debajo del promedio del período'}
                                    </p>
                                </CardContent>
                            </Card>
                        )
                    })()}
                </div>
            )}

            {/* Gráficos */}
            <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardContent>
                        <h3 className="mb-6 text-[15px] font-bold text-slate-900 dark:text-slate-100">Ventas por día</h3>
                        {ventasPorDia.length === 0 ? (
                            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">Sin datos en este período</div>
                        ) : (
                            <GraficoTendenciaVentas datos={ventasPorDia} colorLinea={colores.barColor} colorTexto={colores.text} colorTextoMuted={colores.textMuted} colorGrid={colores.borderLight} colorFondo={colores.surface} />
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <h3 className="mb-5 text-[15px] font-bold text-slate-900 dark:text-slate-100">Ventas por canal</h3>
                        {ventasPorCanal.length === 0 ? (
                            <div className="flex h-[150px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">Sin datos</div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {ventasPorCanal.map((c, i) => {
                                    const pct = totalCanal > 0 ? Math.round((parseInt(c.total) / totalCanal) * 100) : 0
                                    return (
                                        <div key={i}>
                                            <div className="mb-1 flex justify-between">
                                                <span className="text-xs font-medium text-slate-900 dark:text-slate-100">{labelCanal(c.canal)}</span>
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{pct}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: coloresCanal[i % coloresCanal.length] }} />
                                            </div>
                                            <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{formatearGs(c.total)}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {transferenciasPorCuenta.length > 0 && (
                    <Card className="lg:col-span-3">
                        <CardContent>
                            <h3 className="mb-5 text-[15px] font-bold text-slate-900 dark:text-slate-100">Transferencias por cuenta</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {transferenciasPorCuenta.map((c, i) => (
                                    <div key={c.cuenta_id || i} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.banco || 'Sin cuenta asignada'}</p>
                                        {c.titular && <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.titular}{c.alias ? ` · ${c.alias}` : ''}</p>}
                                        <p className="mt-1.5 text-sm font-extrabold text-slate-900 dark:text-slate-100">{formatearGs(c.total)}</p>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{c.cantidad} transferencia{parseInt(c.cantidad) === 1 ? '' : 's'}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Rankings */}
            <div className="mb-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <RankingTable titulo="Top 10 Productos" datos={rankingProductos.top} />
                <RankingTable titulo="Menos vendidos" datos={rankingProductos.bottom} colorVentas="#ef4444" />

                {/* Top clientes */}
                <Card className="py-0 gap-0">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-700 py-4 px-5">
                        <CardTitle className="text-slate-900 dark:text-slate-100">Top Clientes</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[400px] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                    <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Cliente</TableHead>
                                    <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topClientes.map((c, i) => (
                                    <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                        <TableCell className="py-3 px-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                                                    {iniciales(c.cliente)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{c.cliente}</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{c.cantidad_compras} compras</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-[13px] font-bold text-slate-900 dark:text-slate-100 py-3 px-4">{formatearGs(c.total_comprado)}</TableCell>
                                    </TableRow>
                                ))}
                                {topClientes.length === 0 && <TableRow><TableCell colSpan={2} className="py-5 text-center text-sm text-slate-400 dark:text-slate-500">Sin datos</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Sección Delivery */}
            <div className="mb-6">
                <h2 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-slate-100">Delivery por zonas</h2>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                    {/* Pedidos y recaudación por zona */}
                    <Card className="py-0 gap-0">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-700 py-4 px-5">
                            <CardTitle className="text-slate-900 dark:text-slate-100">Pedidos por zona</CardTitle>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Cantidad de deliveries y recaudacion por zona</p>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[360px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Zona</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Pedidos</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Ventas</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveryZonas.por_zona.length === 0 ? (
                                        <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Sin datos en este período</TableCell></TableRow>
                                    ) : deliveryZonas.por_zona.map((z, i) => (
                                        <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: coloresCanal[i % coloresCanal.length] }} />
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{z.zona}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right text-[13px] font-bold text-slate-900 dark:text-slate-100 py-3 px-4">{z.cantidad_pedidos}</TableCell>
                                            <TableCell className="text-right text-xs text-slate-500 dark:text-slate-400 py-3 px-4">{formatearGs(z.total_ventas)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Clientes por zona */}
                    <Card className="py-0 gap-0">
                        <CardHeader className="border-b border-slate-100 dark:border-slate-700 py-4 px-5">
                            <CardTitle className="text-slate-900 dark:text-slate-100">Clientes por zona</CardTitle>
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Distribucion de clientes activos e inactivos por ciudad</p>
                        </CardHeader>
                        <CardContent className="p-0 max-h-[360px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        <TableHead className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Ciudad</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Total</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Activos</TableHead>
                                        <TableHead className="text-right text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4">Inactivos</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deliveryZonas.clientes_por_zona.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">Sin datos de ciudades</TableCell></TableRow>
                                    ) : deliveryZonas.clientes_por_zona.map((z, i) => {
                                        const pctActivos = z.total_clientes > 0 ? Math.round((z.clientes_activos / z.total_clientes) * 100) : 0
                                        return (
                                            <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                                <TableCell className="py-3 px-4">
                                                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{z.zona}</p>
                                                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                        <div className="h-full rounded-full bg-green-500" style={{ width: `${pctActivos}%` }} />
                                                    </div>
                                                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{pctActivos}% activos</p>
                                                </TableCell>
                                                <TableCell className="text-right text-sm font-extrabold text-slate-900 dark:text-slate-100 py-3 px-4">{z.total_clientes}</TableCell>
                                                <TableCell className="text-right text-[13px] font-semibold text-green-600 dark:text-green-400 py-3 px-4">{z.clientes_activos}</TableCell>
                                                <TableCell className="text-right text-[13px] font-semibold text-red-500 py-3 px-4">{z.clientes_inactivos}</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Retención de clientes */}
            {retencion && (
                <div className="mb-6">
                    <h2 className="mb-4 text-lg font-extrabold text-slate-900 dark:text-slate-100">Retención de clientes</h2>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
                        {[
                            { label: 'Clientes activos', valor: retencion.activos, color: '#3b82f6', desc: 'compraron este período' },
                            { label: 'Clientes retenidos', valor: retencion.retenidos, color: '#10b981', desc: 'volvieron a comprar' },
                            { label: 'Clientes nuevos', valor: retencion.nuevos, color: '#8b5cf6', desc: 'primera compra' },
                            { label: 'Clientes perdidos', valor: retencion.perdidos, color: '#ef4444', desc: 'no volvieron' },
                        ].map((m, i) => (
                            <Card key={i}>
                                <CardContent>
                                    <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{m.label}</p>
                                    <p className="text-3xl font-extrabold leading-none sm:text-4xl" style={{ color: m.color }}>{m.valor}</p>
                                    <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{m.desc}</p>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Tasa de retención */}
                        <Card className="col-span-2 bg-slate-900 sm:col-span-4 lg:col-span-1">
                            <CardContent className="flex flex-col items-center justify-center text-center">
                                <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">Tasa de retención</p>
                                <p className="text-5xl font-extrabold leading-none" style={{ color: retencion.tasa_retencion >= 50 ? '#10b981' : retencion.tasa_retencion >= 25 ? '#f59e0b' : '#ef4444' }}>
                                    {retencion.tasa_retencion}%
                                </p>
                                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                    <div className="h-full rounded-full transition-all" style={{ width: `${retencion.tasa_retencion}%`, background: retencion.tasa_retencion >= 50 ? '#10b981' : retencion.tasa_retencion >= 25 ? '#f59e0b' : '#ef4444' }} />
                                </div>
                                <p className="mt-2 text-[11px] text-slate-500">
                                    {retencion.tasa_retencion >= 50 ? 'Buena retención' : retencion.tasa_retencion >= 25 ? 'Retención moderada' : 'Retención baja'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Rentabilidad */}
            {rentabilidad && (
                <div className="mb-6">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Rentabilidad</h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                M. ganancia: <strong className="text-slate-900 dark:text-slate-100">{rentabilidad.resumen?.markup_promedio_pct}%</strong> · M. venta: <strong className="text-slate-900 dark:text-slate-100">{rentabilidad.resumen?.margen_promedio_pct}%</strong> —{' '}
                                Ganancia total: <strong className="text-green-600 dark:text-green-400">{formatearGs(rentabilidad.resumen?.ganancia_total)}</strong>
                            </p>
                        </div>
                        <div className="flex gap-1.5">
                            {[
                                { val: 'producto', label: 'Por producto' },
                                { val: 'marca', label: 'Por marca' },
                                { val: 'categoria', label: 'Por categoría' },
                            ].map(o => (
                                <button key={o.val} onClick={() => setAgruparRentabilidad(o.val)}
                                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${agruparRentabilidad === o.val ? 'border-slate-900 bg-slate-900 text-white dark:border-indigo-500 dark:bg-indigo-500' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Card className="py-0 gap-0">
                        <CardContent className="p-0 overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                        {['#', 'Nombre', 'Unidades', 'Ingresos', 'Costo', 'Ganancia', 'M. Ganancia', 'M. Venta'].map(h => (
                                            <TableHead key={h} className={`text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-4 ${h === '#' ? 'text-center' : ''}`}>{h}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rentabilidad.detalle?.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-500">Sin datos</TableCell></TableRow>
                                    ) : rentabilidad.detalle?.slice(0, 15).map((r, i) => {
                                        const markup = parseFloat(r.markup_pct || 0)
                                        const margen = parseFloat(r.margen_pct || 0)
                                        const colorMarkup = markup >= 25 ? '#10b981' : markup >= 10 ? '#f59e0b' : '#ef4444'
                                        return (
                                            <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                                <TableCell className="text-center text-[11px] text-slate-400 dark:text-slate-500 py-2.5 px-4">{i + 1}</TableCell>
                                                <TableCell className="max-w-[280px] truncate text-xs font-semibold text-slate-900 dark:text-slate-100 py-2.5 px-4">{r.nombre}</TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-slate-400 py-2.5 px-4">{r.unidades_vendidas}</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-900 dark:text-slate-100 py-2.5 px-4">{formatearGs(r.ingresos)}</TableCell>
                                                <TableCell className="text-xs text-red-500 py-2.5 px-4">{formatearGs(r.costo)}</TableCell>
                                                <TableCell className="text-[13px] font-extrabold text-green-600 dark:text-green-400 py-2.5 px-4">{formatearGs(r.ganancia)}</TableCell>
                                                <TableCell className="py-2.5 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                                                            <div className="h-full rounded-full" style={{ width: `${Math.min(markup, 100)}%`, background: colorMarkup }} />
                                                        </div>
                                                        <span className="min-w-[40px] text-xs font-bold" style={{ color: colorMarkup }}>{markup}%</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-slate-500 dark:text-slate-400 py-2.5 px-4">{margen}%</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Exportar */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* Exportar contable */}
                <Card>
                    <CardContent>
                        <h3 className="mb-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">Exportar reporte contable</h3>
                        <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">Detalle de ventas por transacción para contabilidad.</p>
                        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div><label className={labelCls}>Desde</label><input type="date" value={exportDesde} onChange={e => setExportDesde(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Hasta</label><input type="date" value={exportHasta} onChange={e => setExportHasta(e.target.value)} className={inputCls} /></div>
                            <div className="sm:col-span-2">
                                <label className={labelCls}>Canal (opcional)</label>
                                <select value={exportCanal} onChange={e => setExportCanal(e.target.value)} className={inputCls}>
                                    <option value="">Todos los canales</option>
                                    <option value="bot">WhatsApp Bot</option>
                                    <option value="tienda">Tienda / Presencial</option>
                                    <option value="delivery">Delivery</option>
                                    <option value="web">Pagina Web</option>
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleExportarExcel} disabled={exportando}
                            className={`w-full py-5 text-[13px] font-semibold ${exportando ? '' : 'bg-green-600 hover:bg-green-700'}`}>
                            {exportando ? 'Generando...' : 'Exportar Excel contable'}
                        </Button>
                        <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                            Incluye: fecha, cliente, RUC, producto, cantidad, monto, IVA 10%, canal y método de pago.
                        </p>
                    </CardContent>
                </Card>

                {/* Exportar estadísticas */}
                <Card>
                    <CardContent>
                        <h3 className="mb-1 text-[15px] font-bold text-slate-900 dark:text-slate-100">Exportar estadísticas</h3>
                        <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">Métricas, comparativas, top productos y canales.</p>
                        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div><label className={labelCls}>Desde</label><input type="date" value={statsDesde} onChange={e => setStatsDesde(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>Hasta</label><input type="date" value={statsHasta} onChange={e => setStatsHasta(e.target.value)} className={inputCls} /></div>
                        </div>
                        <Button onClick={handleExportarEstadisticas} disabled={exportandoStats}
                            className={`w-full py-5 text-[13px] font-semibold ${exportandoStats ? '' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                            {exportandoStats ? 'Generando...' : 'Exportar estadísticas'}
                        </Button>
                        <p className="mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                            Incluye: resumen general, comparativas, top productos, ventas por canal y delivery por zonas.
                        </p>
                    </CardContent>
                </Card>
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
