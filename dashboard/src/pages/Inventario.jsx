import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
    getProductos, getCategorias, getMarcas, crearMarca,
    verificarEliminarMarca, confirmarEliminarMarca,
    crearCategoria, editarCategoria,
    verificarEliminarCategoria, confirmarEliminarCategoria,
    getSubcategorias, crearSubcategoria, editarSubcategoria,
    verificarEliminarSubcategoria, confirmarEliminarSubcategoria,
    crearProducto, editarProducto, agregarPresentacion,
    actualizarStock, actualizarPrecio, actualizarCodigoBarras,
    toggleDisponibleProducto, eliminarPresentacion, eliminarProducto,
    getSecciones, crearSeccion, editarSeccion, eliminarSeccion,
    importarProductos, descargarTemplateStock, importarStock
} from '../services/productos'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearFecha } from '../utils/fecha'
import { getLotesPresentacion, crearLote, eliminarLote } from '../services/lotes'
import { formatearCalidad, formatMiles, parseMiles } from '../utils/formato'
import { registrarTransformacion } from '../services/transformaciones'

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

    const [pestanaActiva, setPestanaActiva] = useState('balanceados')
    const [buscar, setBuscar] = useState('')
    const [modalCategorias, setModalCategorias] = useState(false)
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '', seccion: '' })
    const [confirmEliminarCategoria, setConfirmEliminarCategoria] = useState(null)
    const [editandoCategoria, setEditandoCategoria] = useState(null)
    const [modalSubcategorias, setModalSubcategorias] = useState(false)
    const [nuevaSubcategoria, setNuevaSubcategoria] = useState({ nombre: '', descripcion: '' })
    const [confirmEliminarSubcategoria, setConfirmEliminarSubcategoria] = useState(null)
    const [editandoSubcategoria, setEditandoSubcategoria] = useState(null)
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [subcategorias, setSubcategorias] = useState([])
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
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '', especie: '', seccion_inventario: '', subcategoria_id: '' })
    const [nuevaPresentacion, setNuevaPresentacion] = useState({ nombre: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', stock: 0, codigo_barras: '' })
    const [precioForm, setPrecioForm] = useState({ precio_venta: '', precio_tarjeta: '', precio_compra: '', precio_descuento: '', precio_compra_descuento: '', descuento_activo: false, descuento_desde: '', descuento_hasta: '', descuento_stock: '' })
    const [editarForm, setEditarForm] = useState({ nombre: '', descripcion: '', calidad: '', categoria_id: '', marca_id: '', sku: '', especie: '', seccion_inventario: '', subcategoria_id: '' })
    const [codigoBarrasValor, setCodigoBarrasValor] = useState('')
    const [guardando, setGuardando] = useState(false)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalImportar, setModalImportar] = useState(null) // null | { filas, modo: 'precios'|'stock' }
    const [importando, setImportando] = useState(false)
    const [importResultado, setImportResultado] = useState(null)
    const inputImportRef = useRef(null)
    const inputImportStockRef = useRef(null)
    const [modalStock, setModalStock] = useState(null)
    const [nuevoStockValor, setNuevoStockValor] = useState('')
    const [modalLotes, setModalLotes] = useState(null) // presentacion objeto
    const [secciones, setSecciones] = useState([])
    const [modalSecciones, setModalSecciones] = useState(false)
    const [nuevaSeccion, setNuevaSeccion] = useState({ nombre: '', color: '#6366f1', tipo: 'generico' })
    const [editandoSeccion, setEditandoSeccion] = useState(null)
    const [marcasExpandidas, setMarcasExpandidas] = useState({})
    const toggleMarca = (marca) => setMarcasExpandidas(prev => ({ ...prev, [marca]: !prev[marca] }))

    function toSlug(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    }
    const [modalFraccionar, setModalFraccionar] = useState(null) // { producto, presentacion }
    const [fraccionForm, setFraccionForm] = useState({ presentacion_destino_id: '', cantidad_origen: '', cantidad_destino: '', nota: '' })
    const [fraccionando, setFraccionando] = useState(false)
    const [lotes, setLotes] = useState([])
    const [cargandoLotes, setCargandoLotes] = useState(false)
    const [nuevoLote, setNuevoLote] = useState({ numero_lote: '', fecha_vencimiento: '', stock_inicial: '' })

    useEffect(() => { cargarDatos() }, [])

    async function cargarDatos() {
        try {
            setCargando(true)
            const [prods, cats, mrcs, subs, secs] = await Promise.all([getProductos(), getCategorias(), getMarcas(), getSubcategorias(), getSecciones()])
            setProductos(prods); setCategorias(cats); setMarcas(mrcs); setSubcategorias(subs)
            setSecciones(secs.length > 0 ? secs : [
                { id: 1, slug: 'balanceados',  nombre: 'Balanceados',  color: '#1a1a2e', orden: 1, tipo: 'con_calidad_especie' },
                { id: 2, slug: 'accesorios',   nombre: 'Accesorios',   color: '#0ea5e9', orden: 2, tipo: 'con_especie' },
                { id: 3, slug: 'medicamentos', nombre: 'Medicamentos', color: '#10b981', orden: 3, tipo: 'generico' },
            ])
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
        if (guardando) return
        setGuardando(true)
        try { await crearProducto(nuevoProducto); setModalProducto(false); setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '', especie: '', seccion_inventario: pestanaActiva !== 'sin_categoria' ? pestanaActiva : '', subcategoria_id: '' }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
        finally { setGuardando(false) }
    }

    function descargarTemplate() {
        const encabezados = [['nombre_producto', 'marca', 'especie', 'calidad', 'categoria', 'subcategoria', 'sku', 'presentacion', 'precio_compra', 'precio_venta', 'precio_tarjeta', 'stock']]
        const ejemplos = [
            ['Pro Plan Adulto', 'Purina', 'perro', 'super_premium', 'balanceados', 'Adultos', 'PP-AD-3KG', '3kg', 155000, 190000, 202000, 10],
            ['Pro Plan Adulto', 'Purina', 'perro', 'super_premium', 'balanceados', 'Adultos', 'PP-AD-15KG', '15kg', 580000, 720000, 765000, 5],
            ['Whiskas Adulto', 'Mars', 'gato', 'standard', 'balanceados', '', 'WK-AD-500', '500g', 18000, 25000, '', 20],
        ]
        const ws = XLSX.utils.aoa_to_sheet([...encabezados, ...ejemplos])
        ws['!cols'] = encabezados[0].map((_, i) => ({ wch: i === 0 ? 28 : i <= 4 ? 16 : 14 }))
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Lista de Precios')
        XLSX.writeFile(wb, 'template_importacion.xlsx')
    }

    function handleSeleccionarExcel(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
                // Normalizar nombres de columnas
                const filas = raw.map(row => {
                    const norm = {}
                    Object.entries(row).forEach(([k, v]) => { norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = v })
                    return {
                        nombre_producto: String(norm.nombre_producto || norm.nombre || norm.product || '').trim(),
                        marca: String(norm.marca || norm.brand || norm.fabricante || '').trim(),
                        especie: String(norm.especie || norm.especie_animal || '').trim().toLowerCase(),
                        calidad: String(norm.calidad || norm.quality || '').trim().toLowerCase(),
                        categoria: String(norm.categoria || norm.category || '').trim().toLowerCase(),
                        subcategoria: String(norm.subcategoria || norm.subcategory || norm.sub_categoria || '').trim(),
                        sku: String(norm.sku || norm.codigo || norm.codigo_producto || '').trim(),
                        presentacion: String(norm.presentacion || norm.presentacion_nombre || norm.tamaño || norm.size || norm.kg || '').trim(),
                        precio_compra: parseInt(String(norm.precio_compra || norm.p_compra || norm.costo || '').replace(/[^0-9]/g, '')) || 0,
                        precio_venta: parseInt(String(norm.precio_venta || norm.p_venta || norm.precio || norm.precio_de_venta || '').replace(/[^0-9]/g, '')) || 0,
                        precio_tarjeta: parseInt(String(norm.precio_tarjeta || norm.p_tarjeta || '').replace(/[^0-9]/g, '')) || null,
                        stock: parseInt(String(norm.stock || norm.cantidad || '').replace(/[^0-9]/g, '')) || 0,
                    }
                }).filter(f => f.nombre_producto && f.presentacion)

                if (filas.length === 0) {
                    setModalConfirmar({ titulo: 'Archivo vacío', mensaje: 'No se encontraron filas válidas. Verificá que el archivo use el template correcto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                    return
                }
                setImportResultado(null)
                setModalImportar({ filas })
            } catch {
                setModalConfirmar({ titulo: 'Error al leer el archivo', mensaje: 'No se pudo leer el Excel. Asegurate de usar el template descargado.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            }
        }
        reader.readAsArrayBuffer(file)
        e.target.value = ''
    }

    async function handleConfirmarImport() {
        if (!modalImportar?.filas?.length || importando) return
        setImportando(true)
        try {
            const resultado = modalImportar.modo === 'stock'
                ? await importarStock(modalImportar.filas)
                : await importarProductos(modalImportar.filas)
            setImportResultado({ ...resultado, modo: modalImportar.modo })
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error en la importación', mensaje: err.response?.data?.error || 'No se pudo completar la importación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            setImportando(false)
        }
    }

    function handleSeleccionarExcelStock(e) {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = ev => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })
                const filas = raw.map(row => {
                    const norm = {}
                    Object.entries(row).forEach(([k, v]) => { norm[k.toLowerCase().trim().replace(/\s+/g, '_')] = v })
                    return {
                        presentacion_id: parseInt(norm.presentacion_id) || null,
                        producto: String(norm.producto || ''),
                        presentacion: String(norm.presentacion || ''),
                        codigo_barras: String(norm.codigo_barras || '').trim(),
                        stock_a_agregar: parseInt(String(norm.stock_a_agregar || '').replace(/[^0-9]/g, '')) || 0,
                        fecha_vencimiento: String(norm.fecha_vencimiento || '').trim(),
                        numero_lote: String(norm.numero_lote || '').trim(),
                    }
                }).filter(f => f.presentacion_id && (f.stock_a_agregar > 0 || f.codigo_barras || f.fecha_vencimiento))

                if (filas.length === 0) {
                    setModalConfirmar({ titulo: 'Sin filas válidas', mensaje: 'No se encontraron filas con stock_a_agregar mayor a 0. Completá la columna y volvé a importar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                    return
                }
                setImportResultado(null)
                setModalImportar({ filas, modo: 'stock' })
            } catch {
                setModalConfirmar({ titulo: 'Error al leer', mensaje: 'No se pudo leer el archivo. Usá el template descargado desde el sistema.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
            }
        }
        reader.readAsArrayBuffer(file)
        e.target.value = ''
    }
    async function handleCrearCategoria() {
        if (!nuevaCategoria.nombre.trim()) return
        try { await crearCategoria(nuevaCategoria); setNuevaCategoria({ nombre: '', descripcion: '', seccion: nuevaCategoria.seccion }); await cargarDatos() }
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
    async function handleToggleDisponibleProducto(producto) {
        const nuevaDisp = !producto.disponible
        setModalConfirmar({
            titulo: nuevaDisp ? 'Activar producto' : 'Desactivar producto',
            mensaje: `¿${nuevaDisp ? 'Activar' : 'Desactivar'} "${producto.nombre}"? ${nuevaDisp ? 'Volverá a aparecer en el bot y tienda.' : 'No aparecerá en el bot ni tienda.'}`,
            textoBoton: nuevaDisp ? 'Activar' : 'Desactivar',
            colorBoton: nuevaDisp ? '#10b981' : '#ef4444',
            onConfirmar: async () => {
                try { await toggleDisponibleProducto(producto.id, nuevaDisp); setModalConfirmar(null); await cargarDatos() }
                catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cambiar el estado del producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
            }
        })
    }
    async function handleCrearSubcategoria() {
        if (!nuevaSubcategoria.nombre.trim()) return
        try {
            await crearSubcategoria({ ...nuevaSubcategoria, seccion: pestanaActiva !== 'sin_categoria' ? pestanaActiva : null })
            setNuevaSubcategoria({ nombre: '', descripcion: '' })
            await cargarDatos()
        } catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear la subcategoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEditarSubcategoria(id, datos) {
        try { await editarSubcategoria(id, datos); setEditandoSubcategoria(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo editar la subcategoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEliminarSubcategoria(sub) {
        try { const r = await verificarEliminarSubcategoria(sub.id); setConfirmEliminarSubcategoria({ ...sub, cantidad: r.productos_asociados }) }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo verificar la subcategoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleConfirmarEliminarSubcategoria() {
        try { await confirmarEliminarSubcategoria(confirmEliminarSubcategoria.id); setConfirmEliminarSubcategoria(null); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar la subcategoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleAgregarPresentacion(productoId) {
        if (guardando) return
        setGuardando(true)
        try { await agregarPresentacion(productoId, nuevaPresentacion); setModalPresentacion(null); setNuevaPresentacion({ nombre: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', stock: 0, codigo_barras: '' }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo agregar la presentación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
        finally { setGuardando(false) }
    }

    function handleEliminarPresentacion(pr, producto) {
        setModalConfirmar({
            titulo: 'Eliminar presentacion',
            mensaje: `¿Eliminar "${pr.nombre}" de ${producto.nombre}? Esta accion no se puede deshacer.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await eliminarPresentacion(pr.id)
                    setModalConfirmar(null)
                    await cargarDatos()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar la presentacion.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    function handleEliminarProducto(producto) {
        setModalConfirmar({
            titulo: 'Eliminar producto',
            mensaje: `¿Eliminar "${producto.nombre}" y todas sus presentaciones? Esta accion no se puede deshacer.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await eliminarProducto(producto.id)
                    setModalConfirmar(null)
                    setProductoExpandido(null)
                    await cargarDatos()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar el producto.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    async function handleCrearSeccion() {
        const slug = toSlug(nuevaSeccion.nombre)
        if (!nuevaSeccion.nombre.trim()) return
        try {
            await crearSeccion({ nombre: nuevaSeccion.nombre.trim(), slug, color: nuevaSeccion.color, tipo: nuevaSeccion.tipo, orden: secciones.length + 1 })
            setNuevaSeccion({ nombre: '', color: '#6366f1', tipo: 'generico' })
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear la sección.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }
    async function handleEditarSeccion(sec) {
        try {
            await editarSeccion(sec.id, { nombre: sec.nombre, color: sec.color })
            setEditandoSeccion(null)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo editar la sección.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }
    function handleEliminarSeccion(sec) {
        setModalConfirmar({
            titulo: 'Eliminar sección',
            mensaje: `¿Eliminar la sección "${sec.nombre}"? Solo se puede si no tiene productos asignados.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await eliminarSeccion(sec.id)
                    setModalConfirmar(null)
                    if (pestanaActiva === sec.slug) setPestanaActiva(secciones[0]?.slug || 'balanceados')
                    await cargarDatos()
                } catch (err) {
                    setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                }
            }
        })
    }

    function abrirModalFraccionar(producto, pr) {
        setFraccionForm({ modo_destino: 'existente', presentacion_destino_id: '', nombre_nuevo: '', cantidad_origen: '', cantidad_destino: '', precio_venta: '', precio_compra: '', nota: '' })
        setModalFraccionar({ producto, presentacion: pr })
    }

    async function handleConfirmarFraccion() {
        const cantOrigen = parseInt(fraccionForm.cantidad_origen)
        const cantDestino = parseInt(fraccionForm.cantidad_destino)
        if (!cantOrigen || cantOrigen < 1) return setModalConfirmar({ titulo: 'Error', mensaje: 'Cantidad a fraccionar debe ser mayor a 0.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        if (!cantDestino || cantDestino < 1) return setModalConfirmar({ titulo: 'Error', mensaje: 'Cantidad resultante debe ser mayor a 0.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        if (fraccionForm.modo_destino === 'existente' && !fraccionForm.presentacion_destino_id) return setModalConfirmar({ titulo: 'Error', mensaje: 'Seleccioná la presentación destino.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        if (fraccionForm.modo_destino === 'nueva' && !fraccionForm.nombre_nuevo.trim()) return setModalConfirmar({ titulo: 'Error', mensaje: 'Ingresá el nombre de la presentación fraccionada.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        try {
            setFraccionando(true)
            const payload = {
                presentacion_origen_id: modalFraccionar.presentacion.id,
                cantidad_origen: cantOrigen,
                cantidad_destino: cantDestino,
                nota: fraccionForm.nota || null
            }
            if (fraccionForm.modo_destino === 'nueva') {
                payload.nueva_presentacion = {
                    nombre: fraccionForm.nombre_nuevo.trim(),
                    precio_venta: fraccionForm.precio_venta ? parseInt(fraccionForm.precio_venta) : null,
                    precio_compra: fraccionForm.precio_compra ? parseInt(fraccionForm.precio_compra) : null,
                }
            } else {
                payload.presentacion_destino_id = parseInt(fraccionForm.presentacion_destino_id)
                payload.precio_venta = fraccionForm.precio_venta ? parseInt(fraccionForm.precio_venta) : null
                payload.precio_compra = fraccionForm.precio_compra ? parseInt(fraccionForm.precio_compra) : null
            }
            await registrarTransformacion(payload)
            setModalFraccionar(null)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar el fraccionamiento.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            setFraccionando(false)
        }
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
            await actualizarPrecio(modalPrecio.id, { precio_venta: parseInt(precioForm.precio_venta) || null, precio_tarjeta: precioForm.precio_tarjeta ? parseInt(precioForm.precio_tarjeta) : null, precio_compra: parseInt(precioForm.precio_compra) || null, precio_descuento: precioForm.precio_descuento ? parseInt(precioForm.precio_descuento) : null, precio_compra_descuento: precioForm.precio_compra_descuento ? parseInt(precioForm.precio_compra_descuento) : null, descuento_activo: precioForm.descuento_activo, descuento_desde: precioForm.descuento_desde || null, descuento_hasta: precioForm.descuento_hasta || null, descuento_stock: precioForm.descuento_stock ? parseInt(precioForm.descuento_stock) : null })
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
        setPrecioForm({ precio_venta: pr.precio_venta || '', precio_tarjeta: pr.precio_tarjeta || '', precio_compra: pr.precio_compra || '', precio_descuento: pr.precio_descuento || '', precio_compra_descuento: pr.precio_compra_descuento || '', descuento_activo: pr.descuento_activo || false, descuento_desde: pr.descuento_desde ? pr.descuento_desde.slice(0, 16) : '', descuento_hasta: pr.descuento_hasta ? pr.descuento_hasta.slice(0, 16) : '', descuento_stock: pr.descuento_stock || '' })
        setModalPrecio(pr)
    }
    function abrirModalEditar(producto) {
        setEditarForm({ nombre: producto.nombre, descripcion: producto.descripcion || '', calidad: producto.calidad || 'standard', categoria_id: producto.categoria_id || '', marca_id: producto.marca_id || '', sku: producto.sku || '', especie: producto.especie || '', seccion_inventario: producto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : ''), subcategoria_id: producto.subcategoria_id || '' })
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
        const ganancia = precio - pr.precio_compra
        return {
            markup: Math.round((ganancia / pr.precio_compra) * 100),
            margenVenta: Math.round((ganancia / precio) * 100),
        }
    }

    const totalProductos = productos.length
    const totalPresentaciones = productos.reduce((sum, p) => sum + p.presentaciones.length, 0)
    const stockBajo = productos.reduce((sum, p) => sum + p.presentaciones.filter(pr => pr.stock <= 3 && pr.stock > 0).length, 0)
    const sinStock = productos.reduce((sum, p) => sum + p.presentaciones.filter(pr => pr.stock === 0).length, 0)

    const PESTANAS = [
        ...secciones.map(s => ({ id: s.slug, label: s.nombre, color: s.color })),
        { id: 'sin_categoria', label: 'Sin categoria', color: '#dc2626' },
    ]

    const productosFiltrados = productos
        .filter(p => pestanaActiva === 'sin_categoria' ? !p.seccion_inventario : p.seccion_inventario === pestanaActiva)
        .filter(p =>
            p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
            (p.marca_nombre && p.marca_nombre.toLowerCase().includes(buscar.toLowerCase())) ||
            (p.categoria_nombre && p.categoria_nombre.toLowerCase().includes(buscar.toLowerCase())) ||
            (p.subcategoria_nombre && p.subcategoria_nombre.toLowerCase().includes(buscar.toLowerCase())) ||
            (p.sku && p.sku.toLowerCase().includes(buscar.toLowerCase()))
        )

    const colorSeccionActiva = PESTANAS.find(t => t.id === pestanaActiva)?.color || '#1a1a2e'
    const tipoActivo = secciones.find(s => s.slug === pestanaActiva)?.tipo || 'generico'

    function getAgrupadorSecundario(p) {
        if (tipoActivo === 'con_calidad_especie') return p.subcategoria_nombre || 'Sin Subcategoria'
        if (pestanaActiva === 'sin_categoria') return 'Sin categoria asignada'
        return p.categoria_nombre || 'Sin Categoria'
    }

    const porMarca = {}
    productosFiltrados.forEach(p => {
        const marca = p.marca_nombre || 'Sin Marca'
        const sub = getAgrupadorSecundario(p)
        if (!porMarca[marca]) porMarca[marca] = {}
        if (!porMarca[marca][sub]) porMarca[marca][sub] = []
        porMarca[marca][sub].push(p)
    })
    const marcasOrdenadas = Object.keys(porMarca).sort((a, b) => a === 'Sin Marca' ? 1 : b === 'Sin Marca' ? -1 : a.localeCompare(b))
    const getTipoSeccion = (slug) => secciones.find(s => s.slug === slug)?.tipo || 'generico'

    const subcategoriasPestana = subcategorias.filter(s => s.seccion === pestanaActiva)
    const categoriasPestana = categorias.filter(c => !c.seccion || c.seccion === pestanaActiva)
    const catsPara = (sec) => categorias.filter(c => !c.seccion || c.seccion === sec)
    const subcatsPara = (sec) => subcategorias.filter(s => s.seccion === sec)

    const contadorPorPestana = {}
    PESTANAS.forEach(t => {
        contadorPorPestana[t.id] = t.id === 'sin_categoria'
            ? productos.filter(p => !p.seccion_inventario).length
            : productos.filter(p => p.seccion_inventario === t.id).length
    })

    
    if (cargando) return (
        <div style={{ padding: '32px', background: s.bg, color: s.textMuted, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Cargando inventario...
        </div>
    )

    return (
        <div className="page-scroll" style={{ padding: '32px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Inventario</h1>
                    <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px' }}>Gestioná productos, precios y stock.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setModalSecciones(true)} style={btnSecundario}>Secciones</button>
                    <button onClick={() => setModalMarca(true)} style={btnSecundario}>Marcas</button>
                    <button onClick={() => { setNuevaCategoria({ nombre: '', descripcion: '', seccion: pestanaActiva !== 'sin_categoria' ? pestanaActiva : '' }); setModalCategorias(true) }} style={btnSecundario}>Categorías</button>
                    {pestanaActiva !== 'sin_categoria' && <button onClick={() => setModalSubcategorias(true)} style={btnSecundario}>Subcategorías</button>}
                    <button onClick={descargarTemplate} style={btnSecundario}>⬇ Template precios</button>
                    <button onClick={() => inputImportRef.current?.click()} style={btnSecundario}>⬆ Importar precios</button>
                    <input ref={inputImportRef} type="file" accept=".xlsx,.xls" onChange={handleSeleccionarExcel} style={{ display: 'none' }} />
                    <button onClick={() => descargarTemplateStock().catch(() => {})} style={btnSecundario}>⬇ Template stock</button>
                    <button onClick={() => inputImportStockRef.current?.click()} style={btnSecundario}>⬆ Importar stock</button>
                    <input ref={inputImportStockRef} type="file" accept=".xlsx,.xls" onChange={handleSeleccionarExcelStock} style={{ display: 'none' }} />
                    <button onClick={() => { setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '', especie: '', seccion_inventario: pestanaActiva !== 'sin_categoria' ? pestanaActiva : '', subcategoria_id: '' }); setModalProducto(true) }} style={btnPrimario}>+ Producto</button>
                </div>
            </div>

            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {[
                    { label: 'Total productos',  valor: totalProductos,      icono: 'box',     color: s.text,    bg: s.surface },
                    { label: 'Presentaciones',   valor: totalPresentaciones, icono: 'layers',  color: s.text,    bg: s.surface },
                    { label: 'Stock bajo',       valor: stockBajo,           icono: 'warning', color: '#f59e0b', bg: darkMode ? '#451a03' : '#fffbeb' },
                    { label: 'Sin stock',        valor: sinStock,            icono: 'banned',  color: '#ef4444', bg: darkMode ? '#450a0a' : '#fef2f2' },
                ].map((m, i) => (
                    <div key={i} style={{ background: m.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                            <span style={{ color: m.color, display: 'flex' }}>
                                {m.icono === 'box'     && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>}
                                {m.icono === 'layers'  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
                                {m.icono === 'warning' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
                                {m.icono === 'banned'  && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
                            </span>
                        </div>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: m.color, letterSpacing: '-1px' }}>{m.valor}</p>
                    </div>
                ))}
            </div>

            {/* Pestanas tipo Chrome */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '0', borderBottom: `2px solid ${s.border}`, marginBottom: '0' }}>
                {PESTANAS.map(t => {
                    const activa = pestanaActiva === t.id
                    const color = t.color || '#1a1a2e'
                    const esSinCat = t.id === 'sin_categoria'
                    const contadorAlerta = esSinCat && contadorPorPestana[t.id] > 0
                    return (
                        <button key={t.id} onClick={() => { setPestanaActiva(t.id); setBuscar('') }}
                            style={{ padding: '10px 20px', border: 'none', borderBottom: activa ? `2px solid ${color}` : '2px solid transparent', marginBottom: '-2px', background: activa ? s.surface : 'transparent', color: activa ? s.text : s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: activa ? '700' : '500', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}>
                            {!esSinCat && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, opacity: activa ? 1 : 0.4 }} />}
                            {t.label}
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '1px 7px', borderRadius: '10px', background: activa ? color : (contadorAlerta ? '#fee2e2' : s.border), color: activa ? 'white' : (contadorAlerta ? '#dc2626' : s.textMuted) }}>{contadorPorPestana[t.id]}</span>
                        </button>
                    )
                })}
            </div>

            {/* Buscador */}
            <div style={{ background: s.surface, borderRadius: '0 12px 0 0', border: `1px solid ${s.border}`, borderBottom: 'none', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: s.textFaint, display: 'flex' }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                    <input
                        placeholder="Buscar por nombre, marca, categoría o SKU..."
                        value={buscar}
                        onChange={e => setBuscar(e.target.value)}
                        style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surfaceLow, color: s.text, fontSize: '13px', boxSizing: 'border-box', outline: 'none' }}
                    />
                </div>
                <button onClick={cargarDatos} style={{ ...btnSecundario, padding: '10px 14px', fontSize: '12px' }}>↻ Actualizar</button>
            </div>

            {/* Vista agrupada: Marca → Categoría → Productos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {marcasOrdenadas.length === 0 ? (
                    <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, padding: '48px', textAlign: 'center', color: s.textMuted, fontSize: '14px' }}>
                        No hay productos que coincidan con la búsqueda.
                    </div>
                ) : marcasOrdenadas.map(marca => {
                    const expandida = marcasExpandidas[marca] === true
                    const catsPorMarca = porMarca[marca]
                    const totalStockMarca = Object.values(catsPorMarca).flat().reduce((acc, p) => acc + p.presentaciones.reduce((a, pr) => a + pr.stock, 0), 0)
                    const totalProdsMarca = Object.values(catsPorMarca).flat().length
                    const sinLabel = tipoActivo === 'con_calidad_especie' ? 'Sin Subcategoria' : 'Sin Categoria'
                    const catsOrdenadas = Object.keys(catsPorMarca).sort((a, b) => a === sinLabel ? 1 : b === sinLabel ? -1 : a.localeCompare(b))

                    return (
                        <div key={marca} style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

                            {/* Header marca */}
                            <div onClick={() => toggleMarca(marca)}
                                style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: darkMode ? '#1a2536' : '#f8fafc', borderBottom: expandida ? `1px solid ${s.border}` : 'none', userSelect: 'none' }}
                                onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                onMouseLeave={e => e.currentTarget.style.background = darkMode ? '#1a2536' : '#f8fafc'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>{marca.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '15px', fontWeight: '800', color: s.text, letterSpacing: '-0.3px' }}>{marca}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '1px' }}>
                                            {totalProdsMarca} producto{totalProdsMarca !== 1 ? 's' : ''} · {catsOrdenadas.length} categoría{catsOrdenadas.length !== 1 ? 's' : ''} · Stock total: {totalStockMarca}
                                        </p>
                                    </div>
                                </div>
                                <span style={{ color: s.textFaint, display: 'flex' }}>
                                    {expandida
                                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                                        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                                    }
                                </span>
                            </div>

                            {/* Categorías dentro de la marca */}
                            {expandida && catsOrdenadas.map((cat, catIdx) => (
                                <div key={cat} style={{ borderTop: catIdx > 0 ? `1px solid ${s.borderLight}` : 'none' }}>

                                    {/* Sub-header */}
                                    <div style={{ padding: '8px 20px 8px 72px', background: darkMode ? 'rgba(26,37,54,0.5)' : 'rgba(26,26,127,0.025)', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: `1px solid ${s.borderLight}` }}>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#3730a3', background: '#e0e7ff', padding: '2px 10px', borderRadius: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{cat}</span>
                                        <span style={{ fontSize: '11px', color: s.textFaint }}>{catsPorMarca[cat].length} producto{catsPorMarca[cat].length !== 1 ? 's' : ''}</span>
                                    </div>

                                    {/* Tabla de productos */}
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: s.tableTh }}>
                                                {(tipoActivo === 'con_calidad_especie'
                                                    ? ['Producto', 'SKU', 'Calidad', 'Especie', 'Presentaciones', 'Acciones']
                                                    : tipoActivo === 'con_especie'
                                                    ? ['Producto', 'SKU', 'Especie', 'Presentaciones', 'Acciones']
                                                    : ['Producto', 'SKU', 'Presentaciones', 'Acciones']
                                                ).map(h => (
                                                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catsPorMarca[cat].map(producto => {
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
                                                            <td style={{ padding: '14px 16px' }}>
                                                                <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{producto.nombre}</p>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                    <span style={{ fontSize: '11px', color: s.textFaint }}>Stock: {stockTotal}</span>
                                                                    {alertas > 0 && <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', background: darkMode ? '#450a0a' : '#fee2e2', padding: '1px 6px', borderRadius: '10px' }}>{alertas} bajo stock</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '14px 16px' }}>
                                                                {producto.sku
                                                                    ? <span style={{ fontSize: '11px', fontWeight: '700', fontFamily: 'monospace', padding: '3px 8px', borderRadius: '6px', background: darkMode ? '#1e3a5f' : '#eff6ff', color: darkMode ? '#93c5fd' : '#1d4ed8' }}>{producto.sku}</span>
                                                                    : <span style={{ fontSize: '11px', color: s.textFaint }}>—</span>}
                                                            </td>
                                                            {tipoActivo === 'con_calidad_especie' && (
                                                                <td style={{ padding: '14px 16px' }}>
                                                                    <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: '#e0e7ff', color: '#3730a3' }}>{formatearCalidad(producto.calidad)}</span>
                                                                </td>
                                                            )}
                                                            {(tipoActivo === 'con_calidad_especie' || tipoActivo === 'con_especie') && (
                                                                <td style={{ padding: '14px 16px' }}>
                                                                    {producto.especie ? (
                                                                        <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '10px', background: producto.especie === 'perro' ? (darkMode ? '#1e3a5f' : '#dbeafe') : producto.especie === 'gato' ? (darkMode ? '#2d1b4e' : '#ede9fe') : (darkMode ? '#1a2e1a' : '#dcfce7'), color: producto.especie === 'perro' ? '#2563eb' : producto.especie === 'gato' ? '#7c3aed' : '#16a34a' }}>
                                                                            {producto.especie === 'ambos' ? 'Perro/Gato' : producto.especie === 'otro' ? 'Otro' : producto.especie.charAt(0).toUpperCase() + producto.especie.slice(1)}
                                                                        </span>
                                                                    ) : <span style={{ fontSize: '11px', color: s.textFaint }}>—</span>}
                                                                </td>
                                                            )}
                                                            <td style={{ padding: '14px 16px' }}>
                                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                                    {producto.presentaciones.slice(0, 3).map(pr => (
                                                                        <span key={pr.id} style={{ fontSize: '10px', fontWeight: '600', padding: '2px 8px', borderRadius: '6px', background: s.surfaceLow, color: pr.stock <= 3 ? '#ef4444' : s.textMuted, border: `1px solid ${pr.stock <= 3 ? '#fca5a5' : s.border}` }}>
                                                                            {pr.nombre}
                                                                        </span>
                                                                    ))}
                                                                    {producto.presentaciones.length > 3 && <span style={{ fontSize: '10px', color: s.textFaint }}>+{producto.presentaciones.length - 3}</span>}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                                    <button onClick={e => { e.stopPropagation(); handleToggleDisponibleProducto(producto) }}
                                                                        style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${producto.disponible ? s.border : '#fca5a5'}`, background: producto.disponible ? 'transparent' : (darkMode ? '#450a0a' : '#fef2f2'), color: producto.disponible ? s.textMuted : '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                                                        {producto.disponible ? 'Activo' : 'Inactivo'}
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); abrirModalEditar(producto) }}
                                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                                        Editar
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); handleEliminarProducto(producto) }}
                                                                        style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #fca5a5', background: darkMode ? '#450a0a' : '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                                    </button>
                                                                    <span style={{ color: s.textFaint, display: 'flex', alignItems: 'center' }}>
                                                                        {expandido
                                                                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                                                                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {expandido && (
                                                            <tr key={`${producto.id}-expand`}>
                                                                <td colSpan={tipoActivo === 'con_calidad_especie' ? 6 : tipoActivo === 'con_especie' ? 5 : 4} style={{ padding: '0', background: s.surfaceLow, borderBottom: `1px solid ${s.border}` }}>
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
                                                                                    {['Nombre', 'Cod. Barras', 'P. Compra', 'P. Venta', 'Descuento', 'Margen', 'Stock', 'Vencimiento', 'Acciones'].map(h => (
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
                                                                                                {pr.codigo_barras ? <span style={{ fontSize: '11px', fontFamily: 'monospace', color: s.text }}>{pr.codigo_barras}</span> : <span style={{ fontSize: '11px', color: s.textFaint }}>—</span>}
                                                                                            </td>
                                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: s.textMuted }}>{pr.precio_compra ? `Gs. ${pr.precio_compra.toLocaleString()}` : '—'}</td>
                                                                                            <td style={{ padding: '10px 12px', fontSize: '12px', color: s.text }}>
                                                                                                {conDescuento ? (
                                                                                                    <span>
                                                                                                        <span style={{ textDecoration: 'line-through', color: s.textFaint, fontSize: '11px' }}>Gs. {pr.precio_venta.toLocaleString()}</span>
                                                                                                        <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: '700' }}>Gs. {precio.toLocaleString()}</span>
                                                                                                        <span style={{ marginLeft: '4px', fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '1px 5px', borderRadius: '8px', fontWeight: '700' }}>%</span>
                                                                                                    </span>
                                                                                                ) : `Gs. ${(pr.precio_venta || 0).toLocaleString()}`}
                                                                                            </td>
                                                                                            <td style={{ padding: '10px 12px', fontSize: '12px' }}>
                                                                                                {pr.descuento_activo && pr.precio_descuento ? <span style={{ color: '#10b981', fontWeight: '600' }}>Activo hasta {new Date(pr.descuento_hasta).toLocaleDateString('es-PY')}</span> : <span style={{ color: s.textFaint }}>—</span>}
                                                                                            </td>
                                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                                {mg !== null ? (
                                                                                                    <div>
                                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: mg.markup >= 20 ? '#10b981' : mg.markup >= 10 ? '#f59e0b' : '#ef4444' }}>{mg.markup}%</span>
                                                                                                            <div style={{ width: '40px', height: '4px', background: s.border, borderRadius: '2px', overflow: 'hidden' }}>
                                                                                                                <div style={{ width: `${Math.min(mg.markup, 100)}%`, height: '100%', background: mg.markup >= 20 ? '#10b981' : mg.markup >= 10 ? '#f59e0b' : '#ef4444', borderRadius: '2px' }} />
                                                                                                            </div>
                                                                                                            <span style={{ fontSize: '10px', color: s.textFaint }}>ganancia</span>
                                                                                                        </div>
                                                                                                        <div style={{ fontSize: '10px', color: s.textFaint }}>{mg.margenVenta}% venta</div>
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
                                                                                                {(() => {
                                                                                                    if (!pr.fecha_vencimiento_proxima) return <span style={{ color: s.textFaint, fontSize: '11px' }}>—</span>
                                                                                                    const dias = Math.ceil((new Date(pr.fecha_vencimiento_proxima) - new Date()) / (1000 * 60 * 60 * 24))
                                                                                                    const color = dias < 0 ? '#ef4444' : dias <= 7 ? '#ef4444' : dias <= 30 ? '#f59e0b' : '#10b981'
                                                                                                    const count = parseInt(pr.lotes_con_vencimiento) || 0
                                                                                                    return (
                                                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                                                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px', background: `${color}20`, color, whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                                                                                {dias < 0 ? 'Vencido' : dias === 0 ? 'Hoy' : `${dias}d`}
                                                                                                            </span>
                                                                                                            {count > 1 && <span style={{ fontSize: '10px', color: s.textFaint }}>{count} lotes</span>}
                                                                                                        </div>
                                                                                                    )
                                                                                                })()}
                                                                                            </td>
                                                                                            <td style={{ padding: '10px 12px' }}>
                                                                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                                                                    <button onClick={() => { setNuevoStockValor(String(pr.stock)); setModalStock({ id: pr.id, nombre: pr.nombre, stockActual: pr.stock }) }} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Stock</button>
                                                                                                    <button onClick={() => abrirModalPrecio(pr)} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Precio</button>
                                                                                                    <button onClick={() => abrirModalCodigoBarras(pr)} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Cod.</button>
                                                                                                    <button onClick={() => abrirModalLotes(pr)} style={{ padding: '5px 8px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Lotes</button>
                                                                                                    <button onClick={() => abrirModalFraccionar(producto, pr)} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #c4b5fd', background: '#f5f3ff', color: '#6d28d9', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>Fraccionar</button>
                                                                                                    <button onClick={e => { e.stopPropagation(); handleEliminarPresentacion(pr, producto) }} style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>
                                                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                                                                                    </button>
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
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '12px', color: s.textFaint }}>Mostrando <strong style={{ color: s.text }}>{productosFiltrados.length}</strong> de <strong style={{ color: s.text }}>{productos.length}</strong> productos</p>
                <p style={{ fontSize: '12px', color: s.textFaint }}>{totalPresentaciones} presentaciones en total</p>
            </div>

            {/* ===== MODALES ===== */}

            {modalSecciones && (
                <Modal s={s}>
                    <div style={{ width: '460px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Secciones de inventario</h3>
                                <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>Las secciones son las pestañas principales del inventario.</p>
                            </div>
                            <button onClick={() => { setModalSecciones(false); setEditandoSeccion(null) }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>

                        {/* Crear nueva seccion */}
                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                            <label style={labelStyle}>Nueva sección</label>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    value={nuevaSeccion.nombre}
                                    onChange={e => setNuevaSeccion({ ...nuevaSeccion, nombre: e.target.value })}
                                    placeholder="Ej: Reptiles, Aves, Peces..."
                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                />
                                <input
                                    type="color"
                                    value={nuevaSeccion.color}
                                    onChange={e => setNuevaSeccion({ ...nuevaSeccion, color: e.target.value })}
                                    title="Color de la sección"
                                    style={{ width: '42px', height: '42px', borderRadius: '8px', border: `1px solid ${s.border}`, padding: '2px', cursor: 'pointer', background: 'none', flexShrink: 0 }}
                                />
                            </div>
                            <label style={labelStyle}>Comportamiento</label>
                            <select value={nuevaSeccion.tipo} onChange={e => setNuevaSeccion({ ...nuevaSeccion, tipo: e.target.value })} style={{ ...inputStyle, marginBottom: '8px' }}>
                                <option value="generico">Genérico — solo categoría (como Medicamentos)</option>
                                <option value="con_especie">Con especie — categoría + especie (como Accesorios)</option>
                                <option value="con_calidad_especie">Con calidad y especie — subcategoría + calidad + especie (como Balanceados)</option>
                            </select>
                            {nuevaSeccion.nombre && (
                                <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '8px' }}>
                                    Slug: <strong style={{ color: s.text, fontFamily: 'monospace' }}>{toSlug(nuevaSeccion.nombre)}</strong>
                                </p>
                            )}
                            <button onClick={handleCrearSeccion} disabled={!nuevaSeccion.nombre.trim()} style={{ ...btnPrimario, width: '100%', justifyContent: 'center', opacity: nuevaSeccion.nombre.trim() ? 1 : 0.5 }}>
                                + Agregar sección
                            </button>
                        </div>

                        {/* Lista de secciones */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {secciones.map(sec => (
                                <div key={sec.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {editandoSeccion?.id === sec.id ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input
                                                    value={editandoSeccion.nombre}
                                                    onChange={e => setEditandoSeccion({ ...editandoSeccion, nombre: e.target.value })}
                                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                                />
                                                <input
                                                    type="color"
                                                    value={editandoSeccion.color}
                                                    onChange={e => setEditandoSeccion({ ...editandoSeccion, color: e.target.value })}
                                                    style={{ width: '38px', height: '38px', borderRadius: '8px', border: `1px solid ${s.border}`, padding: '2px', cursor: 'pointer', background: 'none', flexShrink: 0 }}
                                                />
                                            </div>
                                            <select value={editandoSeccion.tipo} onChange={e => setEditandoSeccion({ ...editandoSeccion, tipo: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }}>
                                                <option value="generico">Genérico (como Medicamentos)</option>
                                                <option value="con_especie">Con especie (como Accesorios)</option>
                                                <option value="con_calidad_especie">Con calidad y especie (como Balanceados)</option>
                                            </select>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleEditarSeccion(editandoSeccion)} style={{ ...btnPrimario, padding: '8px 12px', fontSize: '12px', flex: 1, justifyContent: 'center' }}>Guardar</button>
                                                <button onClick={() => setEditandoSeccion(null)} style={{ ...btnSecundario, padding: '8px 10px', fontSize: '12px' }}>✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: sec.color, flexShrink: 0, border: `2px solid ${sec.color}40` }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '13px', fontWeight: '600', color: s.text, margin: 0 }}>{sec.nombre}</p>
                                                <p style={{ fontSize: '11px', color: s.textFaint, margin: 0, fontFamily: 'monospace' }}>{sec.slug} · {contadorPorPestana[sec.slug] || 0} productos</p>
                                            </div>
                                            <button onClick={() => setEditandoSeccion({ ...sec })} style={{ ...btnSecundario, padding: '5px 10px', fontSize: '12px' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onClick={() => handleEliminarSeccion(sec)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

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
                                    <button onClick={() => handleEliminarMarca(marca)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {modalProducto && (
                <Modal s={s}>
                    <div style={{ width: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Nuevo producto</h3>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px', background: nuevoProducto.seccion_inventario ? '#1a1a2e' : '#dc2626', color: 'white', textTransform: 'uppercase' }}>{nuevoProducto.seccion_inventario || 'Sin categoria'}</span>
                        </div>
                        {!nuevoProducto.seccion_inventario && (
                            <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: darkMode ? '#450a0a' : '#fef2f2', border: '1px solid #fca5a5' }}>
                                <label style={{ ...labelStyle, color: '#dc2626', marginBottom: '8px' }}>Categoria del producto</label>
                                <select value={nuevoProducto.seccion_inventario} onChange={e => setNuevoProducto({ ...nuevoProducto, seccion_inventario: e.target.value })} style={{ ...inputStyle, marginBottom: 0, borderColor: '#fca5a5' }}>
                                    <option value="">-- Seleccionar --</option>
                                    {secciones.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                                </select>
                            </div>
                        )}
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

                        {/* Campos especificos por tipo de seccion */}
                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_calidad_especie' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    <div>
                                        <label style={labelStyle}>Calidad</label>
                                        <select value={nuevoProducto.calidad} onChange={e => setNuevoProducto({ ...nuevoProducto, calidad: e.target.value })} style={inputStyle}>
                                            <option value="standard">Standard</option>
                                            <option value="premium">Premium</option>
                                            <option value="premium_special">Premium Special</option>
                                            <option value="super_premium">Super Premium</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Especie</label>
                                        <select value={nuevoProducto.especie} onChange={e => setNuevoProducto({ ...nuevoProducto, especie: e.target.value })} style={inputStyle}>
                                            <option value="">Sin especificar</option>
                                            <option value="perro">Perro</option>
                                            <option value="gato">Gato</option>
                                            <option value="ambos">Perro y Gato</option>
                                        </select>
                                    </div>
                                </div>
                                <label style={labelStyle}>Subcategoria (tamaño)</label>
                                <select value={nuevoProducto.subcategoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, subcategoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin subcategoria</option>
                                    {subcatsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(sub => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                                </select>
                            </>
                        )}

                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_especie' && (
                            <>
                                <label style={labelStyle}>Categoria</label>
                                <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin categoria</option>
                                    {catsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    <div>
                                        <label style={labelStyle}>Especie</label>
                                        <select value={nuevoProducto.especie} onChange={e => setNuevoProducto({ ...nuevoProducto, especie: e.target.value })} style={inputStyle}>
                                            <option value="">Sin especificar</option>
                                            <option value="perro">Perro</option>
                                            <option value="gato">Gato</option>
                                            <option value="ambos">Perro y Gato</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Tamaño</label>
                                        <select value={nuevoProducto.subcategoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, subcategoria_id: e.target.value })} style={inputStyle}>
                                            <option value="">Sin tamaño</option>
                                            {subcatsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(sub => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'generico' && (nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) && (
                            <>
                                <label style={labelStyle}>Categoría</label>
                                <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin categoría</option>
                                    {catsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalProducto(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearProducto} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.6 : 1 }}>{guardando ? 'Creando...' : 'Crear producto'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalEditarProducto && (
                <Modal s={s}>
                    <div style={{ width: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Editar producto</h3>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '10px', background: editarForm.seccion_inventario ? '#1a1a2e' : '#dc2626', color: 'white', textTransform: 'uppercase' }}>{editarForm.seccion_inventario || 'Sin categoria'}</span>
                        </div>
                        {!editarForm.seccion_inventario && (
                            <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: darkMode ? '#450a0a' : '#fef2f2', border: '1px solid #fca5a5' }}>
                                <label style={{ ...labelStyle, color: '#dc2626', marginBottom: '8px' }}>Asignar categoria del producto</label>
                                <select value={editarForm.seccion_inventario} onChange={e => setEditarForm({ ...editarForm, seccion_inventario: e.target.value })} style={{ ...inputStyle, marginBottom: 0, borderColor: '#fca5a5' }}>
                                    <option value="">-- Seleccionar --</option>
                                    {secciones.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                                </select>
                            </div>
                        )}
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

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_calidad_especie' && (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    <div>
                                        <label style={labelStyle}>Calidad</label>
                                        <select value={editarForm.calidad} onChange={e => setEditarForm({ ...editarForm, calidad: e.target.value })} style={inputStyle}>
                                            <option value="standard">Standard</option>
                                            <option value="premium">Premium</option>
                                            <option value="premium_special">Premium Special</option>
                                            <option value="super_premium">Super Premium</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Especie</label>
                                        <select value={editarForm.especie} onChange={e => setEditarForm({ ...editarForm, especie: e.target.value })} style={inputStyle}>
                                            <option value="">Sin especificar</option>
                                            <option value="perro">Perro</option>
                                            <option value="gato">Gato</option>
                                            <option value="ambos">Perro y Gato</option>
                                        </select>
                                    </div>
                                </div>
                                <label style={labelStyle}>Subcategoria (tamaño)</label>
                                <select value={editarForm.subcategoria_id} onChange={e => setEditarForm({ ...editarForm, subcategoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin subcategoria</option>
                                    {subcatsPara(editarForm.seccion_inventario).map(sub => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                                </select>
                            </>
                        )}

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_especie' && (
                            <>
                                <label style={labelStyle}>Categoria</label>
                                <select value={editarForm.categoria_id} onChange={e => setEditarForm({ ...editarForm, categoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin categoria</option>
                                    {catsPara(editarForm.seccion_inventario).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                                    <div>
                                        <label style={labelStyle}>Especie</label>
                                        <select value={editarForm.especie} onChange={e => setEditarForm({ ...editarForm, especie: e.target.value })} style={inputStyle}>
                                            <option value="">Sin especificar</option>
                                            <option value="perro">Perro</option>
                                            <option value="gato">Gato</option>
                                            <option value="ambos">Perro y Gato</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Tamaño</label>
                                        <select value={editarForm.subcategoria_id} onChange={e => setEditarForm({ ...editarForm, subcategoria_id: e.target.value })} style={inputStyle}>
                                            <option value="">Sin tamaño</option>
                                            {subcatsPara(editarForm.seccion_inventario).map(sub => <option key={sub.id} value={sub.id}>{sub.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </>
                        )}

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'generico' && (editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) && (
                            <>
                                <label style={labelStyle}>Categoría</label>
                                <select value={editarForm.categoria_id} onChange={e => setEditarForm({ ...editarForm, categoria_id: e.target.value })} style={inputStyle}>
                                    <option value="">Sin categoría</option>
                                    {catsPara(editarForm.seccion_inventario || pestanaActiva).map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </>
                        )}

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
                        <input type="text" inputMode="numeric" placeholder="Ej: 50.000" value={formatMiles(nuevaPresentacion.precio_compra)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_compra: parseMiles(e.target.value) })} style={inputStyle} />
                        <label style={labelStyle}>Precio efectivo / transferencia (Gs.)</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 75.000" value={formatMiles(nuevaPresentacion.precio_venta)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_venta: parseMiles(e.target.value) })} style={inputStyle} />
                        <label style={labelStyle}>Precio tarjeta (Gs.)</label>
                        <input type="text" inputMode="numeric" placeholder="Dejar vacío si es igual al efectivo" value={formatMiles(nuevaPresentacion.precio_tarjeta)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_tarjeta: parseMiles(e.target.value) })} style={inputStyle} />
                        {nuevaPresentacion.precio_venta && nuevaPresentacion.precio_tarjeta && parseInt(nuevaPresentacion.precio_tarjeta) > parseInt(nuevaPresentacion.precio_venta) && (
                            <div style={{ padding: '8px 12px', background: darkMode ? '#1e3a5f' : '#eff6ff', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#1d4ed8', fontWeight: '600' }}>
                                Recargo tarjeta: {((parseInt(nuevaPresentacion.precio_tarjeta) - parseInt(nuevaPresentacion.precio_venta)) / parseInt(nuevaPresentacion.precio_venta) * 100).toFixed(2)}%
                            </div>
                        )}
                        {nuevaPresentacion.precio_compra && nuevaPresentacion.precio_venta && (
                            <div style={{ padding: '8px 12px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '8px', marginBottom: '12px', fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                                {(() => {
                                    const c = parseInt(nuevaPresentacion.precio_compra), v = parseInt(nuevaPresentacion.precio_venta)
                                    const t = nuevaPresentacion.precio_tarjeta ? parseInt(nuevaPresentacion.precio_tarjeta) : null
                                    return (
                                        <>
                                            <span>Ef. — M. ganancia: {Math.round(((v-c)/c)*100)}% · M. venta: {Math.round(((v-c)/v)*100)}%</span>
                                            {t > 0 && <span style={{ display: 'block', marginTop: '2px' }}>Tarjeta — M. ganancia: {Math.round(((t-c)/c)*100)}% · M. venta: {Math.round(((t-c)/t)*100)}%</span>}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                        <label style={labelStyle}>Stock inicial</label>
                        <input type="number" value={nuevaPresentacion.stock} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, stock: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Codigo de barras (opcional)</label>
                        <input value={nuevaPresentacion.codigo_barras} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, codigo_barras: e.target.value })} placeholder="Escanea o ingresa manualmente" style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPresentacion(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={() => handleAgregarPresentacion(modalPresentacion)} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.6 : 1 }}>{guardando ? 'Agregando...' : 'Agregar'}</button>
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
                            <div><label style={labelStyle}>P. compra (Gs.)</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_compra)} onChange={e => setPrecioForm({ ...precioForm, precio_compra: parseMiles(e.target.value) })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                            <div><label style={labelStyle}>P. efectivo / transferencia (Gs.)</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_venta)} onChange={e => setPrecioForm({ ...precioForm, precio_venta: parseMiles(e.target.value) })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>P. tarjeta (Gs.)</label>
                            <input type="text" inputMode="numeric" placeholder="Dejar vacío si es igual al precio efectivo" value={formatMiles(precioForm.precio_tarjeta)} onChange={e => setPrecioForm({ ...precioForm, precio_tarjeta: parseMiles(e.target.value) })} style={{ ...inputStyle, marginBottom: 0 }} />
                        </div>
                        {precioForm.precio_venta && precioForm.precio_tarjeta && parseInt(precioForm.precio_tarjeta) > parseInt(precioForm.precio_venta) && (
                            <div style={{ padding: '10px 14px', background: darkMode ? '#1e3a5f' : '#eff6ff', borderRadius: '8px', marginBottom: '8px', fontSize: '12px', color: '#1d4ed8', fontWeight: '600' }}>
                                Recargo tarjeta: {((parseInt(precioForm.precio_tarjeta) - parseInt(precioForm.precio_venta)) / parseInt(precioForm.precio_venta) * 100).toFixed(2)}% · Diferencia: Gs. {(parseInt(precioForm.precio_tarjeta) - parseInt(precioForm.precio_venta)).toLocaleString()}
                            </div>
                        )}
                        {precioForm.precio_compra && precioForm.precio_venta && (
                            <div style={{ padding: '10px 14px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#166534', fontWeight: '600' }}>
                                {(() => {
                                    const costo = parseInt(precioForm.precio_compra)
                                    const venta = parseInt(precioForm.precio_venta)
                                    const ganancia = venta - costo
                                    const markupEf = Math.round((ganancia / costo) * 100)
                                    const margenEf = Math.round((ganancia / venta) * 100)
                                    const tarjeta = precioForm.precio_tarjeta ? parseInt(precioForm.precio_tarjeta) : null
                                    return (
                                        <>
                                            <span>Efectivo — Ganancia: Gs. {ganancia.toLocaleString()} · M. ganancia: {markupEf}% · M. venta: {margenEf}%</span>
                                            {tarjeta > 0 && (
                                                <span style={{ display: 'block', marginTop: '4px', color: '#1d6b14' }}>
                                                    Tarjeta — Ganancia: Gs. {(tarjeta - costo).toLocaleString()} · M. ganancia: {Math.round(((tarjeta - costo) / costo) * 100)}% · M. venta: {Math.round(((tarjeta - costo) / tarjeta) * 100)}%
                                                </span>
                                            )}
                                        </>
                                    )
                                })()}
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
                                            <div><label style={labelStyle}>P. compra descuento</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_compra_descuento || '')} onChange={e => setPrecioForm({ ...precioForm, precio_compra_descuento: parseMiles(e.target.value) })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                            <div><label style={labelStyle}>P. venta descuento</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_descuento)} onChange={e => setPrecioForm({ ...precioForm, precio_descuento: parseMiles(e.target.value) })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
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

            {modalSubcategorias && (
                <Modal s={s}>
                    <div style={{ width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Subcategorias — {pestanaActiva}</h3>
                                <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>
                                    {tipoActivo === 'con_calidad_especie' ? 'Mini, Maxi, Cachorro, Senior...' : tipoActivo === 'con_especie' ? 'XS, S, M, L, XL...' : 'Tamaños o variantes'}
                                </p>
                            </div>
                            <button onClick={() => { setModalSubcategorias(false); setEditandoSubcategoria(null) }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
                            <label style={labelStyle}>Nueva subcategoria</label>
                            <input placeholder="Nombre" value={nuevaSubcategoria.nombre} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, nombre: e.target.value })} style={inputStyle} />
                            <input placeholder="Descripción (opcional)" value={nuevaSubcategoria.descripcion} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, descripcion: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                            <button onClick={handleCrearSubcategoria} style={{ ...btnPrimario, marginTop: '12px', width: '100%', justifyContent: 'center' }}>+ Agregar subcategoria</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {subcategoriasPestana.map(sub => (
                                <div key={sub.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {editandoSubcategoria === sub.id ? (
                                        <>
                                            <input defaultValue={sub.nombre} id={`sub-edit-${sub.id}`} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                                            <button onClick={() => handleEditarSubcategoria(sub.id, { nombre: document.getElementById(`sub-edit-${sub.id}`).value })} style={{ ...btnPrimario, padding: '6px 12px' }}>Guardar</button>
                                            <button onClick={() => setEditandoSubcategoria(null)} style={{ ...btnSecundario, padding: '6px 12px' }}>Cancelar</button>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '13px', fontWeight: '500', color: s.text }}>{sub.nombre}</p>
                                                {sub.descripcion && <p style={{ fontSize: '11px', color: s.textMuted }}>{sub.descripcion}</p>}
                                            </div>
                                            <button onClick={() => setEditandoSubcategoria(sub.id)} style={{ ...btnSecundario, padding: '4px 10px', fontSize: '12px' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onClick={() => handleEliminarSubcategoria(sub)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                            {subcategoriasPestana.length === 0 && (
                                <p style={{ textAlign: 'center', padding: '24px', color: s.textMuted, fontSize: '13px' }}>No hay subcategorias para {pestanaActiva} aún.</p>
                            )}
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
                            <input placeholder="Descripción (opcional)" value={nuevaCategoria.descripcion} onChange={e => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })} style={inputStyle} />
                            <label style={labelStyle}>Sección</label>
                            <select value={nuevaCategoria.seccion} onChange={e => setNuevaCategoria({ ...nuevaCategoria, seccion: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }}>
                                <option value="">General (todas las secciones)</option>
                                {secciones.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                            </select>
                            <button onClick={handleCrearCategoria} style={{ ...btnPrimario, marginTop: '12px', width: '100%', justifyContent: 'center' }}>+ Agregar categoría</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {categorias.map(cat => {
                                const seccionColor = cat.seccion === 'balanceados' ? { bg: '#e0e7ff', color: '#3730a3' } : cat.seccion === 'accesorios' ? { bg: '#dcfce7', color: '#166534' } : cat.seccion === 'medicamentos' ? { bg: '#fce7f3', color: '#9d174d' } : { bg: s.border, color: s.textMuted }
                                const seccionLabel = cat.seccion ? cat.seccion.charAt(0).toUpperCase() + cat.seccion.slice(1) : 'General'
                                return (
                                <div key={cat.id} style={{ padding: '10px 12px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {editandoCategoria === cat.id ? (
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <input defaultValue={cat.nombre} id={`cat-edit-${cat.id}`} style={{ ...inputStyle, marginBottom: 0 }} />
                                            <select defaultValue={cat.seccion || ''} id={`cat-edit-seccion-${cat.id}`} style={{ ...inputStyle, marginBottom: 0 }}>
                                                <option value="">General (todas las secciones)</option>
                                                {secciones.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                                            </select>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => handleEditarCategoria(cat.id, { nombre: document.getElementById(`cat-edit-${cat.id}`).value, seccion: document.getElementById(`cat-edit-seccion-${cat.id}`).value || null })} style={{ ...btnPrimario, padding: '6px 12px', flex: 1, justifyContent: 'center' }}>Guardar</button>
                                                <button onClick={() => setEditandoCategoria(null)} style={{ ...btnSecundario, padding: '6px 12px' }}>Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <p style={{ fontSize: '13px', fontWeight: '500', color: s.text }}>{cat.nombre}</p>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 7px', borderRadius: '10px', background: seccionColor.bg, color: seccionColor.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{seccionLabel}</span>
                                                </div>
                                                {cat.descripcion && <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>{cat.descripcion}</p>}
                                            </div>
                                            <button onClick={() => setEditandoCategoria(cat.id)} style={{ ...btnSecundario, padding: '4px 10px', fontSize: '12px' }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                            </button>
                                            <button onClick={() => handleEliminarCategoria(cat)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                                        </>
                                    )}
                                </div>
                                )
                            })}
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
                                <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.35 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
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
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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

            {modalFraccionar && (() => {
                const pr = modalFraccionar.presentacion
                const producto = modalFraccionar.producto
                const otrasPresent = producto.presentaciones.filter(p => p.id !== pr.id)
                const cantOrigen = parseInt(fraccionForm.cantidad_origen) || 0
                const cantDestino = parseInt(fraccionForm.cantidad_destino) || 0
                const destino = otrasPresent.find(p => p.id === parseInt(fraccionForm.presentacion_destino_id))
                const modoNueva = fraccionForm.modo_destino === 'nueva'
                const btnDisabled = fraccionando || cantOrigen > pr.stock || !cantOrigen || !cantDestino ||
                    (modoNueva ? !fraccionForm.nombre_nuevo.trim() : !fraccionForm.presentacion_destino_id)
                return (
                    <Modal s={s} zIndex={2000}>
                        <div style={{ width: '500px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Fraccionar stock</h3>
                                <button onClick={() => setModalFraccionar(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                            </div>
                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#6d28d9', marginBottom: '18px' }}>{producto.nombre}</p>

                            {/* Origen */}
                            <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Origen — {pr.nombre}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', color: s.textMuted }}>Stock disponible: <strong style={{ color: s.text }}>{pr.stock}</strong></span>
                                    {cantOrigen > 0 && <span style={{ fontSize: '12px', color: s.textMuted }}>Quedará: <strong style={{ color: cantOrigen > pr.stock ? '#ef4444' : '#10b981' }}>{pr.stock - cantOrigen >= 0 ? pr.stock - cantOrigen : '—'}</strong></span>}
                                </div>
                                <label style={labelStyle}>Cantidad a fraccionar</label>
                                <input
                                    type="number" min="1" max={pr.stock}
                                    value={fraccionForm.cantidad_origen}
                                    onChange={e => setFraccionForm({ ...fraccionForm, cantidad_origen: e.target.value })}
                                    placeholder={`Máx. ${pr.stock}`}
                                    style={{ ...inputStyle, marginBottom: 0, borderColor: cantOrigen > pr.stock ? '#ef4444' : s.border }}
                                />
                                {cantOrigen > pr.stock && <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>Stock insuficiente</p>}
                            </div>

                            {/* Destino */}
                            <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '14px 16px', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto fraccionado</p>
                                    {/* Toggle existente / nueva */}
                                    <div style={{ display: 'flex', borderRadius: '8px', border: `1px solid ${s.border}`, overflow: 'hidden', fontSize: '11px', fontWeight: '600' }}>
                                        <button onClick={() => setFraccionForm({ ...fraccionForm, modo_destino: 'existente', nombre_nuevo: '' })}
                                            style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', background: !modoNueva ? '#6d28d9' : s.surface, color: !modoNueva ? 'white' : s.textMuted }}>
                                            Existente
                                        </button>
                                        <button onClick={() => setFraccionForm({ ...fraccionForm, modo_destino: 'nueva', presentacion_destino_id: '' })}
                                            style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', background: modoNueva ? '#6d28d9' : s.surface, color: modoNueva ? 'white' : s.textMuted }}>
                                            Nueva presentación
                                        </button>
                                    </div>
                                </div>

                                {modoNueva ? (
                                    <>
                                        <label style={labelStyle}>Nombre de la presentación fraccionada</label>
                                        <input
                                            value={fraccionForm.nombre_nuevo}
                                            onChange={e => setFraccionForm({ ...fraccionForm, nombre_nuevo: e.target.value })}
                                            placeholder="Ej: Bolsa 1kg"
                                            style={{ ...inputStyle }}
                                        />
                                    </>
                                ) : otrasPresent.length === 0 ? (
                                    <p style={{ fontSize: '12.5px', color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', marginBottom: '10px' }}>
                                        Este producto no tiene otras presentaciones. Usá "Nueva presentación" para crear una al fraccionar.
                                    </p>
                                ) : (
                                    <>
                                        <label style={labelStyle}>Presentación destino</label>
                                        <select
                                            value={fraccionForm.presentacion_destino_id}
                                            onChange={e => setFraccionForm({ ...fraccionForm, presentacion_destino_id: e.target.value })}
                                            style={{ ...inputStyle, marginBottom: '10px' }}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {otrasPresent.map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre} (stock: {p.stock})</option>
                                            ))}
                                        </select>
                                        {destino && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontSize: '12px', color: s.textMuted }}>Stock después:</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{destino.stock + cantDestino}</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <label style={labelStyle}>Cantidad resultante</label>
                                <input
                                    type="number" min="1"
                                    value={fraccionForm.cantidad_destino}
                                    onChange={e => setFraccionForm({ ...fraccionForm, cantidad_destino: e.target.value })}
                                    placeholder="Unidades que se generan"
                                    style={{ ...inputStyle, marginBottom: '10px' }}
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={labelStyle}>Precio compra {modoNueva ? '' : '(opcional)'}</label>
                                        <input
                                            type="number" min="0"
                                            value={fraccionForm.precio_compra}
                                            onChange={e => setFraccionForm({ ...fraccionForm, precio_compra: e.target.value })}
                                            placeholder="Gs. 0"
                                            style={{ ...inputStyle, marginBottom: 0 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Precio venta {modoNueva ? '' : '(opcional)'}</label>
                                        <input
                                            type="number" min="0"
                                            value={fraccionForm.precio_venta}
                                            onChange={e => setFraccionForm({ ...fraccionForm, precio_venta: e.target.value })}
                                            placeholder="Gs. 0"
                                            style={{ ...inputStyle, marginBottom: 0 }}
                                        />
                                    </div>
                                </div>
                                {cantOrigen > 0 && cantDestino > 0 && fraccionForm.precio_venta && (
                                    <p style={{ fontSize: '11px', color: '#10b981', marginTop: '8px', fontWeight: '600' }}>
                                        Total fraccionado: Gs. {(cantDestino * parseInt(fraccionForm.precio_venta || 0)).toLocaleString('es-PY')}
                                        {pr.precio_venta && ` (original: Gs. ${(cantOrigen * pr.precio_venta).toLocaleString('es-PY')})`}
                                    </p>
                                )}
                            </div>

                            {/* Nota */}
                            <label style={labelStyle}>Nota (opcional)</label>
                            <input
                                value={fraccionForm.nota}
                                onChange={e => setFraccionForm({ ...fraccionForm, nota: e.target.value })}
                                placeholder="Ej: Bolsa 15kg → 15 bolsas 1kg"
                                style={{ ...inputStyle }}
                            />

                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button onClick={() => setModalFraccionar(null)} style={btnSecundario}>Cancelar</button>
                                <button
                                    onClick={handleConfirmarFraccion}
                                    disabled={btnDisabled}
                                    style={{ ...btnPrimario, background: '#6d28d9', opacity: btnDisabled ? 0.6 : 1, cursor: btnDisabled ? 'not-allowed' : 'pointer' }}
                                >
                                    {fraccionando ? 'Fraccionando...' : 'Confirmar fraccionamiento'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            })()}

            {confirmEliminarSubcategoria && (
                <Modal s={s} zIndex={1100}>
                    <div style={{ width: '400px' }}>
                        <h3 style={{ marginBottom: '12px', color: confirmEliminarSubcategoria.cantidad > 0 ? '#ef4444' : s.text }}>
                            {confirmEliminarSubcategoria.cantidad > 0 ? 'Atención' : 'Eliminar subcategoria'}
                        </h3>
                        {confirmEliminarSubcategoria.cantidad > 0 ? (
                            <>
                                <p style={{ fontSize: '13px', marginBottom: '12px', color: s.text }}>La subcategoria <strong>{confirmEliminarSubcategoria.nombre}</strong> tiene <strong>{confirmEliminarSubcategoria.cantidad}</strong> productos asociados.</p>
                                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#991b1b' }}>Eliminar esta subcategoria desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p style={{ fontSize: '13px', marginBottom: '16px', color: s.text }}>¿Eliminar la subcategoria <strong>{confirmEliminarSubcategoria.nombre}</strong>?</p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmEliminarSubcategoria(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarSubcategoria} style={{ ...btnPrimario, background: '#ef4444' }}>Eliminar igual</button>
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
        {/* Modal importar Excel */}
        {modalImportar && (
            <Modal s={s} zIndex={3000}>
                <div style={{ width: '720px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text, marginBottom: '2px' }}>
                                {importResultado ? 'Importación completada' : 'Vista previa de importación'}
                            </h3>
                            <p style={{ fontSize: '12px', color: s.textMuted }}>
                                {importResultado
                                    ? `${importResultado.creados} productos nuevos · ${importResultado.actualizados} presentaciones cargadas · ${importResultado.errores.length} errores`
                                    : `${modalImportar.filas.length} filas detectadas`}
                            </p>
                        </div>
                        <button onClick={() => { setModalImportar(null); setImportResultado(null) }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                    </div>

                    {importResultado ? (
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                {(importResultado.modo === 'stock' ? [
                                    { label: 'Presentaciones actualizadas', val: importResultado.actualizados, color: '#10b981' },
                                    { label: 'Lotes creados', val: importResultado.lotesCreados, color: '#3b82f6' },
                                    { label: 'Errores', val: importResultado.errores.length, color: importResultado.errores.length > 0 ? '#ef4444' : s.textMuted },
                                ] : [
                                    { label: 'Productos nuevos', val: importResultado.creados, color: '#10b981' },
                                    { label: 'Presentaciones', val: importResultado.actualizados, color: '#3b82f6' },
                                    { label: 'Errores', val: importResultado.errores.length, color: importResultado.errores.length > 0 ? '#ef4444' : s.textMuted },
                                ]).map(k => (
                                    <div key={k.label} style={{ padding: '14px', borderRadius: '10px', background: s.surfaceLow, textAlign: 'center', border: `1px solid ${s.border}` }}>
                                        <p style={{ fontSize: '24px', fontWeight: '800', color: k.color }}>{k.val}</p>
                                        <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '4px' }}>{k.label}</p>
                                    </div>
                                ))}
                            </div>
                            {importResultado.errores.length > 0 && (
                                <div style={{ background: '#fee2e2', borderRadius: '8px', padding: '12px', maxHeight: '160px', overflowY: 'auto' }}>
                                    {importResultado.errores.map((e, i) => (
                                        <p key={i} style={{ fontSize: '12px', color: '#991b1b', marginBottom: '4px' }}>Fila {e.fila}: {e.mensaje}</p>
                                    ))}
                                </div>
                            )}
                            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setModalImportar(null); setImportResultado(null) }} style={btnPrimario}>Cerrar</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ flex: 1, overflowY: 'auto', border: `1px solid ${s.border}`, borderRadius: '8px', marginBottom: '16px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: s.surfaceLow }}>
                                            {(modalImportar.modo === 'stock'
                                                ? ['Producto', 'Presentación', 'Cód. Barras', '+Stock', 'Vencimiento', 'N° Lote']
                                                : ['Producto', 'Marca', 'Subcategoría', 'SKU', 'Presentación', 'P. Compra', 'P. Venta', 'P. Tarjeta', 'Stock']
                                            ).map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700', color: s.textMuted, fontSize: '10px', textTransform: 'uppercase', borderBottom: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalImportar.filas.map((f, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${s.borderLight}` }}>
                                                {modalImportar.modo === 'stock' ? <>
                                                    <td style={{ padding: '8px 12px', color: s.text, fontWeight: '600' }}>{f.producto}</td>
                                                    <td style={{ padding: '8px 12px', color: s.text }}>{f.presentacion}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted, fontFamily: 'monospace' }}>{f.codigo_barras || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: '700' }}>+{f.stock_a_agregar}</td>
                                                    <td style={{ padding: '8px 12px', color: f.fecha_vencimiento ? '#f59e0b' : s.textFaint }}>{f.fecha_vencimiento || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.numero_lote || '—'}</td>
                                                </> : <>
                                                    <td style={{ padding: '8px 12px', color: s.text, fontWeight: '600', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.nombre_producto}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.marca || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.subcategoria || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted, fontFamily: 'monospace' }}>{f.sku || '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: s.text, fontWeight: '600' }}>{f.presentacion}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.precio_compra ? `Gs. ${parseInt(f.precio_compra).toLocaleString()}` : '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: '#10b981', fontWeight: '700' }}>{f.precio_venta ? `Gs. ${parseInt(f.precio_venta).toLocaleString()}` : <span style={{ color: '#ef4444' }}>Requerido</span>}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.precio_tarjeta ? `Gs. ${parseInt(f.precio_tarjeta).toLocaleString()}` : '—'}</td>
                                                    <td style={{ padding: '8px 12px', color: s.textMuted }}>{f.stock ?? 0}</td>
                                                </>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setModalImportar(null)} style={btnSecundario}>Cancelar</button>
                                <button onClick={handleConfirmarImport} disabled={importando} style={{ ...btnPrimario, opacity: importando ? 0.6 : 1 }}>
                                    {importando ? 'Importando...' : `Confirmar importación (${modalImportar.filas.length} filas)`}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        )}

        </div>
    )
}

export default Inventario