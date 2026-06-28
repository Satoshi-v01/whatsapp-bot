import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductos, buscarPorCodigoBarras } from '../services/productos'
import { buscarClientes, crearCliente, getCliente } from '../services/clientes'
import { registrarVentaPresencial } from '../services/ventas'
import { confirmarOrden } from '../services/ordenes'
import { getZonas } from '../services/zonas'
import ModalConfirmar from '../components/ModalConfirmar'
import { imprimirFactura, imprimirCierre } from '../utils/factura'
import { useApp } from '../App'
import api from '../services/api'
import { formatearCalidad } from '../utils/formato'
import { fechaHoyPY } from '../utils/fecha'


function Caja() {
    const navigate = useNavigate()
    const busquedaProductoRef = useRef(null)
    const codigoBarrasRef = useRef('')
    const codigoBarrasTimer = useRef(null)
    const procesandoVenta = useRef(false)
    const { darkMode } = useApp()
    const [pestana, setPestana] = useState('venta')
    const [tipoVenta, setTipoVenta] = useState('contado')
    const [plazoDias, setPlazoDias] = useState(30)
    const [montoEfectivo, setMontoEfectivo] = useState('')
    const [configFactura, setConfigFactura] = useState({})
    const [cajero, setCajero] = useState('')

    const segBtn = (active, color) => ({
        flex: 1,
        padding: '9px 6px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: active ? '700' : '500',
        border: active ? `1px solid ${color || '#1a1a22'}` : '1px solid #e6e4de',
        background: active ? (color || '#1a1a22') : '#fff',
        color: active ? '#fff' : '#6d6b65',
        transition: 'all 0.15s',
        textAlign: 'center',
    })

    const fieldInput = { padding: '8px 12px', borderRadius: '8px', border: '1px solid #e3e1db', background: '#faf9f7', color: '#1a1a22', fontSize: '12px', outline: 'none', boxSizing: 'border-box', width: '100%' }
    const fieldLabel = { fontSize: '10px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' }

    // Estados venta
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
    const [facturaManual, setFacturaManual] = useState(false)
    const [numeroFacturaManual, setNumeroFacturaManual] = useState('')
    const [canal, setCanal] = useState('presencial')
    const [metodoPago, setMetodoPago] = useState('efectivo')
    const [subtipoPago, setSubtipoPago] = useState('')
    const [opOrigen, setOpOrigen] = useState(null)
    const [formDelivery, setFormDelivery] = useState({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', zona_id: '', zona_nombre: '', costo_delivery: 0 })

    // Estados cierre de caja
    const [cierreDatos, setCierreDatos] = useState(null)
    const [cargandoCierre, setCargandoCierre] = useState(false)
    const [gastos, setGastos] = useState([])
    const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' })
    const [fechaCierre, setFechaCierre] = useState(fechaHoyPY())

    useEffect(() => {
        async function init() {
            await cargarDatos()
            await cargarOpPrecargada()
            const u = JSON.parse(localStorage.getItem('usuario') || '{}')
            setCajero(u.nombre || '')
        }
        init()
    }, [])

    useEffect(() => {
        if (pestana === 'cierre') cargarCierre()
    }, [pestana, fechaCierre])

    useEffect(() => {
        if (!clienteSeleccionado) return
        if (clienteSeleccionado.ruc) setRucFactura(clienteSeleccionado.ruc)
        if (clienteSeleccionado.nombre) setRazonSocial(clienteSeleccionado.nombre)

        if (clienteSeleccionado.direccion || clienteSeleccionado.ciudad) {
            setFormDelivery(prev => ({
                ...prev,
                ubicacion: clienteSeleccionado.direccion || prev.ubicacion,
                contacto_entrega: clienteSeleccionado.nombre || prev.contacto_entrega,
                referencia: clienteSeleccionado.ultima_referencia || prev.referencia,
            }))

            if (clienteSeleccionado.ciudad) {
                const normalizar = str => str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
                const ciudadNorm = normalizar(clienteSeleccionado.ciudad)
                const zonaMatch = zonas.find(z => normalizar(z.nombre) === ciudadNorm)
                if (zonaMatch) {
                    setFormDelivery(prev => ({ ...prev, zona_id: zonaMatch.id, zona_nombre: zonaMatch.nombre, costo_delivery: zonaMatch.costo }))
                }
            }
        }
    }, [clienteSeleccionado, zonas])

    useEffect(() => {
        if (pestana !== 'venta') return

        function handleKeyDown(e) {
            if (e.key === 'Enter') {
                const codigo = codigoBarrasRef.current.trim()
                if (codigo.length >= 4) {
                    handleScannerCodigo(codigo)
                }
                codigoBarrasRef.current = ''
                clearTimeout(codigoBarrasTimer.current)
                return
            }
            if (e.key.length === 1) {
                codigoBarrasRef.current += e.key
                clearTimeout(codigoBarrasTimer.current)
                codigoBarrasTimer.current = setTimeout(() => {
                    codigoBarrasRef.current = ''
                }, 100)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [pestana, lineas])

    async function cargarDatos() {
        try {
            const [prods, zns, resFactura] = await Promise.all([getProductos(), getZonas(), api.get('/configuracion/factura')])
            setProductos(prods)
            setZonas(zns)
            setConfigFactura(resFactura.data)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function cargarCierre() {
        try {
            setCargandoCierre(true)
            const res = await api.get(`/ventas/historial?periodo=personalizado&fecha_desde=${fechaCierre}T00:00:00&fecha_hasta=${fechaCierre}T23:59:59&por_pagina=1000`)
            const ventas = res.data.ventas || []

            const resumen = {}
            let totalGeneral = 0

            for (const v of ventas) {
                const metodo = v.metodo_pago || 'efectivo'
                const subtipo = v.subtipo_pago || ''
                const clave = subtipo ? `${metodo}_${subtipo}` : metodo
                const monto = parseInt(v.precio) || 0
                if (!resumen[clave]) resumen[clave] = { metodo, subtipo, cantidad: 0, total: 0 }
                resumen[clave].cantidad++
                resumen[clave].total += monto
                totalGeneral += monto
            }

            const canales = {}
            for (const v of ventas) {
                const c = v.canal || 'otro'
                const canalLabel = {
                    agente_presencial: 'Tienda', presencial: 'Tienda', en_tienda: 'Tienda',
                    agente_delivery: 'Delivery', whatsapp_delivery: 'Delivery',
                    whatsapp_bot: 'Bot', whatsapp: 'Bot'
                }[c] || 'Otro'
                if (!canales[canalLabel]) canales[canalLabel] = { cantidad: 0, total: 0 }
                canales[canalLabel].cantidad++
                canales[canalLabel].total += parseInt(v.precio) || 0
            }

            setCierreDatos({ resumen, canales, totalGeneral, cantidadVentas: ventas.length, ventas })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos del cierre.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargandoCierre(false) }
    }

    async function cargarOpPrecargada() {
        const opJson = sessionStorage.getItem('op_precargada')
        if (!opJson) return
        sessionStorage.removeItem('op_precargada')
        const op = JSON.parse(opJson)
        setOpOrigen(op)

        if (op.cliente_nombre || op.cliente_numero) {
            let rucCliente = op.ruc_factura || ''
            if (!rucCliente && op.cliente_id) {
                try {
                    const c = await getCliente(op.cliente_id)
                    rucCliente = c.ruc || ''
                } catch (e) {}
            }
            setClienteSeleccionado({ id: op.cliente_id, nombre: op.cliente_nombre || `Cliente ${op.cliente_numero}`, telefono: op.cliente_telefono || op.cliente_numero, ruc: rucCliente, direccion: op.ubicacion || '' })
            setBusquedaCliente(op.cliente_nombre || op.cliente_numero || '')
        }
        if (op.razon_social) setRazonSocial(op.razon_social)
        if (op.ruc_factura) setRucFactura(op.ruc_factura)
        if (op.metodo_pago) setMetodoPago(op.metodo_pago)

        if (op.modalidad === 'delivery') {
            setCanal('delivery')
            setFormDelivery({ ubicacion: op.ubicacion || '', referencia: op.referencia || '', horario: op.horario || '', contacto_entrega: op.contacto_entrega || '', zona_id: op.zona_id || '', zona_nombre: op.zona_delivery || '', costo_delivery: op.costo_delivery || 0 })
        } else {
            setCanal('presencial')
        }

        if (op.items?.length > 0) {
            try {
                const prods = await getProductos()
                const lineasPrecargadas = op.items.filter(i => i.presentacion_id).map(item => {
                    const producto = prods.find(p => p.presentaciones?.some(pr => pr.id === item.presentacion_id))
                    if (!producto) return null
                    const presentacion = producto.presentaciones.find(pr => pr.id === item.presentacion_id)
                    if (!presentacion) return null
                    return { id: item.presentacion_id, busqueda: `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: presentacion, cantidad: item.cantidad || 1 }
                }).filter(Boolean)
                if (lineasPrecargadas.length > 0) setLineas(lineasPrecargadas)
            } catch (e) {}
        }
    }

    async function handleBuscarCliente(valor) {
        setBusquedaCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try { const r = await buscarClientes(valor); setResultadosCliente(r) } catch (err) {}
    }

    function handleBuscarProducto(lineaId, valor) {
        const filtrados = valor.trim()
            ? productos
                .filter(p => p.nombre.toLowerCase().includes(valor.toLowerCase()) || (p.marca_nombre && p.marca_nombre.toLowerCase().includes(valor.toLowerCase())))
                .sort((a, b) => {
                    const stockA = a.presentaciones?.reduce((s, pr) => s + (pr.stock || 0), 0) || 0
                    const stockB = b.presentaciones?.reduce((s, pr) => s + (pr.stock || 0), 0) || 0
                    if ((stockA > 0) !== (stockB > 0)) return stockA > 0 ? -1 : 1
                    return a.nombre.localeCompare(b.nombre)
                })
            : []
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

    function calcularPrecioCaja(pr, metodo = metodoPago) {
        if (metodo === 'tarjeta') {
            return { precio: pr.precio_tarjeta || pr.precio_venta, conDescuento: false }
        }
        const ahora = new Date()
        if (pr.descuento_activo && pr.precio_descuento && new Date(pr.descuento_desde) <= ahora && new Date(pr.descuento_hasta) >= ahora)
            return { precio: pr.precio_descuento, conDescuento: true }
        return { precio: pr.precio_venta, conDescuento: false }
    }

    function handleZonaChange(zona_id) {
        const zona = zonas.find(z => z.id === parseInt(zona_id))
        setFormDelivery(prev => ({ ...prev, zona_id, zona_nombre: zona?.nombre || '', costo_delivery: zona?.costo || 0 }))
    }

    function agregarGasto() {
        if (!nuevoGasto.descripcion.trim() || !nuevoGasto.monto) return
        setGastos(prev => [...prev, { id: Date.now(), ...nuevoGasto, monto: parseInt(nuevoGasto.monto) }])
        setNuevoGasto({ descripcion: '', monto: '' })
    }

    function eliminarGasto(id) {
        setGastos(prev => prev.filter(g => g.id !== id))
    }

    function handleImprimirCierre() {
        imprimirCierre({ cierreDatos, gastos, fechaCierre, cajero, config: configFactura })
    }

    async function handleScannerCodigo(codigo) {
        try {
            const pr = await buscarPorCodigoBarras(codigo)

            const producto = {
                id: pr.producto_id,
                nombre: pr.producto_nombre,
                marca_nombre: pr.marca_nombre,
                categoria_nombre: pr.categoria_nombre,
                calidad: pr.calidad,
                categoria_id: pr.categoria_id,
                marca_id: pr.marca_id,
                descripcion: pr.descripcion,
                sku: pr.sku,
                presentaciones: [pr]
            }

            const lineaVacia = lineas.find(l => !l.presentacionSeleccionada)

            if (lineaVacia) {
                setLineas(prev => prev.map(l =>
                    l.id === lineaVacia.id
                        ? { ...l, busqueda: `${pr.marca_nombre ? pr.marca_nombre + ' — ' : ''}${pr.producto_nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: pr }
                        : l
                ))
            } else {
                const nuevoId = Math.max(...lineas.map(l => l.id)) + 1
                setLineas(prev => [...prev, { id: nuevoId, busqueda: `${pr.marca_nombre ? pr.marca_nombre + ' — ' : ''}${pr.producto_nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: pr, cantidad: 1 }])
            }
        } catch (err) {
            if (err.response?.status === 404) {
                setModalConfirmar({
                    titulo: 'Producto no encontrado',
                    mensaje: `No se encontro ningun producto con el codigo "${codigo}".`,
                    textoBoton: 'Cerrar',
                    colorBoton: '#888',
                    onConfirmar: () => setModalConfirmar(null)
                })
            }
        }
    }

    const lineasValidas = lineas.filter(l => l.presentacionSeleccionada)
    const subtotal = lineasValidas.reduce((sum, l) => sum + calcularPrecioCaja(l.presentacionSeleccionada).precio * l.cantidad, 0)
    const costoDelivery = canal === 'delivery' ? (formDelivery.costo_delivery || 0) : 0
    const total = subtotal + costoDelivery
    const iva = Math.floor(total / 11)

    async function handleCrearCliente() {
        if (!formCliente.nombre.trim()) return
        try {
            const nuevo = await crearCliente({ ...formCliente, origen: 'presencial' })
            setClienteSeleccionado(nuevo); setCreandoCliente(false); setResultadosCliente([]); setBusquedaCliente(nuevo.nombre)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function resetCaja() {
        setLineas([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1 }])
        setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial(''); setFacturaManual(false); setNumeroFacturaManual('')
        setCanal('presencial'); setMetodoPago('efectivo'); setSubtipoPago(''); setOpOrigen(null)
        setFormDelivery({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', zona_id: '', zona_nombre: '', costo_delivery: 0 })
        setTipoVenta('contado')
        setPlazoDias(30)
        setMontoEfectivo('')
    }

    async function handleConfirmarVenta() {
        if (lineasValidas.length === 0) {
            setModalConfirmar({ titulo: 'Falta el producto', mensaje: 'Agrega al menos un producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        if (canal === 'delivery' && !formDelivery.ubicacion) {
            setModalConfirmar({ titulo: 'Falta la ubicacion', mensaje: 'Ingresa la ubicacion para el delivery.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        if (metodoPago === 'tarjeta' && !subtipoPago) {
            setModalConfirmar({ titulo: 'Falta el tipo de tarjeta', mensaje: 'Selecciona si es debito o credito.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        if (tipoVenta === 'credito' && !clienteSeleccionado) {
            setModalConfirmar({ titulo: 'Cliente requerido', mensaje: 'Para venta a credito debes seleccionar un cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }

        if (canal === 'delivery' && clienteSeleccionado?.id && formDelivery.referencia) {
            api.patch(`/clientes/${clienteSeleccionado.id}`, { referencia_delivery: formDelivery.referencia }).catch(() => {})
        }

        const canalFinal = opOrigen
            ? (canal === 'delivery' ? 'whatsapp_delivery' : 'whatsapp_bot')
            : (canal === 'delivery' ? 'agente_delivery' : 'agente_presencial')

        const montoEfectivoNum = parseInt(montoEfectivo) || 0
        const vueltoCalculado = metodoPago === 'efectivo' && montoEfectivoNum > total ? montoEfectivoNum - total : 0

        setModalConfirmar({
            titulo: 'Confirmar venta',
            mensaje: `Registrar ${lineasValidas.length} producto(s) por Gs. ${total.toLocaleString()}?`,
            textoBoton: 'Confirmar', colorBoton: '#0f9d6b',
            onConfirmar: async () => {
                if (procesandoVenta.current) return
                procesandoVenta.current = true

                let numeroFactura = null
                let datosImpresion = null
                try {
                    if (facturaManual) {
                        numeroFactura = numeroFacturaManual.trim() || null
                    } else {
                        const resNumero = await api.post('/configuracion/factura/siguiente-numero')
                        numeroFactura = resNumero.data.numero_formateado
                    }

                    const ventasIds = []
                    for (let i = 0; i < lineasValidas.length; i++) {
                        const linea = lineasValidas[i]
                        const { precio } = calcularPrecioCaja(linea.presentacionSeleccionada)
                        const respuesta = await registrarVentaPresencial({
                            cliente_id: clienteSeleccionado?.id || null,
                            presentacion_id: linea.presentacionSeleccionada.id,
                            cantidad: linea.cantidad,
                            precio: precio * linea.cantidad,
                            metodo_pago: metodoPago,
                            subtipo_pago: subtipoPago || null,
                            tipo_iva: '10',
                            quiere_factura: !!(razonSocial || rucFactura),
                            ruc_factura: rucFactura || null,
                            razon_social: razonSocial || null,
                            canal: canalFinal,
                            tipo_venta: tipoVenta,
                            plazo_dias: tipoVenta === 'credito' ? plazoDias : null,
                            costo_delivery: i === 0 ? costoDelivery : 0,
                            zona_delivery: i === 0 ? (formDelivery.zona_nombre || null) : null,
                            numero_factura: numeroFactura
                        })
                        ventasIds.push(respuesta?.venta?.id)
                    }

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

                    if (opOrigen) {
                        try { await confirmarOrden(opOrigen.id, { modalidad: canal, metodo_pago: metodoPago }) } catch (e) {}
                    }

                    const metodoImpresion = metodoPago === 'tarjeta'
                        ? (subtipoPago === 'debito' ? 'tarjeta_debito' : 'tarjeta_credito')
                        : metodoPago

                    datosImpresion = {
                        numero_factura: numeroFactura,
                        cliente_nombre: razonSocial || clienteSeleccionado?.nombre || null,
                        cliente_ruc: rucFactura || clienteSeleccionado?.ruc || null,
                        tipo_venta: tipoVenta,
                        metodo_pago: metodoImpresion,
                        monto_efectivo: montoEfectivoNum || total,
                        vuelto: vueltoCalculado,
                        items: [
                            ...lineasValidas.map(linea => {
                                const { precio } = calcularPrecioCaja(linea.presentacionSeleccionada)
                                return {
                                    descripcion: `${linea.productoSeleccionado.marca_nombre ? linea.productoSeleccionado.marca_nombre + ' ' : ''}${linea.productoSeleccionado.nombre} ${linea.presentacionSeleccionada.nombre}`,
                                    cantidad: linea.cantidad,
                                    precio_unitario: precio,
                                    total: precio * linea.cantidad,
                                    iva: 10
                                }
                            }),
                            ...(costoDelivery > 0 ? [{
                                descripcion: `Delivery — ${formDelivery.zona_nombre || 'Zona'}`,
                                cantidad: 1,
                                precio_unitario: costoDelivery,
                                total: costoDelivery,
                                iva: 10
                            }] : [])
                        ],
                        total,
                        cajero,
                        config: configFactura
                    }

                    resetCaja()
                    setModalConfirmar({
                        titulo: 'Venta registrada',
                        mensaje: `Factura ${numeroFactura} — Gs. ${total.toLocaleString()}${canal === 'delivery' ? ' · Delivery creado.' : ''}`,
                        textoBoton: 'Nueva venta', colorBoton: '#0f9d6b',
                        onConfirmar: () => { setModalConfirmar(null); busquedaProductoRef.current?.focus() }
                    })
                } catch (err) {
                    const detalle = err.response?.data?.error
                        || (err.response ? `Error HTTP ${err.response.status}` : `Sin respuesta del servidor (${err.message})`)
                    setModalConfirmar({ titulo: 'Error al registrar', mensaje: detalle, textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                } finally {
                    procesandoVenta.current = false
                }

                if (datosImpresion) {
                    try { imprimirFactura(datosImpresion) } catch (e) { console.error('Error al imprimir:', e) }
                }
            }
        })
    }

    if (cargando) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#eeede9', color: '#9d9b96', fontSize: '14px' }}>
            Cargando caja...
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: '#eeede9', overflow: 'hidden' }}>

            {/* Top bar */}
            <div style={{ height: '52px', background: '#fff', borderBottom: '1px solid #e3e1db', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
                <div style={{ display: 'flex' }}>
                    {[{ id: 'venta', label: 'Nueva Venta' }, { id: 'cierre', label: 'Cierre de Caja' }].map(tab => (
                        <button key={tab.id} onClick={() => setPestana(tab.id)}
                            style={{ padding: '0 18px', height: '52px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: pestana === tab.id ? '700' : '500', color: pestana === tab.id ? '#1a1a22' : '#6d6b65', borderBottom: `2px solid ${pestana === tab.id ? '#1a1a22' : 'transparent'}`, transition: 'all 0.15s' }}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#9d9b96' }}>
                        {new Date().toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={() => navigate('/dashboard/ventas')}
                        style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #e3e1db', background: 'transparent', color: '#6d6b65', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                        Ver ventas
                    </button>
                </div>
            </div>

            {/* ── PESTAÑA VENTA ── */}
            {pestana === 'venta' && (
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* Panel izquierdo */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>

                        {/* Banner OP */}
                        {opOrigen && (
                            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ fontSize: '13px', fontWeight: '800', color: '#1d4ed8' }}>
                                        Procesando orden {opOrigen.numero}
                                        <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: opOrigen.modalidad === 'delivery' ? '#dbeafe' : '#dcfce7', color: opOrigen.modalidad === 'delivery' ? '#1d4ed8' : '#166534', fontWeight: '700' }}>
                                            {opOrigen.modalidad === 'delivery' ? 'Delivery' : 'Retiro en tienda'}
                                        </span>
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#6d6b65', marginTop: '2px' }}>Al confirmar, la orden quedara como confirmada.</p>
                                </div>
                                <button onClick={() => setOpOrigen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d9b96', fontSize: '16px' }}>x</button>
                            </div>
                        )}

                        {/* Barra de cliente */}
                        <div style={{ background: '#fff', border: '1px solid #e3e1db', borderRadius: '12px', padding: '12px 16px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Avatar */}
                                <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: '#e3e1db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {clienteSeleccionado
                                        ? <span style={{ fontSize: '15px', fontWeight: '700', color: '#6d6b65' }}>{clienteSeleccionado.nombre[0].toUpperCase()}</span>
                                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9d9b96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                    }
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {clienteSeleccionado ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a22' }}>{clienteSeleccionado.nombre}</p>
                                                {clienteSeleccionado.ruc && <p style={{ fontSize: '11px', color: '#9d9b96' }}>RUC: {clienteSeleccionado.ruc}</p>}
                                                {clienteSeleccionado.telefono && <p style={{ fontSize: '11px', color: '#9d9b96' }}>Tel: {clienteSeleccionado.telefono}</p>}
                                            </div>
                                            <button onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial('') }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d9b96', fontSize: '18px', flexShrink: 0 }}>x</button>
                                        </div>
                                    ) : (
                                        <input
                                            placeholder="Buscar cliente por nombre, RUC o telefono..."
                                            value={busquedaCliente}
                                            onChange={e => handleBuscarCliente(e.target.value)}
                                            style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', color: '#1a1a22', outline: 'none' }}
                                        />
                                    )}
                                </div>
                                {!clienteSeleccionado && (
                                    <button onClick={() => setCreandoCliente(!creandoCliente)}
                                        style={{ fontSize: '11px', padding: '6px 12px', border: '1px solid #e3e1db', borderRadius: '8px', background: 'transparent', color: '#6d6b65', cursor: 'pointer', fontWeight: '600', flexShrink: 0 }}>
                                        {creandoCliente ? 'Cancelar' : '+ Nuevo'}
                                    </button>
                                )}
                            </div>

                            {resultadosCliente.length > 0 && (
                                <div style={{ marginTop: '8px', border: '1px solid #e3e1db', borderRadius: '8px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                    {resultadosCliente.map(c => (
                                        <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(c.nombre); setResultadosCliente([]) }}
                                            style={{ padding: '9px 14px', borderBottom: '1px solid #f0eee8', cursor: 'pointer', background: '#fff' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a22' }}>{c.nombre}</p>
                                            <p style={{ fontSize: '11px', color: '#9d9b96' }}>{c.ruc && `RUC: ${c.ruc} · `}{c.telefono}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {creandoCliente && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid #f0eee8', paddingTop: '12px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <select value={formCliente.tipo} onChange={e => setFormCliente({ ...formCliente, tipo: e.target.value })}
                                            style={{ ...fieldInput, gridColumn: '1 / -1' }}>
                                            <option value="persona">Persona fisica</option>
                                            <option value="empresa">Empresa</option>
                                        </select>
                                        <input placeholder="Nombre *" value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                                            style={{ ...fieldInput, gridColumn: '1 / -1' }} />
                                        <input placeholder="RUC" value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} style={fieldInput} />
                                        <input placeholder="Telefono" value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} style={fieldInput} />
                                    </div>
                                    <button onClick={handleCrearCliente}
                                        style={{ marginTop: '8px', width: '100%', padding: '9px', borderRadius: '8px', border: 'none', background: '#1a1a22', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                        Crear y seleccionar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Productos */}
                        <div style={{ background: '#fff', border: '1px solid #e3e1db', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0eee8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#faf9f7' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22' }}>Productos</span>
                                <button onClick={agregarLinea}
                                    style={{ fontSize: '11px', padding: '5px 12px', border: '1px solid #e3e1db', borderRadius: '7px', background: '#fff', color: '#6d6b65', cursor: 'pointer', fontWeight: '600' }}>
                                    + Agregar
                                </button>
                            </div>

                            {/* Header de tabla */}
                            {lineasValidas.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 100px 108px 28px', padding: '6px 16px', background: '#fafaf8', borderBottom: '1px solid #f0eee8' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cant.</span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', paddingRight: '8px' }}>P.Unit</span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', paddingRight: '8px' }}>Total</span>
                                    <span></span>
                                </div>
                            )}

                            {/* Filas de productos seleccionados */}
                            {lineasValidas.map(linea => {
                                const pr = linea.presentacionSeleccionada
                                const { precio, conDescuento } = calcularPrecioCaja(pr)
                                return (
                                    <div key={linea.id} style={{ display: 'grid', gridTemplateColumns: '96px 1fr 100px 108px 28px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f0eee8' }}>
                                        {/* Stepper */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <button onClick={() => cambiarCantidad(linea.id, -1)}
                                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e3e1db', background: '#faf9f7', color: '#6d6b65', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', padding: 0 }}>
                                                -
                                            </button>
                                            <span style={{ width: '22px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#1a1a22' }}>{linea.cantidad}</span>
                                            <button onClick={() => cambiarCantidad(linea.id, 1)}
                                                style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #e3e1db', background: '#faf9f7', color: '#6d6b65', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', padding: 0 }}>
                                                +
                                            </button>
                                        </div>
                                        {/* Nombre */}
                                        <div style={{ paddingRight: '8px' }}>
                                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a22', lineHeight: '1.3' }}>
                                                {linea.productoSeleccionado?.marca_nombre ? `${linea.productoSeleccionado.marca_nombre} ` : ''}{linea.productoSeleccionado?.nombre}
                                            </p>
                                            <p style={{ fontSize: '11px', color: '#9d9b96', marginTop: '1px' }}>
                                                {pr.nombre}{pr.stock <= 3 ? ` · Stock: ${pr.stock}` : ''}
                                            </p>
                                            <button onClick={() => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, busqueda: '', productoSeleccionado: null, presentacionSeleccionada: null } : l))}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#9d9b96', padding: 0, marginTop: '2px' }}>
                                                cambiar
                                            </button>
                                        </div>
                                        {/* P.Unit */}
                                        <p style={{ fontSize: '12px', color: conDescuento ? '#0f9d6b' : '#6d6b65', textAlign: 'right', paddingRight: '8px' }}>
                                            {precio.toLocaleString('es-PY')}
                                        </p>
                                        {/* Total */}
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a22', textAlign: 'right', paddingRight: '8px' }}>
                                            {(precio * linea.cantidad).toLocaleString('es-PY')}
                                        </p>
                                        {/* Quitar */}
                                        {lineas.length > 1 && (
                                            <button onClick={() => eliminarLinea(linea.id)}
                                                style={{ width: '22px', height: '22px', borderRadius: '4px', border: 'none', background: 'transparent', color: '#9d9b96', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                                                x
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Fila de delivery */}
                            {canal === 'delivery' && formDelivery.costo_delivery > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '96px 1fr 100px 108px 28px', alignItems: 'center', padding: '8px 16px', background: '#fafaf8', borderBottom: '1px solid #f0eee8' }}>
                                    <span></span>
                                    <span style={{ fontSize: '12px', color: '#6d6b65' }}>Delivery — {formDelivery.zona_nombre || 'Zona'}</span>
                                    <span></span>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#6d6b65', textAlign: 'right', paddingRight: '8px' }}>+{formDelivery.costo_delivery.toLocaleString()}</span>
                                    <span></span>
                                </div>
                            )}

                            {/* Filas de busqueda (lineas sin presentacion) */}
                            {lineas.filter(l => !l.presentacionSeleccionada).map((linea, idx) => (
                                <div key={linea.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f0eee8' }}>
                                    {!linea.productoSeleccionado ? (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9d9b96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                </svg>
                                                <input
                                                    ref={idx === 0 ? busquedaProductoRef : null}
                                                    placeholder="Buscar producto por nombre o marca..."
                                                    value={linea.busqueda}
                                                    onChange={e => handleBuscarProducto(linea.id, e.target.value)}
                                                    style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', color: '#1a1a22', outline: 'none' }}
                                                    autoFocus={idx === 0 && lineasValidas.length === 0}
                                                />
                                                {lineas.length > 1 && (
                                                    <button onClick={() => eliminarLinea(linea.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d9b96', fontSize: '16px' }}>x</button>
                                                )}
                                            </div>
                                            {linea.productosFiltrados.length > 0 && (
                                                <div style={{ marginTop: '8px', border: '1px solid #e3e1db', borderRadius: '8px', overflow: 'hidden', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '180px', overflowY: 'auto' }}>
                                                    {linea.productosFiltrados.map(p => (
                                                        <div key={p.id} onClick={() => seleccionarProducto(linea.id, p)}
                                                            style={{ padding: '9px 14px', borderBottom: '1px solid #f0eee8', cursor: 'pointer', background: '#fff' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
                                                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                                                            {(() => {
                                                                const stockTotal = p.presentaciones?.reduce((s, pr) => s + (pr.stock || 0), 0) || 0
                                                                const sinStock = stockTotal === 0
                                                                return (
                                                                    <>
                                                                        <p style={{ fontSize: '13px', fontWeight: '600', color: sinStock ? '#9d9b96' : '#1a1a22' }}>{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                                        <p style={{ fontSize: '11px', color: '#9d9b96', marginTop: '2px' }}>{formatearCalidad(p.calidad)} · {p.categoria_nombre}</p>
                                                                        <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: '700', color: sinStock ? '#d04545' : stockTotal <= 5 ? '#f59e0b' : '#0f9d6b', background: sinStock ? '#fff0f0' : stockTotal <= 5 ? '#fffbeb' : '#f0fdf9', padding: '1px 7px', borderRadius: '5px', border: `1px solid ${sinStock ? '#fca5a5' : stockTotal <= 5 ? '#fde68a' : '#86efac'}` }}>
                                                                            {sinStock ? 'Sin stock' : `Stock: ${stockTotal}`}
                                                                        </span>
                                                                    </>
                                                                )
                                                            })()}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22' }}>
                                                    {linea.productoSeleccionado.marca_nombre && `${linea.productoSeleccionado.marca_nombre} — `}{linea.productoSeleccionado.nombre}
                                                </p>
                                                <button onClick={() => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, busqueda: '', productoSeleccionado: null, presentacionSeleccionada: null } : l))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#9d9b96' }}>
                                                    cambiar
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '11px', color: '#9d9b96', marginBottom: '8px' }}>Selecciona la presentacion:</p>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {linea.productoSeleccionado.presentaciones.filter(pr => pr.disponible && pr.stock > 0).map(pr => {
                                                    const { precio, conDescuento } = calcularPrecioCaja(pr)
                                                    return (
                                                        <button key={pr.id} onClick={() => seleccionarPresentacion(linea.id, pr)}
                                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e3e1db', background: '#faf9f7', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                                                            onMouseEnter={e => { e.currentTarget.style.border = '1px solid #1a1a22'; e.currentTarget.style.background = '#f0eee8' }}
                                                            onMouseLeave={e => { e.currentTarget.style.border = '1px solid #e3e1db'; e.currentTarget.style.background = '#faf9f7' }}>
                                                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#1a1a22', marginBottom: '2px' }}>{pr.nombre}</p>
                                                            <p style={{ fontSize: '12px', fontWeight: '800', color: conDescuento ? '#0f9d6b' : '#1a1a22' }}>Gs. {precio.toLocaleString()}</p>
                                                            <p style={{ fontSize: '10px', color: pr.stock <= 3 ? '#d04545' : '#9d9b96', marginTop: '1px' }}>Stock: {pr.stock}</p>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Factura */}
                        <div style={{ background: '#fff', border: '1px solid #e3e1db', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22', marginBottom: '10px' }}>Factura</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <input type="checkbox" id="factManual" checked={facturaManual} onChange={e => { setFacturaManual(e.target.checked); setNumeroFacturaManual('') }} style={{ width: '14px', height: '14px', cursor: 'pointer' }} />
                                <label htmlFor="factManual" style={{ fontSize: '12px', color: facturaManual ? '#d04545' : '#6d6b65', fontWeight: '600', cursor: 'pointer' }}>
                                    Factura manual (talonario fisico)
                                </label>
                            </div>
                            {facturaManual ? (
                                <div style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px' }}>
                                    <p style={{ fontSize: '11px', color: '#d04545', fontWeight: '600', marginBottom: '8px' }}>
                                        NO se generara numero del sistema. Ingresa el numero del talonario fisico.
                                    </p>
                                    <input placeholder="Ej: 001-002-0000123" value={numeroFacturaManual} onChange={e => setNumeroFacturaManual(e.target.value)}
                                        style={{ ...fieldInput, borderColor: '#fca5a5' }} />
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div>
                                        <label style={fieldLabel}>Razon social</label>
                                        <input placeholder="Consumidor final" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} style={fieldInput} />
                                    </div>
                                    <div>
                                        <label style={fieldLabel}>RUC</label>
                                        <input placeholder="Ej: 5.578.584-9" value={rucFactura} onChange={e => setRucFactura(e.target.value)} style={fieldInput} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Datos de delivery */}
                        {canal === 'delivery' && (
                            <div style={{ background: '#fff', border: '1px solid #e3e1db', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' }}>
                                <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22', marginBottom: '10px' }}>Datos de entrega</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={fieldLabel}>Ubicacion / Direccion *</label>
                                        <input value={formDelivery.ubicacion} onChange={e => setFormDelivery({ ...formDelivery, ubicacion: e.target.value })} placeholder="Barrio, calle, link de maps..." style={fieldInput} />
                                    </div>
                                    <div>
                                        <label style={fieldLabel}>Referencia</label>
                                        <input value={formDelivery.referencia} onChange={e => setFormDelivery({ ...formDelivery, referencia: e.target.value })} placeholder="Numero de casa, parada..." style={fieldInput} />
                                    </div>
                                    <div>
                                        <label style={fieldLabel}>Horario preferido</label>
                                        <input value={formDelivery.horario} onChange={e => setFormDelivery({ ...formDelivery, horario: e.target.value })} placeholder="Ej: Desde las 14hs" style={fieldInput} />
                                    </div>
                                    <div>
                                        <label style={fieldLabel}>Contacto que recibe</label>
                                        <input value={formDelivery.contacto_entrega} onChange={e => setFormDelivery({ ...formDelivery, contacto_entrega: e.target.value })} placeholder="Nombre y telefono" style={fieldInput} />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={fieldLabel}>Zona de delivery</label>
                                        <select value={formDelivery.zona_id} onChange={e => handleZonaChange(e.target.value)} style={fieldInput}>
                                            <option value="">Seleccionar zona...</option>
                                            {zonas.filter(z => z.activa).map(z => (
                                                <option key={z.id} value={z.id}>{z.nombre} — Gs. {z.costo.toLocaleString()}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Panel derecho */}
                    <div style={{ width: '340px', background: '#fff', borderLeft: '1px solid #e3e1db', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto', flexShrink: 0, gap: '18px' }}>

                        {/* Modalidad */}
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Modalidad</p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {[{ val: 'presencial', label: 'Retiro en tienda' }, { val: 'delivery', label: 'Delivery' }].map(c => (
                                    <button key={c.val} onClick={() => setCanal(c.val)} style={segBtn(canal === c.val)}>{c.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Metodo de pago */}
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Metodo de pago</p>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: metodoPago === 'tarjeta' ? '8px' : 0 }}>
                                {[{ val: 'efectivo', label: 'Efectivo' }, { val: 'transferencia', label: 'Transferencia' }, { val: 'tarjeta', label: 'Tarjeta' }].map(m => (
                                    <button key={m.val} onClick={() => { setMetodoPago(m.val); setSubtipoPago('') }} style={segBtn(metodoPago === m.val)}>{m.label}</button>
                                ))}
                            </div>
                            {metodoPago === 'tarjeta' && (
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    {[{ val: 'debito', label: 'Debito' }, { val: 'credito', label: 'Credito' }].map(t => (
                                        <button key={t.val} onClick={() => setSubtipoPago(t.val)} style={segBtn(subtipoPago === t.val, '#2b74b8')}>{t.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Condicion */}
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Condicion de venta</p>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: tipoVenta === 'credito' ? '8px' : 0 }}>
                                {[{ val: 'contado', label: 'Contado' }, { val: 'credito', label: 'Credito' }].map(t => (
                                    <button key={t.val} onClick={() => setTipoVenta(t.val)} style={segBtn(tipoVenta === t.val)}>{t.label}</button>
                                ))}
                            </div>
                            {tipoVenta === 'credito' && (
                                <div>
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                        {[15, 30, 60, 90].map(d => (
                                            <button key={d} onClick={() => setPlazoDias(d)} style={segBtn(plazoDias === d, '#2b74b8')}>{d}d</button>
                                        ))}
                                    </div>
                                    <input type="number" placeholder="O ingresa los dias manualmente" value={plazoDias}
                                        onChange={e => setPlazoDias(parseInt(e.target.value) || 0)}
                                        style={{ ...fieldInput, marginBottom: '6px' }} />
                                    {clienteSeleccionado
                                        ? <p style={{ fontSize: '11px', color: '#6d6b65' }}>Vencimiento: {new Date(Date.now() + plazoDias * 24 * 60 * 60 * 1000).toLocaleDateString('es-PY')}</p>
                                        : <p style={{ fontSize: '11px', color: '#d04545' }}>Debes seleccionar un cliente para venta a credito</p>
                                    }
                                </div>
                            )}
                        </div>

                        {/* Monto recibido */}
                        {metodoPago === 'efectivo' && (
                            <div>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Monto recibido (Gs.)</p>
                                <input
                                    type="text"
                                    value={montoEfectivo ? parseInt(montoEfectivo).toLocaleString('es-PY') : ''}
                                    onChange={e => { const limpio = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); setMontoEfectivo(limpio) }}
                                    placeholder={total ? total.toLocaleString('es-PY') : '0'}
                                    style={{ ...fieldInput, fontSize: '15px', fontWeight: '700' }}
                                />
                                {montoEfectivo && parseInt(montoEfectivo) >= total && total > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '13px' }}>
                                        <span style={{ color: '#9d9b96' }}>Vuelto:</span>
                                        <span style={{ fontWeight: '800', color: '#0f9d6b' }}>Gs. {(parseInt(montoEfectivo) - total).toLocaleString()}</span>
                                    </div>
                                )}
                                {montoEfectivo && parseInt(montoEfectivo) < total && (
                                    <p style={{ fontSize: '11px', color: '#d04545', marginTop: '6px' }}>Monto insuficiente</p>
                                )}
                            </div>
                        )}

                        {/* Resumen y boton */}
                        <div style={{ marginTop: 'auto' }}>
                            {(razonSocial || rucFactura) && (
                                <div style={{ background: '#faf9f7', border: '1px solid #e3e1db', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px' }}>
                                    <p style={{ fontSize: '10px', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Factura a</p>
                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a22' }}>{razonSocial || 'Cliente'}</p>
                                    {rucFactura && <p style={{ fontSize: '11px', color: '#9d9b96', marginTop: '2px' }}>RUC: {rucFactura}</p>}
                                </div>
                            )}
                            {metodoPago === 'tarjeta' && subtipoPago && (
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#2b74b8', fontWeight: '600' }}>
                                    Tarjeta {subtipoPago === 'debito' ? 'Debito' : 'Credito'}
                                </div>
                            )}
                            {tipoVenta === 'credito' && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px', fontSize: '12px', color: '#92400e', fontWeight: '600' }}>
                                    Credito — {plazoDias} dias
                                </div>
                            )}
                            {lineasValidas.length > 0 && (
                                <div style={{ background: '#faf9f7', border: '1px solid #e3e1db', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9d9b96', marginBottom: '4px' }}>
                                        <span>IVA 10% incluido</span>
                                        <span>Gs. {iva.toLocaleString()}</span>
                                    </div>
                                    {canal === 'delivery' && costoDelivery > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#9d9b96', marginBottom: '4px' }}>
                                            <span>Delivery {formDelivery.zona_nombre && `— ${formDelivery.zona_nombre}`}</span>
                                            <span>Gs. {costoDelivery.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div style={{ borderTop: '1px solid #e3e1db', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a22' }}>Total</span>
                                        <span style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a22' }}>Gs. {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                            <button onClick={handleConfirmarVenta}
                                style={{ width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#0f9d6b', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: '800', transition: 'opacity 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                                Registrar venta
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PESTAÑA CIERRE ── */}
            {pestana === 'cierre' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>

                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a22', letterSpacing: '-0.4px' }}>Cierre de Caja</h1>
                                <p style={{ fontSize: '12px', color: '#9d9b96', marginTop: '2px' }}>Resumen de ventas y egresos del dia</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e3e1db', background: '#fff', color: '#1a1a22', fontSize: '13px', outline: 'none' }} />
                                <button onClick={handleImprimirCierre} disabled={!cierreDatos}
                                    style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: cierreDatos ? '#1a1a22' : '#e3e1db', color: cierreDatos ? 'white' : '#9d9b96', cursor: cierreDatos ? 'pointer' : 'not-allowed', fontSize: '13px', fontWeight: '700' }}>
                                    Imprimir cierre
                                </button>
                            </div>
                        </div>

                        {cargandoCierre ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#9d9b96' }}>Cargando datos...</div>
                        ) : !cierreDatos ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#9d9b96' }}>No hay datos para esta fecha.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                {/* Metricas */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[
                                        { label: 'Total ventas', val: `Gs. ${cierreDatos.totalGeneral.toLocaleString('es-PY')}`, color: '#0f9d6b' },
                                        { label: 'Cant. ventas', val: cierreDatos.cantidadVentas, color: '#2b74b8' },
                                        { label: 'Total gastos', val: `Gs. ${gastos.reduce((s, g) => s + g.monto, 0).toLocaleString('es-PY')}`, color: '#d04545' },
                                    ].map((m, i) => (
                                        <div key={i} style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: '1px solid #e3e1db' }}>
                                            <p style={{ fontSize: '11px', color: '#9d9b96', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{m.label}</p>
                                            <p style={{ fontSize: '20px', fontWeight: '800', color: m.color }}>{m.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Por metodo */}
                                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e3e1db', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0eee8', background: '#faf9f7' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22' }}>Ventas por metodo de pago</p>
                                    </div>
                                    {Object.entries(cierreDatos.resumen).map(([k, v]) => {
                                        const label = v.metodo === 'tarjeta'
                                            ? `Tarjeta ${v.subtipo === 'debito' ? 'Debito' : v.subtipo === 'credito' ? 'Credito' : ''}`
                                            : v.metodo === 'transferencia' ? 'Transferencia' : 'Efectivo'
                                        const porcentaje = cierreDatos.totalGeneral > 0 ? Math.round((v.total / cierreDatos.totalGeneral) * 100) : 0
                                        const barColor = v.metodo === 'efectivo' ? '#0f9d6b' : v.metodo === 'transferencia' ? '#2b74b8' : '#f59e0b'
                                        return (
                                            <div key={k} style={{ padding: '12px 16px', borderBottom: '1px solid #f0eee8' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a22' }}>{label}</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: '13px', fontWeight: '800', color: '#1a1a22' }}>Gs. {v.total.toLocaleString('es-PY')}</p>
                                                        <p style={{ fontSize: '11px', color: '#9d9b96' }}>{v.cantidad} venta{v.cantidad !== 1 ? 's' : ''} · {porcentaje}%</p>
                                                    </div>
                                                </div>
                                                <div style={{ height: '3px', background: '#f0eee8', borderRadius: '2px' }}>
                                                    <div style={{ height: '100%', width: `${porcentaje}%`, background: barColor, borderRadius: '2px', transition: 'width 0.5s' }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Por canal */}
                                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e3e1db', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0eee8', background: '#faf9f7' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22' }}>Ventas por canal</p>
                                    </div>
                                    {Object.entries(cierreDatos.canales).map(([canalKey, v]) => (
                                        <div key={canalKey} style={{ padding: '10px 16px', borderBottom: '1px solid #f0eee8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', color: '#1a1a22' }}>{canalKey}</span>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a22' }}>Gs. {v.total.toLocaleString('es-PY')}</p>
                                                <p style={{ fontSize: '11px', color: '#9d9b96' }}>{v.cantidad} venta{v.cantidad !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Gastos */}
                                <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #e3e1db', overflow: 'hidden' }}>
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0eee8', background: '#faf9f7' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: '#1a1a22' }}>Gastos y egresos</p>
                                    </div>
                                    <div style={{ padding: '14px 16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '8px', marginBottom: '12px' }}>
                                            <input placeholder="Descripcion del gasto..." value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                                                style={{ ...fieldInput }} />
                                            <input type="number" placeholder="Monto Gs." value={nuevoGasto.monto} onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                                                style={{ ...fieldInput, width: '120px' }} />
                                            <button onClick={agregarGasto}
                                                style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#1a1a22', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                                                + Agregar
                                            </button>
                                        </div>
                                        {gastos.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: '#9d9b96', textAlign: 'center', padding: '10px 0' }}>No hay gastos registrados para esta sesion.</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {gastos.map(g => (
                                                    <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#faf9f7', borderRadius: '8px' }}>
                                                        <span style={{ fontSize: '13px', color: '#1a1a22' }}>{g.descripcion}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#d04545' }}>- Gs. {g.monto.toLocaleString('es-PY')}</span>
                                                            <button onClick={() => eliminarGasto(g.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9d9b96', fontSize: '14px' }}>x</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Resumen final */}
                                <div style={{ background: '#1a1a22', borderRadius: '12px', padding: '20px', color: 'white' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: '#4d4d57', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Resumen del dia</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '13px', color: '#9d9b96' }}>Total ventas</span>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f9d6b' }}>Gs. {cierreDatos.totalGeneral.toLocaleString('es-PY')}</span>
                                        </div>
                                        {gastos.length > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '13px', color: '#9d9b96' }}>Total gastos</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#d04545' }}>- Gs. {gastos.reduce((sum, g) => sum + g.monto, 0).toLocaleString('es-PY')}</span>
                                            </div>
                                        )}
                                        <div style={{ borderTop: '1px solid #2d2d35', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                            <span style={{ fontSize: '15px', fontWeight: '700' }}>Neto del dia</span>
                                            <span style={{ fontSize: '22px', fontWeight: '800', color: '#0f9d6b' }}>
                                                Gs. {(cierreDatos.totalGeneral - gastos.reduce((sum, g) => sum + g.monto, 0)).toLocaleString('es-PY')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        )}
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

export default Caja
