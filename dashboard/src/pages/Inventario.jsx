import { useState, useEffect } from 'react'
import {
    getProductos, getCategorias, getMarcas, crearMarca,
    verificarEliminarMarca, confirmarEliminarMarca,
    crearCategoria, editarCategoria,
    verificarEliminarCategoria, confirmarEliminarCategoria,
    crearProducto, editarProducto, agregarPresentacion,
    actualizarStock, actualizarPrecio, actualizarCodigoBarras
} from '../services/productos'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearFecha } from '../utils/fecha'
import { getLotesPresentacion, crearLote, eliminarLote } from '../services/lotes'

function Modal({ children, zIndex = 1000, s }) {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex }}>
            <div style={{ background: s.surface, borderRadius: '14px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', color: s.text, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {children}
            </div>
        </div>
    )
}

function Inventario() {
    const { darkMode } = useApp()

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : 'rgba(26,26,127,0.08)',
        borderLight: darkMode ? '#2d3f55' : 'rgba(26,26,127,0.05)',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        inputBg: darkMode ? '#0f172a' : '#f8fafc',
        rowHover: darkMode ? '#1a2536' : 'rgba(26,26,127,0.01)',
        tableTh: darkMode ? '#1a2536' : 'rgba(26,26,127,0.02)',
    }

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text }
    const labelStyle = { fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }
    const btnSecundario = { padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    const [buscar, setBuscar] = useState('')
    const [modalCategorias, setModalCategorias] = useState(false)
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '' })
    const [confirmEliminarCategoria, setConfirmEliminarCategoria] = useState(null)
    const [editandoCategoria, setEditandoCategoria] = useState(null)
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [marcas, setMarcas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [productoExpandido, setProductoExpandido] = useState(null)
    const [modalProducto, setModalProducto] = useState(false)
    const [modalMarca, setModalMarca] = useState(false)
    const [modalPresentacion, setModalPresentacion] = useState(null)
    const [modalPrecio, setModalPrecio] = useState(null)
    const [modalEditarProducto, setModalEditarProducto] = useState(null)
    const [modalCodigoBarras, setModalCodigoBarras] = useState(null)
    const [nuevaMarca, setNuevaMarca] = useState('')
    const [errorMarca, setErrorMarca] = useState('')
    const [confirmEliminarMarca, setConfirmEliminarMarca] = useState(null)
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '' })
    const [nuevaPresentacion, setNuevaPresentacion] = useState({ nombre: '', precio_venta: '', precio_compra: '', stock: 0, codigo_barras: '' })
    const [precioForm, setPrecioForm] = useState({ precio_venta: '', precio_compra: '', precio_descuento: '', descuento_activo: false, descuento_desde: '', descuento_hasta: '', descuento_stock: '' })
    const [editarForm, setEditarForm] = useState({ nombre: '', descripcion: '', calidad: '', categoria_id: '', marca_id: '', sku: '' })
    const [codigoBarrasValor, setCodigoBarrasValor] = useState('')
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalStock, setModalStock] = useState(null)
    const [nuevoStockValor, setNuevoStockValor] = useState('')
    const [modalLotes, setModalLotes] = useState(null) // presentacion objeto
    const [lotes, setLotes] = useState([])
    const [cargandoLotes, setCargandoLotes] = useState(false)
    const [nuevoLote, setNuevoLote] = useState({ numero_lote: '', fecha_vencimiento: '', stock_inicial: '' })

    useEffect(() => { cargarDatos() }, [])

    async function cargarDatos() {
        try {
            setCargando(true)
            const [prods, cats, mrcs] = await Promise.all([getProductos(), getCategorias(), getMarcas()])
            setProductos(prods); setCategorias(cats); setMarcas(mrcs)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function handleCrearMarca() {
        if (!nuevaMarca.trim()) return
        try { setErrorMarca(''); await crearMarca({ nombre: nuevaMarca }); setNuevaMarca(''); await cargarDatos() }
        catch (err) { setErrorMarca(err.response?.data?.error?.includes('duplicate key') ? 'Esta marca ya existe.' : 'Error al crear la marca.') }
    }
    async function handleEliminarMarca(marca) {
        try { const r = await verificarEliminarMarca(marca.id); setConfirmEliminarMarca({ ...marca, cantidad: r.productos_asociados }) }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo verificar la marca.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleConfirmarEliminarMarca() {
        try { await confirmarEliminarMarca(confirmEliminarMarca.id); setConfirmEliminarMarca(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar la marca.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleCrearProducto() {
        try { await crearProducto(nuevoProducto); setModalProducto(false); setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '' }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleCrearCategoria() {
        if (!nuevaCategoria.nombre.trim()) return
        try { await crearCategoria(nuevaCategoria); setNuevaCategoria({ nombre: '', descripcion: '' }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear la categoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEditarCategoria(id, datos) {
        try { await editarCategoria(id, datos); setEditandoCategoria(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo editar la categoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEliminarCategoria(cat) {
        try { const r = await verificarEliminarCategoria(cat.id); setConfirmEliminarCategoria({ ...cat, cantidad: r.productos_asociados }) }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo verificar la categoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleConfirmarEliminarCategoria() {
        try { await confirmarEliminarCategoria(confirmEliminarCategoria.id); setConfirmEliminarCategoria(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar la categoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEditarProducto() {
        try { await editarProducto(modalEditarProducto.id, editarForm); setModalEditarProducto(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo editar el producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleAgregarPresentacion(productoId) {
        try { await agregarPresentacion(productoId, nuevaPresentacion); setModalPresentacion(null); setNuevaPresentacion({ nombre: '', precio_venta: '', precio_compra: '', stock: 0, codigo_barras: '' }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo agregar la presentación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }

    async function abrirModalLotes(pr) {
    setModalLotes(pr)
    setNuevoLote({ numero_lote: '', fecha_vencimiento: '', stock_inicial: '' })
    try {
        setCargandoLotes(true)
        const datos = await getLotesPresentacion(pr.id)
        setLotes(datos)
    } catch (err) {
        setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los lotes.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
    } finally { setCargandoLotes(false) }
}

async function handleCrearLote() {
    if (!nuevoLote.fecha_vencimiento || !nuevoLote.stock_inicial) return
    try {
        await crearLote({ ...nuevoLote, presentacion_id: modalLotes.id, stock_inicial: parseInt(nuevoLote.stock_inicial) })
        const datos = await getLotesPresentacion(modalLotes.id)
        setLotes(datos)
        setNuevoLote({ numero_lote: '', fecha_vencimiento: '', stock_inicial: '' })
        await cargarDatos()
    } catch (err) {
        setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el lote.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
    }
}

async function handleEliminarLote(lote) {
    setModalConfirmar({
        titulo: 'Eliminar lote',
        mensaje: `¿Eliminar el lote ${lote.numero_lote || 'sin número'}? Se restarán ${lote.stock_actual} unidades del stock.`,
        textoBoton: 'Eliminar', colorBoton: '#ef4444',
        onConfirmar: async () => {
            try {
                await eliminarLote(lote.id)
                const datos = await getLotesPresentacion(modalLotes.id)
                setLotes(datos)
                setModalConfirmar(null)
                await cargarDatos()
            } catch (err) {
                setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar el lote.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            }
        }
    })
}

function colorVencimiento(diasParaVencer) {
    if (diasParaVencer < 0) return '#ef4444'
    if (diasParaVencer <= 30) return '#f59e0b'
    return '#10b981'
}

    async function handleConfirmarStock() {
        try { await actualizarStock(modalStock.id, parseInt(nuevoStockValor)); setModalStock(null); setNuevoStockValor(''); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el stock.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleGuardarPrecio() {
        try {
            await actualizarPrecio(modalPrecio.id, { precio_venta: parseInt(precioForm.precio_venta) || null, precio_compra: parseInt(precioForm.precio_compra) || null, precio_descuento: precioForm.precio_descuento ? parseInt(precioForm.precio_descuento) : null, precio_compra_descuento: precioForm.precio_compra_descuento ? parseInt(precioForm.precio_compra_descuento) : null, descuento_activo: precioForm.descuento_activo, descuento_desde: precioForm.descuento_desde || null, descuento_hasta: precioForm.descuento_hasta || null, descuento_stock: precioForm.descuento_stock ? parseInt(precioForm.descuento_stock) : null })
            setModalPrecio(null); await cargarDatos()
        } catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el precio.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleGuardarCodigoBarras() {
        try {
            await actualizarCodigoBarras(modalCodigoBarras.id, codigoBarrasValor)
            setModalCodigoBarras(null)
            setCodigoBarrasValor('')
            await cargarDatos()
        } catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el codigo de barras.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }

    function abrirModalPrecio(pr) {
        setPrecioForm({ precio_venta: pr.precio_venta || '', precio_compra: pr.precio_compra || '', precio_descuento: pr.precio_descuento || '', descuento_activo: pr.descuento_activo || false, descuento_desde: pr.descuento_desde ? pr.descuento_desde.slice(0, 16) : '', descuento_hasta: pr.descuento_hasta ? pr.descuento_hasta.slice(0, 16) : '', descuento_stock: pr.descuento_stock || '' })
        setModalPrecio(pr)
    }
    function abrirModalEditar(producto) {
        setEditarForm({ nombre: producto.nombre, descripcion: producto.descripcion || '', calidad: producto.calidad, categoria_id: producto.categoria_id || '', marca_id: producto.marca_id || '', sku: producto.sku || '' })
        setModalEditarProducto(producto)
    }
    function abrirModalCodigoBarras(pr) {
        setCodigoBarrasValor(pr.codigo_barras || '')
        setModalCodigoBarras(pr)
    }
    function calcularPrecioEfectivo(pr) {
        const ahora = new Date()
        if (pr.descuento_activo && pr.precio_descuento && new Date(pr.descuento_desde) <= ahora && new Date(pr.descuento_hasta) >= ahora) return { precio: pr.precio_descuento, conDescuento: true }
        return { precio: pr.precio_venta, conDescuento: false }
    }
    function margen(pr) {
        const { precio } = calcularPrecioEfectivo(pr)
        if (!precio || !pr.precio_compra) return null
        return Math.round(((precio - pr.precio_compra) / precio) * 100)
    }

    const totalProductos = productos.length
    const totalPresentaciones = productos.reduce((sum, p) => sum + p.presentaciones.length, 0)
    const stockBajo = productos.reduce((sum, p) => sum + p.presentaciones.filter(pr => pr.stock <= 3 && pr.stock > 0).length, 0)
    const sinStock = productos.reduce((sum, p) => sum + p.presentaciones.filter(pr => pr.stock === 0).length, 0)

    const productosFiltrados = productos.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        (p.marca_nombre && p.marca_nombre.toLowerCase().includes(buscar.toLowerCase())) ||
        (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(buscar.toLowerCase())) ||
        (p.sku && p.sku.toLowerCase().includes(buscar.toLowerCase()))
    )

    
    if (cargando) return (
        <div style={{ padding: '32px', background: s.bg, color: s.textMuted, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Cargando inventario...
        </div>
    )

    return (
        <div style={{ padding: '32px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Inventario</h1>
                    <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px' }}>Gestioná productos, precios y stock.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setModalMarca(true)} style={btnSecundario}>Marcas</button>
                    <button onClick={() => setModalCategorias(true)} style={btnSecundario}>Categorías</button>
                    <button onClick={() => setModalProducto(true)} style={btnPrimario}>+ Producto</button>
                </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: 'Total productos', valor: totalProductos, icono: '📦', color: s.text, bg: s.surface },
                    { label: 'Presentaciones', valor: totalPresentaciones, icono: '🗂️', color: s.text, bg: s.surface },
                    { label: 'Stock bajo', valor: stockBajo, icono: '⚠️', color: '#f59e0b', bg: darkMode ? '#451a03' : '#fffbeb' },
                    { label: 'Sin stock', valor: sinStock, icono: '🚫', color: '#ef4444', bg: darkMode ? '#450a0a' : '#fef2f2' },
                ].map((m, i) => (
                    <div key={i} style={{ background: m.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                            <span style={{ fontSize: '18px' }}>{m.icono}</span>
                        </div>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: m.color, letterSpacing: '-1px' }}>{m.valor}</p>
                    </div>
                ))}
            </div>

            {/* Buscador */}
            <div style={{ background: s.surface, borderRadius: '12px 12px 0 0', border: `1px solid ${s.border}`, borderBottom: 'none', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: s.textFaint }}>🔍</span>
                    <input
                        placeholder="Buscar por nombre, marca, categoría o SKU..."
                        value={buscar}
                        onChange={e => setBuscar(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surfaceLow, color: s.text, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                    />
                </div>
                <button onClick={cargarDatos} style={{ ...btnSecundario, padding: '10px 14px', fontSize: '12px' }}>↻ Actualizar</button>
            </div>

            {/* Tabla */}
            <div style={{ background: s.surface, borderRadius: '0 0 12px 12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: s.tableTh, borderBottom: `1px solid ${s.borderLight}` }}>
                            {['Producto', 'SKU', 'Categoría', 'Calidad', 'Presentaciones', 'Acciones'].map(h => (
                                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: s.textMuted, fontSize: '14px' }}>
                                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>📦</p>
                                    <p>No hay productos que coincidan con la búsqueda.</p>
                                </td>
                            </tr>
                        ) : (
                            productosFiltrados.map(producto => {
                                const expandido = productoExpandido === producto.id
                                const stockTotal = producto.presentaciones.reduce((sum, pr) => sum + pr.stock, 0)
                                const alertas = producto.presentaciones.filter(pr => pr.stock <= 3).length

                                return (
                                    <>
                                        <tr key={producto.id}
                                            style={{ borderBottom: `1px solid ${expandido ? 'transparent' : s.borderLight}`, transition: 'background 0.1s', cursor: 'pointer' }}
                                            onClick={() => setProductoExpandido(expandido ? null : producto.id)}
                                            onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.surfaceLow, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>🐾</div>
                                                    <div>
                                                        <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>
                                                            {producto.marca_nombre && <span style={{ color: s.textMuted }}>{producto.marca_nombre} — </span>}
                                                            {producto.nombre}
                                                        </p>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                            <span style={{ fontSize: '11px', color: s.textFaint }}>Stock: {stockTotal}</span>
                                                            {alertas > 0 && <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', background: darkMode ? '#450a0a' : '#fee2e2', padding: '1px 6px', borderRadius: '10px' }}>⚠️ {alertas} bajo</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                {producto.sku
                                                    ? <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'monospace', padding: '3px 8px', borderRadius: '6px', background: darkMode ? '#1e3a5f' : '#eff6ff', color: darkMode ? '#93c5fd' : '#1d4ed8' }}>{producto.sku}</span>
                                                    : <span style={{ fontSize: '11px', color: s.textFaint }}>—</span>
                                                }
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: darkMode ? '#1e3a5f' : '#eff6ff', color: darkMode ? '#93c5fd' : '#1d4ed8' }}>
                                                    {producto.categoria_nombre || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: '#e0e7ff', color: '#3730a3' }}>
                                                    {producto.calidad}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {producto.presentaciones.slice(0, 3).map(pr => (
                                                        <span key={pr.id} style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: s.surfaceLow, color: pr.stock <= 3 ? '#ef4444' : s.textMuted, border: `1px solid ${pr.stock <= 3 ? '#fca5a5' : s.border}` }}>
                                                            {pr.nombre}
                                                        </span>
                                                    ))}
                                                    {producto.presentaciones.length > 3 && <span style={{ fontSize: '10px', color: s.textFaint }}>+{producto.presentaciones.length - 3}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                    <button onClick={e => { e.stopPropagation(); abrirModalEditar(producto) }}
                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                                                        ✏️ Editar
                                                    </button>
                                                    <span style={{ fontSize: '12px', color: s.textFaint }}>{expandido ? '▲' : '▼'}</span>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Fila expandida */}
                                        {expandido && (
                                            <tr key={`${producto.id}-expand`}>
                                                <td colSpan={6} style={{ padding: '0', background: s.surfaceLow, borderBottom: `1px solid ${s.border}` }}>
                                                    <div style={{ padding: '16px 20px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                            <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Presentaciones</p>
                                                            <button onClick={() => setModalPresentacion(producto.id)}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                                + Agregar presentación
                                                            </button>
                                                        </div>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                            <thead>
                                                                <tr style={{ background: s.surface }}>
                                                                    {['Nombre', 'Cod. Barras', 'P. Compra', 'P. Venta', 'Descuento', 'Margen', 'Stock', 'Acciones'].map(h => (
                                                                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {producto.presentaciones.map(pr => {
                                                                    const { precio, conDescuento } = calcularPrecioEfectivo(pr)
                                                                    const mg = margen(pr)
                                                                    return (
                                                                        <tr key={pr.id} style={{ borderTop: `1px solid ${s.borderLight}` }}>
                                                                            <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: '600', color: s.text }}>{pr.nombre}</td>
                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                {pr.codigo_barras
                                                                                    ? <span style={{ fontSize: '11px', fontFamily: 'monospace', color: s.text }}>{pr.codigo_barras}</span>
                                                                                    : <span style={{ fontSize: '11px', color: s.textFaint }}>—</span>
                                                                                }
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: s.textMuted }}>{pr.precio_compra ? `Gs. ${pr.precio_compra.toLocaleString()}` : '—'}</td>
                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: s.text }}>
                                                                                {conDescuento ? (
                                                                                    <span>
                                                                                        <span style={{ textDecoration: 'line-through', color: s.textFaint, fontSize: '11px' }}>Gs. {pr.precio_venta.toLocaleString()}</span>
                                                                                        <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: '700' }}>Gs. {precio.toLocaleString()}</span>
                                                                                        <span style={{ marginLeft: '4px', fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '1px 5px', borderRadius: '8px' }}>🏷️</span>
                                                                                    </span>
                                                                                ) : `Gs. ${(pr.precio_venta || 0).toLocaleString()}`}
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                                                                                {pr.descuento_activo && pr.precio_descuento
                                                                                    ? <span style={{ color: '#10b981', fontWeight: '600' }}>Activo hasta {new Date(pr.descuento_hasta).toLocaleDateString('es-PY')}</span>
                                                                                    : <span style={{ color: s.textFaint }}>—</span>}
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                {mg !== null ? (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: mg >= 20 ? '#10b981' : mg >= 10 ? '#f59e0b' : '#ef4444' }}>{mg}%</span>
                                                                                        <div style={{ width: '48px', height: '4px', background: s.border, borderRadius: '2px', overflow: 'hidden' }}>
                                                                                            <div style={{ width: `${Math.min(mg, 100)}%`, height: '100%', background: mg >= 20 ? '#10b981' : mg >= 10 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
                                                                                        </div>
                                                                                    </div>
                                                                                ) : <span style={{ color: s.textFaint }}>—</span>}
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: pr.stock === 0 ? '#ef4444' : pr.stock <= 3 ? '#f59e0b' : '#10b981' }}>{pr.stock}</span>
                                                                                    <div style={{ width: '48px', height: '4px', background: s.border, borderRadius: '2px', overflow: 'hidden' }}>
                                                                                        <div style={{ width: `${Math.min((pr.stock / 20) * 100, 100)}%`, height: '100%', background: pr.stock === 0 ? '#ef4444' : pr.stock <= 3 ? '#f59e0b' : '#10b981', borderRadius: '2px' }} />
                                                                                    </div>
                                                                                </div>
                                                                            </td>
                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                                    <button onClick={() => { setNuevoStockValor(String(pr.stock)); setModalStock({ id: pr.id, nombre: pr.nombre, stockActual: pr.stock }) }}
                                                                                        style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                                                        Stock
                                                                                    </button>
                                                                                    <button onClick={() => abrirModalPrecio(pr)}
                                                                                        style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                                                        Precio
                                                                                    </button>
                                                                                    <button onClick={() => abrirModalCodigoBarras(pr)}
                                                                                        style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                                                        🔢 Cod.
                                                                                    </button>
                                                                                    <button onClick={() => abrirModalLotes(pr)}
                                                                                        style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                                                        📅 Lotes
                                                                                    </button>
                                                                                </div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )
                            })
                        )}
                    </tbody>
                </table>

                <div style={{ padding: '12px 20px', background: darkMode ? 'rgba(26,37,54,0.5)' : 'rgba(248,250,252,0.8)', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '12px', color: s.textFaint }}>
                        Mostrando <strong style={{ color: s.text }}>{productosFiltrados.length}</strong> de <strong style={{ color: s.text }}>{productos.length}</strong> productos
                    </p>
                    <p style={{ fontSize: '12px', color: s.textFaint }}>{totalPresentaciones} presentaciones en total</p>
                </div>
            </div>

            {/* ===== MODALES ===== */}

            {modalMarca && (
                <Modal s={s}>
                    <div style={{ width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Gestión de marcas</h3>
                            <button onClick={() => { setModalMarca(false); setErrorMarca('') }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                            <label style={labelStyle}>Nueva marca</label>
                            <input value={nuevaMarca} onChange={e => { setNuevaMarca(e.target.value); setErrorMarca('') }} placeholder="Ej: CIBAU" style={inputStyle} />
                            {errorMarca && <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '8px', fontSize: '12px', color: '#991b1b', marginBottom: '8px' }}>{errorMarca}</div>}
                            <button onClick={handleCrearMarca} style={{ ...btnPrimario, width: '100%', justifyContent: 'center' }}>+ Agregar marca</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {marcas.map(marca => (
                                <div key={marca.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <p style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: s.text }}>{marca.nombre}</p>
                                    <button onClick={() => handleEliminarMarca(marca)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>🗑️</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {modalProducto && (
                <Modal s={s}>
                    <div style={{ width: '420px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: s.text }}>Nuevo producto</h3>
                        <label style={labelStyle}>Marca</label>
                        <select value={nuevoProducto.marca_id} onChange={e => setNuevoProducto({ ...nuevoProducto, marca_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin marca</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        <label style={labelStyle}>Nombre</label>
                        <input value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>SKU (codigo interno)</label>
                        <input value={nuevoProducto.sku} onChange={e => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })} placeholder="Ej: CIBAU-ADU-15KG" style={inputStyle} />
                        <label style={labelStyle}>Descripción</label>
                        <input value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Calidad</label>
                        <select value={nuevoProducto.calidad} onChange={e => setNuevoProducto({ ...nuevoProducto, calidad: e.target.value })} style={inputStyle}>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="premium_special">Premium Special</option>
                            <option value="super_premium">Super Premium</option>
                        </select>
                        <label style={labelStyle}>Categoría</label>
                        <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin categoría</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalProducto(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearProducto} style={btnPrimario}>Crear producto</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalEditarProducto && (
                <Modal s={s}>
                    <div style={{ width: '420px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: s.text }}>Editar producto</h3>
                        <label style={labelStyle}>Marca</label>
                        <select value={editarForm.marca_id} onChange={e => setEditarForm({ ...editarForm, marca_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin marca</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        <label style={labelStyle}>Nombre</label>
                        <input value={editarForm.nombre} onChange={e => setEditarForm({ ...editarForm, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>SKU (codigo interno)</label>
                        <input value={editarForm.sku} onChange={e => setEditarForm({ ...editarForm, sku: e.target.value })} placeholder="Ej: CIBAU-ADU-15KG" style={inputStyle} />
                        <label style={labelStyle}>Descripción</label>
                        <input value={editarForm.descripcion} onChange={e => setEditarForm({ ...editarForm, descripcion: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Calidad</label>
                        <select value={editarForm.calidad} onChange={e => setEditarForm({ ...editarForm, calidad: e.target.value })} style={inputStyle}>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="premium_special">Premium Special</option>
                            <option value="super_premium">Super Premium</option>
                        </select>
                        <label style={labelStyle}>Categoría</label>
                        <select value={editarForm.categoria_id} onChange={e => setEditarForm({ ...editarForm, categoria_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin categoría</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalEditarProducto(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleEditarProducto} style={btnPrimario}>Guardar cambios</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalPresentacion && (
                <Modal s={s}>
                    <div style={{ width: '400px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', color: s.text }}>Nueva presentación</h3>
                        <label style={labelStyle}>Nombre</label>
                        <input placeholder="Ej: 3kg, 1KG, 15kg" value={nuevaPresentacion.nombre} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Precio de compra (Gs.)</label>
                        <input type="number" value={nuevaPresentacion.precio_compra} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_compra: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Precio de venta (Gs.)</label>
                        <input type="number" value={nuevaPresentacion.precio_venta} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_venta: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Stock inicial</label>
                        <input type="number" value={nuevaPresentacion.stock} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, stock: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Codigo de barras (opcional)</label>
                        <input value={nuevaPresentacion.codigo_barras} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, codigo_barras: e.target.value })} placeholder="Escanea o ingresa manualmente" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPresentacion(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={() => handleAgregarPresentacion(modalPresentacion)} style={btnPrimario}>Agregar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalCodigoBarras && (
                <Modal s={s} zIndex={2000}>
                    <div style={{ width: '380px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: s.text }}>Codigo de barras</h3>
                        <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '20px' }}>{modalCodigoBarras.nombre}</p>
                        <label style={labelStyle}>Codigo de barras</label>
                        <input
                            value={codigoBarrasValor}
                            onChange={e => setCodigoBarrasValor(e.target.value)}
                            placeholder="Escanea con lector o ingresa manualmente"
                            style={inputStyle}
                            autoFocus
                        />
                        <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '16px' }}>
                            Si tenes un lector de codigo de barras, conectalo por USB y escanea el producto directamente en este campo.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalCodigoBarras(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarCodigoBarras} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalPrecio && (
                <Modal s={s}>
                    <div style={{ width: '420px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: s.text }}>Precio y descuento</h3>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginBottom: '20px' }}>{modalPrecio.nombre}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div><label style={labelStyle}>P. compra (Gs.)</label><input type="number" value={precioForm.precio_compra} onChange={e => setPrecioForm({ ...precioForm, precio_compra: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                            <div><label style={labelStyle}>P. venta (Gs.)</label><input type="number" value={precioForm.precio_venta} onChange={e => setPrecioForm({ ...precioForm, precio_venta: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                        </div>
                        {precioForm.precio_compra && precioForm.precio_venta && (
                            <div style={{ padding: '10px 14px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                                Margen: {Math.round(((precioForm.precio_venta - precioForm.precio_compra) / precioForm.precio_venta) * 100)}% · Ganancia: Gs. {(precioForm.precio_venta - precioForm.precio_compra).toLocaleString()}
                            </div>
                        )}
                        <div style={{ borderTop: `1px solid ${s.borderLight}`, paddingTop: '16px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <input type="checkbox" id="desc" checked={precioForm.descuento_activo} onChange={e => setPrecioForm({ ...precioForm, descuento_activo: e.target.checked })} />
                                <label htmlFor="desc" style={{ fontSize: '13px', fontWeight: '600', cursor: 'pointer', color: s.text }}>Activar descuento temporal</label>
                            </div>
                            {precioForm.descuento_activo && (
                                <>
                                    <div style={{ background: darkMode ? '#1e3a5f' : '#f0f4ff', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                                        <p style={{ fontSize: '11px', fontWeight: '700', color: '#3730a3', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Precios con descuento</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div><label style={labelStyle}>P. compra descuento</label><input type="number" value={precioForm.precio_compra_descuento || ''} onChange={e => setPrecioForm({ ...precioForm, precio_compra_descuento: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                            <div><label style={labelStyle}>P. venta descuento</label><input type="number" value={precioForm.precio_descuento} onChange={e => setPrecioForm({ ...precioForm, precio_descuento: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                        <div><label style={labelStyle}>Desde</label><input type="datetime-local" value={precioForm.descuento_desde} onChange={e => setPrecioForm({ ...precioForm, descuento_desde: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                        <div><label style={labelStyle}>Hasta</label><input type="datetime-local" value={precioForm.descuento_hasta} onChange={e => setPrecioForm({ ...precioForm, descuento_hasta: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                    </div>
                                    <label style={labelStyle}>Límite de stock (opcional)</label>
                                    <input type="number" placeholder="Sin límite" value={precioForm.descuento_stock} onChange={e => setPrecioForm({ ...precioForm, descuento_stock: e.target.value })} style={inputStyle} />
                                </>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPrecio(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarPrecio} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalCategorias && (
                <Modal s={s}>
                    <div style={{ width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Gestión de categorías</h3>
                            <button onClick={() => setModalCategorias(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                            <label style={labelStyle}>Nueva categoría</label>
                            <input placeholder="Nombre" value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })} style={inputStyle} />
                            <input placeholder="Descripción (opcional)" value={nuevaCategoria.descripcion} onChange={e => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                            <button onClick={handleCrearCategoria} style={{ ...btnPrimario, marginTop: '12px', width: '100%', justifyContent: 'center' }}>+ Agregar categoría</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {categorias.map(cat => (
                                <div key={cat.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {editandoCategoria === cat.id ? (
                                        <>
                                            <input defaultValue={cat.nombre} id={`cat-edit-${cat.id}`} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                                            <button onClick={() => handleEditarCategoria(cat.id, { nombre: document.getElementById(`cat-edit-${cat.id}`).value })} style={{ ...btnPrimario, padding: '6px 12px' }}>Guardar</button>
                                            <button onClick={() => setEditandoCategoria(null)} style={{ ...btnSecundario, padding: '6px 12px' }}>Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '13px', fontWeight: '500', color: s.text }}>{cat.nombre}</p>
                                                {cat.descripcion && <p style={{ fontSize: '11px', color: s.textMuted }}>{cat.descripcion}</p>}
                                            </div>
                                            <button onClick={() => setEditandoCategoria(cat.id)} style={{ ...btnSecundario, padding: '4px 10px', fontSize: '12px' }}>✏️</button>
                                            <button onClick={() => handleEliminarCategoria(cat)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>🗑️</button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {modalStock && (
                <Modal s={s} zIndex={2000}>
                    <div style={{ width: '360px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', color: s.text }}>Actualizar stock</h3>
                        <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '20px' }}>{modalStock.nombre}</p>
                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: s.textMuted }}>Stock actual</span>
                            <span style={{ fontSize: '20px', fontWeight: '800', color: modalStock.stockActual <= 3 ? '#ef4444' : s.text }}>{modalStock.stockActual}</span>
                        </div>
                        <label style={labelStyle}>Nuevo stock</label>
                        <input type="number" value={nuevoStockValor} onChange={e => setNuevoStockValor(e.target.value)} style={inputStyle} autoFocus />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalStock(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarStock} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmEliminarMarca && (
                <Modal s={s} zIndex={1100}>
                    <div style={{ width: '400px' }}>
                        <h3 style={{ marginBottom: '12px', color: confirmEliminarMarca.cantidad > 0 ? '#ef4444' : s.text }}>
                            {confirmEliminarMarca.cantidad > 0 ? '⚠️ Atención' : 'Eliminar marca'}
                        </h3>
                        {confirmEliminarMarca.cantidad > 0 ? (
                            <>
                                <p style={{ fontSize: '13px', marginBottom: '12px', color: s.text }}>La marca <strong>{confirmEliminarMarca.nombre}</strong> tiene <strong>{confirmEliminarMarca.cantidad}</strong> productos asociados.</p>
                                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#991b1b' }}>Eliminar esta marca desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p style={{ fontSize: '13px', marginBottom: '16px', color: s.text }}>¿Eliminar la marca <strong>{confirmEliminarMarca.nombre}</strong>?</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmEliminarMarca(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarMarca} style={{ ...btnPrimario, background: '#ef4444' }}>Eliminar igual</button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmEliminarCategoria && (
                <Modal s={s} zIndex={1100}>
                    <div style={{ width: '400px' }}>
                        <h3 style={{ marginBottom: '12px', color: confirmEliminarCategoria.cantidad > 0 ? '#ef4444' : s.text }}>
                            {confirmEliminarCategoria.cantidad > 0 ? '⚠️ Atención' : 'Eliminar categoría'}
                        </h3>
                        {confirmEliminarCategoria.cantidad > 0 ? (
                            <>
                                <p style={{ fontSize: '13px', marginBottom: '12px', color: s.text }}>La categoría <strong>{confirmEliminarCategoria.nombre}</strong> tiene <strong>{confirmEliminarCategoria.cantidad}</strong> productos asociados.</p>
                                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#991b1b' }}>Eliminar esta categoría desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p style={{ fontSize: '13px', marginBottom: '16px', color: s.text }}>¿Eliminar la categoría <strong>{confirmEliminarCategoria.nombre}</strong>?</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmEliminarCategoria(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarCategoria} style={{ ...btnPrimario, background: '#ef4444' }}>Eliminar igual</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalLotes && (
            <Modal s={s} zIndex={2000}>
                <div style={{ width: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Lotes — {modalLotes.nombre}</h3>
                        <button onClick={() => setModalLotes(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                    </div>
                    <p style={{ fontSize: '12px', color: s.textMuted, marginBottom: '20px' }}>
                        Stock total: <strong style={{ color: s.text }}>{modalLotes.stock}</strong> unidades · FEFO activo (vence primero, sale primero)
                    </p>
                    <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                        <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Agregar lote</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                                <label style={labelStyle}>N° de lote</label>
                                <input value={nuevoLote.numero_lote} onChange={e => setNuevoLote({ ...nuevoLote, numero_lote: e.target.value })}
                                    placeholder="Opcional" style={{ ...inputStyle, marginBottom: 0 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha de vencimiento *</label>
                                <input type="date" value={nuevoLote.fecha_vencimiento} onChange={e => setNuevoLote({ ...nuevoLote, fecha_vencimiento: e.target.value })}
                                    style={{ ...inputStyle, marginBottom: 0 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Stock inicial *</label>
                                <input type="number" value={nuevoLote.stock_inicial} onChange={e => setNuevoLote({ ...nuevoLote, stock_inicial: e.target.value })}
                                    placeholder="Unidades" style={{ ...inputStyle, marginBottom: 0 }} />
                            </div>
                        </div>
                        <button onClick={handleCrearLote}
                            style={{ ...btnPrimario, width: '100%', justifyContent: 'center', fontSize: '12px' }}>
                            + Agregar lote
                        </button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {cargandoLotes ? (
                            <p style={{ textAlign: 'center', color: s.textMuted, padding: '20px' }}>Cargando lotes...</p>
                        ) : lotes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: s.textMuted }}>
                                <p style={{ fontSize: '24px', marginBottom: '8px' }}>📦</p>
                                <p style={{ fontSize: '13px' }}>No hay lotes cargados para esta presentación.</p>
                                <p style={{ fontSize: '11px', marginTop: '4px', color: s.textFaint }}>El stock se gestiona de forma global hasta que cargues lotes.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: s.surfaceLow }}>
                                        {['N° Lote', 'Vencimiento', 'Días', 'Stock inicial', 'Stock actual', ''].map(h => (
                                            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotes.map(lote => {
                                        const dias = parseInt(lote.dias_para_vencer)
                                        const color = colorVencimiento(dias)
                                        const vencido = dias < 0
                                        return (
                                            <tr key={lote.id} style={{ borderTop: `1px solid ${s.borderLight}` }}>
                                                <td style={{ padding: '10px 12px', fontSize: '12px', fontFamily: 'monospace', color: s.text }}>
                                                    {lote.numero_lote || <span style={{ color: s.textFaint }}>—</span>}
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: '12px', color: s.text }}>
                                                    {new Date(lote.fecha_vencimiento).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${color}20`, color }}>
                                                        {vencido ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? 'Vence hoy' : `${dias}d`}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: '12px', color: s.textMuted }}>{lote.stock_inicial}</td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: '800', color: lote.stock_actual === 0 ? s.textFaint : s.text }}>
                                                        {lote.stock_actual}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <button onClick={() => handleEliminarLote(lote)}
                                                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '11px', cursor: 'pointer' }}>
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </Modal>
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

export default Inventario