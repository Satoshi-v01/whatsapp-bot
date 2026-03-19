import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductos } from '../services/productos'
import { buscarClientes, crearCliente } from '../services/clientes'
import { getSesiones } from '../services/sesiones'
import { registrarVentaPresencial } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'

function Caja() {
    const navigate = useNavigate()
    const busquedaProductoRef = useRef(null)

    const [productos, setProductos] = useState([])
    const [sesiones, setSesiones] = useState([])
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)

    // Líneas de productos
    const [lineas, setLineas] = useState([
        { id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }
    ])

    // Cliente / Factura
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [resultadosCliente, setResultadosCliente] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [formCliente, setFormCliente] = useState({ tipo: 'persona', nombre: '', ruc: '', telefono: '' })
    const [razonSocial, setRazonSocial] = useState('')
    const [rucFactura, setRucFactura] = useState('')

    // Canal y pago
    const [canal, setCanal] = useState('en_tienda')
    const [sesionSeleccionada, setSesionSeleccionada] = useState(null)
    const [metodoPago, setMetodoPago] = useState('efectivo')

    useEffect(() => {
        cargarDatos()
    }, [])

    useEffect(() => {
        if (clienteSeleccionado?.ruc) setRucFactura(clienteSeleccionado.ruc)
        if (clienteSeleccionado?.nombre) setRazonSocial(clienteSeleccionado.nombre)
    }, [clienteSeleccionado])

    async function cargarDatos() {
        try {
            const [prods, sess] = await Promise.all([getProductos(), getSesiones()])
            setProductos(prods)
            setSesiones(sess)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los datos.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargando(false)
        }
    }

    async function handleBuscarCliente(valor) {
        setBusquedaCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try {
            const resultados = await buscarClientes(valor)
            setResultadosCliente(resultados)
        } catch (err) {}
    }

    function handleBuscarProducto(lineaId, valor) {
        const filtrados = valor.trim()
            ? productos.filter(p =>
                p.nombre.toLowerCase().includes(valor.toLowerCase()) ||
                (p.marca_nombre && p.marca_nombre.toLowerCase().includes(valor.toLowerCase()))
            )
            : []

        setLineas(prev => prev.map(l => l.id === lineaId
            ? { ...l, busqueda: valor, productosFiltrados: filtrados, productoSeleccionado: valor ? l.productoSeleccionado : null }
            : l
        ))
    }

    function seleccionarProducto(lineaId, producto) {
        setLineas(prev => prev.map(l => l.id === lineaId
            ? {
                ...l,
                busqueda: `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`,
                productosFiltrados: [],
                productoSeleccionado: producto,
                presentacionSeleccionada: null
            }
            : l
        ))
    }

    function seleccionarPresentacion(lineaId, presentacion) {
        setLineas(prev => prev.map(l => l.id === lineaId
            ? { ...l, presentacionSeleccionada: presentacion }
            : l
        ))
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
        setLineas(prev => [...prev, {
            id: nuevoId, busqueda: '', productosFiltrados: [],
            productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1
        }])
    }

    function eliminarLinea(lineaId) {
        if (lineas.length === 1) return
        setLineas(prev => prev.filter(l => l.id !== lineaId))
    }

    function calcularPrecioEfectivo(pr) {
        const ahora = new Date()
        if (pr.descuento_activo && pr.precio_descuento &&
            new Date(pr.descuento_desde) <= ahora &&
            new Date(pr.descuento_hasta) >= ahora) {
            return { precio: pr.precio_descuento, conDescuento: true }
        }
        return { precio: pr.precio_venta, conDescuento: false }
    }

    function calcularIVA(precio) {
        return Math.floor(precio / 11)
    }

    const lineasValidas = lineas.filter(l => l.presentacionSeleccionada)
    const total = lineasValidas.reduce((sum, l) => {
        const { precio } = calcularPrecioEfectivo(l.presentacionSeleccionada)
        return sum + precio * l.cantidad
    }, 0)
    const iva = calcularIVA(total)

    async function handleCrearCliente() {
        if (!formCliente.nombre.trim()) return
        try {
            const nuevo = await crearCliente({ ...formCliente, origen: 'presencial' })
            setClienteSeleccionado(nuevo)
            setCreandoCliente(false)
            setResultadosCliente([])
            setBusquedaCliente(nuevo.nombre)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo crear el cliente.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleConfirmarVenta() {
        if (lineasValidas.length === 0) {
            setModalConfirmar({
                titulo: 'Falta el producto',
                mensaje: 'Agregá al menos un producto con presentación seleccionada.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
            return
        }

        const canalFinal = canal === 'whatsapp_delivery' ? 'whatsapp' : canal

        setModalConfirmar({
            titulo: 'Confirmar venta',
            mensaje: `¿Registrar ${lineasValidas.length} producto(s) por Gs. ${total.toLocaleString()}?`,
            textoBoton: 'Confirmar',
            colorBoton: '#10b981',
            onConfirmar: async () => {
                try {
                    // Registrar cada línea como una venta separada
                    for (const linea of lineasValidas) {
                        const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                        const subtotal = precio * linea.cantidad

                        await registrarVentaPresencial({
                            cliente_id: clienteSeleccionado?.id || null,
                            presentacion_id: linea.presentacionSeleccionada.id,
                            cantidad: linea.cantidad,
                            precio: subtotal,
                            metodo_pago: metodoPago,
                            quiere_factura: razonSocial || rucFactura ? true : false,
                            ruc_factura: rucFactura || null,
                            razon_social: razonSocial || (clienteSeleccionado ? null : 'Consumidor final'),
                            agente_id: 1,
                            canal: canalFinal,
                            es_de_whatsapp: canal === 'whatsapp_delivery',
                            sesion_numero: canal === 'whatsapp_delivery' ? sesionSeleccionada : null
                        })
                    }

                    // Resetear
                    setLineas([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
                    setClienteSeleccionado(null)
                    setBusquedaCliente('')
                    setRucFactura('')
                    setRazonSocial('')
                    setCanal('en_tienda')
                    setSesionSeleccionada(null)
                    setMetodoPago('efectivo')

                    setModalConfirmar({
                        titulo: '✅ Venta registrada',
                        mensaje: `Venta registrada correctamente por Gs. ${total.toLocaleString()}.`,
                        textoBoton: 'Nueva venta',
                        colorBoton: '#10b981',
                        onConfirmar: () => {
                            setModalConfirmar(null)
                            busquedaProductoRef.current?.focus()
                        }
                    })
                } catch (err) {
                    setModalConfirmar({
                        titulo: 'Error',
                        mensaje: err.response?.data?.error || 'No se pudo registrar la venta.',
                        textoBoton: 'Cerrar',
                        colorBoton: '#888',
                        onConfirmar: () => setModalConfirmar(null)
                    })
                }
            }
        })
    }

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px', boxSizing: 'border-box' }
    const labelStyle = { fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }
    const btnPrimario = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px' }
    const btnSecundario = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando...</p></div>

    return (
        <div style={{ padding: '24px' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Caja</h2>
                    <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                        {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <button onClick={() => navigate('/ventas')} style={btnSecundario}>Ver ventas</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>

                {/* Columna izquierda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Productos */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Productos</h3>
                            <button onClick={agregarLinea} style={{ ...btnSecundario, fontSize: '12px', padding: '6px 12px' }}>+ Agregar producto</button>
                        </div>

                        {lineas.map((linea, idx) => (
                            <div key={linea.id} style={{ borderBottom: idx < lineas.length - 1 ? '1px solid #f0f0f0' : 'none', paddingBottom: idx < lineas.length - 1 ? '16px' : '0', marginBottom: idx < lineas.length - 1 ? '16px' : '0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <p style={{ fontSize: '12px', color: '#888', fontWeight: '600' }}>PRODUCTO {idx + 1}</p>
                                    {lineas.length > 1 && (
                                        <button onClick={() => eliminarLinea(linea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}>✕ Quitar</button>
                                    )}
                                </div>

                                <input
                                    ref={idx === 0 ? busquedaProductoRef : null}
                                    placeholder="Buscar por nombre o marca..."
                                    value={linea.busqueda}
                                    onChange={e => handleBuscarProducto(linea.id, e.target.value)}
                                    style={inputStyle}
                                    autoFocus={idx === 0}
                                />

                                {linea.productosFiltrados.length > 0 && !linea.productoSeleccionado && (
                                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden', maxHeight: '180px', overflowY: 'auto' }}>
                                        {linea.productosFiltrados.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => seleccionarProducto(linea.id, p)}
                                                style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <p style={{ fontWeight: '500' }}>{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                <p style={{ fontSize: '11px', color: '#888' }}>{p.calidad} · {p.categoria_nombre}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {linea.productoSeleccionado && (
                                    <>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            {linea.productoSeleccionado.presentaciones
                                                .filter(pr => pr.disponible && pr.stock > 0)
                                                .map(pr => {
                                                    const { precio, conDescuento } = calcularPrecioEfectivo(pr)
                                                    return (
                                                        <div
                                                            key={pr.id}
                                                            onClick={() => seleccionarPresentacion(linea.id, pr)}
                                                            style={{
                                                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                                                border: `2px solid ${linea.presentacionSeleccionada?.id === pr.id ? '#1a1a2e' : '#e5e7eb'}`,
                                                                background: linea.presentacionSeleccionada?.id === pr.id ? '#f0f4ff' : 'white',
                                                                fontSize: '12px'
                                                            }}
                                                        >
                                                            <p style={{ fontWeight: '500' }}>{pr.nombre}</p>
                                                            {conDescuento && <p style={{ textDecoration: 'line-through', color: '#888', fontSize: '11px' }}>Gs. {pr.precio_venta.toLocaleString()}</p>}
                                                            <p style={{ fontWeight: '700', color: conDescuento ? '#10b981' : '#333' }}>Gs. {precio.toLocaleString()}</p>
                                                            <p style={{ color: '#888', fontSize: '11px' }}>Stock: {pr.stock}</p>
                                                        </div>
                                                    )
                                                })}
                                        </div>

                                        {linea.presentacionSeleccionada && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <button onClick={() => cambiarCantidad(linea.id, -1)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}>−</button>
                                                <span style={{ fontSize: '16px', fontWeight: '600', minWidth: '32px', textAlign: 'center' }}>{linea.cantidad}</span>
                                                <button onClick={() => cambiarCantidad(linea.id, 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '16px' }}>+</button>
                                                <span style={{ fontSize: '12px', color: '#888' }}>Stock: {linea.presentacionSeleccionada.stock}</span>
                                                <span style={{ fontSize: '13px', fontWeight: '600', marginLeft: 'auto', color: '#1a1a2e' }}>
                                                    Gs. {(calcularPrecioEfectivo(linea.presentacionSeleccionada).precio * linea.cantidad).toLocaleString()}
                                                </span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Cliente y Factura */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Cliente y Factura</h3>

                        <label style={labelStyle}>Buscar cliente (opcional)</label>
                        <input
                            placeholder="Nombre, RUC o teléfono..."
                            value={busquedaCliente}
                            onChange={e => handleBuscarCliente(e.target.value)}
                            style={inputStyle}
                        />

                        {resultadosCliente.length > 0 && (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                                {resultadosCliente.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setClienteSeleccionado(c)
                                            setBusquedaCliente(c.nombre)
                                            setResultadosCliente([])
                                            if (c.ruc) setRucFactura(c.ruc)
                                            if (c.nombre) setRazonSocial(c.nombre)
                                        }}
                                        style={{ padding: '8px 14px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', fontSize: '13px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <p style={{ fontWeight: '500' }}>{c.nombre}</p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>{c.ruc && `RUC: ${c.ruc} · `}{c.telefono && `📱 ${c.telefono}`}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {clienteSeleccionado && (
                            <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#166534' }}>✓ {clienteSeleccionado.nombre}</p>
                                    <p style={{ fontSize: '11px', color: '#888' }}>{clienteSeleccionado.ruc && `RUC: ${clienteSeleccionado.ruc}`}</p>
                                </div>
                                <button onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#888' }}>✕</button>
                            </div>
                        )}

                        <button onClick={() => setCreandoCliente(!creandoCliente)} style={{ ...btnSecundario, fontSize: '12px', marginBottom: '12px' }}>
                            {creandoCliente ? '✕ Cancelar' : '+ Cliente nuevo'}
                        </button>

                        {creandoCliente && (
                            <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
                                <label style={labelStyle}>Tipo</label>
                                <select value={formCliente.tipo} onChange={e => setFormCliente({ ...formCliente, tipo: e.target.value })} style={inputStyle}>
                                    <option value="persona">Persona física</option>
                                    <option value="empresa">Empresa</option>
                                </select>
                                <label style={labelStyle}>Nombre *</label>
                                <input placeholder="Nombre completo" value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>RUC</label>
                                <input placeholder="Ej: 4.154.264-9" value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>Teléfono</label>
                                <input placeholder="Opcional" value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} style={inputStyle} />
                                <button onClick={handleCrearCliente} style={btnPrimario}>Crear y seleccionar</button>
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                            <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>DATOS DE FACTURA</p>
                            <label style={labelStyle}>Razón social</label>
                            <input
                                placeholder="Dejar vacío = Consumidor final"
                                value={razonSocial}
                                onChange={e => setRazonSocial(e.target.value)}
                                style={inputStyle}
                            />
                            <label style={labelStyle}>RUC</label>
                            <input
                                placeholder="Ej: 4.154.264-9 o 125.549-0"
                                value={rucFactura}
                                onChange={e => setRucFactura(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>
                </div>

                {/* Columna derecha — resumen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Canal */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '14px' }}>Canal de venta</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {[
                                { valor: 'en_tienda', label: '🏪 En tienda' },
                                { valor: 'whatsapp_bot', label: '🤖 WhatsApp Bot' },
                                { valor: 'whatsapp', label: '💬 WhatsApp directo' },
                                { valor: 'whatsapp_delivery', label: '🚚 WhatsApp — delivery' },
                                { valor: 'pagina_web', label: '🌐 Página web' },
                                { valor: 'otro', label: '📋 Otro' },
                            ].map(c => (
                                <div
                                    key={c.valor}
                                    onClick={() => setCanal(c.valor)}
                                    style={{
                                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                        border: `2px solid ${canal === c.valor ? '#1a1a2e' : '#e5e7eb'}`,
                                        background: canal === c.valor ? '#f0f4ff' : 'white',
                                        fontSize: '13px', fontWeight: canal === c.valor ? '600' : '400'
                                    }}
                                >
                                    {c.label}
                                </div>
                            ))}
                        </div>

                        {canal === 'whatsapp_delivery' && (
                            <div style={{ marginTop: '12px' }}>
                                <label style={labelStyle}>Conversación de WhatsApp</label>
                                <select
                                    value={sesionSeleccionada || ''}
                                    onChange={e => setSesionSeleccionada(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">Seleccionar cliente...</option>
                                    {sesiones.map(s => (
                                        <option key={s.cliente_numero} value={s.cliente_numero}>
                                            {s.cliente_numero} — {s.paso}
                                        </option>
                                    ))}
                                </select>
                                {sesionSeleccionada && (
                                    <p style={{ fontSize: '12px', color: '#92400e', background: '#fffbeb', padding: '8px', borderRadius: '6px' }}>
                                        El delivery pasará a <strong>En camino</strong> automáticamente.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Método de pago */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Método de pago</h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['efectivo', 'transferencia', 'tarjeta'].map(m => (
                                <button
                                    key={m}
                                    onClick={() => setMetodoPago(m)}
                                    style={{
                                        flex: 1, padding: '10px 6px', borderRadius: '8px',
                                        border: `2px solid ${metodoPago === m ? '#1a1a2e' : '#e5e7eb'}`,
                                        background: metodoPago === m ? '#1a1a2e' : 'white',
                                        color: metodoPago === m ? 'white' : '#555',
                                        cursor: 'pointer', fontSize: '12px', fontWeight: '500'
                                    }}
                                >
                                    {m === 'efectivo' ? '💵' : m === 'transferencia' ? '🏦' : '💳'}<br />
                                    <span style={{ textTransform: 'capitalize' }}>{m}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resumen y total */}
                    <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '20px', color: 'white' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: '#a0a0c0' }}>RESUMEN</h3>

                        {lineasValidas.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#a0a0c0', textAlign: 'center', padding: '12px 0' }}>
                                Seleccioná productos
                            </p>
                        ) : (
                            <>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                    {lineasValidas.map(linea => {
                                        const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                                        return (
                                            <div key={linea.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                <span style={{ color: '#d0d0e0' }}>
                                                    {linea.productoSeleccionado.nombre} — {linea.presentacionSeleccionada.nombre} ×{linea.cantidad}
                                                </span>
                                                <span>Gs. {(precio * linea.cantidad).toLocaleString()}</span>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div style={{ borderTop: '1px solid #2a2a4e', paddingTop: '12px', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                        <span style={{ fontSize: '12px', color: '#a0a0c0' }}>IVA 10% incluido</span>
                                        <span style={{ fontSize: '12px' }}>Gs. {iva.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600' }}>Total</span>
                                        <span style={{ fontSize: '18px', fontWeight: '700', color: '#10b981' }}>Gs. {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                {(razonSocial || rucFactura) && (
                                    <div style={{ background: '#2a2a4e', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px' }}>
                                        <p style={{ color: '#a0a0c0', marginBottom: '4px' }}>Factura a:</p>
                                        <p>{razonSocial || 'Consumidor final'}</p>
                                        {rucFactura && <p style={{ color: '#a0a0c0' }}>RUC: {rucFactura}</p>}
                                    </div>
                                )}

                                <button
                                    onClick={handleConfirmarVenta}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '15px', fontWeight: '600' }}
                                >
                                    ✓ Registrar venta
                                </button>
                            </>
                        )}
                    </div>
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

export default Caja