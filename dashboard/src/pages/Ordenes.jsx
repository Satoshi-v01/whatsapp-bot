import { useState, useEffect } from 'react'
import { getOrdenes, cancelarOrden } from '../services/ordenes'
import ModalConfirmar from '../components/ModalConfirmar'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'
import { formatearFecha } from '../utils/fecha'

function Ordenes() {
    const [ordenes, setOrdenes] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('pendiente')
    const [filtroCanal, setFiltroCanal] = useState('')
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const navigate = useNavigate()
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        rowActive: darkMode ? '#1e3a5f' : '#eff6ff',
        inputBg: darkMode ? '#0f172a' : 'white',
    }

    const estadoConfig = {
        pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: '#fef3c7', textColor: '#92400e' },
        confirmada: { label: 'Confirmada', color: '#10b981', bg: '#d1fae5', textColor: '#065f46' },
        expirada:   { label: 'Expirada',   color: '#94a3b8', bg: '#f1f5f9', textColor: '#475569' },
        cancelada:  { label: 'Cancelada',  color: '#ef4444', bg: '#fee2e2', textColor: '#991b1b' },
    }

    const filtros = [
        { valor: 'pendiente', label: 'Pendientes' },
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

    return (
        <div className="ordenes-wrap" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: s.bg, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${s.border}`, background: s.surface }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Ordenes de Pedido</h1>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>Gestion de ordenes pendientes de confirmacion</p>
                    </div>
                    <button onClick={cargarOrdenes}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surfaceLow, color: s.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                        Actualizar
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {filtros.map(f => {
                        const cfg = estadoConfig[f.valor]
                        const activo = filtroEstado === f.valor
                        const count = ordenes.filter(o => f.valor ? o.estado === f.valor : true).length
                        return (
                            <button key={f.valor} onClick={() => setFiltroEstado(f.valor)}
                                style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: activo ? (cfg?.color || '#1a1a2e') : s.surfaceLow, color: activo ? 'white' : s.textMuted, borderColor: activo ? (cfg?.color || '#1a1a2e') : s.border }}>
                                {f.label} ({count})
                            </button>
                        )
                    })}
                </div>

                {/* Filtro canal */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    {[
                        { valor: '',           label: 'Todos los canales' },
                        { valor: 'whatsapp',   label: 'WhatsApp' },
                        { valor: 'pagina_web', label: 'Tienda Web' },
                    ].map(f => {
                        const activo = filtroCanal === f.valor
                        return (
                            <button key={f.valor} onClick={() => setFiltroCanal(f.valor)}
                                style={{ padding: '4px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: activo ? (f.valor === 'pagina_web' ? '#7c3aed' : f.valor === 'whatsapp' ? '#25D366' : '#1a1a2e') : s.surfaceLow, color: activo ? 'white' : s.textMuted, borderColor: activo ? (f.valor === 'pagina_web' ? '#7c3aed' : f.valor === 'whatsapp' ? '#25D366' : '#1a1a2e') : s.border }}>
                                {f.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Contenido */}
            <div className="split-content" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Lista */}
                <div className={`split-list${ordenSeleccionada ? ' has-detail' : ''}`} style={{ width: '380px', borderRight: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.surface, flexShrink: 0, overflowY: 'auto' }}>
                    {cargando ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</div>
                    ) : ordenes.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>
                            <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.4 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                            <p style={{ fontSize: '13px' }}>No hay ordenes en este estado.</p>
                        </div>
                    ) : ordenes.map(o => {
                        const cfg = estadoConfig[o.estado] || {}
                        const activo = ordenSeleccionada?.id === o.id
                        const total = calcularTotal(o)
                        const tiempoRest = o.estado === 'pendiente' ? tiempoRestante(o.expira_at) : null
                        const porExpirar = tiempoRest && !tiempoRest.includes('h') && parseInt(tiempoRest) < 30

                        return (
                            <div key={o.id} onClick={() => setOrdenSeleccionada(o)}
                                style={{ padding: '14px 16px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: activo ? s.rowActive : s.surface, borderLeft: `3px solid ${activo ? '#3b82f6' : 'transparent'}` }}
                                onMouseEnter={e => { if (!activo) e.currentTarget.style.background = s.surfaceLow }}
                                onMouseLeave={e => { if (!activo) e.currentTarget.style.background = s.surface }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '800', color: s.text }}>{o.numero}</span>
                                        {o.canal === 'pagina_web' && (
                                            <span style={{ padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: '#ede9fe', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                                Tienda Web
                                            </span>
                                        )}
                                        {(() => {
                                            const entrega = o.tipo_entrega || o.modalidad
                                            if (!entrega) return null
                                            return (
                                                <span style={{ padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: entrega === 'delivery' ? '#dbeafe' : '#dcfce7', color: entrega === 'delivery' ? '#1d4ed8' : '#166534', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    {entrega === 'delivery'
                                                        ? <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery</>
                                                        : <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Retiro</>
                                                    }
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: cfg.textColor, background: darkMode ? `${cfg.color}30` : cfg.bg }}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: s.text, fontWeight: '600', marginBottom: '2px' }}>
                                    {o.cliente_nombre || o.cliente_numero || 'Sin nombre'}
                                </p>
                                <p style={{ fontSize: '11px', color: s.textMuted, marginBottom: '4px' }}>
                                    {o.items?.filter(i => i.producto_nombre).slice(0, 2).map(i => `${i.producto_nombre} x${i.cantidad}`).join(', ')}
                                    {o.items?.length > 2 && ` +${o.items.length - 2} mas`}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '800', color: s.text }}>Gs. {total.toLocaleString('es-PY')}</span>
                                    {tiempoRest && (
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: porExpirar ? '#ef4444' : s.textFaint }}>
                                            {tiempoRest}
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '4px' }}>{formatearFecha(o.created_at)}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Detalle */}
                <div className={`split-detail${ordenSeleccionada ? ' has-detail' : ''}`} style={{ flex: 1, overflowY: 'auto', background: s.bg }}>
                    {!ordenSeleccionada ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: s.textMuted }}>
                            <span style={{ opacity: 0.3 }}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>Selecciona una orden para ver los detalles</p>
                        </div>
                    ) : (
                        <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>

                            {/* Header orden */}
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '20px', border: `1px solid ${s.border}`, marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: '800', color: s.text }}>{ordenSeleccionada.numero}</h2>
                                            {ordenSeleccionada.canal === 'pagina_web' && (
                                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: '#ede9fe', color: '#6d28d9', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                                                    Tienda Web
                                                </span>
                                            )}
                                            {(() => {
                                                const entrega = ordenSeleccionada.tipo_entrega || ordenSeleccionada.modalidad
                                                if (!entrega) return null
                                                return (
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: entrega === 'delivery' ? '#dbeafe' : '#dcfce7', color: entrega === 'delivery' ? '#1d4ed8' : '#166534', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        {entrega === 'delivery'
                                                            ? <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Delivery</>
                                                            : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>Retiro en tienda</>
                                                        }
                                                    </span>
                                                )
                                            })()}
                                        </div>
                                        <p style={{ fontSize: '12px', color: s.textMuted }}>
                                            Creada: {formatearFecha(ordenSeleccionada.created_at)}
                                        </p>
                                        {ordenSeleccionada.estado === 'pendiente' && (
                                            <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
                                                Expira: {formatearFecha(ordenSeleccionada.expira_at)} ({tiempoRestante(ordenSeleccionada.expira_at)})
                                            </p>
                                        )}
                                    </div>
                                    {ordenSeleccionada.estado === 'pendiente' && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleProcesarEnCaja(ordenSeleccionada)}
                                                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
                                                Procesar en Caja
                                            </button>
                                            <button onClick={() => handleCancelar(ordenSeleccionada)}
                                                style={{ padding: '10px 16px', borderRadius: '8px', border: `1px solid #fca5a5`, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                                Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Info cliente */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Cliente', val: ordenSeleccionada.cliente_nombre },
                                        { label: 'Telefono', val: ordenSeleccionada.cliente_telefono || ordenSeleccionada.cliente_numero },
                                        { label: 'Canal', val: ordenSeleccionada.canal },
                                        { label: 'Metodo de pago', val: ordenSeleccionada.metodo_pago },
                                        { label: 'Zona', val: ordenSeleccionada.zona_delivery },
                                    ].filter(i => i.val).map((item, i) => (
                                        <div key={i} style={{ padding: '8px 12px', background: s.surfaceLow, borderRadius: '8px' }}>
                                            <p style={{ fontSize: '9px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', marginBottom: '2px' }}>{item.label}</p>
                                            <p style={{ fontSize: '12px', color: s.text, fontWeight: '500' }}>{item.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Items */}
                            <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', marginBottom: '16px' }}>
                                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${s.borderLight}`, background: s.surfaceLow }}>
                                    <p style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>Productos</p>
                                </div>
                                {ordenSeleccionada.items?.filter(i => i.producto_nombre).map((item, i) => (
                                    <div key={i} style={{ padding: '12px 18px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>
                                                {item.marca_nombre && `${item.marca_nombre} — `}{item.producto_nombre}
                                            </p>
                                            <p style={{ fontSize: '11px', color: s.textMuted }}>{item.presentacion_nombre} x{item.cantidad}</p>
                                        </div>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>Gs. {(item.precio_total || 0).toLocaleString('es-PY')}</p>
                                    </div>
                                ))}
                                {ordenSeleccionada.costo_delivery > 0 && (
                                    <div style={{ padding: '12px 18px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between' }}>
                                        <p style={{ fontSize: '13px', color: s.textMuted }}>Delivery a {ordenSeleccionada.zona_delivery}</p>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>Gs. {ordenSeleccionada.costo_delivery.toLocaleString('es-PY')}</p>
                                    </div>
                                )}
                                <div style={{ padding: '14px 18px', background: '#1a1a2e', display: 'flex', justifyContent: 'space-between' }}>
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#94a3b8' }}>Total</p>
                                    <p style={{ fontSize: '16px', fontWeight: '800', color: '#10b981' }}>Gs. {calcularTotal(ordenSeleccionada).toLocaleString('es-PY')}</p>
                                </div>
                            </div>

                            {/* Datos de entrega */}
                            {(ordenSeleccionada.tipo_entrega || ordenSeleccionada.modalidad) === 'delivery' && (
                                <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, padding: '18px', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Datos de entrega</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {[
                                            { label: 'Ubicacion', val: ordenSeleccionada.ubicacion },
                                            { label: 'Referencia', val: ordenSeleccionada.referencia },
                                            { label: 'Horario', val: ordenSeleccionada.horario },
                                            { label: 'Contacto', val: ordenSeleccionada.contacto_entrega },
                                        ].filter(i => i.val).map((item, i) => (
                                            <div key={i} style={{ display: 'flex', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: s.textFaint, minWidth: '80px' }}>{item.label}:</span>
                                                <span style={{ fontSize: '12px', color: s.text }}>{item.val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            {ordenSeleccionada.notas && (
                                <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, padding: '18px' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Notas</p>
                                    <p style={{ fontSize: '13px', color: s.text }}>{ordenSeleccionada.notas}</p>
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