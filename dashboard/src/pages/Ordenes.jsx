import { useState, useEffect } from 'react'
import { getOrdenes, cancelarOrden, liberarOrden } from '../services/ordenes'
import ModalConfirmar from '../components/ModalConfirmar'
import { useNavigate } from 'react-router-dom'
import { formatearFecha } from '../utils/fecha'
import { Button } from '@/components/ui/button'

const estadoConfig = {
    pendiente:  { label: 'Pendiente',  activeCls: 'border-amber-500 bg-amber-500', badgeCls: 'text-amber-800 bg-amber-100 dark:bg-amber-500/20 dark:text-amber-300' },
    procesando: { label: 'En proceso', activeCls: 'border-blue-500 bg-blue-500', badgeCls: 'text-blue-800 bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300' },
    confirmada: { label: 'Confirmada', activeCls: 'border-green-500 bg-green-500', badgeCls: 'text-green-800 bg-green-100 dark:bg-green-500/20 dark:text-green-300' },
    expirada:   { label: 'Expirada',   activeCls: 'border-slate-400 bg-slate-400', badgeCls: 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300' },
    cancelada:  { label: 'Cancelada',  activeCls: 'border-red-500 bg-red-500', badgeCls: 'text-red-800 bg-red-100 dark:bg-red-500/20 dark:text-red-300' },
}

function Ordenes() {
    const [ordenes, setOrdenes] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('pendiente')
    const [filtroCanal, setFiltroCanal] = useState('')
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const navigate = useNavigate()

    const filtros = [
        { valor: 'pendiente', label: 'Pendientes' },
        { valor: 'procesando', label: 'En proceso' },
        { valor: 'confirmada', label: 'Confirmadas' },
        { valor: 'expirada', label: 'Expiradas' },
        { valor: 'cancelada', label: 'Canceladas' },
        { valor: '', label: 'Todas' },
    ]

    useEffect(() => { cargarOrdenes() }, [filtroEstado, filtroCanal])

    async function cargarOrdenes() {
        try {
            setCargando(true)
            const params = {}
            if (filtroEstado) params.estado = filtroEstado
            if (filtroCanal) params.canal = filtroCanal
            const datos = await getOrdenes(params)
            setOrdenes(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar las ordenes.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function tiempoRestante(expira_at) {
        if (!expira_at) return null
        const diff = new Date(expira_at) - new Date()
        if (diff <= 0) return 'Expirada'
        const mins = Math.floor(diff / 60000)
        const hrs = Math.floor(mins / 60)
        if (hrs > 0) return `${hrs}h ${mins % 60}m restantes`
        return `${mins}m restantes`
    }

    function calcularTotal(orden) {
        if (!orden.items) return 0
        const subtotal = orden.items.reduce((sum, i) => sum + (i.precio_total || 0), 0)
        return subtotal + (orden.costo_delivery || 0)
    }

    function handleProcesarEnCaja(orden) {
        sessionStorage.setItem('op_precargada', JSON.stringify(orden))
        navigate('/dashboard/caja')
    }

    function handleCancelar(orden) {
        setModalConfirmar({
            titulo: 'Cancelar orden',
            mensaje: `Cancelar la orden ${orden.numero}? Esta accion no se puede deshacer.`,
            textoBoton: 'Cancelar orden',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await cancelarOrden(orden.id, 'Cancelada por agente')
                    setModalConfirmar(null)
                    if (ordenSeleccionada?.id === orden.id) setOrdenSeleccionada(null)
                    await cargarOrdenes()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cancelar la orden.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    function handleLiberar(orden) {
        setModalConfirmar({
            titulo: 'Liberar orden',
            mensaje: `La orden ${orden.numero} quedo "en proceso" sin confirmarse (probablemente el agente cerro Caja antes de terminar). Liberarla la vuelve a dejar "pendiente" para procesarla de nuevo.`,
            textoBoton: 'Liberar',
            colorBoton: '#3b82f6',
            onConfirmar: async () => {
                try {
                    await liberarOrden(orden.id)
                    setModalConfirmar(null)
                    if (ordenSeleccionada?.id === orden.id) setOrdenSeleccionada(null)
                    await cargarOrdenes()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo liberar la orden.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    return (
        <div className="ordenes-wrap flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">

            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-7 py-5 dark:border-slate-700 dark:bg-slate-800">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Ordenes de Pedido</h1>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Gestion de ordenes pendientes de confirmacion</p>
                    </div>
                    <Button variant="outline" onClick={cargarOrdenes}>Actualizar</Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {filtros.map(f => {
                        const cfg = estadoConfig[f.valor]
                        const activo = filtroEstado === f.valor
                        const count = ordenes.filter(o => f.valor ? o.estado === f.valor : true).length
                        return (
                            <button key={f.valor} onClick={() => setFiltroEstado(f.valor)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors ${activo ? `${cfg?.activeCls || 'border-slate-900 bg-slate-900'} text-white` : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {f.label} ({count})
                            </button>
                        )
                    })}
                </div>

                {/* Filtro canal */}
                <div className="mt-2 flex gap-1.5">
                    {[
                        { valor: '',           label: 'Todos los canales', cls: 'border-slate-900 bg-slate-900' },
                        { valor: 'whatsapp',   label: 'WhatsApp', cls: 'border-[#25D366] bg-[#25D366]' },
                        { valor: 'pagina_web', label: 'Tienda Web', cls: 'border-violet-600 bg-violet-600' },
                    ].map(f => {
                        const activo = filtroCanal === f.valor
                        return (
                            <button key={f.valor} onClick={() => setFiltroCanal(f.valor)}
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${activo ? `${f.cls} text-white` : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                {f.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Contenido */}
            <div className="split-content flex flex-1 overflow-hidden">

                {/* Lista */}
                <div className={`split-list${ordenSeleccionada ? ' has-detail' : ''} flex w-[380px] shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800`}>
                    {cargando ? (
                        <div className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando...</div>
                    ) : ordenes.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 dark:text-slate-400">
                            <span className="mb-2 flex justify-center opacity-40"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                            <p className="text-[13px]">No hay ordenes en este estado.</p>
                        </div>
                    ) : ordenes.map(o => {
                        const cfg = estadoConfig[o.estado] || {}
                        const activo = ordenSeleccionada?.id === o.id
                        const total = calcularTotal(o)
                        const tiempoRest = o.estado === 'pendiente' ? tiempoRestante(o.expira_at) : null
                        const porExpirar = tiempoRest && !tiempoRest.includes('h') && parseInt(tiempoRest) < 30

                        return (
                            <div key={o.id} onClick={() => setOrdenSeleccionada(o)}
                                className={`cursor-pointer border-b border-slate-100 px-4 py-3.5 transition-colors dark:border-slate-700 ${activo ? 'border-l-[3px] border-l-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-l-[3px] border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}>
                                <div className="mb-1 flex items-start justify-between">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">{o.numero}</span>
                                        {o.canal === 'pagina_web' && (
                                            <span className="inline-flex items-center gap-1 rounded-xl bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                                Tienda Web
                                            </span>
                                        )}
                                        {(() => {
                                            const entrega = o.tipo_entrega || o.modalidad
                                            if (!entrega) return null
                                            return (
                                                <span className={`inline-flex items-center gap-1 rounded-xl px-1.5 py-0.5 text-[10px] font-bold ${entrega === 'delivery' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}`}>
                                                    {entrega === 'delivery'
                                                        ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery</>
                                                        : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Retiro</>
                                                    }
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <span className={`rounded-xl px-2 py-0.5 text-[10px] font-bold ${cfg.badgeCls}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="mb-0.5 flex items-center gap-1.5">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                        {o.cliente_nombre || o.cliente_numero || 'Sin nombre'}
                                    </p>
                                    {o.comprobante_url && (
                                        <span title="Comprobante recibido" className="inline-flex items-center gap-0.5 rounded-xl bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-800 dark:bg-green-500/20 dark:text-green-300">
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                            Comprobante
                                        </span>
                                    )}
                                </div>
                                <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    {o.items?.filter(i => i.producto_nombre).slice(0, 2).map(i => `${i.producto_nombre} x${i.cantidad}`).join(', ')}
                                    {o.items?.length > 2 && ` +${o.items.length - 2} mas`}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Gs. {total.toLocaleString('es-PY')}</span>
                                    {tiempoRest && (
                                        <span className={`text-[10px] font-bold ${porExpirar ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {tiempoRest}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">{formatearFecha(o.created_at)}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Detalle */}
                <div className={`split-detail${ordenSeleccionada ? ' has-detail' : ''} flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900`}>
                    {!ordenSeleccionada ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                            <span className="opacity-30"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                            <p className="text-sm font-medium">Selecciona una orden para ver los detalles</p>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-[700px] p-6">

                            {/* Header orden */}
                            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{ordenSeleccionada.numero}</h2>
                                            {ordenSeleccionada.canal === 'pagina_web' && (
                                                <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                                    Tienda Web
                                                </span>
                                            )}
                                            {(() => {
                                                const entrega = ordenSeleccionada.tipo_entrega || ordenSeleccionada.modalidad
                                                if (!entrega) return null
                                                return (
                                                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-[11px] font-bold ${entrega === 'delivery' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'}`}>
                                                        {entrega === 'delivery'
                                                            ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery</>
                                                            : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Retiro en tienda</>
                                                        }
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Creada: {formatearFecha(ordenSeleccionada.created_at)}
                                        </p>
                                        {ordenSeleccionada.estado === 'pendiente' && (
                                            <p className="mt-1 text-xs font-semibold text-amber-500">
                                                Expira: {formatearFecha(ordenSeleccionada.expira_at)} ({tiempoRestante(ordenSeleccionada.expira_at)})
                                            </p>
                                        )}
                                    </div>
                                    {ordenSeleccionada.estado === 'pendiente' && (
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleProcesarEnCaja(ordenSeleccionada)} className="bg-green-600 font-extrabold hover:bg-green-700">
                                                Procesar en Caja
                                            </Button>
                                            <Button variant="destructive" onClick={() => handleCancelar(ordenSeleccionada)}>
                                                Cancelar
                                            </Button>
                                        </div>
                                    )}
                                    {ordenSeleccionada.estado === 'procesando' && (
                                        <div className="flex gap-2">
                                            <Button onClick={() => handleLiberar(ordenSeleccionada)} className="bg-blue-600 font-extrabold hover:bg-blue-700">
                                                Liberar (quedo atascada)
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Info cliente */}
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Cliente', val: ordenSeleccionada.cliente_nombre },
                                        { label: 'Telefono', val: ordenSeleccionada.cliente_telefono || ordenSeleccionada.cliente_numero },
                                        { label: 'Canal', val: ordenSeleccionada.canal },
                                        { label: 'Metodo de pago', val: ordenSeleccionada.metodo_pago },
                                        { label: 'Zona', val: ordenSeleccionada.zona_delivery },
                                    ].filter(i => i.val).map((item, i) => (
                                        <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900">
                                            <p className="mb-0.5 text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500">{item.label}</p>
                                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100">{item.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Items */}
                            <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="border-b border-slate-100 bg-slate-50 px-4.5 py-3.5 dark:border-slate-700 dark:bg-slate-900">
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Productos</p>
                                </div>
                                {ordenSeleccionada.items?.filter(i => i.producto_nombre).map((item, i) => (
                                    <div key={i} className="flex items-center justify-between border-b border-slate-100 bg-white px-4.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                                        <div>
                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                                {item.marca_nombre && `${item.marca_nombre} — `}{item.producto_nombre}
                                            </p>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.presentacion_nombre} x{item.cantidad}</p>
                                        </div>
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Gs. {(item.precio_total || 0).toLocaleString('es-PY')}</p>
                                    </div>
                                ))}
                                {ordenSeleccionada.costo_delivery > 0 && (
                                    <div className="flex justify-between border-b border-slate-100 bg-white px-4.5 py-3 dark:border-slate-700 dark:bg-slate-800">
                                        <p className="text-[13px] text-slate-500 dark:text-slate-400">Delivery a {ordenSeleccionada.zona_delivery}</p>
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Gs. {ordenSeleccionada.costo_delivery.toLocaleString('es-PY')}</p>
                                    </div>
                                )}
                                <div className="flex justify-between bg-slate-900 px-4.5 py-3.5">
                                    <p className="text-[13px] font-bold text-slate-400">Total</p>
                                    <p className="text-base font-extrabold text-green-500">Gs. {calcularTotal(ordenSeleccionada).toLocaleString('es-PY')}</p>
                                </div>
                            </div>

                            {/* Datos de entrega */}
                            {(ordenSeleccionada.tipo_entrega || ordenSeleccionada.modalidad) === 'delivery' && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-700 dark:bg-slate-800">
                                    <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Datos de entrega</p>

                                    {/* Boton Maps — lo mas importante para el repartidor */}
                                    {(ordenSeleccionada.maps_url || ordenSeleccionada.ubicacion?.startsWith('http')) && (
                                        <a
                                            href={ordenSeleccionada.maps_url || ordenSeleccionada.ubicacion}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mb-3.5 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-[13px] font-bold text-white no-underline hover:bg-green-700"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            Abrir en Google Maps
                                        </a>
                                    )}

                                    <div className="flex flex-col gap-1.5">
                                        {[
                                            { label: 'Ubicacion', val: ordenSeleccionada.ubicacion },
                                            { label: 'Referencia', val: ordenSeleccionada.referencia },
                                            { label: 'Horario', val: ordenSeleccionada.horario },
                                            { label: 'Contacto', val: ordenSeleccionada.contacto_entrega },
                                        ].filter(i => i.val).map((item, i) => (
                                            <div key={i} className="flex gap-2">
                                                <span className="min-w-[80px] text-[11px] font-bold text-slate-400 dark:text-slate-500">{item.label}:</span>
                                                <span className="text-xs text-slate-900 dark:text-slate-100">{item.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            {ordenSeleccionada.notas && (
                                <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4.5 dark:border-slate-700 dark:bg-slate-800">
                                    <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">Notas</p>
                                    <p className="text-[13px] text-slate-900 dark:text-slate-100">{ordenSeleccionada.notas}</p>
                                </div>
                            )}

                            {/* Comprobante de transferencia */}
                            {ordenSeleccionada.comprobante_url ? (
                                <div className="rounded-xl border border-emerald-300 bg-white p-4.5 dark:border-emerald-500/40 dark:bg-slate-800">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                        </div>
                                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-green-800 dark:text-green-400">Comprobante de transferencia</p>
                                    </div>
                                    <a href={ordenSeleccionada.comprobante_url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img
                                            src={ordenSeleccionada.comprobante_url}
                                            alt="Comprobante de transferencia"
                                            className="block max-h-[420px] w-full rounded-lg border border-slate-200 object-contain [cursor:zoom-in] dark:border-slate-700"
                                        />
                                    </a>
                                    <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
                                        Click en la imagen para abrir en tamaño completo
                                    </p>
                                </div>
                            ) : ordenSeleccionada.metodo_pago === 'transferencia' && (
                                <div className="rounded-xl border border-amber-300 bg-white p-4.5 dark:border-amber-500/40 dark:bg-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        </div>
                                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                            Esperando comprobante de transferencia
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
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

export default Ordenes
