import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductos, buscarPorCodigoBarras } from '../services/productos'
import { buscarClientes, crearCliente, getCliente } from '../services/clientes'
import { registrarVentaPresencial } from '../services/ventas'
import { confirmarOrden, reclamarOrden, liberarOrden } from '../services/ordenes'
import { getZonas } from '../services/zonas'
import ModalConfirmar from '../components/ModalConfirmar'
import { imprimirFactura, imprimirCierre } from '../utils/factura'
import { useApp } from '../App'
import api from '../services/api'
import { formatearCalidad } from '../utils/formato'
import { fechaHoyPY } from '../utils/fecha'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

const inputCls = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none transition-colors focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400'

function segCls(active, accent) {
    const accents = {
        default: active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
        blue: active ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50',
    }
    return `flex-1 rounded-lg border px-2 py-2.5 text-xs font-semibold text-center transition-colors ${accents[accent || 'default']}`
}

function Caja() {
    const navigate = useNavigate()
    const busquedaProductoRef = useRef(null)
    const codigoBarrasRef = useRef('')
    const codigoBarrasTimer = useRef(null)
    const procesandoVenta = useRef(false)
    const procesandoCliente = useRef(false)
    const { darkMode, puedo } = useApp()
    const [pestana, setPestana] = useState('venta')
    // Decide explicitamente si la venta consume numerador de factura real o no.
    // Antes esto se inferia de si razonSocial/rucFactura tenian algo cargado, y esos
    // campos se autocompletaban solos al seleccionar un cliente (para seguimiento),
    // lo que terminaba consumiendo un numero de factura sin que el cajero lo pidiera.
    const [tipoComprobante, setTipoComprobante] = useState('ticket')
    const [tipoVenta, setTipoVenta] = useState('contado')
    const [plazoDias, setPlazoDias] = useState(30)
    const [montoEfectivo, setMontoEfectivo] = useState('')
    const [configFactura, setConfigFactura] = useState({})
    const [cajero, setCajero] = useState('')

    // Estados venta
    const [productos, setProductos] = useState([])
    const [zonas, setZonas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [lineas, setLineas] = useState([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1, precioEspecial: '', modoMonto: false, montoTexto: '' }])
    const [precioEspecialActivo, setPrecioEspecialActivo] = useState(false)
    const [busquedaCliente, setBusquedaCliente] = useState('')
    const [resultadosCliente, setResultadosCliente] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [creandoCliente, setCreandoCliente] = useState(false)
    const [guardandoCliente, setGuardandoCliente] = useState(false)
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
    const [facturarDelivery, setFacturarDelivery] = useState(true)

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
        if (op.razon_social || op.ruc_factura) setTipoComprobante('factura')
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
        setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, busqueda: `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: null, precioEspecial: '' } : l))
    }

    function seleccionarPresentacion(lineaId, presentacion) {
        setLineas(prev => prev.map(l => l.id === lineaId ? { ...l, presentacionSeleccionada: presentacion, precioEspecial: '', modoMonto: false, montoTexto: '', cantidad: 1 } : l))
    }

    function toggleModoMonto(lineaId) {
        setLineas(prev => prev.map(l => {
            if (l.id !== lineaId) return l
            const entrando = !l.modoMonto
            return { ...l, modoMonto: entrando, montoTexto: '', cantidad: entrando ? 0 : 1 }
        }))
    }

    function cambiarMontoFraccion(lineaId, montoTexto) {
        setLineas(prev => prev.map(l => {
            if (l.id !== lineaId) return l
            const precioUnitario = calcularPrecioLinea(l).precio
            const monto = Number(montoTexto)
            const cantidad = (montoTexto && precioUnitario > 0) ? Math.round((monto / precioUnitario) * 1000) / 1000 : 0
            return { ...l, montoTexto, cantidad }
        }))
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
        setLineas(prev => [...prev, { id: nuevoId, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1, modoMonto: false, montoTexto: '' }])
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

    function calcularPrecioLinea(linea, baseYaCalculada) {
        const base = baseYaCalculada || calcularPrecioCaja(linea.presentacionSeleccionada)
        if (precioEspecialActivo && linea.precioEspecial !== '' && linea.precioEspecial !== undefined && linea.precioEspecial !== null) {
            const especial = Number(linea.precioEspecial)
            if (!isNaN(especial) && especial >= 0) return { precio: especial, conDescuento: false, esEspecial: true, diferencial: base.precio - especial }
        }
        return base
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
                setLineas(prev => [...prev, { id: nuevoId, busqueda: `${pr.marca_nombre ? pr.marca_nombre + ' — ' : ''}${pr.producto_nombre}`, productosFiltrados: [], productoSeleccionado: producto, presentacionSeleccionada: pr, cantidad: 1, modoMonto: false, montoTexto: '' }])
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
    const subtotal = lineasValidas.reduce((sum, l) => sum + calcularPrecioLinea(l).precio * l.cantidad, 0)
    const costoDelivery = canal === 'delivery' && facturarDelivery ? (formDelivery.costo_delivery || 0) : 0
    const total = subtotal + costoDelivery
    const iva = Math.floor(total / 11)

    async function handleCrearCliente() {
        if (!formCliente.nombre.trim()) return
        if (procesandoCliente.current) return
        procesandoCliente.current = true
        setGuardandoCliente(true)
        try {
            const nuevo = await crearCliente({ ...formCliente, origen: 'presencial' })
            setClienteSeleccionado(nuevo); setCreandoCliente(false); setResultadosCliente([]); setBusquedaCliente(nuevo.nombre)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            procesandoCliente.current = false
            setGuardandoCliente(false)
        }
    }

    function handleTipoComprobante(valor) {
        setTipoComprobante(valor)
        if (valor === 'ticket') { setFacturaManual(false); setNumeroFacturaManual('') }
    }

    function resetCaja() {
        setLineas([{ id: 1, busqueda: '', productosFiltrados: [], productoSeleccionado: null, presentacionSeleccionada: null, cantidad: 1, precioEspecial: '' }])
        setPrecioEspecialActivo(false)
        setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial(''); setFacturaManual(false); setNumeroFacturaManual('')
        setTipoComprobante('ticket')
        setCanal('presencial'); setMetodoPago('efectivo'); setSubtipoPago(''); setOpOrigen(null)
        setFormDelivery({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', zona_id: '', zona_nombre: '', costo_delivery: 0 })
        setFacturarDelivery(true)
        setTipoVenta('contado')
        setPlazoDias(30)
        setMontoEfectivo('')
    }

    async function handleConfirmarVenta() {
        if (lineasValidas.length === 0) {
            setModalConfirmar({ titulo: 'Falta el producto', mensaje: 'Agrega al menos un producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        const lineaFraccionInvalida = lineasValidas.find(l => l.modoMonto && (!(l.cantidad > 0) || l.cantidad > l.presentacionSeleccionada.stock))
        if (lineaFraccionInvalida) {
            setModalConfirmar({ titulo: 'Monto invalido', mensaje: 'Revisa el monto ingresado en la linea "por monto": no hay stock suficiente o el monto no es valido.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
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
        if (tipoVenta === 'credito' && !clienteSeleccionado?.id) {
            setModalConfirmar({ titulo: 'Cliente requerido', mensaje: 'Para venta a credito debes seleccionar un cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            return
        }
        if (tipoComprobante === 'factura' && facturaManual && !numeroFacturaManual.trim()) {
            setModalConfirmar({ titulo: 'Falta el numero de factura', mensaje: 'Ingresa el numero del talonario fisico o destilda "Factura manual".', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
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

                // Si la venta viene de un pedido del bot, reclamamos la orden ANTES de
                // crear ninguna venta: evita que dos agentes procesen el mismo pedido
                // 'pendiente' en simultaneo y generen ventas/stock duplicados.
                if (opOrigen) {
                    try {
                        await reclamarOrden(opOrigen.id)
                    } catch (err) {
                        procesandoVenta.current = false
                        const detalle = err.response?.data?.error || 'La orden ya esta siendo procesada por otro agente.'
                        setModalConfirmar({ titulo: 'No se pudo reclamar la orden', mensaje: detalle, textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                        return
                    }
                }

                // El numero de factura (real, ticket interno, o manual) lo decide y
                // genera el backend en POST /presencial, no el frontend: asi ninguna
                // pestana desactualizada puede forzar el consumo del correlativo SET.
                // esFactura es la unica fuente de verdad de si se consume el correlativo:
                // en modo ticket, ruc_factura/razon_social SIEMPRE viajan null, aunque la
                // barra de cliente (arriba) haya autocompletado esos campos por conveniencia.
                const esFactura = tipoComprobante === 'factura'
                let numeroFactura = (esFactura && facturaManual) ? (numeroFacturaManual.trim() || null) : null
                let datosImpresion = null
                const ventasIds = []
                try {
                    for (let i = 0; i < lineasValidas.length; i++) {
                        const linea = lineasValidas[i]
                        const { precio } = calcularPrecioLinea(linea)
                        const respuesta = await registrarVentaPresencial({
                            cliente_id: clienteSeleccionado?.id || null,
                            presentacion_id: linea.presentacionSeleccionada.id,
                            cantidad: linea.cantidad,
                            precio: precio * linea.cantidad,
                            metodo_pago: metodoPago,
                            subtipo_pago: subtipoPago || null,
                            tipo_iva: '10',
                            quiere_factura: esFactura,
                            ruc_factura: esFactura ? (rucFactura || null) : null,
                            razon_social: esFactura ? (razonSocial || null) : null,
                            canal: canalFinal,
                            tipo_venta: tipoVenta,
                            plazo_dias: tipoVenta === 'credito' ? plazoDias : null,
                            costo_delivery: i === 0 ? costoDelivery : 0,
                            zona_delivery: i === 0 ? (formDelivery.zona_nombre || null) : null,
                            numero_factura: numeroFactura
                        })
                        if (i === 0 && !numeroFactura) {
                            numeroFactura = respuesta?.venta?.numero_factura || null
                        }
                        ventasIds.push(respuesta?.venta?.id)
                    }
                    const esTicket = !!numeroFactura && numeroFactura.startsWith('TICKET-')

                    // A partir de aca las ventas ya estan commiteadas (stock descontado,
                    // cobro hecho): armamos el recibo antes de los pasos siguientes para
                    // poder imprimirlo igual si delivery/confirmarOrden fallan despues.
                    const metodoImpresion = metodoPago === 'tarjeta'
                        ? (subtipoPago === 'debito' ? 'tarjeta_debito' : 'tarjeta_credito')
                        : metodoPago

                    datosImpresion = {
                        numero_factura: numeroFactura,
                        es_ticket: esTicket,
                        cliente_nombre: (esFactura ? razonSocial : null) || clienteSeleccionado?.nombre || null,
                        cliente_ruc: (esFactura ? rucFactura : null) || clienteSeleccionado?.ruc || null,
                        tipo_venta: tipoVenta,
                        metodo_pago: metodoImpresion,
                        monto_efectivo: montoEfectivoNum || total,
                        vuelto: vueltoCalculado,
                        items: [
                            ...lineasValidas.map(linea => {
                                const { precio } = calcularPrecioLinea(linea)
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
                        await confirmarOrden(opOrigen.id, { modalidad: canal, ventas_ids: ventasIds })
                    }

                    resetCaja()
                    setModalConfirmar({
                        titulo: 'Venta registrada',
                        mensaje: `${esTicket ? 'Ticket' : `Factura ${numeroFactura}`} — Gs. ${total.toLocaleString()}${canal === 'delivery' ? ' · Delivery creado.' : ''}`,
                        textoBoton: 'Nueva venta', colorBoton: '#0f9d6b',
                        onConfirmar: () => { setModalConfirmar(null); busquedaProductoRef.current?.focus() }
                    })
                } catch (err) {
                    const detalle = err.response?.data?.error
                        || (err.response ? `Error HTTP ${err.response.status}` : `Sin respuesta del servidor (${err.message})`)

                    if (ventasIds.length > 0) {
                        // La(s) venta(s) YA se registraron (stock descontado, cobro hecho)
                        // antes de que fallara delivery/confirmarOrden. No liberamos la
                        // orden ni reintentamos desde aca: hacerlo crearia una segunda
                        // venta duplicada para el mismo pedido. Se imprime igual el
                        // recibo y se avisa al cajero para seguimiento manual.
                        resetCaja()
                        setModalConfirmar({
                            titulo: 'Venta registrada con advertencia',
                            mensaje: `La venta SI se registro, pero: ${detalle}. ${opOrigen ? `Avisa a soporte para revisar el pedido ${opOrigen.numero || opOrigen.id} manualmente.` : ''}`,
                            textoBoton: 'Entendido', colorBoton: '#d97706',
                            onConfirmar: () => { setModalConfirmar(null); busquedaProductoRef.current?.focus() }
                        })
                    } else {
                        if (opOrigen) {
                            try { await liberarOrden(opOrigen.id) } catch (e) {}
                        }
                        setModalConfirmar({ titulo: 'Error al registrar', mensaje: detalle, textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                    }
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
        <div className="flex h-full items-center justify-center bg-slate-100 text-sm text-slate-400">
            Cargando caja...
        </div>
    )

    return (
        <div className="flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-slate-100">

            {/* Top bar */}
            <div className="flex h-[52px] flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
                <div className="flex">
                    {[{ id: 'venta', label: 'Nueva Venta' }, { id: 'cierre', label: 'Cierre de Caja' }].map(tab => (
                        <button key={tab.id} onClick={() => setPestana(tab.id)}
                            className={`h-[52px] border-b-2 px-4.5 text-[13px] transition-colors ${pestana === tab.id ? 'border-slate-900 font-bold text-slate-900' : 'border-transparent font-medium text-slate-500 hover:text-slate-700'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs capitalize text-slate-400">
                        {new Date().toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/ventas')}>
                        Ver ventas
                    </Button>
                </div>
            </div>

            {/* ── PESTAÑA VENTA ── */}
            {pestana === 'venta' && (
                <div className="flex flex-1 overflow-hidden">

                    {/* Panel izquierdo */}
                    <div className="flex-1 overflow-y-auto p-5">

                        {/* Banner OP */}
                        {opOrigen && (
                            <div className="mb-3 flex items-center justify-between rounded-[10px] border border-blue-200 bg-blue-50 px-4 py-3">
                                <div>
                                    <p className="text-[13px] font-extrabold text-blue-700">
                                        Procesando orden {opOrigen.numero}
                                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${opOrigen.modalidad === 'delivery' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {opOrigen.modalidad === 'delivery' ? 'Delivery' : 'Retiro en tienda'}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-[11px] text-slate-500">Al confirmar, la orden quedara como confirmada.</p>
                                </div>
                                <button onClick={() => setOpOrigen(null)} className="text-base text-slate-400 hover:text-slate-600">x</button>
                            </div>
                        )}

                        {/* Barra de cliente */}
                        <Card className="mb-3">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    {/* Avatar */}
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] bg-slate-100">
                                        {clienteSeleccionado
                                            ? <span className="text-[15px] font-bold text-slate-600">{clienteSeleccionado.nombre[0].toUpperCase()}</span>
                                            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9d9b96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        }
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {clienteSeleccionado ? (
                                            <div className="flex items-center gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13px] font-bold text-slate-900">{clienteSeleccionado.nombre}</p>
                                                    {clienteSeleccionado.ruc && <p className="text-[11px] text-slate-400">RUC: {clienteSeleccionado.ruc}</p>}
                                                    {clienteSeleccionado.telefono && <p className="text-[11px] text-slate-400">Tel: {clienteSeleccionado.telefono}</p>}
                                                </div>
                                                <button onClick={() => { setClienteSeleccionado(null); setBusquedaCliente(''); setRucFactura(''); setRazonSocial('') }}
                                                    className="shrink-0 text-lg text-slate-400 hover:text-slate-600">x</button>
                                            </div>
                                        ) : (
                                            <input
                                                placeholder="Buscar cliente por nombre, RUC o telefono..."
                                                value={busquedaCliente}
                                                onChange={e => handleBuscarCliente(e.target.value)}
                                                className="w-full border-none bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
                                            />
                                        )}
                                    </div>
                                    {!clienteSeleccionado && (
                                        <Button variant="outline" size="sm" onClick={() => setCreandoCliente(!creandoCliente)} className="shrink-0">
                                            {creandoCliente ? 'Cancelar' : '+ Nuevo'}
                                        </Button>
                                    )}
                                </div>

                                {resultadosCliente.length > 0 && (
                                    <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                                        {resultadosCliente.map(c => (
                                            <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBusquedaCliente(c.nombre); setResultadosCliente([]) }}
                                                className="cursor-pointer border-b border-slate-100 px-3.5 py-2.5 last:border-b-0 hover:bg-slate-50">
                                                <p className="text-[13px] font-semibold text-slate-900">{c.nombre}</p>
                                                <p className="text-[11px] text-slate-400">{c.ruc && `RUC: ${c.ruc} · `}{c.telefono}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {creandoCliente && (
                                    <div className="mt-3 border-t border-slate-100 pt-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <select value={formCliente.tipo} onChange={e => setFormCliente({ ...formCliente, tipo: e.target.value })}
                                                className={`${inputCls} col-span-2`}>
                                                <option value="persona">Persona fisica</option>
                                                <option value="empresa">Empresa</option>
                                            </select>
                                            <input placeholder="Nombre *" value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })}
                                                className={`${inputCls} col-span-2`} />
                                            <input placeholder="RUC" value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} className={inputCls} />
                                            <input placeholder="Telefono" value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} className={inputCls} />
                                        </div>
                                        <Button onClick={handleCrearCliente} disabled={guardandoCliente} className="mt-2 w-full">
                                            {guardandoCliente ? 'Creando...' : 'Crear y seleccionar'}
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Productos */}
                        <Card className="mb-3 py-0 gap-0">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                                <span className="text-xs font-bold text-slate-900">Productos</span>
                                <div className="flex items-center gap-3">
                                    {puedo('caja', 'precio_especial') && (
                                        <div className="flex items-center gap-1.5">
                                            <input type="checkbox" id="precioEspecial" checked={precioEspecialActivo} onChange={e => setPrecioEspecialActivo(e.target.checked)} className="h-3.5 w-3.5 cursor-pointer" />
                                            <label htmlFor="precioEspecial" className={`cursor-pointer text-[11px] font-semibold ${precioEspecialActivo ? 'text-red-500' : 'text-slate-500'}`}>
                                                Precio especial
                                            </label>
                                        </div>
                                    )}
                                    <Button variant="outline" size="xs" onClick={agregarLinea}>+ Agregar</Button>
                                </div>
                            </div>

                            {/* Header de tabla */}
                            {lineasValidas.length > 0 && (
                                <div className="grid grid-cols-[96px_1fr_100px_108px_28px] border-b border-slate-100 bg-slate-50/70 px-4 py-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cant.</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Producto</span>
                                    <span className="pr-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">P.Unit</span>
                                    <span className="pr-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                                    <span></span>
                                </div>
                            )}

                            {/* Filas de productos seleccionados */}
                            {lineasValidas.map(linea => {
                                const pr = linea.presentacionSeleccionada
                                const precioBase = calcularPrecioCaja(pr)
                                const { precio, conDescuento, diferencial } = calcularPrecioLinea(linea, precioBase)
                                return (
                                    <div key={linea.id} className="grid grid-cols-[96px_1fr_100px_108px_28px] items-center border-b border-slate-100 px-4 py-2.5">
                                        {/* Stepper / Monto */}
                                        {linea.modoMonto ? (
                                            <input type="number" min="0" value={linea.montoTexto}
                                                onChange={e => cambiarMontoFraccion(linea.id, e.target.value)}
                                                placeholder="Gs."
                                                className="w-[84px] rounded-md border border-amber-400 px-1 py-1.5 text-center text-xs outline-none" />
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => cambiarCantidad(linea.id, -1)}
                                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[15px] font-bold text-slate-500 transition-colors hover:bg-slate-100">
                                                    -
                                                </button>
                                                <span className="w-[22px] text-center text-[13px] font-bold text-slate-900">{linea.cantidad}</span>
                                                <button onClick={() => cambiarCantidad(linea.id, 1)}
                                                    className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[15px] font-bold text-slate-500 transition-colors hover:bg-slate-100">
                                                    +
                                                </button>
                                            </div>
                                        )}
                                        {/* Nombre */}
                                        <div className="pr-2">
                                            <p className="text-xs font-semibold leading-tight text-slate-900">
                                                {linea.productoSeleccionado?.marca_nombre ? `${linea.productoSeleccionado.marca_nombre} ` : ''}{linea.productoSeleccionado?.nombre}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-slate-400">
                                                {pr.nombre}{pr.stock <= 3 ? ` · Stock: ${pr.stock}` : ''}
                                            </p>
                                            {linea.modoMonto && linea.montoTexto !== '' && (
                                                linea.cantidad > 0 && linea.cantidad <= pr.stock ? (
                                                    <p className="mt-0.5 text-[10px] font-semibold text-green-600">
                                                        ≈ {(linea.cantidad * 1000).toLocaleString('es-PY')} g
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 text-[10px] font-bold text-red-500">
                                                        {linea.cantidad <= 0 ? 'Ingresá un monto valido' : `No hay stock suficiente (disp. ${(pr.stock * 1000).toLocaleString('es-PY')} g)`}
                                                    </p>
                                                )
                                            )}
                                            <div className="flex gap-2">
                                                <button onClick={() => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, busqueda: '', productoSeleccionado: null, presentacionSeleccionada: null, precioEspecial: '' } : l))}
                                                    className="mt-0.5 text-[10px] text-slate-400 hover:text-slate-600">
                                                    cambiar
                                                </button>
                                                {pr.permite_fraccion && (
                                                    <button onClick={() => toggleModoMonto(linea.id)}
                                                        className="mt-0.5 text-[10px] font-semibold text-amber-600 hover:text-amber-700">
                                                        {linea.modoMonto ? 'vender por unidad' : 'vender por monto'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {/* P.Unit */}
                                        {precioEspecialActivo ? (
                                            <div>
                                                <input type="number" min="0" value={linea.precioEspecial ?? ''}
                                                    placeholder={precioBase.precio.toString()}
                                                    onChange={e => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, precioEspecial: e.target.value } : l))}
                                                    className="w-full rounded-md border border-red-300 px-1.5 py-1 text-right text-xs text-red-500 outline-none" />
                                                {!!diferencial && (
                                                    <p className={`mt-0.5 text-right text-[10px] font-bold ${diferencial > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {diferencial > 0 ? '-' : '+'}{Math.abs(diferencial).toLocaleString('es-PY')} vs. Gs. {precioBase.precio.toLocaleString('es-PY')}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className={`pr-2 text-right text-xs ${conDescuento ? 'text-green-600' : 'text-slate-500'}`}>
                                                {precio.toLocaleString('es-PY')}
                                            </p>
                                        )}
                                        {/* Total */}
                                        <p className="pr-2 text-right text-[13px] font-bold text-slate-900">
                                            {(precio * linea.cantidad).toLocaleString('es-PY')}
                                        </p>
                                        {/* Quitar */}
                                        {lineas.length > 1 && (
                                            <button onClick={() => eliminarLinea(linea.id)}
                                                className="flex h-[22px] w-[22px] items-center justify-center rounded text-base text-slate-400 hover:bg-red-50 hover:text-red-500">
                                                x
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Fila de delivery */}
                            {canal === 'delivery' && formDelivery.costo_delivery > 0 && (
                                <div className="grid grid-cols-[96px_1fr_100px_108px_28px] items-center border-b border-slate-100 bg-slate-50/70 px-4 py-2">
                                    <span></span>
                                    <span className="text-xs text-slate-500">Delivery — {formDelivery.zona_nombre || 'Zona'}</span>
                                    <span></span>
                                    <span className="pr-2 text-right text-xs font-semibold text-slate-500">+{formDelivery.costo_delivery.toLocaleString()}</span>
                                    <span></span>
                                </div>
                            )}

                            {/* Filas de busqueda (lineas sin presentacion) */}
                            {lineas.filter(l => !l.presentacionSeleccionada).map((linea, idx) => (
                                <div key={linea.id} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                                    {!linea.productoSeleccionado ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9d9b96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                                </svg>
                                                <input
                                                    ref={idx === 0 ? busquedaProductoRef : null}
                                                    placeholder="Buscar producto por nombre o marca..."
                                                    value={linea.busqueda}
                                                    onChange={e => handleBuscarProducto(linea.id, e.target.value)}
                                                    className="flex-1 border-none bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400"
                                                    autoFocus={idx === 0 && lineasValidas.length === 0}
                                                />
                                                {lineas.length > 1 && (
                                                    <button onClick={() => eliminarLinea(linea.id)} className="text-base text-slate-400 hover:text-slate-600">x</button>
                                                )}
                                            </div>
                                            {linea.productosFiltrados.length > 0 && (
                                                <div className="mt-2 max-h-[180px] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                                    {linea.productosFiltrados.map(p => (
                                                        <div key={p.id} onClick={() => seleccionarProducto(linea.id, p)}
                                                            className="cursor-pointer border-b border-slate-100 px-3.5 py-2.5 last:border-b-0 hover:bg-slate-50">
                                                            {(() => {
                                                                const stockTotal = p.presentaciones?.reduce((s, pr) => s + (pr.stock || 0), 0) || 0
                                                                const sinStock = stockTotal === 0
                                                                return (
                                                                    <>
                                                                        <p className={`text-[13px] font-semibold ${sinStock ? 'text-slate-400' : 'text-slate-900'}`}>{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                                        <p className="mt-0.5 text-[11px] text-slate-400">{formatearCalidad(p.calidad)} · {p.categoria_nombre}</p>
                                                                        <span className={`mt-1 inline-block rounded-[5px] border px-1.5 py-0.5 text-[11px] font-bold ${sinStock ? 'border-red-300 bg-red-50 text-red-500' : stockTotal <= 5 ? 'border-amber-300 bg-amber-50 text-amber-600' : 'border-green-300 bg-green-50 text-green-600'}`}>
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
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-xs font-bold text-slate-900">
                                                    {linea.productoSeleccionado.marca_nombre && `${linea.productoSeleccionado.marca_nombre} — `}{linea.productoSeleccionado.nombre}
                                                </p>
                                                <button onClick={() => setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, busqueda: '', productoSeleccionado: null, presentacionSeleccionada: null, precioEspecial: '' } : l))}
                                                    className="text-[11px] text-slate-400 hover:text-slate-600">
                                                    cambiar
                                                </button>
                                            </div>
                                            <p className="mb-2 text-[11px] text-slate-400">Selecciona la presentacion:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {linea.productoSeleccionado.presentaciones.filter(pr => pr.disponible && pr.stock > 0).map(pr => {
                                                    const { precio, conDescuento } = calcularPrecioCaja(pr)
                                                    return (
                                                        <button key={pr.id} onClick={() => seleccionarPresentacion(linea.id, pr)}
                                                            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-900 hover:bg-slate-100">
                                                            <p className="mb-0.5 text-[11px] font-bold text-slate-900">{pr.nombre}</p>
                                                            <p className={`text-xs font-extrabold ${conDescuento ? 'text-green-600' : 'text-slate-900'}`}>Gs. {precio.toLocaleString()}</p>
                                                            <p className={`mt-0.5 text-[10px] ${pr.stock <= 3 ? 'text-red-500' : 'text-slate-400'}`}>Stock: {pr.stock}</p>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </Card>

                        {/* Factura */}
                        {tipoComprobante === 'factura' && (
                            <Card className="mb-3">
                                <CardContent className="p-3.5">
                                    <p className="mb-2.5 text-xs font-bold text-slate-900">Factura</p>
                                    <div className="mb-2.5 flex items-center gap-2">
                                        <input type="checkbox" id="factManual" checked={facturaManual} onChange={e => { setFacturaManual(e.target.checked); setNumeroFacturaManual('') }} className="h-3.5 w-3.5 cursor-pointer" />
                                        <label htmlFor="factManual" className={`cursor-pointer text-xs font-semibold ${facturaManual ? 'text-red-500' : 'text-slate-500'}`}>
                                            Factura manual (talonario fisico)
                                        </label>
                                    </div>
                                    {facturaManual ? (
                                        <div className="rounded-lg border border-red-300 bg-red-50 p-3">
                                            <p className="mb-2 text-[11px] font-semibold text-red-500">
                                                NO se generara numero del sistema. Ingresa el numero del talonario fisico.
                                            </p>
                                            <input placeholder="Ej: 001-002-0000123" value={numeroFacturaManual} onChange={e => setNumeroFacturaManual(e.target.value)}
                                                className={`${inputCls} border-red-300`} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className={labelCls}>Razon social</label>
                                                <input placeholder="Consumidor final" value={razonSocial} onChange={e => setRazonSocial(e.target.value)} className={inputCls} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>RUC</label>
                                                <input placeholder="Ej: 5.578.584-9" value={rucFactura} onChange={e => setRucFactura(e.target.value)} className={inputCls} />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Datos de delivery */}
                        {canal === 'delivery' && (
                            <Card className="mb-3">
                                <CardContent className="p-3.5">
                                    <div className="mb-2.5 flex items-center justify-between">
                                        <p className="text-xs font-bold text-slate-900">Datos de entrega</p>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-[11px] font-semibold text-slate-500">Facturar delivery</span>
                                            <Switch checked={facturarDelivery} onCheckedChange={v => setFacturarDelivery(!!v)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                            <label className={labelCls}>Ubicacion / Direccion *</label>
                                            <input value={formDelivery.ubicacion} onChange={e => setFormDelivery({ ...formDelivery, ubicacion: e.target.value })} placeholder="Barrio, calle, link de maps..." className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Referencia</label>
                                            <input value={formDelivery.referencia} onChange={e => setFormDelivery({ ...formDelivery, referencia: e.target.value })} placeholder="Numero de casa, parada..." className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Horario preferido</label>
                                            <input value={formDelivery.horario} onChange={e => setFormDelivery({ ...formDelivery, horario: e.target.value })} placeholder="Ej: Desde las 14hs" className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Contacto que recibe</label>
                                            <input value={formDelivery.contacto_entrega} onChange={e => setFormDelivery({ ...formDelivery, contacto_entrega: e.target.value })} placeholder="Nombre y telefono" className={inputCls} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelCls}>Zona de delivery</label>
                                            <select value={formDelivery.zona_id} onChange={e => handleZonaChange(e.target.value)} className={inputCls}>
                                                <option value="">Seleccionar zona...</option>
                                                {zonas.filter(z => z.activa).map(z => (
                                                    <option key={z.id} value={z.id}>{z.nombre} — Gs. {z.costo.toLocaleString()}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Panel derecho */}
                    <div className="flex w-[340px] shrink-0 flex-col gap-4.5 overflow-y-auto border-l border-slate-200 bg-white p-5">

                        {/* Modalidad */}
                        <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Modalidad</p>
                            <div className="flex gap-1.5">
                                {[{ val: 'presencial', label: 'Retiro en tienda' }, { val: 'delivery', label: 'Delivery' }].map(c => (
                                    <button key={c.val} onClick={() => setCanal(c.val)} className={segCls(canal === c.val)}>{c.label}</button>
                                ))}
                            </div>
                        </div>

                        {/* Comprobante */}
                        <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Comprobante</p>
                            <div className="flex gap-1.5">
                                {[{ val: 'ticket', label: 'Ticket' }, { val: 'factura', label: 'Factura' }].map(c => (
                                    <button key={c.val} onClick={() => handleTipoComprobante(c.val)} className={segCls(tipoComprobante === c.val)}>{c.label}</button>
                                ))}
                            </div>
                            {tipoComprobante === 'ticket' && (
                                <p className="mt-1.5 text-[11px] text-slate-500">No consume numero de factura. Si cargaste un cliente arriba, igual queda guardado para su historial.</p>
                            )}
                        </div>

                        {/* Metodo de pago */}
                        <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Metodo de pago</p>
                            <div className={`flex gap-1.5 ${metodoPago === 'tarjeta' ? 'mb-2' : ''}`}>
                                {[{ val: 'efectivo', label: 'Efectivo' }, { val: 'transferencia', label: 'Transferencia' }, { val: 'tarjeta', label: 'Tarjeta' }].map(m => (
                                    <button key={m.val} onClick={() => { setMetodoPago(m.val); setSubtipoPago('') }} className={segCls(metodoPago === m.val)}>{m.label}</button>
                                ))}
                            </div>
                            {metodoPago === 'tarjeta' && (
                                <div className="flex gap-1.5">
                                    {[{ val: 'debito', label: 'Debito' }, { val: 'credito', label: 'Credito' }].map(t => (
                                        <button key={t.val} onClick={() => setSubtipoPago(t.val)} className={segCls(subtipoPago === t.val, 'blue')}>{t.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Condicion */}
                        <div>
                            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Condicion de venta</p>
                            <div className={`flex gap-1.5 ${tipoVenta === 'credito' ? 'mb-2' : ''}`}>
                                {[{ val: 'contado', label: 'Contado' }, { val: 'credito', label: 'Credito' }].map(t => (
                                    <button key={t.val} onClick={() => setTipoVenta(t.val)} className={segCls(tipoVenta === t.val)}>{t.label}</button>
                                ))}
                            </div>
                            {tipoVenta === 'credito' && (
                                <div>
                                    <div className="mb-2 flex gap-1.5">
                                        {[15, 30, 60, 90].map(d => (
                                            <button key={d} onClick={() => setPlazoDias(d)} className={segCls(plazoDias === d, 'blue')}>{d}d</button>
                                        ))}
                                    </div>
                                    <input type="number" placeholder="O ingresa los dias manualmente" value={plazoDias}
                                        onChange={e => setPlazoDias(parseInt(e.target.value) || 0)}
                                        className={`${inputCls} mb-1.5`} />
                                    {clienteSeleccionado
                                        ? <p className="text-[11px] text-slate-500">Vencimiento: {new Date(Date.now() + plazoDias * 24 * 60 * 60 * 1000).toLocaleDateString('es-PY')}</p>
                                        : <p className="text-[11px] text-red-500">Debes seleccionar un cliente para venta a credito</p>
                                    }
                                </div>
                            )}
                        </div>

                        {/* Monto recibido */}
                        {metodoPago === 'efectivo' && (
                            <div>
                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Monto recibido (Gs.)</p>
                                <input
                                    type="text"
                                    value={montoEfectivo ? parseInt(montoEfectivo).toLocaleString('es-PY') : ''}
                                    onChange={e => { const limpio = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, ''); setMontoEfectivo(limpio) }}
                                    placeholder={total ? total.toLocaleString('es-PY') : '0'}
                                    className={`${inputCls} text-[15px] font-bold`}
                                />
                                {montoEfectivo && parseInt(montoEfectivo) >= total && total > 0 && (
                                    <div className="mt-2 flex justify-between text-[13px]">
                                        <span className="text-slate-400">Vuelto:</span>
                                        <span className="font-extrabold text-green-600">Gs. {(parseInt(montoEfectivo) - total).toLocaleString()}</span>
                                    </div>
                                )}
                                {montoEfectivo && parseInt(montoEfectivo) < total && (
                                    <p className="mt-1.5 text-[11px] text-red-500">Monto insuficiente</p>
                                )}
                            </div>
                        )}

                        {/* Resumen y boton */}
                        <div className="mt-auto">
                            {tipoComprobante === 'factura' && (razonSocial || rucFactura) && (
                                <div className="mb-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                                    <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-400">Factura a</p>
                                    <p className="text-xs font-semibold text-slate-900">{razonSocial || 'Cliente'}</p>
                                    {rucFactura && <p className="mt-0.5 text-[11px] text-slate-400">RUC: {rucFactura}</p>}
                                </div>
                            )}
                            {metodoPago === 'tarjeta' && subtipoPago && (
                                <div className="mb-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                                    Tarjeta {subtipoPago === 'debito' ? 'Debito' : 'Credito'}
                                </div>
                            )}
                            {tipoVenta === 'credito' && (
                                <div className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                                    Credito — {plazoDias} dias
                                </div>
                            )}
                            {lineasValidas.length > 0 && (
                                <div className="mb-3 rounded-[10px] border border-slate-200 bg-slate-50 p-3.5">
                                    <div className="mb-1 flex justify-between text-xs text-slate-400">
                                        <span>IVA 10% incluido</span>
                                        <span>Gs. {iva.toLocaleString()}</span>
                                    </div>
                                    {canal === 'delivery' && costoDelivery > 0 && (
                                        <div className="mb-1 flex justify-between text-xs text-slate-400">
                                            <span>Delivery {formDelivery.zona_nombre && `— ${formDelivery.zona_nombre}`}</span>
                                            <span>Gs. {costoDelivery.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex items-baseline justify-between border-t border-slate-200 pt-2.5">
                                        <span className="text-sm font-bold text-slate-900">Total</span>
                                        <span className="text-[22px] font-extrabold text-slate-900">Gs. {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}
                            <Button onClick={handleConfirmarVenta}
                                className="w-full bg-green-600 py-6 text-sm font-extrabold text-white hover:bg-green-700">
                                Registrar venta
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PESTAÑA CIERRE ── */}
            {pestana === 'cierre' && (
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="mx-auto max-w-[800px]">

                        {/* Header */}
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Cierre de Caja</h1>
                                <p className="mt-0.5 text-xs text-slate-400">Resumen de ventas y egresos del dia</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="date" value={fechaCierre} onChange={e => setFechaCierre(e.target.value)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-900 outline-none" />
                                <Button onClick={handleImprimirCierre} disabled={!cierreDatos} variant={cierreDatos ? 'default' : 'secondary'}>
                                    Imprimir cierre
                                </Button>
                            </div>
                        </div>

                        {cargandoCierre ? (
                            <div className="p-16 text-center text-slate-400">Cargando datos...</div>
                        ) : !cierreDatos ? (
                            <div className="p-16 text-center text-slate-400">No hay datos para esta fecha.</div>
                        ) : (
                            <div className="flex flex-col gap-3">

                                {/* Metricas */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { label: 'Total ventas', val: `Gs. ${cierreDatos.totalGeneral.toLocaleString('es-PY')}`, color: 'text-green-600' },
                                        { label: 'Cant. ventas', val: cierreDatos.cantidadVentas, color: 'text-blue-600' },
                                        { label: 'Total gastos', val: `Gs. ${gastos.reduce((s, g) => s + g.monto, 0).toLocaleString('es-PY')}`, color: 'text-red-500' },
                                    ].map((m, i) => (
                                        <Card key={i}>
                                            <CardContent className="p-4">
                                                <p className="mb-1.5 text-[11px] uppercase tracking-wide text-slate-400">{m.label}</p>
                                                <p className={`text-xl font-extrabold ${m.color}`}>{m.val}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Por metodo */}
                                <Card className="py-0 gap-0">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-900">Ventas por metodo de pago</p>
                                    </div>
                                    {Object.entries(cierreDatos.resumen).map(([k, v]) => {
                                        const label = v.metodo === 'tarjeta'
                                            ? `Tarjeta ${v.subtipo === 'debito' ? 'Debito' : v.subtipo === 'credito' ? 'Credito' : ''}`
                                            : v.metodo === 'transferencia' ? 'Transferencia' : 'Efectivo'
                                        const porcentaje = cierreDatos.totalGeneral > 0 ? Math.round((v.total / cierreDatos.totalGeneral) * 100) : 0
                                        const barColor = v.metodo === 'efectivo' ? 'bg-green-600' : v.metodo === 'transferencia' ? 'bg-blue-600' : 'bg-amber-500'
                                        return (
                                            <div key={k} className="border-b border-slate-100 px-4 py-3 last:border-b-0">
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <span className="text-[13px] font-semibold text-slate-900">{label}</span>
                                                    <div className="text-right">
                                                        <p className="text-[13px] font-extrabold text-slate-900">Gs. {v.total.toLocaleString('es-PY')}</p>
                                                        <p className="text-[11px] text-slate-400">{v.cantidad} venta{v.cantidad !== 1 ? 's' : ''} · {porcentaje}%</p>
                                                    </div>
                                                </div>
                                                <div className="h-[3px] rounded-full bg-slate-100">
                                                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${porcentaje}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </Card>

                                {/* Por canal */}
                                <Card className="py-0 gap-0">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-900">Ventas por canal</p>
                                    </div>
                                    {Object.entries(cierreDatos.canales).map(([canalKey, v]) => (
                                        <div key={canalKey} className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 last:border-b-0">
                                            <span className="text-[13px] text-slate-900">{canalKey}</span>
                                            <div className="text-right">
                                                <p className="text-[13px] font-bold text-slate-900">Gs. {v.total.toLocaleString('es-PY')}</p>
                                                <p className="text-[11px] text-slate-400">{v.cantidad} venta{v.cantidad !== 1 ? 's' : ''}</p>
                                            </div>
                                        </div>
                                    ))}
                                </Card>

                                {/* Gastos */}
                                <Card className="py-0 gap-0">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                                        <p className="text-xs font-bold text-slate-900">Gastos y egresos</p>
                                    </div>
                                    <div className="p-4">
                                        <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-2">
                                            <input placeholder="Descripcion del gasto..." value={nuevoGasto.descripcion} onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                                                className={inputCls} />
                                            <input type="number" placeholder="Monto Gs." value={nuevoGasto.monto} onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                                                className={`${inputCls} w-[120px]`} />
                                            <Button onClick={agregarGasto} className="whitespace-nowrap">+ Agregar</Button>
                                        </div>
                                        {gastos.length === 0 ? (
                                            <p className="py-2.5 text-center text-xs text-slate-400">No hay gastos registrados para esta sesion.</p>
                                        ) : (
                                            <div className="flex flex-col gap-1.5">
                                                {gastos.map(g => (
                                                    <div key={g.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                                        <span className="text-[13px] text-slate-900">{g.descripcion}</span>
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="text-[13px] font-bold text-red-500">- Gs. {g.monto.toLocaleString('es-PY')}</span>
                                                            <button onClick={() => eliminarGasto(g.id)} className="text-sm text-slate-400 hover:text-slate-600">x</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                {/* Resumen final */}
                                <div className="rounded-xl bg-slate-900 p-5 text-white">
                                    <p className="mb-3.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Resumen del dia</p>
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex justify-between">
                                            <span className="text-[13px] text-slate-400">Total ventas</span>
                                            <span className="text-[13px] font-bold text-green-500">Gs. {cierreDatos.totalGeneral.toLocaleString('es-PY')}</span>
                                        </div>
                                        {gastos.length > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-[13px] text-slate-400">Total gastos</span>
                                                <span className="text-[13px] font-bold text-red-400">- Gs. {gastos.reduce((sum, g) => sum + g.monto, 0).toLocaleString('es-PY')}</span>
                                            </div>
                                        )}
                                        <div className="flex items-baseline justify-between border-t border-slate-700 pt-3">
                                            <span className="text-[15px] font-bold">Neto del dia</span>
                                            <span className="text-[22px] font-extrabold text-green-500">
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
