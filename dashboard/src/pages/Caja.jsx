import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductos } from '../services/productos'
import { buscarClientes, crearCliente } from '../services/clientes'
import { getSesiones } from '../services/sesiones'
import { registrarVentaPresencial } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

function Caja() {
    const navigate = useNavigate()
    const busquedaProductoRef = useRef(null)
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : 'rgba(26,26,127,0.1)',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        inputBg: darkMode ? '#0f172a' : '#f8fafc',
        rowHover: darkMode ? '#1a2536' : '#f8fafc',
    }

    const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${s.border}`, marginBottom: '12px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '800', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }

    const [productos, setProductos] = useState([])
    const [sesiones, setSesiones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [lineas, setLineas] = useState([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [resultadosCliente, setResultadosCliente] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [formCliente, setFormCliente] = useState({ tipo: 'persona', nombre: '', ruc: '', telefono: '' })
    const [razonSocial, setRazonSocial] = useState('')
    const [rucFactura, setRucFactura] = useState('')
    const [canal, setCanal] = useState('en_tienda')
    const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
    const [metodoPago, setMetodoPago] = useState('efectivo')

    useEffect(() => { cargarDatos() }, [])
    useEffect(() => {
        if (clienteSeleccionado?.ruc) setRucFactura(clienteSeleccionado.ruc)
        if (clienteSeleccionado?.nombre) setRazonSocial(clienteSeleccionado.nombre)
    }, [clienteSeleccionado])

    async function cargarDatos() {
        try {
            const [prods, sess] = await Promise.all([getProductos(), getSesiones()])
            setProductos(prods); setSesiones(sess)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function handleBuscarCliente(valor) {
        setBusquedaCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try { const r = await buscarClientes(valor); setResultadosCliente(r) } catch (err) {}
    }

    function handleBuscarProducto(lineaId, valor) {
        const filtrados = valor.trim() ? productos.filter(p => p.nombre.toLowerCase().includes(valor.toLowerCase()) || (p.marca_nombre && p.marca_nombre.toLowerCase().includes(valor.toLowerCase()))) : []
        setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, busqueda: valor, productosFiltrados: filtrados, productoSeleccionado: valor ? l.productoSeleccionado : null } : l))
    }

    function seleccionarProducto(lineaId, producto) {
        setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, busqueda: `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: null } : l))
    }

    function seleccionarPresentacion(lineaId, presentacion) {
        setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, presentacionSeleccionada: presentacion } : l))
    }

    function cambiarCantidad(lineaId, delta) {
        setLineas(prev => prev.map(l => {
            if (l.id !== lineaId) return l
            const max = l.presentacionSeleccionada?.stock || 99
            return { ...l, cantidad: Math.min(max, Math.max(1, l.cantidad + delta)) }
        }))
    }

    function agregarLinea() {
        const nuevoId = Math.max(...lineas.map(l => l.id)) + 1
        setLineas(prev => [...prev, { id: nuevoId, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
    }

    function eliminarLinea(lineaId) {
        if (lineas.length === 1) return
        setLineas(prev => prev.filter(l => l.id !== lineaId))
    }

    function calcularPrecioEfectivo(pr) {
        const ahora = new Date()
        if (pr.descuento_activo && pr.precio_descuento && new Date(pr.descuento_desde) <= ahora && new Date(pr.descuento_hasta) >= ahora) return { precio: pr.precio_descuento, conDescuento: true }
        return { precio: pr.precio_venta, conDescuento: false }
    }

    const lineasValidas = lineas.filter(l => l.presentacionSeleccionada)
    const total = lineasValidas.reduce((sum, l) => sum + calcularPrecioEfectivo(l.presentacionSeleccionada).precio * l.cantidad, 0)
    const iva = Math.floor(total / 11)

    async function handleCrearCliente() {
        if (!formCliente.nombre.trim()) return
        try {
            const nuevo = await crearCliente({ ...formCliente, origen: 'presencial' })
            setClienteSeleccionado(nuevo); setCreandoCliente(false); setResultadosCliente([]); setBusquedaCliente(nuevo.nombre)
        } catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }

    async function handleConfirmarVenta() {
        if (lineasValidas.length === 0) {
            setModalConfirmar({ titulo: 'Falta el producto', mensaje: 'Agregá al menos un producto con presentación seleccionada.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        const canalFinal = canal === 'whatsapp_delivery' ? 'whatsapp' : canal
        setModalConfirmar({
            titulo: 'Confirmar venta',
            mensaje: `¿Registrar ${lineasValidas.length} producto(s) por Gs. ${total.toLocaleString()}?`,
            textoBoton: 'Confirmar', colorBoton: '#10b981',
            onConfirmar: async () => {
                try {
                    for (const linea of lineasValidas) {
                        const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                        await registrarVentaPresencial({ cliente_id: clienteSeleccionado?.id || null, presentacion_id: linea.presentacionSeleccionada.id, cantidad: linea.cantidad, precio: precio * linea.cantidad, metodo_pago: metodoPago, quiere_factura: razonSocial || rucFactura ? true : false, ruc_factura: rucFactura || null, razon_social: razonSocial || (clienteSeleccionado ? null : 'Cliente'), agente_id: 1, canal: canalFinal, es_de_whatsapp: canal === 'whatsapp_delivery', sesion_numero: canal === 'whatsapp_delivery' ? sesionSeleccionada : null })
                    }
                    setLineas([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
                    setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial(''); setCanal('en_tienda'); setSesionSeleccionada(null); setMetodoPago('efectivo')
                    setModalConfirmar({ titulo: '✅ Venta registrada', mensaje: `Venta registrada correctamente por Gs. ${total.toLocaleString()}.`, textoBoton: 'Nueva venta', colorBoton: '#10b981', onConfirmar: () => { setModalConfirmar(null); busquedaProductoRef.current?.focus() } })
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar la venta.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    const canales = [
        { valor: 'en_tienda', label: 'En tienda', icono: '🏪' },
        { valor: 'whatsapp_bot', label: 'WhatsApp Bot', icono: '🤖' },
        { valor: 'whatsapp', label: 'WhatsApp directo', icono: '💬' },
        { valor: 'whatsapp_delivery', label: 'WhatsApp — delivery', icono: '🚚' },
        { valor: 'pagina_web', label: 'Página web', icono: '🌐' },
        { valor: 'otro', label: 'Otro', icono: '📋' },
    ]

    if (cargando) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: s.bg, color: s.textMuted, fontSize: '14px' }}>
            Cargando caja...
        </div>
    )

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', background: s.bg, overflow: 'hidden' }}>

            {/* Centro — scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Caja</h1>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>
                            {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <button onClick={() => navigate('/ventas')}
                        style={{ padding: '8px 16px', borderRadius: '10px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        Ver ventas
                    </button>
                </div>

                {/* Productos */}
                <section style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Productos</h2>
                        <button onClick={agregarLinea}
                            style={{ fontSize: '12px', padding: '6px 14px', border: `1px solid ${s.border}`, borderRadius: '8px', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontWeight: '500' }}>
                            + Agregar producto
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {lineas.map((linea, idx) => (
                            <div key={linea.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <p style={{ fontSize: '10px', fontWeight: '800', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Producto</p>
                                        {linea.productoSeleccionado ? (
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>
                                                {linea.productoSeleccionado.marca_nombre && `${linea.productoSeleccionado.marca_nombre} — `}{linea.productoSeleccionado.nombre}
                                            </h3>
                                        ) : (
                                            <p style={{ fontSize: '13px', color: s.textMuted }}>Buscar producto...</p>
                                        )}
                                    </div>
                                    {lineas.length > 1 && (
                                        <button onClick={() => eliminarLinea(linea.id)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                            ✕ Quitar
                                        </button>
                                    )}
                                </div>

                                {!linea.productoSeleccionado && (
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            ref={idx === 0 ? busquedaProductoRef : null}
                                            placeholder="Buscar por nombre o marca..."
                                            value={linea.busqueda}
                                            onChange={e => handleBuscarProducto(linea.id, e.target.value)}
                                            style={inputStyle}
                                            autoFocus={idx === 0}
                                        />
                                        {linea.productosFiltrados.length > 0 && (
                                            <div style={{ border: `1px solid ${s.border}`, borderRadius: '10px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', position: 'absolute', top: '52px', left: 0, right: 0, zIndex: 10, background: s.surface }}>
                                                {linea.productosFiltrados.map(p => (
                                                    <div key={p.id} onClick={() => seleccionarProducto(linea.id, p)}
                                                        style={{ padding: '12px 16px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: s.surface }}
                                                        onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                                        onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                                        <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                        <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>{p.calidad} · {p.categoria_nombre}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {linea.productoSeleccionado && (
                                    <>
                                        {/* Presentaciones */}
                                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                            {linea.productoSeleccionado.presentaciones.filter(pr => pr.disponible && pr.stock > 0).map(pr => {
                                                const { precio, conDescuento } = calcularPrecioEfectivo(pr)
                                                const activa = linea.presentacionSeleccionada?.id === pr.id
                                                return (
                                                    <button key={pr.id} onClick={() => seleccionarPresentacion(linea.id, pr)}
                                                        style={{ padding: '12px 16px', borderRadius: '10px', border: `2px solid ${activa ? '#1a1a2e' : s.border}`, background: activa ? (darkMode ? 'rgba(26,26,46,0.4)' : 'rgba(26,26,46,0.04)') : s.surfaceLow, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                                                        <p style={{ fontSize: '12px', fontWeight: '700', color: s.text, marginBottom: '4px' }}>{pr.nombre}</p>
                                                        {conDescuento && <p style={{ fontSize: '11px', color: s.textFaint, textDecoration: 'line-through' }}>Gs. {pr.precio_venta.toLocaleString()}</p>}
                                                        <p style={{ fontSize: '14px', fontWeight: '800', color: conDescuento ? '#10b981' : s.text }}>Gs. {precio.toLocaleString()}</p>
                                                        <p style={{ fontSize: '10px', color: pr.stock <= 3 ? '#ef4444' : s.textFaint, marginTop: '2px' }}>Stock: {pr.stock}</p>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Cantidad */}
                                        {linea.presentacionSeleccionada && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: `1px solid ${s.border}`, borderRadius: '10px', overflow: 'hidden', background: s.surfaceLow }}>
                                                    <button onClick={() => cambiarCantidad(linea.id, -1)}
                                                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                    <span style={{ width: '48px', textAlign: 'center', fontSize: '16px', fontWeight: '800', color: s.text }}>{linea.cantidad}</span>
                                                    <button onClick={() => cambiarCantidad(linea.id, 1)}
                                                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                                </div>
                                                <span style={{ fontSize: '11px', color: s.textFaint }}>Stock disponible: {linea.presentacionSeleccionada.stock}</span>
                                                <p style={{ fontSize: '18px', fontWeight: '800', color: s.text }}>
                                                    Gs. {(calcularPrecioEfectivo(linea.presentacionSeleccionada).precio * linea.cantidad).toLocaleString()}
                                                </p>
                                            </div>
                                        )}

                                        <button onClick={() => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, busqueda: '', productoSeleccionado: null, presentacionSeleccionada: null } : l))}
                                            style={{ marginTop: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: s.textFaint }}>
                                            ← Cambiar producto
                                        </button>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Cliente y Factura */}
                <section>
                    <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '20px' }}>Cliente y Factura</h2>

                        <label style={labelStyle}>Buscar cliente existente (opcional)</label>
                        <input placeholder="Nombre, RUC o teléfono..." value={busquedaCliente} onChange={e => handleBuscarCliente(e.target.value)} style={inputStyle} />

                        {resultadosCliente.length > 0 && (
                            <div style={{ border: `1px solid ${s.border}`, borderRadius: '10px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                {resultadosCliente.map(c => (
                                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(c.nombre); setResultadosCliente([]); if (c.ruc) setRucFactura(c.ruc); if (c.nombre) setRazonSocial(c.nombre) }}
                                        style={{ padding: '10px 16px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: s.surface }}
                                        onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                        onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{c.nombre}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{c.ruc && `RUC: ${c.ruc} · `}{c.telefono && `📱 ${c.telefono}`}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {clienteSeleccionado && (
                            <div style={{ padding: '12px 16px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #86efac' }}>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>✓ {clienteSeleccionado.nombre}</p>
                                    {clienteSeleccionado.ruc && <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>RUC: {clienteSeleccionado.ruc}</p>}
                                </div>
                                <button onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial('') }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.textMuted, fontSize: '18px' }}>✕</button>
                            </div>
                        )}

                        <button onClick={() => setCreandoCliente(!creandoCliente)}
                            style={{ fontSize: '12px', padding: '8px 14px', border: `1px solid ${s.border}`, borderRadius: '8px', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontWeight: '600', marginBottom: '16px' }}>
                            {creandoCliente ? '✕ Cancelar' : '+ Cliente nuevo'}
                        </button>

                        {creandoCliente && (
                            <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px', border: `1px solid ${s.border}` }}>
                                <label style={labelStyle}>Tipo</label>
                                <select value={formCliente.tipo} onChange={e => setFormCliente({ ...formCliente, tipo: e.target.value })} style={inputStyle}>
                                    <option value="persona">Persona física</option>
                                    <option value="empresa">Empresa</option>
                                </select>
                                <label style={labelStyle}>Nombre *</label>
                                <input value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>RUC</label>
                                <input value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>Teléfono</label>
                                <input value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} style={{ ...inputStyle, marginBottom: '14px' }} />
                                <button onClick={handleCrearCliente}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                                    Crear y seleccionar
                                </button>
                            </div>
                        )}

                        <div style={{ borderTop: `1px solid ${s.borderLight}`, paddingTop: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={labelStyle}>Datos de factura — Razón social</label>
                                    <input placeholder="Consumidor final" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>RUC</label>
                                    <input placeholder="Ej: 5.578.584-9" value={rucFactura} onChange={e => setRucFactura(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Panel derecho fijo */}
            <div style={{ width: '400px', background: s.surface, borderLeft: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto', flexShrink: 0 }}>

                {/* Canal de venta */}
                <section style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: s.text, marginBottom: '12px' }}>Canal de venta</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {canales.map(c => {
                            const activo = canal === c.valor
                            return (
                                <button key={c.valor} onClick={() => setCanal(c.valor)}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', border: `${activo ? 2 : 1}px solid ${activo ? '#1a1a2e' : s.border}`, borderRadius: '12px', background: activo ? (darkMode ? 'rgba(26,26,46,0.4)' : 'rgba(26,26,46,0.04)') : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '16px' }}>{c.icono}</span>
                                    <span style={{ fontSize: '13px', fontWeight: activo ? '700' : '500', color: activo ? s.text : s.textMuted, flex: 1 }}>{c.label}</span>
                                    {activo && <span style={{ fontSize: '14px' }}>✓</span>}
                                </button>
                            )
                        })}
                    </div>

                    {canal === 'whatsapp_delivery' && (
                        <div style={{ marginTop: '12px' }}>
                            <label style={{ ...labelStyle, marginTop: '8px' }}>Conversación de WhatsApp</label>
                            <select value={sesionSeleccionada || ''} onChange={e => setSesionSeleccionada(e.target.value)}
                                style={{ ...inputStyle, marginBottom: sesionSeleccionada ? '8px' : 0 }}>
                                <option value="">Seleccionar cliente...</option>
                                {sesiones.map(s => <option key={s.cliente_numero} value={s.cliente_numero}>{s.cliente_numero} — {s.paso}</option>)}
                            </select>
                            {sesionSeleccionada && (
                                <p style={{ fontSize: '12px', color: '#92400e', background: darkMode ? '#451a03' : '#fffbeb', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                                    🚚 El delivery pasará a <strong>En camino</strong> automáticamente.
                                </p>
                            )}
                        </div>
                    )}
                </section>

                {/* Método de pago */}
                <section style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: s.text, marginBottom: '12px' }}>Método de pago</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {[
                            { val: 'efectivo', label: 'Efectivo', icono: '💵' },
                            { val: 'transferencia', label: 'Transferencia', icono: '🏦' },
                            { val: 'tarjeta', label: 'Tarjeta', icono: '💳' },
                        ].map(m => (
                            <button key={m.val} onClick={() => setMetodoPago(m.val)}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 8px', borderRadius: '12px', border: `1px solid ${s.border}`, background: metodoPago === m.val ? '#1a1a2e' : 'transparent', color: metodoPago === m.val ? 'white' : s.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s', boxShadow: metodoPago === m.val ? '0 4px 12px rgba(26,26,46,0.3)' : 'none' }}>
                                <span style={{ fontSize: '22px' }}>{m.icono}</span>
                                {m.label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Resumen */}
                <section style={{ marginTop: 'auto', background: '#0f172a', borderRadius: '16px', padding: '24px', color: 'white', boxShadow: '0 8px 32px rgba(15,23,42,0.4)' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Resumen</p>

                    {lineasValidas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', color: '#334155' }}>
                            <p style={{ fontSize: '28px', marginBottom: '8px' }}>🛒</p>
                            <p style={{ fontSize: '13px' }}>Seleccioná productos para comenzar</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {lineasValidas.map(linea => {
                                    const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                                    return (
                                        <div key={linea.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                                            <span style={{ color: '#94a3b8', flex: 1, lineHeight: '1.4' }}>
                                                {linea.productoSeleccionado.nombre} — {linea.presentacionSeleccionada.nombre} ×{linea.cantidad}
                                            </span>
                                            <span style={{ fontWeight: '700', flexShrink: 0 }}>Gs. {(precio * linea.cantidad).toLocaleString()}</span>
                                        </div>
                                    )
                                })}
                            </div>

                            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#475569' }}>IVA 10% incluido</span>
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>Gs. {iva.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '16px', fontWeight: '700' }}>Total</span>
                                    <span style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>Gs. {total.toLocaleString()}</span>
                                </div>
                            </div>

                            {(razonSocial || rucFactura) && (
                                <div style={{ background: '#1e293b', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px' }}>
                                    <p style={{ color: '#475569', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Factura a</p>
                                    <p style={{ fontWeight: '600' }}>{razonSocial || 'Cliente'}</p>
                                    {rucFactura && <p style={{ color: '#64748b', marginTop: '2px' }}>RUC: {rucFactura}</p>}
                                </div>
                            )}

                            <button onClick={handleConfirmarVenta}
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: '#10b981', color: '#0f172a', cursor: 'pointer', fontSize: '15px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'opacity 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                                ✓ Registrar venta
                            </button>
                        </>
                    )}
                </section>
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

export default Caja