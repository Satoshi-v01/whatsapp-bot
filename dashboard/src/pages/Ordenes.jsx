import { useState, useEffect } from 'react'
import { getOrdenes, confirmarOrden, cancelarOrden } from '../services/ordenes'
import { getProductos } from '../services/productos'
import { buscarClientes } from '../services/clientes'
import { getZonas } from '../services/zonas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../App'


function Ordenes() {
    const [ordenes, setOrdenes] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('pendiente')
    const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalConfirmarOrden, setModalConfirmarOrden] = useState(false)
    const [formConfirmar, setFormConfirmar] = useState({ modalidad: '', metodo_pago: 'efectivo' })
    const navigate = useNavigate()
    const { darkMode, puedo } = useApp()

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
        pendiente:  { label: 'Pendiente',   color: '#f59e0b', bg: '#fef3c7', textColor: '#92400e' },
        confirmada: { label: 'Confirmada',  color: '#10b981', bg: '#d1fae5', textColor: '#065f46' },
        expirada:   { label: 'Expirada',    color: '#94a3b8', bg: '#f1f5f9', textColor: '#475569' },
        cancelada:  { label: 'Cancelada',   color: '#ef4444', bg: '#fee2e2', textColor: '#991b1b' },
    }

    const filtros = [
        { valor: 'pendiente', label: 'Pendientes' },
        { valor: 'confirmada', label: 'Confirmadas' },
        { valor: 'expirada', label: 'Expiradas' },
        { valor: 'cancelada', label: 'Canceladas' },
        { valor: '', label: 'Todas' },
    ]

    useEffect(() => { cargarOrdenes() }, [filtroEstado])

    async function cargarOrdenes() {
        try {
            setCargando(true)
            const params = {}
            if (filtroEstado) params.estado = filtroEstado
            const datos = await getOrdenes(params)
            setOrdenes(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar las ordenes.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function formatearFecha(f) {
        if (!f) return '—'
        return new Date(f).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

    async function handleConfirmar() {
        if (!ordenSeleccionada) return
        if (!formConfirmar.modalidad) {
            setModalConfirmar({ titulo: 'Falta modalidad', mensaje: 'Selecciona si es presencial o delivery.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        try {
            await confirmarOrden(ordenSeleccionada.id, formConfirmar)
            setModalConfirmarOrden(false)
            setOrdenSeleccionada(null)
            await cargarOrdenes()
            setModalConfirmar({ titulo: 'Confirmada', mensaje: 'Orden confirmada y venta registrada correctamente.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo confirmar la orden.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
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

    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' }
    const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none', marginBottom: '12px' }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: s.bg, overflow: 'hidden' }}>

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

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '6px' }}>
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
            </div>

            {/* Contenido */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Lista */}
                <div style={{ width: '380px', borderRight: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.surface, flexShrink: 0, overflowY: 'auto' }}>
                    {cargando ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</div>
                    ) : ordenes.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>
                            <p style={{ fontSize: '24px', marginBottom: '8px' }}>📋</p>
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
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: s.text }}>{o.numero}</span>
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
                <div style={{ flex: 1, overflowY: 'auto', background: s.bg }}>
                    {!ordenSeleccionada ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: s.textMuted }}>
                            <span style={{ fontSize: '48px' }}>📋</span>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>Selecciona una orden para ver los detalles</p>
                        </div>
                    ) : (
                        <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>

                            {/* Header orden */}
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '20px', border: `1px solid ${s.border}`, marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h2 style={{ fontSize: '20px', fontWeight: '800', color: s.text }}>{ordenSeleccionada.numero}</h2>
                                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>
                                            Creada: {formatearFecha(ordenSeleccionada.created_at)}
                                        </p>
                                        {ordenSeleccionada.estado === 'pendiente' && (
                                            <p style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600', marginTop: '4px' }}>
                                                Expira: {formatearFecha(ordenSeleccionada.expira_at)} ({tiempoRestante(ordenSeleccionada.expira_at)})
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {ordenSeleccionada.estado === 'pendiente' && (
                                            <>
                                                <button onClick={() => { setFormConfirmar({ modalidad: ordenSeleccionada.modalidad || '', metodo_pago: ordenSeleccionada.metodo_pago || 'efectivo' }); setModalConfirmarOrden(true) }}
                                                    style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                                                    Confirmar orden
                                                </button>
                                                <button onClick={() => handleCancelar(ordenSeleccionada)}
                                                    style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid #fca5a5`, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                                    Cancelar
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Info cliente */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {[
                                        { label: 'Cliente', val: ordenSeleccionada.cliente_nombre },
                                        { label: 'Telefono', val: ordenSeleccionada.cliente_telefono || ordenSeleccionada.cliente_numero },
                                        { label: 'Canal', val: ordenSeleccionada.canal },
                                        { label: 'Modalidad', val: ordenSeleccionada.modalidad },
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
                            {ordenSeleccionada.modalidad === 'delivery' && (
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

            {/* Modal confirmar orden */}
            {modalConfirmarOrden && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '16px', padding: '24px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '800', color: s.text }}>Confirmar orden {ordenSeleccionada?.numero}</h3>
                            <button onClick={() => setModalConfirmarOrden(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>

                        <label style={labelStyle}>Modalidad de entrega</label>
                        <select value={formConfirmar.modalidad} onChange={e => setFormConfirmar({ ...formConfirmar, modalidad: e.target.value })} style={inputStyle}>
                            <option value="">Seleccionar...</option>
                            <option value="presencial">Retiro en tienda</option>
                            <option value="delivery">Delivery</option>
                        </select>

                        <label style={labelStyle}>Metodo de pago</label>
                        <select value={formConfirmar.metodo_pago} onChange={e => setFormConfirmar({ ...formConfirmar, metodo_pago: e.target.value })} style={inputStyle}>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia</option>
                            <option value="tarjeta">Tarjeta</option>
                        </select>

                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '12px', color: s.textMuted }}>
                                Al confirmar se registrara la venta, se descontara el stock y la orden desaparecera de pendientes.
                                {formConfirmar.modalidad === 'delivery' && ' Se creara el delivery automaticamente.'}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalConfirmarOrden(false)}
                                style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px' }}>
                                Cancelar
                            </button>
                            <button onClick={handleConfirmar}
                                style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '800' }}>
                                Confirmar y registrar venta
                            </button>
                        </div>
                    </div>
                </div>
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

export default Ordenes