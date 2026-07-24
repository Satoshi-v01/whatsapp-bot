import { useState, useEffect } from 'react'
import { getResumen, getVentasSemana, getTopProductos } from '../services/estadisticas'
import { getReportes } from '../services/proveedores'
import { getResumenOrdenes } from '../services/ordenes'
import { getAlertasLotes } from '../services/lotes'
import { useNavigate } from 'react-router-dom'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearSoloFecha } from '../utils/fecha'
import GraficoTendenciaVentas from '../components/GraficoTendenciaVentas'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

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

    // Colores literales solo para el grafico SVG (no puede leer clases de Tailwind)
    const colores = {
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        border: darkMode ? '#334155' : '#e2e8f0',
        surface: darkMode ? '#1e293b' : 'white',
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
        if (dias <= 1) return 'bg-red-100 text-red-500 dark:bg-red-500/15'
        if (dias <= 4) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
        return 'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'
    }
    function etiquetaDias(dias) {
        if (dias <= 0) return 'Hoy'
        if (dias === 1) return 'Mañana'
        return `En ${dias}d`
    }

    const tarjetas = [
        { label: 'Ventas del día', valor: formatearGs(resumen?.ventas_hoy?.total || 0), sub: `${resumen?.ventas_hoy?.cantidad || 0} transacciones`, extra: resumen?.ventas_hoy?.ganancia > 0 ? `+${formatearGs(resumen.ventas_hoy.ganancia)}` : null, color: 'text-green-500', accentBg: 'bg-green-50 dark:bg-green-500/10', accentText: 'text-green-500', icono: 'trend', ruta: '/dashboard/ventas' },
        { label: 'Pendientes de pago', valor: resumen?.pendientes || 0, sub: 'requieren confirmación', color: 'text-amber-500', accentBg: 'bg-amber-50 dark:bg-amber-500/10', accentText: 'text-amber-500', icono: 'clock', ruta: '/dashboard/ventas?estado=pendiente_pago' },
        { label: 'Ordenes pendientes', valor: ordenesResumen?.pendientes ?? '—', sub: 'sin confirmar', color: ordenesResumen?.pendientes > 0 ? 'text-amber-500' : 'text-green-500', accentBg: ordenesResumen?.pendientes > 0 ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-green-50 dark:bg-green-500/10', accentText: ordenesResumen?.pendientes > 0 ? 'text-amber-500' : 'text-green-500', icono: 'bag', ruta: '/dashboard/ordenes' },
        { label: 'Deliveries activos', valor: resumen?.deliveries || 0, sub: 'en proceso', color: 'text-blue-500', accentBg: 'bg-blue-50 dark:bg-blue-500/10', accentText: 'text-blue-500', icono: 'truck', ruta: '/dashboard/delivery' },
        { label: 'Chats esperando', valor: resumen?.esperando_agente || 0, sub: 'requieren atención', color: 'text-red-500', accentBg: 'bg-red-50 dark:bg-red-500/10', accentText: 'text-red-500', icono: 'chat', ruta: '/dashboard/chat' },
    ]

    if (cargando) return (
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
            <p className="text-slate-500 dark:text-slate-400">Cargando panel...</p>
        </div>
    )

    return (
        <div className="page-scroll flex min-h-full flex-col gap-6 bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="mb-1.5 text-xs capitalize text-slate-400 dark:text-slate-500">
                        {new Date().toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-[26px]">
                        Bienvenido{usuario.nombre ? `, ${usuario.nombre.split(' ')[0]}` : ''}
                    </h2>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                        Este es el resumen de actividad de hoy.
                    </p>
                </div>
                <Button variant="outline" onClick={cargarDatos}>
                    ↻ Actualizar
                </Button>
            </div>

            {/* Alertas facturas proveedores */}
            {(facturasVencidas.length > 0 || proximasVencer.length > 0) && (
                <div className="flex flex-col gap-2">

                    {/* Vencidas */}
                    {facturasVencidas.length > 0 && (
                        <div className="rounded-xl border border-red-300 bg-red-50 p-3.5 dark:border-red-500/40 dark:bg-red-500/10 sm:p-4">
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex text-red-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg></span>
                                    <p className="text-[13px] font-extrabold text-red-800 dark:text-red-400">
                                        {facturasVencidas.length} factura{facturasVencidas.length !== 1 ? 's' : ''} vencida{facturasVencidas.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <button onClick={() => navigate('/dashboard/proveedores')}
                                    className="shrink-0 text-xs font-semibold text-red-800 underline dark:text-red-400">
                                    Ver todas →
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {facturasVencidas.slice(0, 3).map(f => (
                                    <div key={f.id} onClick={() => navigate('/dashboard/proveedores')}
                                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-red-300 bg-white px-3 py-2 transition-colors hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/5 dark:hover:bg-red-500/15">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{f.proveedor_nombre} — {f.numero_factura}</p>
                                            <p className="text-[11px] text-red-500">Venció el {formatearSoloFecha(f.fecha_vencimiento)} · {f.dias_vencida} día{f.dias_vencida !== 1 ? 's' : ''} vencida</p>
                                        </div>
                                        <p className="shrink-0 text-[13px] font-extrabold text-red-500">Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                    </div>
                                ))}
                                {facturasVencidas.length > 3 && (
                                    <p className="text-center text-[11px] font-semibold text-red-500">
                                        +{facturasVencidas.length - 3} más vencidas
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Próximas a vencer */}
                    {proximasVencer.length > 0 && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 dark:border-amber-500/40 dark:bg-amber-500/10 sm:p-4">
                            <div className="mb-2.5 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex text-amber-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>
                                    <p className="text-[13px] font-extrabold text-amber-800 dark:text-amber-400">
                                        {proximasVencer.length} factura{proximasVencer.length !== 1 ? 's' : ''} próxima{proximasVencer.length !== 1 ? 's' : ''} a vencer
                                    </p>
                                </div>
                                <button onClick={() => navigate('/dashboard/proveedores')}
                                    className="shrink-0 text-xs font-semibold text-amber-800 underline dark:text-amber-400">
                                    Ver todas →
                                </button>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                {proximasVencer.slice(0, 3).map(f => {
                                    const dias = diasParaVencer(f.fecha_vencimiento)
                                    return (
                                        <div key={f.id} onClick={() => navigate('/dashboard/proveedores')}
                                            className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-amber-300 bg-white px-3 py-2 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/5 dark:hover:bg-amber-500/15">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold ${colorUrgencia(dias)}`}>
                                                    {etiquetaDias(dias)}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p className="text-[11px] text-amber-600 dark:text-amber-400">Vence el {formatearSoloFecha(f.fecha_vencimiento)}</p>
                                                </div>
                                            </div>
                                            <p className="ml-2 shrink-0 text-[13px] font-extrabold text-amber-600 dark:text-amber-400">Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                        </div>
                                    )
                                })}
                                {proximasVencer.length > 3 && (
                                    <p className="text-center text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                        +{proximasVencer.length - 3} más próximas a vencer
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tarjetas métricas */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {tarjetas.map((t, i) => (
                    <Card key={i} onClick={() => navigate(t.ruta)}
                        className="cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg">
                        <CardContent>
                            <div className="mb-3 flex items-start justify-between sm:mb-4">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${t.accentBg} ${t.accentText}`}>
                                    {t.icono === 'trend' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
                                    {t.icono === 'clock' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                                    {t.icono === 'bag' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>}
                                    {t.icono === 'truck' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>}
                                    {t.icono === 'chat' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>}
                                </div>
                                {t.extra && (
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${t.accentBg} ${t.accentText}`}>
                                        {t.extra}
                                    </span>
                                )}
                            </div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.label}</p>
                            <p className={`text-xl font-extrabold tracking-tight sm:text-2xl ${t.color}`}>{t.valor}</p>
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{t.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Gráfico + Alertas inventario */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                {/* Gráfico tendencia */}
                <Card className="lg:col-span-2">
                    <CardContent>
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Ventas recientes</h3>
                            <div className="flex items-center gap-1.5">
                                <div className="h-2.5 w-2.5 rounded-full" style={{ background: colores.barColor }} />
                                <span className="text-[11px] text-slate-500 dark:text-slate-400">Últimos 7 días</span>
                            </div>
                        </div>
                        {ventasSemana.length === 0 ? (
                            <div className="flex h-[180px] items-center justify-center text-sm text-slate-500 dark:text-slate-400">Sin datos</div>
                        ) : (
                            <GraficoTendenciaVentas datos={ventasSemana} colorLinea={colores.barColor} colorTexto={colores.text} colorTextoMuted={colores.textMuted} colorGrid={colores.border} colorFondo={colores.surface} maxEtiquetas={ventasSemana.length} resaltarHoy />
                        )}
                    </CardContent>
                </Card>

                {/* Alertas de inventario */}
                <Card className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col">
                        <div className="mb-4 flex items-center justify-between gap-2">
                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Alertas de inventario</h3>
                            <div className="flex flex-wrap justify-end gap-1.5">
                                {resumen?.stock_bajo?.length > 0 && (
                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-red-800 dark:bg-red-500/15 dark:text-red-400">
                                        {resumen.stock_bajo.length} sin stock
                                    </span>
                                )}
                                {alertasLotes.vencidos.length > 0 && (
                                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-red-800 dark:bg-red-500/15 dark:text-red-400">
                                        {alertasLotes.vencidos.length} vencidos
                                    </span>
                                )}
                                {alertasLotes.proximos_vencer.length > 0 && (
                                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                                        {alertasLotes.proximos_vencer.length} a vencer
                                    </span>
                                )}
                            </div>
                        </div>

                        {!resumen?.stock_bajo?.length && !alertasLotes.proximos_vencer.length && !alertasLotes.vencidos.length ? (
                            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                <span className="flex text-green-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                                <p>Todo el inventario en orden</p>
                            </div>
                        ) : (
                            <div className="flex max-h-[280px] flex-1 flex-col gap-1.5 overflow-y-auto">
                                {/* Stock bajo */}
                                {resumen?.stock_bajo?.length > 0 && (
                                    <>
                                        <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Stock bajo</p>
                                        {resumen.stock_bajo.map((item, i) => (
                                            <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                                className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-indigo-500/10">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.stock === 0 ? 'bg-red-100 text-red-500 dark:bg-red-500/15' : 'bg-amber-50 text-amber-500 dark:bg-amber-500/15'}`}>
                                                    {item.stock === 0
                                                        ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                                                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                                    }
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{item.nombre}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.presentacion}</p>
                                                </div>
                                                <span className={`shrink-0 text-[11px] font-bold ${item.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                                                    {item.stock === 0 ? 'Sin stock' : `${item.stock} ud.`}
                                                </span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Lotes vencidos */}
                                {alertasLotes.vencidos.length > 0 && (
                                    <>
                                        <p className={`text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 ${resumen?.stock_bajo?.length ? 'mt-2' : ''} mb-0.5`}>Lotes vencidos</p>
                                        {alertasLotes.vencidos.map((lote, i) => (
                                            <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                                className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-indigo-500/10">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-500/15">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{lote.producto_nombre}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{lote.presentacion_nombre} · {lote.stock_actual} ud. · Vencido hace {lote.dias_vencido}d</p>
                                                </div>
                                                <span className="shrink-0 text-[11px] font-bold text-red-500">Vencido</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Lotes próximos a vencer */}
                                {alertasLotes.proximos_vencer.length > 0 && (
                                    <>
                                        <p className={`text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 ${(resumen?.stock_bajo?.length || alertasLotes.vencidos.length) ? 'mt-2' : ''} mb-0.5`}>Próximos a vencer</p>
                                        {alertasLotes.proximos_vencer.map((lote, i) => {
                                            const dias = parseInt(lote.dias_para_vencer)
                                            const color = dias <= 7 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#6366f1'
                                            return (
                                                <div key={i} onClick={() => navigate('/dashboard/inventario')}
                                                    className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-transparent bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-indigo-50 dark:bg-slate-800/60 dark:hover:border-slate-700 dark:hover:bg-indigo-500/10">
                                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${color}18`, color }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{lote.producto_nombre}</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{lote.presentacion_nombre} · {lote.stock_actual} ud.{lote.numero_lote ? ` · Lote ${lote.numero_lote}` : ''}</p>
                                                    </div>
                                                    <span className="shrink-0 whitespace-nowrap text-[11px] font-bold" style={{ color }}>
                                                        {dias === 0 ? 'Hoy' : `${dias}d`}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </>
                                )}
                            </div>
                        )}

                        <Button variant="outline" onClick={() => navigate('/dashboard/inventario')} className="mt-4 w-full py-5 text-[13px] font-semibold">
                            Ver inventario completo
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Top productos */}
            <Card className="py-0 gap-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-700 sm:px-6">
                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Productos más vendidos del mes</h3>
                    <Button variant="link" onClick={() => navigate('/dashboard/reportes')} className="h-auto p-0 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400">
                        Ver reportes →
                    </Button>
                </div>

                {topProductos.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos para mostrar.</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                {['#', 'Producto', 'Vendidos', 'Total', 'Ganancia'].map((h, i) => (
                                    <TableHead key={i} className={`text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-3 px-5 sm:px-6 ${i >= 2 ? 'text-right' : ''}`}>{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {topProductos.map((prod, i) => (
                                <TableRow key={i} className="border-slate-100 dark:border-slate-700">
                                    <TableCell className="py-3.5 px-5 sm:px-6">
                                        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold ${i === 0 ? 'bg-amber-100 text-amber-800' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                            {i + 1}
                                        </span>
                                    </TableCell>
                                    <TableCell className="py-3.5 px-4">
                                        <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{prod.producto}</p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{prod.presentacion}</p>
                                    </TableCell>
                                    <TableCell className="text-right text-sm font-bold text-slate-900 dark:text-slate-100 py-3.5 px-4">{prod.cantidad_vendida}</TableCell>
                                    <TableCell className="text-right text-[13px] text-slate-900 dark:text-slate-100 py-3.5 px-4">{formatearGs(prod.total_generado)}</TableCell>
                                    <TableCell className="text-right text-[13px] font-semibold text-green-600 dark:text-green-400 py-3.5 px-5 sm:px-6">
                                        {prod.ganancia_generada > 0 ? formatearGs(prod.ganancia_generada) : '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </Card>

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
