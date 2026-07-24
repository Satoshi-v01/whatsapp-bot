import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../App'
import api from '../services/api'
import { formatearFecha, fechaHoyPY } from '../utils/fecha'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

// ─── Helpers ────────────────────────────────────────────────────
function gs(n) {
    return `Gs. ${Number(n || 0).toLocaleString('es-PY')}`
}

function calcTotal(orden) {
    const itemsTotal = (orden.items || []).reduce((s, it) => s + Number(it.precio_total || 0), 0)
    return itemsTotal + Number(orden.costo_delivery || 0)
}

function toFechaDesde(periodo) {
    const hoy = fechaHoyPY()
    if (periodo === 'hoy') { return hoy }
    const d = new Date(hoy + 'T00:00:00')
    if (periodo === '7d')  { d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }
    if (periodo === '30d') { d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }
    if (periodo === 'mes') { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
    return null
}

// ─── Configuración de canales ────────────────────────────────────
const CANAL_CONFIG = {
    pagina_web:        { label: 'Web',            cls: 'text-blue-600 bg-blue-100 dark:bg-blue-500/15' },
    whatsapp_bot:      { label: 'Bot',            cls: 'text-green-600 bg-green-100 dark:bg-green-500/15' },
    whatsapp:          { label: 'WhatsApp',       cls: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/15' },
    whatsapp_delivery: { label: 'WA Delivery',    cls: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-500/15' },
    en_tienda:         { label: 'Tienda',         cls: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15' },
    presencial:        { label: 'Presencial',     cls: 'text-violet-600 bg-violet-100 dark:bg-violet-500/15' },
    agente_presencial: { label: 'Agente',         cls: 'text-amber-700 bg-amber-100 dark:bg-amber-500/15' },
    agente_delivery:   { label: 'Ag. Delivery',   cls: 'text-sky-700 bg-sky-100 dark:bg-sky-500/15' },
}

const ESTADO_CONFIG = {
    pendiente:      { label: 'Pendiente',    cls: 'text-amber-700 bg-amber-100 dark:bg-amber-500/15' },
    pendiente_pago: { label: 'Pend. pago',   cls: 'text-amber-700 bg-amber-100 dark:bg-amber-500/15' },
    confirmado:     { label: 'Confirmado',   cls: 'text-blue-700 bg-blue-100 dark:bg-blue-500/15' },
    confirmada:     { label: 'Confirmada',   cls: 'text-blue-700 bg-blue-100 dark:bg-blue-500/15' },
    en_camino:      { label: 'En camino',    cls: 'text-violet-700 bg-violet-100 dark:bg-violet-500/15' },
    entregado:      { label: 'Entregado',    cls: 'text-green-700 bg-green-100 dark:bg-green-500/15' },
    cancelado:      { label: 'Cancelado',    cls: 'text-red-600 bg-red-100 dark:bg-red-500/15' },
    cancelada:      { label: 'Cancelada',    cls: 'text-red-600 bg-red-100 dark:bg-red-500/15' },
    expirada:       { label: 'Expirada',     cls: 'text-slate-500 bg-slate-100 dark:bg-slate-700' },
}

function CanalBadge({ canal }) {
    const cfg = CANAL_CONFIG[canal] || { label: canal, cls: 'text-slate-500 bg-slate-100 dark:bg-slate-700' }
    return (
        <span className={`whitespace-nowrap rounded-xl px-2 py-0.5 text-[11px] font-bold ${cfg.cls}`}>
            {cfg.label}
        </span>
    )
}

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CONFIG[estado] || { label: estado, cls: 'text-slate-500 bg-slate-100 dark:bg-slate-700' }
    return (
        <span className={`whitespace-nowrap rounded-xl px-2 py-0.5 text-[11px] font-bold ${cfg.cls}`}>
            {cfg.label}
        </span>
    )
}

// ─── Fila expandible ────────────────────────────────────────────
function FilaOrden({ orden }) {
    const [abierta, setAbierta] = useState(false)
    const total = calcTotal(orden)
    const items = (orden.items || []).filter(it => it.id)
    const esDelivery = orden.tipo_entrega === 'delivery' || orden.modalidad === 'delivery'

    return (
        <>
            {/* Fila principal */}
            <tr
                onClick={() => setAbierta(v => !v)}
                className={`cursor-pointer transition-colors ${abierta ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
            >
                <td className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-blue-500">
                    {orden.numero_pedido || `#${orden.id}`}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {formatearFecha(orden.created_at)}
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-[13px] text-slate-900 dark:text-slate-100">
                    {orden.cliente_nombre || '—'}
                </td>
                <td className="px-4 py-3">
                    <CanalBadge canal={orden.canal} />
                </td>
                <td className="px-4 py-3">
                    <EstadoBadge estado={orden.estado} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {esDelivery ? 'Delivery' : 'Retiro'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">
                    {gs(total)}
                </td>
                <td className="px-4 py-3 text-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`inline-block text-slate-400 transition-transform dark:text-slate-500 ${abierta ? 'rotate-90' : ''}`}>
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </td>
            </tr>

            {/* Fila expandida */}
            {abierta && (
                <tr>
                    <td colSpan={8} className="p-0">
                        <div className="grid grid-cols-1 gap-5 border-t border-slate-200 border-b-2 border-b-blue-500/25 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900 md:grid-cols-[1.4fr_1fr]">
                            {/* Columna izquierda — items */}
                            <div>
                                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Productos
                                </p>
                                {items.length === 0
                                    ? <p className="text-[13px] text-slate-400 dark:text-slate-500">Sin items</p>
                                    : items.map((it, idx) => (
                                        <div key={idx} className={`flex items-baseline justify-between gap-3 py-1.5 ${idx < items.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                                            <span className="flex-1 text-[13px] text-slate-900 dark:text-slate-100">
                                                {it.producto_nombre || it.presentacion_nombre || 'Producto'}{it.presentacion_nombre && it.producto_nombre ? ` — ${it.presentacion_nombre}` : ''} <span className="text-slate-500 dark:text-slate-400">x{it.cantidad}</span>
                                            </span>
                                            <span className="whitespace-nowrap text-[13px] font-semibold text-slate-900 dark:text-slate-100">{gs(it.precio_total)}</span>
                                        </div>
                                    ))
                                }
                                <div className="mt-2.5 flex flex-col gap-1 border-t border-slate-200 pt-2 dark:border-slate-700">
                                    {Number(orden.costo_delivery) > 0 && (
                                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>Delivery{orden.zona_delivery ? ` — ${orden.zona_delivery}` : ''}</span>
                                            <span>{gs(orden.costo_delivery)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-slate-100">
                                        <span>Total</span>
                                        <span className="text-blue-500">{gs(total)}</span>
                                    </div>
                                </div>
                                {orden.notas && (
                                    <p className="mt-2.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                        Notas: {orden.notas}
                                    </p>
                                )}
                            </div>

                            {/* Columna derecha — entrega + pago */}
                            <div>
                                <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Entrega y pago
                                </p>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                                    {[
                                        ['Tipo',      esDelivery ? 'Delivery' : 'Retiro en local'],
                                        ['Cliente',   orden.cliente_nombre],
                                        ['Telefono',  orden.cliente_telefono],
                                        ['Zona',      orden.zona_delivery],
                                        ['Direccion', orden.ubicacion || orden.direccion],
                                        ['Maps',      orden.maps_url ? { link: orden.maps_url } : null],
                                        ['Referencia',orden.referencia],
                                        ['Horario',   orden.horario],
                                        ['Recibe',    orden.contacto_entrega],
                                        ['Pago',      orden.metodo_pago
                                            ? (orden.metodo_pago === 'efectivo' ? 'Efectivo' : orden.metodo_pago === 'transferencia' ? 'Transferencia' : orden.metodo_pago)
                                            : null],
                                        ['Factura',   orden.quiere_factura
                                            ? `${orden.razon_social || ''}${orden.ruc_factura ? ' / RUC ' + orden.ruc_factura : ''}`
                                            : null],
                                    ].filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} className="contents">
                                            <dt className="whitespace-nowrap font-semibold text-slate-500 dark:text-slate-400">{k}:</dt>
                                            <dd className="m-0 break-words text-slate-900 dark:text-slate-100">
                                                {typeof v === 'object' && v?.link
                                                    ? <a href={v.link} target="_blank" rel="noopener noreferrer" className="font-bold text-green-600 no-underline">Abrir Maps</a>
                                                    : v
                                                }
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

// ─── KPI Card ────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, color }) {
    return (
        <Card>
            <CardContent className="min-w-0 px-5 py-4">
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-xl font-extrabold leading-none" style={{ color }}>
                    <span className={color ? '' : 'text-slate-900 dark:text-slate-100'}>{valor}</span>
                </p>
                {sub && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
            </CardContent>
        </Card>
    )
}

// ─── Página principal ────────────────────────────────────────────
export default function HistorialPedidos() {
    const [ordenes, setOrdenes]       = useState([])
    const [cargando, setCargando]     = useState(true)
    const [tabCanal, setTabCanal]     = useState('todos')
    const [estado, setEstado]         = useState('')
    const [periodo, setPeriodo]       = useState('30d')
    const [buscar, setBuscar]         = useState('')
    const [buscarDebounce, setBuscarDebounce] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setBuscarDebounce(buscar), 350)
        return () => clearTimeout(t)
    }, [buscar])

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const params = new URLSearchParams({ limite: '300' })
            if (tabCanal === 'web')  params.set('canal', 'pagina_web')
            if (tabCanal === 'bot')  params.set('canal', 'whatsapp_bot,whatsapp,whatsapp_delivery')
            if (tabCanal === 'todos') params.set('canal', 'pagina_web,whatsapp_bot,whatsapp,whatsapp_delivery,agente_presencial,agente_delivery')
            if (estado) params.set('estado', estado)
            const desde = toFechaDesde(periodo)
            if (desde) params.set('fecha_desde', desde)
            if (buscarDebounce) params.set('buscar', buscarDebounce)
            const { data } = await api.get(`/ordenes?${params}`)
            setOrdenes(Array.isArray(data) ? data : [])
        } catch {
            setOrdenes([])
        } finally {
            setCargando(false)
        }
    }, [tabCanal, estado, periodo, buscarDebounce])

    useEffect(() => { cargar() }, [cargar])

    // KPIs
    const totalIngresos  = ordenes.reduce((s, o) => s + calcTotal(o), 0)
    const countWeb       = ordenes.filter(o => o.canal === 'pagina_web').length
    const countBot       = ordenes.filter(o => ['whatsapp_bot', 'whatsapp', 'whatsapp_delivery'].includes(o.canal)).length
    const ticketPromedio = ordenes.length ? Math.round(totalIngresos / ordenes.length) : 0

    const TABS_CANAL = [
        { id: 'todos', label: 'Todos los canales' },
        { id: 'web',   label: 'Pagina Web' },
        { id: 'bot',   label: 'WhatsApp Bot' },
    ]
    const PERIODOS = [
        { id: 'hoy',  label: 'Hoy' },
        { id: '7d',   label: '7 dias' },
        { id: '30d',  label: '30 dias' },
        { id: 'mes',  label: 'Este mes' },
        { id: 'todo', label: 'Todo' },
    ]
    const ESTADOS = [
        { v: '', l: 'Todos los estados' },
        { v: 'pendiente',  l: 'Pendiente' },
        { v: 'confirmado', l: 'Confirmado' },
        { v: 'confirmada', l: 'Confirmada' },
        { v: 'en_camino',  l: 'En camino' },
        { v: 'entregado',  l: 'Entregado' },
        { v: 'cancelado',  l: 'Cancelado' },
        { v: 'cancelada',  l: 'Cancelada' },
        { v: 'expirada',   l: 'Expirada' },
    ]

    const inputCls = 'rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none transition-shadow focus:border-slate-300 dark:focus:border-slate-600 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-slate-100/5'

    return (
        <div className="min-h-screen bg-slate-50 px-5 pb-12 pt-6 dark:bg-slate-900">
            <div className="mx-auto max-w-[1200px]">

                {/* Encabezado */}
                <div className="mb-6">
                    <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Historial de Pedidos</h1>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Pedidos recibidos por pagina web y WhatsApp bot</p>
                </div>

                {/* KPIs */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <KpiCard label="Total pedidos"   valor={ordenes.length}   sub="en el periodo" />
                    <KpiCard label="Ingresos"        valor={gs(totalIngresos)} sub={`ticket prom. ${gs(ticketPromedio)}`} color="#3b82f6" />
                    <KpiCard label="Pedidos web"     valor={countWeb}          sub="canal pagina_web" color="#2563eb" />
                    <KpiCard label="Pedidos bot"     valor={countBot}          sub="canal whatsapp" color="#16a34a" />
                </div>

                {/* Tabs canal */}
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {TABS_CANAL.map(t => (
                        <button key={t.id} onClick={() => setTabCanal(t.id)}
                            className={`whitespace-nowrap rounded-full px-4.5 py-2 text-[13px] font-semibold transition-colors ${tabCanal === t.id ? 'bg-blue-500 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
                        >{t.label}</button>
                    ))}
                </div>

                {/* Filtros */}
                <Card className="mb-5">
                    <CardContent className="flex flex-wrap items-center gap-2.5 px-4 py-3.5">
                        <input
                            type="text"
                            placeholder="Buscar cliente o #pedido..."
                            value={buscar}
                            onChange={e => setBuscar(e.target.value)}
                            className={`${inputCls} min-w-[140px] flex-1 basis-[180px]`}
                        />
                        <Select value={periodo} onValueChange={setPeriodo}>
                            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PERIODOS.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={estado} onValueChange={setEstado}>
                            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ESTADOS.map(e => <SelectItem key={e.v} value={e.v}>{e.l}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={cargar} className="shrink-0">
                            Actualizar
                        </Button>
                    </CardContent>
                </Card>

                {/* Tabla */}
                <Card className="py-0 gap-0">
                    {cargando ? (
                        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                            Cargando pedidos...
                        </div>
                    ) : ordenes.length === 0 ? (
                        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                            No hay pedidos en este periodo
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                                        {['#Pedido', 'Fecha', 'Cliente', 'Canal', 'Estado', 'Tipo', 'Total', ''].map(h => (
                                            <th key={h} className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${h === 'Total' ? 'text-right' : 'text-left'}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordenes.map(o => (
                                        <FilaOrden key={o.id} orden={o} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!cargando && ordenes.length > 0 && (
                        <div className="border-t border-slate-200 px-4 py-2.5 text-right text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                            {ordenes.length} pedido{ordenes.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}
