import { useState, useEffect } from 'react'
import { getDeliveries, actualizarEstadoDelivery, agregarNota, crearDeliveryManual } from '../services/deliveries'
import { actualizarEstadoVenta } from '../services/ventas'
import { getProductos, getCategorias } from '../services/productos'
import { buscarClientes } from '../services/clientes'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { getUsuarios, getRepartidores } from '../services/usuarios'
import { asignarRepartidor } from '../services/deliveries'
import { formatearCalidad } from '../utils/formato'
import { fechaHoyPY } from '../utils/fecha'
import { Button } from '@/components/ui/button'

const inputCls = 'mb-2.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-100/10'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const estadoConfig = {
    pendiente:  { label: 'Pendiente',  icono: 'clock',   dotCls: 'bg-amber-500',   borderCls: 'border-amber-500',   badgeCls: 'text-amber-800 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300' },
    confirmado: { label: 'Confirmado', icono: 'check',   dotCls: 'bg-blue-500',    borderCls: 'border-blue-500',    badgeCls: 'text-blue-800 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300' },
    en_camino:  { label: 'En camino',  icono: 'truck',   dotCls: 'bg-violet-500',  borderCls: 'border-violet-500',  badgeCls: 'text-violet-800 bg-violet-100 dark:bg-violet-500/20 dark:text-violet-300' },
    entregado:  { label: 'Entregado',  icono: 'package', dotCls: 'bg-green-500',   borderCls: 'border-green-500',   badgeCls: 'text-green-800 bg-green-100 dark:bg-green-500/20 dark:text-green-300' },
    cancelado:  { label: 'Cancelado',  icono: 'x',       dotCls: 'bg-red-500',     borderCls: 'border-red-500',     badgeCls: 'text-red-800 bg-red-100 dark:bg-red-500/20 dark:text-red-300' },
}

const demoras = [
    { tipo: 'demora_trafico', label: 'Demora por tráfico' },
    { tipo: 'demora_tecnica', label: 'Falla técnica' },
    { tipo: 'no_encontrado', label: 'No encontré la dirección' },
]

function Delivery() {
    const [deliveries, setDeliveries] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [detalle, setDetalle] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalNuevo, setModalNuevo] = useState(false)
    const [notaTexto, setNotaTexto] = useState('')
    const [enviandoNota, setEnviandoNota] = useState(false)
    const [repartidores, setRepartidores] = useState([])
    const [fechaFiltro, setFechaFiltro] = useState(fechaHoyPY())
    const { puedo } = useApp()

    useEffect(() => { cargarDeliveries() }, [fechaFiltro])

    async function cargarDeliveries() {
        try {
            setCargando(true)
            const [datos, repartidoresData] = await Promise.all([getDeliveries(fechaFiltro), getRepartidores()])
            setDeliveries(datos)
            setRepartidores(repartidoresData)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los deliveries.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function handleAsignarRepartidor(deliveryId, repartidorId) {
        try {
            await asignarRepartidor(deliveryId, repartidorId || null)
            await cargarDeliveries()
            if (detalle?.id === deliveryId) {
                setDetalle(prev => ({ ...prev, repartidor_id: repartidorId || null }))
            }
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo asignar el repartidor.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function cambiarEstado(id, nuevoEstado) {
        try {
            await actualizarEstadoDelivery(id, nuevoEstado)
            await cargarDeliveries()
            if (detalle?.id === id) {
                setDetalle(prev => ({ ...prev, estado: nuevoEstado }))
            }
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el estado.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function confirmarPago(ventaId) {
        try {
            await actualizarEstadoVenta(ventaId, 'pagado')
            await cargarDeliveries()
            if (detalle) setDetalle(prev => ({ ...prev, estado_venta: 'pagado' }))
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo confirmar el pago.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleAgregarNota(tipo = 'nota') {
        const texto = tipo === 'nota' ? notaTexto : demoras.find(d => d.tipo === tipo)?.label
        if (!texto?.trim()) return
        try {
            setEnviandoNota(true)
            const res = await agregarNota(detalle.id, texto, tipo)
            setNotaTexto('')
            await cargarDeliveries()
            // Actualizar detalle con historial nuevo
            setDetalle(prev => ({ ...prev, historial_notas: res.delivery.historial_notas, notas: res.delivery.notas }))
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo agregar la nota.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviandoNota(false) }
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const conteos = {}
    deliveries.forEach(d => { conteos[d.estado] = (conteos[d.estado] || 0) + 1 })
    const filtros = [
        { valor: 'todos', label: 'Todos' },
        { valor: 'pendiente', label: 'Pendiente' },
        { valor: 'confirmado', label: 'Confirmado' },
        { valor: 'en_camino', label: 'En camino' },
        { valor: 'entregado', label: 'Entregado' },
        { valor: 'cancelado', label: 'Cancelado' },
    ]
    const deliveriesFiltrados = filtroEstado === 'todos' ? deliveries : deliveries.filter(d => d.estado === filtroEstado)
    const activos = deliveries.filter(d => ['pendiente', 'confirmado', 'en_camino'].includes(d.estado)).length
    const enCamino = deliveries.filter(d => d.estado === 'en_camino').length
    const entregados = deliveries.filter(d => d.estado === 'entregado').length

    // Panel lateral derecho del detalle
    function PanelLateral({ d }) {
        const cfg = estadoConfig[d.estado] || {}
        const pagado = d.estado_venta === 'pagado'
        const historial = Array.isArray(d.historial_notas) ? d.historial_notas : []

        // Timeline de estados
        const timeline = [
            { label: 'Pedido creado', ts: d.created_at, siempre: true },
            { label: 'Confirmado', ts: d.confirmado_at },
            { label: 'En camino', ts: d.en_camino_at },
            { label: 'Entregado', ts: d.entregado_at },
            { label: 'Cancelado', ts: d.cancelado_at },
        ].filter(t => t.siempre || t.ts)

        return (
            <div className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">

                {/* Estado de pago */}
                <div className="border-b border-slate-100 p-4.5 dark:border-slate-700">
                    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado de pago</p>
                    <div className={`flex items-center gap-2.5 rounded-[10px] border px-3.5 py-3 ${pagado ? 'border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10' : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'}`}>
                        <span className={`flex ${pagado ? 'text-green-500' : 'text-amber-500'}`}>
                            {pagado
                                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            }
                        </span>
                        <div>
                            <p className={`text-sm font-extrabold ${pagado ? 'text-green-500' : 'text-amber-500'}`}>
                                {pagado ? 'Pagado' : 'Pendiente de pago'}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                                {d.metodo_pago || '—'}
                            </p>
                        </div>
                    </div>
                    {!pagado && d.metodo_pago === 'transferencia' && (
                        <button
                            onClick={() => confirmarPago(d.venta_id)}
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-green-500 px-3.5 py-2.5 text-[13px] font-extrabold text-white hover:bg-green-600"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            Pago confirmado
                        </button>
                    )}
                    {d.quiere_factura && (
                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>Factura a:</span> <strong className="text-slate-900 dark:text-slate-100">{d.razon_social || 'Sin razón social'}</strong>
                            {d.ruc_factura && <span> · RUC: {d.ruc_factura}</span>}
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="border-b border-slate-100 p-4.5 dark:border-slate-700">
                    <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Timeline</p>
                    <div className="flex flex-col">
                        {timeline.map((t, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                                <div className="flex shrink-0 flex-col items-center">
                                    <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${t.ts ? cfg.dotCls : 'bg-slate-200 dark:bg-slate-700'}`} />
                                    {i < timeline.length - 1 && <div className="h-5 w-0.5 bg-slate-100 dark:bg-slate-700" />}
                                </div>
                                <div className={i < timeline.length - 1 ? 'pb-2' : ''}>
                                    <p className={`text-xs font-semibold ${t.ts ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{t.label}</p>
                                    {t.ts && <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatearFecha(t.ts)}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Historial de notas */}
                {historial.length > 0 && (
                    <div className="border-b border-slate-100 p-4.5 dark:border-slate-700">
                        <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notas y demoras</p>
                        <div className="flex flex-col gap-1.5">
                            {historial.map((n, i) => (
                                <div key={i} className="rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] dark:bg-slate-900">
                                    <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100"><span className="shrink-0 text-slate-400 dark:text-slate-500">{iconoNota(n.tipo)}</span>{n.texto}</p>
                                    <p className="mt-0.5 text-slate-400 dark:text-slate-500">{formatearFecha(n.timestamp)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Agregar nota / demora */}
                <div className="p-4.5">
                    <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agregar nota</p>

                    {/* Botones demora rápida */}
                    <div className="mb-2.5 flex flex-col gap-1">
                        {demoras.map(dem => (
                            <button key={dem.tipo} onClick={() => handleAgregarNota(dem.tipo)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100">
                                {dem.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-1.5">
                        <input
                            value={notaTexto}
                            onChange={e => setNotaTexto(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAgregarNota('nota') }}
                            placeholder="Nota personalizada..."
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button onClick={() => handleAgregarNota('nota')} disabled={enviandoNota || !notaTexto.trim()}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold ${notaTexto.trim() ? 'cursor-pointer bg-slate-900 text-white' : 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500'}`}>
                            +
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    function iconoEstado(tipo) {
        const map = {
            clock:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
            check:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
            truck:   <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
            package: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
            x:       <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
        }
        return map[tipo] || null
    }

    function iconoNota(tipo) {
        const map = {
            demora_trafico: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
            demora_tecnica: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>,
            no_encontrado:  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
            estado:         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-8.36"/></svg>,
        }
        return map[tipo] || <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    }

    if (cargando) return (
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <p className="text-slate-500 dark:text-slate-400">Cargando deliveries...</p>
        </div>
    )

    return (
        <div className="delivery-wrap flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-7 py-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Gestión de Entregas</h1>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Panel de control de deliveries en tiempo real</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={cargarDeliveries}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.08-8.36"/></svg>
                            Actualizar
                        </Button>
                        <input
                            type="date"
                            value={fechaFiltro}
                            onChange={e => setFechaFiltro(e.target.value)}
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <Button onClick={() => setModalNuevo(true)}>
                            + Nuevo delivery
                        </Button>
                    </div>
                </div>

                <div className="delivery-stats grid grid-cols-3 gap-3">
                    {[
                        { label: 'Entregas activas', valor: activos, sub: 'pendientes y en proceso', colorCls: 'text-blue-500', bgCls: 'bg-blue-50 dark:bg-blue-950/40', icono: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
                        { label: 'En camino ahora', valor: enCamino, sub: 'repartidores en ruta', colorCls: 'text-violet-500', bgCls: 'bg-violet-50 dark:bg-violet-950/40', icono: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
                        { label: 'Entregados hoy', valor: entregados, sub: 'completados exitosamente', colorCls: 'text-green-500', bgCls: 'bg-green-50 dark:bg-green-950/40', icono: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> },
                    ].map((m, i) => (
                        <div key={i} className={`flex items-center gap-3.5 rounded-[10px] px-4.5 py-3.5 ${m.bgCls}`}>
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-white shadow-sm dark:bg-white/10 ${m.colorCls}`}>
                                {m.icono}
                            </div>
                            <div>
                                <p className={`mb-0.5 text-[10px] font-bold uppercase tracking-wide ${m.colorCls}`}>{m.label}</p>
                                <p className={`text-[22px] font-extrabold leading-none ${m.colorCls}`}>{m.valor}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{m.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div className="split-content flex flex-1 overflow-hidden">

                {/* Lista */}
                <div className={`split-list${detalle ? ' has-detail' : ''} flex w-[340px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800`}>
                    <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                        <div className="flex flex-wrap gap-1">
                            {filtros.map(f => {
                                const count = f.valor === 'todos' ? deliveries.length : (conteos[f.valor] || 0)
                                const cfg = estadoConfig[f.valor]
                                const activo = filtroEstado === f.valor
                                return (
                                    <button key={f.valor} onClick={() => setFiltroEstado(f.valor)}
                                        className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${activo ? `${cfg?.dotCls || 'bg-slate-900'} ${cfg?.borderCls || 'border-slate-900'} text-white` : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                        {f.label} <span className="opacity-80">({count})</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {deliveriesFiltrados.length === 0 ? (
                            <div className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                                <span className="mb-2 flex justify-center opacity-40"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
                                <p className="text-[13px]">No hay deliveries en este estado.</p>
                            </div>
                        ) : (
                            deliveriesFiltrados.map(d => {
                                const cfg = estadoConfig[d.estado] || {}
                                const activo = detalle?.id === d.id
                                const pagado = d.estado_venta === 'pagado'
                                return (
                                    <div key={d.id} onClick={() => setDetalle(d)}
                                        className={`cursor-pointer border-b border-slate-100 px-4 py-3.5 transition-colors dark:border-slate-700 ${activo ? 'border-l-[3px] border-l-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-l-[3px] border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                                    >
                                        <div className="mb-1 flex items-start justify-between">
                                            <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{d.cliente_nombre || d.cliente_numero || 'Sin nombre'}</span>
                                            <span className={`ml-1.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.badgeCls}`}>
                                                {iconoEstado(cfg.icono)} {cfg.label}
                                            </span>
                                        </div>
                                        <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">{d.marca_nombre && `${d.marca_nombre} — `}{d.producto_nombre} — {d.presentacion_nombre}</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100">Gs. {parseInt(d.precio).toLocaleString()}</p>
                                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${pagado ? 'text-green-500 bg-green-50 dark:bg-green-500/10' : 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'}`}>
                                                {pagado ? '✓ Pagado' : 'Pendiente'}
                                            </span>
                                        </div>
                                        {d.repartidor_nombre && (
                                            <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
                                                {d.repartidor_nombre}
                                            </p>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Area vacia cuando no hay detalle */}
                <div className="flex flex-1 items-center justify-center bg-slate-50 dark:bg-slate-950">
                    {!detalle && (
                        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                            <span className="opacity-30"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
                            <p className="text-sm font-medium">Selecciona un delivery para ver los detalles</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal detalle centrado */}
            {detalle && (() => {
                const cfg = estadoConfig[detalle.estado] || {}
                const pagado = detalle.estado_venta === 'pagado'
                const historial = Array.isArray(detalle.historial_notas) ? detalle.historial_notas : []
                const timeline = [
                    { label: 'Pedido creado', ts: detalle.created_at, siempre: true },
                    { label: 'Confirmado', ts: detalle.confirmado_at },
                    { label: 'En camino', ts: detalle.en_camino_at },
                    { label: 'Entregado', ts: detalle.entregado_at },
                    { label: 'Cancelado', ts: detalle.cancelado_at },
                ].filter(t => t.siempre || t.ts)

                return (
                    <div onClick={() => setDetalle(null)}
                        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4 py-8">
                        <div onClick={e => e.stopPropagation()}
                            className="flex max-h-[90vh] w-full max-w-[780px] flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl dark:bg-slate-950">

                            {/* Header modal */}
                            <div className="flex shrink-0 items-start justify-between rounded-t-2xl border-b border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                                <div>
                                    <h3 className="text-[17px] font-extrabold text-slate-900 dark:text-slate-100">{detalle.cliente_nombre || detalle.cliente_numero || 'Sin nombre'}</h3>
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detalle.marca_nombre && `${detalle.marca_nombre} — `}{detalle.producto_nombre} — {detalle.presentacion_nombre}</p>
                                    <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-100">Gs. {parseInt(detalle.precio).toLocaleString()}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2.5">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${cfg.badgeCls}`}>
                                        {iconoEstado(cfg.icono)} {cfg.label}
                                    </span>
                                    <button onClick={() => setDetalle(null)}
                                        className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-slate-200 text-base text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        ×
                                    </button>
                                </div>
                            </div>

                            {/* Cuerpo 2 columnas */}
                            <div className="flex flex-1 overflow-hidden">

                                {/* Columna izquierda */}
                                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">

                                    {/* Datos de entrega */}
                                    <div className="rounded-[10px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Datos de entrega</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: 'Cliente', val: detalle.cliente_nombre },
                                                { label: 'Telefono', val: detalle.cliente_telefono || detalle.cliente_numero },
                                                { label: 'Ubicacion', val: detalle.ubicacion },
                                                { label: 'Referencia', val: detalle.referencia },
                                                { label: 'Horario preferido', val: detalle.horario },
                                                { label: 'Contacto', val: detalle.contacto_entrega },
                                                { label: 'Fecha del pedido', val: formatearFecha(detalle.created_at) },
                                            ].filter(item => item.val).map((item, i) => (
                                                <div key={i} className="rounded-[7px] bg-slate-50 px-2.5 py-2 dark:bg-slate-900">
                                                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
                                                    <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{item.val}</p>
                                                </div>
                                            ))}
                                        </div>
                                        {(detalle.maps_url || detalle.ubicacion?.includes('maps.google.com') || detalle.ubicacion?.startsWith('http')) && (
                                            <a href={detalle.maps_url || detalle.ubicacion} target="_blank" rel="noreferrer"
                                                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-bold text-white no-underline hover:bg-green-700">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                                Abrir en Google Maps
                                            </a>
                                        )}
                                    </div>

                                    {/* Repartidor */}
                                    {repartidores.length > 0 && (
                                        <div className="rounded-[10px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                            <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Repartidor asignado</p>
                                            <select value={detalle.repartidor_id || ''} onChange={e => handleAsignarRepartidor(detalle.id, e.target.value ? parseInt(e.target.value) : null)}
                                                className="w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                                <option value="">Sin asignar</option>
                                                {repartidores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                            </select>
                                            {detalle.repartidor_id && detalle.asignado_at && (
                                                <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                                                    Asignado: {new Date(detalle.asignado_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* Cambiar estado */}
                                    <div className="rounded-[10px] border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                                        <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Cambiar estado</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {Object.entries(estadoConfig).map(([estado, ec]) => {
                                                const activo = detalle.estado === estado
                                                return (
                                                    <button key={estado} onClick={() => cambiarEstado(detalle.id, estado)} disabled={activo || !puedo('delivery', 'editar')}
                                                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${activo ? `${ec.dotCls} ${ec.borderCls} cursor-not-allowed font-bold text-white` : `border-slate-200 bg-slate-50 font-medium text-slate-900 hover:${ec.borderCls} dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100`}`}>
                                                        {iconoEstado(ec.icono)} {ec.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Columna derecha */}
                                <div className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 dark:border-slate-700">

                                    {/* Estado de pago */}
                                    <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                                        <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado de pago</p>
                                        <div className={`flex items-center gap-2.5 rounded-[10px] border px-3 py-2.5 ${pagado ? 'border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10' : 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10'}`}>
                                            <span className={`flex ${pagado ? 'text-green-500' : 'text-amber-500'}`}>
                                                {pagado
                                                    ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                                }
                                            </span>
                                            <div>
                                                <p className={`text-[13px] font-extrabold ${pagado ? 'text-green-500' : 'text-amber-500'}`}>{pagado ? 'Pagado' : 'Pendiente de pago'}</p>
                                                <p className="mt-px text-[11px] text-slate-400 dark:text-slate-500">{detalle.metodo_pago || '—'}</p>
                                            </div>
                                        </div>
                                        {!pagado && detalle.metodo_pago === 'transferencia' && (
                                            <button onClick={() => confirmarPago(detalle.venta_id)}
                                                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3.5 py-2.5 text-xs font-extrabold text-white hover:bg-green-600">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                                Pago confirmado
                                            </button>
                                        )}
                                        {detalle.quiere_factura && (
                                            <div className="mt-2 rounded-[7px] bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                                <span className="inline-flex items-center gap-1"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Factura a:</span> <strong className="text-slate-900 dark:text-slate-100">{detalle.razon_social || 'Sin razon social'}</strong>
                                                {detalle.ruc_factura && <span> · RUC: {detalle.ruc_factura}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                                        <p className="mb-3 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Timeline</p>
                                        <div className="flex flex-col">
                                            {timeline.map((t, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <div className="flex shrink-0 flex-col items-center">
                                                        <div className={`mt-0.5 h-[9px] w-[9px] rounded-full ${t.ts ? cfg.dotCls : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                        {i < timeline.length - 1 && <div className="h-[18px] w-0.5 bg-slate-100 dark:bg-slate-700" />}
                                                    </div>
                                                    <div className={i < timeline.length - 1 ? 'pb-1.5' : ''}>
                                                        <p className={`text-xs font-semibold ${t.ts ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{t.label}</p>
                                                        {t.ts && <p className="text-[10px] text-slate-400 dark:text-slate-500">{formatearFecha(t.ts)}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Historial de notas */}
                                    {historial.length > 0 && (
                                        <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notas y demoras</p>
                                            <div className="flex flex-col gap-1.5">
                                                {historial.map((n, i) => (
                                                    <div key={i} className="rounded-[7px] bg-slate-50 px-2.5 py-1.5 text-[11px] dark:bg-slate-900">
                                                        <p className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100"><span className="shrink-0 text-slate-400 dark:text-slate-500">{iconoNota(n.tipo)}</span>{n.texto}</p>
                                                        <p className="mt-0.5 text-slate-400 dark:text-slate-500">{formatearFecha(n.timestamp)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Agregar nota */}
                                    <div className="p-4">
                                        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agregar nota</p>
                                        <div className="mb-2 flex flex-col gap-1">
                                            {demoras.map(dem => (
                                                <button key={dem.tipo} onClick={() => handleAgregarNota(dem.tipo)}
                                                    className="rounded-[7px] border border-slate-200 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100">
                                                    {dem.label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex gap-1.5">
                                            <input value={notaTexto} onChange={e => setNotaTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAgregarNota('nota') }}
                                                placeholder="Nota personalizada..."
                                                className="flex-1 rounded-[7px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                                            <button onClick={() => handleAgregarNota('nota')} disabled={enviandoNota || !notaTexto.trim()}
                                                className={`rounded-[7px] px-3 py-1.5 text-[13px] font-bold ${notaTexto.trim() ? 'cursor-pointer bg-slate-900 text-white' : 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500'}`}>
                                                +
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* Modal nuevo delivery */}
            {modalNuevo && (
                <ModalNuevoDelivery
                    onClose={() => setModalNuevo(false)}
                    onCreado={async () => { setModalNuevo(false); await cargarDeliveries() }}
                    setModalConfirmar={setModalConfirmar}
                />
            )}

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

// Modal crear delivery manual — componente separado para mantener limpio el código
function ModalNuevoDelivery({ onClose, onCreado, setModalConfirmar }) {
    const [paso, setPaso] = useState(1)
    const [productos, setProductos] = useState([])
    const [buscarCliente, setBuscarCliente] = useState('')
    const [resultadosCliente, setResultadosCliente] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [clienteNuevo, setClienteNuevo] = useState(false)
    const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', tipo: 'persona', ruc: '', ciudad: '', direccion: '' })
    const [lineas, setLineas] = useState([]) // [{ producto, presentacion, cantidad }]
    const [buscarProducto, setBuscarProducto] = useState('')
    const [productoActual, setProductoActual] = useState(null)
    const [formEntrega, setFormEntrega] = useState({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', metodo_pago: 'efectivo', estado_pago: 'pendiente_pago', costo_delivery: 0, notas: '' })
    const [enviando, setEnviando] = useState(false)

    useEffect(() => { cargarProductos() }, [])

    async function cargarProductos() {
        try { setProductos(await getProductos()) } catch (err) {}
    }

    async function handleBuscarCliente(valor) {
        setBuscarCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try { setResultadosCliente(await buscarClientes(valor)) } catch (err) {}
    }

    const productosFiltrados = buscarProducto.trim()
        ? productos.filter(p => p.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) || (p.marca_nombre && p.marca_nombre.toLowerCase().includes(buscarProducto.toLowerCase())))
        : productos.slice(0, 20)

    function seleccionarPresentacion(producto, presentacion) {
        // Verificar si ya existe esa presentación en las líneas
        const existe = lineas.find(l => l.presentacion.id === presentacion.id)
        if (existe) {
            // Incrementar cantidad
            setLineas(prev => prev.map(l => l.presentacion.id === presentacion.id
                ? { ...l, cantidad: Math.min(l.cantidad + 1, presentacion.stock) }
                : l
            ))
        } else {
            setLineas(prev => [...prev, { producto, presentacion, cantidad: 1 }])
        }
        setProductoActual(null)
        setBuscarProducto('')
    }

    function cambiarCantidad(presentacionId, delta) {
        setLineas(prev => prev.map(l => {
            if (l.presentacion.id !== presentacionId) return l
            const nueva = Math.max(1, Math.min(l.cantidad + delta, l.presentacion.stock))
            return { ...l, cantidad: nueva }
        }))
    }

    function quitarLinea(presentacionId) {
        setLineas(prev => prev.filter(l => l.presentacion.id !== presentacionId))
    }

    const totalLineas = lineas.reduce((sum, l) => sum + (l.presentacion.precio_venta * l.cantidad), 0)

    async function handleCrear() {
        if (lineas.length === 0) return
        try {
            setEnviando(true)
            const payload = {
                cliente_id: clienteSeleccionado?.id || null,
                cliente_nuevo: !clienteSeleccionado && formCliente.nombre ? formCliente : null,
                lineas: lineas.map(l => ({
                    presentacion_id: l.presentacion.id,
                    precio: l.presentacion.precio_venta * l.cantidad,
                    cantidad: l.cantidad
                })),
                ...formEntrega,
            }
            await crearDeliveryManual(payload)
            await onCreado()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el delivery.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviando(false) }
    }

    const pasos = ['Cliente', 'Productos', 'Entrega']

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
            <div className="flex max-h-[90vh] w-[560px] flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-800">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Nuevo delivery manual</h3>
                    <button onClick={onClose} className="border-none bg-transparent text-lg text-slate-500 dark:text-slate-400">✕</button>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 border-b border-slate-200 px-6 py-3.5 dark:border-slate-700">
                    {pasos.map((p, i) => {
                        const num = i + 1
                        const activo = paso === num
                        const completo = paso > num
                        return (
                            <div key={i} className="flex items-center gap-1.5">
                                <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${activo ? 'border-slate-900 bg-slate-900 dark:border-slate-100 dark:bg-slate-100' : completo ? 'border-green-500 bg-green-500' : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
                                    <span className={`text-[11px] font-bold ${activo ? 'text-white dark:text-slate-900' : completo ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{completo ? '✓' : num}</span>
                                    <span className={`text-[11px] font-bold ${activo ? 'text-white dark:text-slate-900' : completo ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>{p}</span>
                                </div>
                                {i < pasos.length - 1 && <div className="h-px w-4 bg-slate-200 dark:bg-slate-700" />}
                            </div>
                        )
                    })}
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* Paso 1: Cliente */}
                    {paso === 1 && (
                        <div>
                            <p className="mb-4 text-[13px] text-slate-500 dark:text-slate-400">Buscá un cliente existente o creá uno nuevo.</p>
                            <input placeholder="Buscar por nombre, teléfono o RUC..." value={buscarCliente} onChange={e => handleBuscarCliente(e.target.value)} className={inputCls} />
                            {resultadosCliente.length > 0 && !clienteSeleccionado && (
                                <div className="mb-3 overflow-hidden rounded-[10px] border border-slate-200 shadow-lg dark:border-slate-700">
                                    {resultadosCliente.map(c => (
                                        <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBuscarCliente(c.nombre); setResultadosCliente([]); setClienteNuevo(false) }}
                                            className="cursor-pointer border-b border-slate-100 bg-white px-3.5 py-2.5 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-900">
                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{c.nombre}</p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.telefono && c.telefono}{c.ruc && ` · RUC: ${c.ruc}`}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {clienteSeleccionado && (
                                <div className="mb-3.5 flex items-center justify-between rounded-[10px] border border-green-300 bg-green-50 px-3.5 py-3 dark:border-green-500/40 dark:bg-green-500/10">
                                    <div>
                                        <p className="text-[13px] font-bold text-green-800 dark:text-green-300">✓ {clienteSeleccionado.nombre}</p>
                                        {clienteSeleccionado.telefono && <p className="text-[11px] text-slate-500 dark:text-slate-400">{clienteSeleccionado.telefono}</p>}
                                    </div>
                                    <button onClick={() => { setClienteSeleccionado(null); setBuscarCliente('') }} className="border-none bg-transparent text-base text-slate-500 dark:text-slate-400">✕</button>
                                </div>
                            )}
                            <button onClick={() => setClienteNuevo(!clienteNuevo)}
                                className="mb-3.5 rounded-lg border border-slate-200 bg-transparent px-3.5 py-2 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                {clienteNuevo ? '✕ Cancelar' : '+ Cliente nuevo'}
                            </button>
                            {clienteNuevo && (
                                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900">
                                    <label className={labelCls}>Nombre *</label>
                                    <input value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} className={inputCls} />
                                    <label className={labelCls}>Teléfono / WhatsApp</label>
                                    <input value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} className={inputCls} />
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div><label className={labelCls}>RUC</label><input value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} className={`${inputCls} mb-0`} /></div>
                                        <div><label className={labelCls}>Ciudad</label><input value={formCliente.ciudad} onChange={e => setFormCliente({ ...formCliente, ciudad: e.target.value })} className={`${inputCls} mb-0`} /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paso 2: Productos */}
                    {paso === 2 && (
                        <div>
                            {/* Líneas agregadas */}
                            {lineas.length > 0 && (
                                <div className="mb-4">
                                    <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        Productos seleccionados ({lineas.length})
                                    </p>
                                    <div className="flex flex-col gap-1.5">
                                        {lineas.map(l => (
                                            <div key={l.presentacion.id} className="flex items-center gap-2.5 rounded-[10px] border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                                <div className="flex-1">
                                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{l.producto.marca_nombre && `${l.producto.marca_nombre} — `}{l.producto.nombre}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{l.presentacion.nombre} · Gs. {l.presentacion.precio_venta?.toLocaleString()}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => cambiarCantidad(l.presentacion.id, -1)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">−</button>
                                                    <span className="min-w-[20px] text-center text-sm font-bold text-slate-900 dark:text-slate-100">{l.cantidad}</span>
                                                    <button onClick={() => cambiarCantidad(l.presentacion.id, 1)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">+</button>
                                                </div>
                                                <p className="min-w-[80px] text-right text-xs font-extrabold text-slate-900 dark:text-slate-100">
                                                    Gs. {(l.presentacion.precio_venta * l.cantidad).toLocaleString()}
                                                </p>
                                                <button onClick={() => quitarLinea(l.presentacion.id)}
                                                    className="border-none bg-transparent p-0.5 text-sm text-red-500">✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 flex justify-between rounded-[10px] bg-slate-900 px-3.5 py-2.5 dark:bg-slate-950">
                                        <span className="text-xs font-semibold text-slate-400">Total</span>
                                        <span className="text-sm font-extrabold text-green-500">Gs. {totalLineas.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Buscar y agregar producto */}
                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                {lineas.length === 0 ? 'Seleccioná productos' : '+ Agregar otro producto'}
                            </p>
                            <input
                                placeholder="Buscar producto..."
                                value={buscarProducto}
                                onChange={e => { setBuscarProducto(e.target.value); setProductoActual(null) }}
                                className={inputCls}
                            />

                            {!productoActual ? (
                                buscarProducto.trim() && (
                                    <div className="flex max-h-[200px] flex-col gap-1 overflow-y-auto">
                                        {productosFiltrados.map(p => (
                                            <div key={p.id} onClick={() => { setProductoActual(p); setBuscarProducto(`${p.marca_nombre ? p.marca_nombre + ' — ' : ''}${p.nombre}`) }}
                                                className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-700">
                                                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.categoria_nombre} · {formatearCalidad(p.calidad)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Elegí la presentación</p>
                                    <div className="flex flex-wrap gap-2">
                                        {productoActual.presentaciones?.filter(pr => pr.disponible && pr.stock > 0).map(pr => (
                                            <div key={pr.id} onClick={() => seleccionarPresentacion(productoActual, pr)}
                                                className="cursor-pointer rounded-[10px] border-2 border-slate-200 bg-slate-50 px-3.5 py-2.5 transition-colors hover:border-slate-900 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-100 dark:hover:bg-blue-500/10">
                                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{pr.nombre}</p>
                                                <p className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">Gs. {pr.precio_venta?.toLocaleString()}</p>
                                                <p className={`text-[10px] ${pr.stock <= 3 ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>Stock: {pr.stock}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => { setProductoActual(null); setBuscarProducto('') }}
                                        className="mt-2.5 border-none bg-transparent text-[11px] text-slate-400 dark:text-slate-500">
                                        ← Cambiar producto
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paso 3: Entrega */}
                    {paso === 3 && (
                        <div>
                            <label className={labelCls}>Ubicación / Dirección</label>
                            <input value={formEntrega.ubicacion} onChange={e => setFormEntrega({ ...formEntrega, ubicacion: e.target.value })} className={inputCls} placeholder="Barrio, calle, link de maps..." />
                            <label className={labelCls}>Referencia</label>
                            <input value={formEntrega.referencia} onChange={e => setFormEntrega({ ...formEntrega, referencia: e.target.value })} className={inputCls} placeholder="Número de casa, parada, etc." />
                            <label className={labelCls}>Horario preferido</label>
                            <input value={formEntrega.horario} onChange={e => setFormEntrega({ ...formEntrega, horario: e.target.value })} className={inputCls} placeholder="Ej: Desde las 14hs" />
                            <label className={labelCls}>Contacto que recibe</label>
                            <input value={formEntrega.contacto_entrega} onChange={e => setFormEntrega({ ...formEntrega, contacto_entrega: e.target.value })} className={inputCls} placeholder="Nombre y teléfono" />
                            <label className={labelCls}>Costo de delivery (lo cobra el repartidor, no es venta nuestra)</label>
                            <input type="number" min="0" value={formEntrega.costo_delivery} onChange={e => setFormEntrega({ ...formEntrega, costo_delivery: parseInt(e.target.value) || 0 })} className={inputCls} placeholder="0" />
                            <div className="mb-2.5 grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>Método de pago</label>
                                    <select value={formEntrega.metodo_pago} onChange={e => setFormEntrega({ ...formEntrega, metodo_pago: e.target.value })} className={inputCls}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                        <option value="tarjeta">Tarjeta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Estado de pago</label>
                                    <select value={formEntrega.estado_pago} onChange={e => setFormEntrega({ ...formEntrega, estado_pago: e.target.value })} className={inputCls}>
                                        <option value="pendiente_pago">Pendiente</option>
                                        <option value="pagado">Pagado</option>
                                    </select>
                                </div>
                            </div>
                            <label className={labelCls}>Notas internas (opcional)</label>
                            <textarea value={formEntrega.notas} onChange={e => setFormEntrega({ ...formEntrega, notas: e.target.value })} rows={2}
                                className={`${inputCls} resize-none font-sans`} placeholder="Instrucciones especiales..." />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700">
                    <button onClick={paso === 1 ? onClose : () => setPaso(paso - 1)}
                        className="rounded-lg border border-slate-200 bg-transparent px-4.5 py-2.5 text-[13px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                        {paso === 1 ? 'Cancelar' : '← Atrás'}
                    </button>

                    {paso < 3 ? (
                        <button onClick={() => setPaso(paso + 1)}
                            disabled={paso === 2 && lineas.length === 0}
                            className={`rounded-lg border-none px-5 py-2.5 text-[13px] font-bold ${(paso === 2 && lineas.length === 0) ? 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500' : 'cursor-pointer bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'}`}>
                            Siguiente →
                        </button>
                    ) : (
                        <button onClick={handleCrear} disabled={enviando}
                            className={`rounded-lg border-none px-5 py-2.5 text-[13px] font-extrabold ${enviando ? 'cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-900 dark:text-slate-500' : 'cursor-pointer bg-green-500 text-slate-900'}`}>
                            {enviando ? 'Creando...' : `✓ Crear delivery (${lineas.length} producto${lineas.length > 1 ? 's' : ''})`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Delivery
