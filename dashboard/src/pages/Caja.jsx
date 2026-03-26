import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductos } from '../services/productos'
import { buscarClientes, crearCliente } from '../services/clientes'
import { registrarVentaPresencial } from '../services/ventas'
import { confirmarOrden, crearOrden } from '../services/ordenes'
import { getZonas } from '../services/zonas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import api from '../services/api'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'

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
    const [zonas, setZonas] = useState([])
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
    const [canal, setCanal] = useState('presencial')
    const [metodoPago, setMetodoPago] = useState('efectivo')
    const [opOrigen, setOpOrigen] = useState(null)

    // Datos de delivery
    const [formDelivery, setFormDelivery] = useState({
        ubicacion: '', referencia: '', horario: '',
        contacto_entrega: '', zona_id: '', zona_nombre: '', costo_delivery: 0
    })

    useEffect(() => {
        async function init() {
            await cargarDatos()
            await cargarOpPrecargada()
        }
        init()
    }, [])

    useEffect(() => {
        if (!clienteSeleccionado) return
        if (clienteSeleccionado.ruc) setRucFactura(clienteSeleccionado.ruc)
        if (clienteSeleccionado.nombre) setRazonSocial(clienteSeleccionado.nombre)
        if (!clienteSeleccionado) return
            console.log('cliente seleccionado:', clienteSeleccionado)
            console.log('zonas:', zonas)
            console.log('direccion:', clienteSeleccionado.direccion)
            console.log('ciudad:', clienteSeleccionado.ciudad)

        // Precargar datos de delivery si el cliente tiene dirección guardada
        if (clienteSeleccionado.direccion || clienteSeleccionado.ciudad) {
            setFormDelivery(prev => ({
                ...prev,
                ubicacion: clienteSeleccionado.direccion || prev.ubicacion,
                contacto_entrega: clienteSeleccionado.nombre || prev.contacto_entrega,
                referencia: clienteSeleccionado.ultima_referencia || prev.referencia,

            }))

            // Si tiene ciudad, buscar la zona correspondiente
            if (clienteSeleccionado.ciudad) {
                const zonaMatch = zonas.find(z =>
                    z.nombre.toLowerCase() === clienteSeleccionado.ciudad.toLowerCase()
                )
                if (zonaMatch) {
                    setFormDelivery(prev => ({
                        ...prev,
                        zona_id: zonaMatch.id,
                        zona_nombre: zonaMatch.nombre,
                        costo_delivery: zonaMatch.costo
                    }))
                }
            }
            if (clienteSeleccionado.ciudad) {
                const normalizar = str => str.toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .trim()

                const ciudadNorm = normalizar(clienteSeleccionado.ciudad)
                const zonaMatch = zonas.find(z => normalizar(z.nombre) === ciudadNorm)

                if (zonaMatch) {
                    setFormDelivery(prev => ({
                        ...prev,
                        zona_id: zonaMatch.id,
                        zona_nombre: zonaMatch.nombre,
                        costo_delivery: zonaMatch.costo
                    }))
                }
            }
        }       
    }, [clienteSeleccionado, zonas])

    async function cargarDatos() {
        try {
            const [prods, zns] = await Promise.all([getProductos(), getZonas()])
            setProductos(prods)
            setZonas(zns)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function cargarOpPrecargada() {
        const opJson = sessionStorage.getItem('op_precargada')
        if (!opJson) return
        sessionStorage.removeItem('op_precargada')

        const op = JSON.parse(opJson)
        setOpOrigen(op)

        // Precargar cliente
        if (op.cliente_nombre || op.cliente_numero) {
            setClienteSeleccionado({
                id: op.cliente_id,
                nombre: op.cliente_nombre || `Cliente ${op.cliente_numero}`,
                telefono: op.cliente_telefono || op.cliente_numero,
                ruc: op.ruc_factura || '',
                direccion: op.ubicacion || ''
            })
            setBusquedaCliente(op.cliente_nombre || op.cliente_numero || '')
        }

        // Precargar factura
        if (op.razon_social) setRazonSocial(op.razon_social)
        if (op.ruc_factura) setRucFactura(op.ruc_factura)

        // Precargar método de pago
        if (op.metodo_pago) setMetodoPago(op.metodo_pago)

        // Precargar canal y datos de delivery si aplica
        if (op.modalidad === 'delivery') {
            setCanal('delivery')
            setFormDelivery({
                ubicacion: op.ubicacion || '',
                referencia: op.referencia || '',
                horario: op.horario || '',
                contacto_entrega: op.contacto_entrega || '',
                zona_id: op.zona_id || '',
                zona_nombre: op.zona_delivery || '',
                costo_delivery: op.costo_delivery || 0
            })
        } else {
            setCanal('presencial')
        }

        // Precargar productos de la OP
        if (op.items?.length > 0) {
            try {
                const prods = await getProductos()
                const lineasPrecargadas = []

                for (const item of op.items) {
                    if (!item.presentacion_id) continue

                    // Buscar el producto que contiene esta presentacion
                    const producto = prods.find(p =>
                        p.presentaciones?.some(pr => pr.id === item.presentacion_id)
                    )
                    if (!producto) continue

                    const presentacion = producto.presentaciones.find(pr => pr.id === item.presentacion_id)
                    if (!presentacion) continue

                    lineasPrecargadas.push({
                        id: item.presentacion_id,
                        busqueda: `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`,
                        productosFiltrados: [],
                        productoSeleccionado: producto,
                        presentacionSeleccionada: presentacion,
                        cantidad: item.cantidad || 1
                    })
                }

                if (lineasPrecargadas.length > 0) {
                    setLineas(lineasPrecargadas)
                }
            } catch (e) {}
        }
    }

    async function handleBuscarCliente(valor) {
        setBusquedaCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try { const r = await buscarClientes(valor); setResultadosCliente(r) } catch (err) {}
    }

    function handleBuscarProducto(lineaId, valor) {
        const filtrados = valor.trim() ? productos.filter(p =>
            p.nombre.toLowerCase().includes(valor.toLowerCase()) ||
            (p.marca_nombre && p.marca_nombre.toLowerCase().includes(valor.toLowerCase()))
        ) : []
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
        if (pr.descuento_activo && pr.precio_descuento && new Date(pr.descuento_desde) <= ahora && new Date(pr.descuento_hasta) >= ahora)
            return { precio: pr.precio_descuento, conDescuento: true }
        return { precio: pr.precio_venta, conDescuento: false }
    }

    function handleZonaChange(zona_id) {
        const zona = zonas.find(z => z.id === parseInt(zona_id))
        setFormDelivery(prev => ({
            ...prev,
            zona_id: zona_id,
            zona_nombre: zona?.nombre || '',
            costo_delivery: zona?.costo || 0
        }))
    }

    const lineasValidas = lineas.filter(l => l.presentacionSeleccionada)
    const subtotal = lineasValidas.reduce((sum, l) => sum + calcularPrecioEfectivo(l.presentacionSeleccionada).precio * l.cantidad, 0)
    const costoDelivery = canal === 'delivery' ? (formDelivery.costo_delivery || 0) : 0
    const total = subtotal + costoDelivery
    const iva = Math.floor(total / 11)

    async function handleCrearCliente() {
        if (!formCliente.nombre.trim()) return
        try {
            const nuevo = await crearCliente({ ...formCliente, origen: 'presencial' })
            setClienteSeleccionado(nuevo)
            setCreandoCliente(false)
            setResultadosCliente([])
            setBusquedaCliente(nuevo.nombre)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function resetCaja() {
        setLineas([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
        setClienteSeleccionado(null)
        setBusquedaCliente('')
        setRucFactura('')
        setRazonSocial('')
        setCanal('presencial')
        setMetodoPago('efectivo')
        setOpOrigen(null)
        setFormDelivery({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', zona_id: '', zona_nombre: '', costo_delivery: 0 })
    }

    async function handleConfirmarVenta() {
        if (lineasValidas.length === 0) {
            setModalConfirmar({ titulo: 'Falta el producto', mensaje: 'Agrega al menos un producto con presentacion seleccionada.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        if (canal === 'delivery' && clienteSeleccionado?.id && formDelivery.referencia) {
            api.patch(`/clientes/${clienteSeleccionado.id}`, {
                referencia_delivery: formDelivery.referencia
            }).catch(() => {})
        }

       const canalFinal = opOrigen
            ? (canal === 'delivery' ? 'whatsapp_delivery' : 'whatsapp_bot')
            : (canal === 'delivery' ? 'agente_delivery' : 'agente_presencial')

        setModalConfirmar({
            titulo: 'Confirmar venta',
            mensaje: `Registrar ${lineasValidas.length} producto(s) por Gs. ${total.toLocaleString()}?`,
            textoBoton: 'Confirmar', colorBoton: '#10b981',
            onConfirmar: async () => {
                try {
                    const ventasIds = []

                    for (let i = 0; i < lineasValidas.length; i++) {
                        const linea = lineasValidas[i]
                        const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                        const respuesta = await registrarVentaPresencial({
                            cliente_id: clienteSeleccionado?.id || null,
                            presentacion_id: linea.presentacionSeleccionada.id,
                            cantidad: linea.cantidad,
                            precio: precio * linea.cantidad,
                            metodo_pago: metodoPago,
                            quiere_factura: !!(razonSocial || rucFactura),
                            ruc_factura: rucFactura || null,
                            razon_social: razonSocial || null,
                            canal: canalFinal,
                            costo_delivery: i === 0 ? costoDelivery : 0,
                            zona_delivery: i === 0 ? (formDelivery.zona_nombre || null) : null
                        })
                        ventasIds.push(respuesta?.venta?.id)
                    }

                    // Si es delivery, crear el delivery
                    if (canal === 'delivery' && ventasIds[0]) {
                        await api.post('/deliveries/simple', {
                            venta_id: ventasIds[0],
                            cliente_numero: clienteSeleccionado?.telefono || null,
                            ubicacion: formDelivery.ubicacion,
                            referencia: formDelivery.referencia,
                            horario: formDelivery.horario,
                            contacto_entrega: formDelivery.contacto_entrega,
                            metodo_pago: metodoPago
                        })
                    }

                    // Si viene de una OP, marcarla como confirmada
                    if (opOrigen) {
                        try {
                            await confirmarOrden(opOrigen.id, { modalidad: canal, metodo_pago: metodoPago })
                        } catch (e) {}
                    }

                    resetCaja()
                    setModalConfirmar({
                        titulo: 'Venta registrada',
                        mensaje: `Venta registrada correctamente por Gs. ${total.toLocaleString()}.${canal === 'delivery' ? ' Delivery creado.' : ''}`,
                        textoBoton: 'Nueva venta',
                        colorBoton: '#10b981',
                        onConfirmar: () => { setModalConfirmar(null); busquedaProductoRef.current?.focus() }
                    })
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar la venta.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

                {/* Banner OP precargada */}
                {opOrigen && (
                    <div style={{ background: darkMode ? '#1e3a5f' : '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8' }}>
                                Procesando orden {opOrigen.numero}
                                <span style={{ marginLeft: '10px', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', background: opOrigen.modalidad === 'delivery' ? '#dbeafe' : '#dcfce7', color: opOrigen.modalidad === 'delivery' ? '#1d4ed8' : '#166534', fontWeight: '700' }}>
                                    {opOrigen.modalidad === 'delivery' ? 'Delivery' : 'Retiro en tienda'}
                                </span>
                            </p>
                            <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>
                                Agrega los productos manualmente. Al confirmar la venta, la orden quedara como confirmada.
                            </p>
                        </div>
                        <button onClick={() => setOpOrigen(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.textMuted, fontSize: '16px' }}>✕</button>
                    </div>
                )}

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
                                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
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

                                        {linea.presentacionSeleccionada && (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0', border: `1px solid ${s.border}`, borderRadius: '10px', overflow: 'hidden', background: s.surfaceLow }}>
                                                    <button onClick={() => cambiarCantidad(linea.id, -1)}
                                                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                    <span style={{ width: '48px', textAlign: 'center', fontSize: '16px', fontWeight: '800', color: s.text }}>{linea.cantidad}</span>
                                                    <button onClick={() => cambiarCantidad(linea.id, 1)}
                                                        style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                                </div>
                                                <span style={{ fontSize: '11px', color: s.textFaint }}>Stock: {linea.presentacionSeleccionada.stock}</span>
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
                <section style={{ marginBottom: '24px' }}>
                    <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <h2 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '20px' }}>Cliente y Factura</h2>

                        <label style={labelStyle}>Buscar cliente existente (opcional)</label>
                        <input placeholder="Nombre, RUC o telefono..." value={busquedaCliente} onChange={e => handleBuscarCliente(e.target.value)} style={inputStyle} />

                        {resultadosCliente.length > 0 && (
                            <div style={{ border: `1px solid ${s.border}`, borderRadius: '10px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                {resultadosCliente.map(c => (
                                    <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(c.nombre); setResultadosCliente([]) }}
                                        style={{ padding: '10px 16px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: s.surface }}
                                        onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                        onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                        <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{c.nombre}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{c.ruc && `RUC: ${c.ruc} · `}{c.telefono && `${c.telefono}`}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {clienteSeleccionado && (
                            <div style={{ padding: '12px 16px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #86efac' }}>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>✓ {clienteSeleccionado.nombre}</p>
                                    {clienteSeleccionado.ruc && <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>RUC: {clienteSeleccionado.ruc}</p>}
                                    {clienteSeleccionado.telefono && <p style={{ fontSize: '11px', color: s.textMuted }}>Tel: {clienteSeleccionado.telefono}</p>}
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
                                    <option value="persona">Persona fisica</option>
                                    <option value="empresa">Empresa</option>
                                </select>
                                <label style={labelStyle}>Nombre *</label>
                                <input value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>RUC</label>
                                <input value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} style={inputStyle} />
                                <label style={labelStyle}>Telefono</label>
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
                                    <label style={labelStyle}>Razon social</label>
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

                {/* Datos de delivery — solo si canal es delivery */}
                {canal === 'delivery' && (
                    <section style={{ marginBottom: '24px' }}>
                        <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: '14px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: '700', color: s.text, marginBottom: '20px' }}>Datos de entrega</h2>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Ubicacion / Direccion *</label>
                                    <input value={formDelivery.ubicacion} onChange={e => setFormDelivery({ ...formDelivery, ubicacion: e.target.value })} placeholder="Barrio, calle, link de maps..." style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Referencia</label>
                                    <input value={formDelivery.referencia} onChange={e => setFormDelivery({ ...formDelivery, referencia: e.target.value })} placeholder="Numero de casa, parada..." style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Horario preferido</label>
                                    <input value={formDelivery.horario} onChange={e => setFormDelivery({ ...formDelivery, horario: e.target.value })} placeholder="Ej: Desde las 14hs" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Contacto que recibe</label>
                                    <input value={formDelivery.contacto_entrega} onChange={e => setFormDelivery({ ...formDelivery, contacto_entrega: e.target.value })} placeholder="Nombre y telefono" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Zona de delivery</label>
                                    <select value={formDelivery.zona_id} onChange={e => handleZonaChange(e.target.value)} style={inputStyle}>
                                        <option value="">Seleccionar zona...</option>
                                        {zonas.filter(z => z.activa).map(z => (
                                            <option key={z.id} value={z.id}>{z.nombre} — Gs. {z.costo.toLocaleString()}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {formDelivery.costo_delivery > 0 && (
                                <div style={{ padding: '10px 14px', background: s.surfaceLow, borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '12px', color: s.textMuted }}>Costo de delivery</span>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>Gs. {formDelivery.costo_delivery.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                    </section>
                )}
            </div>

            {/* Panel derecho fijo */}
            <div style={{ width: '400px', background: s.surface, borderLeft: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto', flexShrink: 0 }}>

                {/* Canal de venta — solo Presencial y Delivery */}
                <section style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: s.text, marginBottom: '12px' }}>Modalidad</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {[
                            { valor: 'presencial', label: 'Retiro en tienda', icono: '🏪' },
                            { valor: 'delivery', label: 'Delivery', icono: '🚚' },
                        ].map(c => {
                            const activo = canal === c.valor
                            return (
                                <button key={c.valor} onClick={() => setCanal(c.valor)}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px', border: `${activo ? 2 : 1}px solid ${activo ? '#1a1a2e' : s.border}`, borderRadius: '12px', background: activo ? (darkMode ? 'rgba(26,26,46,0.4)' : 'rgba(26,26,46,0.04)') : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}>
                                    <span style={{ fontSize: '24px' }}>{c.icono}</span>
                                    <span style={{ fontSize: '12px', fontWeight: activo ? '700' : '500', color: activo ? s.text : s.textMuted }}>{c.label}</span>
                                    {activo && <span style={{ fontSize: '12px', color: '#1a1a2e' }}>✓</span>}
                                </button>
                            )
                        })}
                    </div>
                </section>

                {/* Método de pago */}
                <section style={{ marginBottom: '28px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: s.text, marginBottom: '12px' }}>Metodo de pago</h3>
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
                            <p style={{ fontSize: '13px' }}>Selecciona productos para comenzar</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {lineasValidas.map(linea => {
                                    const { precio } = calcularPrecioEfectivo(linea.presentacionSeleccionada)
                                    return (
                                        <div key={linea.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', fontSize: '13px' }}>
                                            <span style={{ color: '#94a3b8', flex: 1, lineHeight: '1.4' }}>
                                                {linea.productoSeleccionado.nombre} — {linea.presentacionSeleccionada.nombre} x{linea.cantidad}
                                            </span>
                                            <span style={{ fontWeight: '700', flexShrink: 0 }}>Gs. {(precio * linea.cantidad).toLocaleString()}</span>
                                        </div>
                                    )
                                })}

                                {canal === 'delivery' && formDelivery.costo_delivery > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#64748b' }}>
                                        <span>Delivery a {formDelivery.zona_nombre}</span>
                                        <span>Gs. {formDelivery.costo_delivery.toLocaleString()}</span>
                                    </div>
                                )}
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
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
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