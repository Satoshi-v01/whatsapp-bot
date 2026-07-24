import { useState, useEffect, useRef, Fragment } from 'react'
import * as XLSX from 'xlsx'
import {
    getProductos, getCategorias, getMarcas, crearMarca,
    verificarEliminarMarca, confirmarEliminarMarca,
    crearCategoria, editarCategoria,
    verificarEliminarCategoria, confirmarEliminarCategoria,
    getSubcategorias, crearSubcategoria, editarSubcategoria,
    verificarEliminarSubcategoria, confirmarEliminarSubcategoria,
    crearProducto, editarProducto, agregarPresentacion,
    actualizarStock, actualizarPrecio, actualizarCodigoBarras, actualizarPermiteFraccion,
    toggleDisponibleProducto, eliminarPresentacion, eliminarProducto,
    getSecciones, crearSeccion, editarSeccion, eliminarSeccion,
    importarProductos, descargarTemplatePrecios, descargarTemplateStock, importarStock
} from '../services/productos'
import ModalConfirmar from '../components/ModalConfirmar'
import { formatearFecha } from '../utils/fecha'
import { getLotesPresentacion, crearLote, eliminarLote } from '../services/lotes'
import { formatearCalidad, formatMiles, parseMiles } from '../utils/formato'
import { registrarTransformacion } from '../services/transformaciones'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const inputCls = 'mb-2.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition-shadow focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-100/5'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const btnPrimarioCls = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4.5 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
const btnSecundarioCls = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4.5 py-2.5 text-[13px] font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/60'
const btnToolbarPrimarioCls = 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-[13px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white'
const btnToolbarSecundarioCls = 'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-[13px] font-medium text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/60'
const chipBtnCls = 'rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60'
const chipDeleteCls = 'inline-flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-200 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-300 dark:hover:bg-red-500/25'

const IconAdvertencia = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
const IconDescargar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
const IconSubir = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
const IconRefrescar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
const IconLapiz = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
const IconBasura = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
const IconBuscar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
const IconChevronUp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
const IconChevronDown = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
const IconCaja = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
const IconCapas = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
const IconProhibido = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
const IconCaja3D = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>

function Modal({ children, zIndex = 1000 }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50" style={{ zIndex }}>
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl dark:bg-slate-800 dark:text-slate-100">
                {children}
            </div>
        </div>
    )
}

function Inventario() {
    const [pestanaActiva, setPestanaActiva] = useState('balanceados')
    const [buscar, setBuscar] = useState('')
    const [modalCategorias, setModalCategorias] = useState(false)
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '', seccion: '' })
    const [confirmEliminarCategoria, setConfirmEliminarCategoria] = useState(null)
    const [editandoCategoria, setEditandoCategoria] = useState(null)
    const [modalSubcategorias, setModalSubcategorias] = useState(false)
    const [nuevaSubcategoria, setNuevaSubcategoria] = useState({ nombre: '', descripcion: '', ecommerce_categoria: '', ecommerce_campo: '', ecommerce_valor: '' })
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
    const [nuevaPresentacion, setNuevaPresentacion] = useState({ nombre: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', stock: 0, codigo_barras: '', permite_fraccion: false })
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
    const [fraccionForm, setFraccionForm] = useState({ presentacion_destino_id: '', cantidad_origen: '', cantidad_destino: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', nota: '' })
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
        catch (err) { setErrorMarca(err.response?.status === 409 ? 'Esta marca ya existe.' : 'Error al crear la marca.') }
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
        const encabezados = [['nombre_producto', 'marca', 'especie', 'calidad', 'categoria', 'subcategoria', 'sku', 'presentacion', 'precio_compra', 'precio_venta', 'precio_tarjeta']]
        const slug = pestanaActiva !== 'sin_categoria' ? pestanaActiva : 'inventario'
        const subcat1 = subcategoriasPestana[0]?.nombre || ''
        const subcat2 = subcategoriasPestana[1]?.nombre || ''

        let ejemplos = []
        if (tipoActivo === 'con_calidad_especie') {
            // Balanceados: necesita especie, calidad y subcategoria
            ejemplos = [
                ['Pro Plan Adulto', 'Purina', 'perro', 'super_premium', slug, subcat1 || 'Adultos', 'PP-AD-3KG', '3kg', 155000, 190000, 202000],
                ['Pro Plan Adulto', 'Purina', 'perro', 'super_premium', slug, subcat1 || 'Adultos', 'PP-AD-15KG', '15kg', 580000, 720000, 765000],
                ['Whiskas Adulto', 'Mars', 'gato', 'standard', slug, subcat2 || '', 'WK-AD-500', '500g', 18000, 25000, ''],
            ]
        } else if (tipoActivo === 'con_especie') {
            // Accesorios/Medicamentos: necesita especie, sin calidad, subcategoria opcional
            ejemplos = [
                ['Collar Ajustable Rojo', 'Marca', 'perro', '', slug, subcat1 || '', 'COL-001-S', 'Talle S', 25000, 45000, 48000],
                ['Collar Ajustable Rojo', 'Marca', 'perro', '', slug, subcat1 || '', 'COL-001-M', 'Talle M', 28000, 50000, 53000],
                ['Juguete Raton', 'Marca', 'gato', '', slug, subcat2 || '', 'JUG-002', 'Unitario', 12000, 22000, ''],
            ]
        } else {
            // Generico (Arenas, etc.): sin especie ni calidad
            ejemplos = [
                ['Producto Ejemplo', 'Marca', '', '', slug, '', 'SKU-001', '100ml', 15000, 25000, 27000],
                ['Producto Ejemplo', 'Marca', '', '', slug, '', 'SKU-002', '250ml', 30000, 50000, 53000],
                ['Otro Producto', 'Marca', '', '', slug, '', 'SKU-003', '1kg', 45000, 70000, 75000],
            ]
        }

        const ws = XLSX.utils.aoa_to_sheet([encabezados[0], ...ejemplos])
        ws['!cols'] = encabezados[0].map((_, i) => ({ wch: i === 0 ? 32 : i <= 4 ? 18 : 14 }))

        const instrucciones = [
            ['CAMPO', 'VALOR VALIDO', 'OBLIGATORIO'],
            ['nombre_producto', 'Texto libre', 'SI'],
            ['marca', 'Debe existir en el sistema (Inventario → Marcas)', 'NO'],
            ['especie', tipoActivo === 'con_calidad_especie' || tipoActivo === 'con_especie' ? 'perro | gato | ambos' : 'Dejar VACIO', tipoActivo !== 'generico' ? 'SI' : 'NO'],
            ['calidad', tipoActivo === 'con_calidad_especie' ? 'standard | premium | premium_special | super_premium' : 'Dejar VACIO', tipoActivo === 'con_calidad_especie' ? 'SI' : 'NO'],
            ['categoria', `Siempre poner: ${slug}`, 'SI'],
            ['subcategoria', 'Debe existir en el sistema. Dejar vacio si no aplica.', 'NO'],
            ['sku', 'Codigo unico del producto', 'NO'],
            ['presentacion', 'Ej: 3kg, 500ml, Unitario', 'SI'],
            ['precio_compra', 'Numero entero en Gs. Ej: 150000', 'NO'],
            ['precio_venta', 'Numero entero en Gs. Ej: 190000', 'SI'],
            ['precio_tarjeta', 'Numero entero en Gs. Dejar vacio si igual a efectivo', 'NO'],
        ]
        const wsInfo = XLSX.utils.aoa_to_sheet(instrucciones)
        wsInfo['!cols'] = [{ wch: 20 }, { wch: 55 }, { wch: 12 }]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Importar')
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Instrucciones')
        XLSX.writeFile(wb, `template_${slug}.xlsx`)
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
                        sku: String(norm.sku_producto || norm.sku || norm.codigo || norm.codigo_producto || '').trim(),
                        presentacion: String(norm.presentacion || norm.presentacion_nombre || norm.tamaño || norm.size || norm.kg || '').trim(),
                        precio_compra: parseInt(String(norm.precio_compra || norm.p_compra || norm.costo || '').replace(/[^0-9]/g, '')) || 0,
                        precio_venta: parseInt(String(norm.precio_venta || norm.p_venta || norm.precio || norm.precio_de_venta || '').replace(/[^0-9]/g, '')) || 0,
                        precio_tarjeta: parseInt(String(norm.precio_tarjeta || norm.p_tarjeta || '').replace(/[^0-9]/g, '')) || null,
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
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: err.response?.status === 409 ? 'Ya existe una categoría con ese nombre en esta sección.' : 'No se pudo crear la categoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
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
            setNuevaSubcategoria({ nombre: '', descripcion: '', ecommerce_categoria: '', ecommerce_campo: '', ecommerce_valor: '' })
            await cargarDatos()
        } catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: err.response?.status === 409 ? 'Ya existe una subcategoría con ese nombre en esta sección.' : 'No se pudo crear la subcategoría.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }
    async function handleEditarSubcategoria() {
        if (!editandoSubcategoria?.nombre?.trim()) return
        try { await editarSubcategoria(editandoSubcategoria.id, editandoSubcategoria); setEditandoSubcategoria(null); await cargarDatos() }
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
        try { await agregarPresentacion(productoId, nuevaPresentacion); setModalPresentacion(null); setNuevaPresentacion({ nombre: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', stock: 0, codigo_barras: '', permite_fraccion: false }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: err.response?.status === 409 ? 'Ya existe una presentación con ese código de barras.' : 'No se pudo agregar la presentación.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
        finally { setGuardando(false) }
    }

    async function handleToggleFraccion(pr) {
        try {
            await actualizarPermiteFraccion(pr.id, !pr.permite_fraccion)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el fraccionamiento.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
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
        const otrasPresent = producto.presentaciones.filter(p => p.id !== pr.id)
        const modoInicial = otrasPresent.length === 0 ? 'nueva' : 'existente'
        setFraccionForm({ modo_destino: modoInicial, presentacion_destino_id: '', nombre_nuevo: '', cantidad_origen: '', cantidad_destino: '', precio_venta: '', precio_tarjeta: '', precio_compra: '', nota: '' })
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
                const nombreBase = fraccionForm.nombre_nuevo.trim()
                payload.nueva_presentacion = {
                    nombre: nombreBase.toUpperCase().includes('FRACCIONADO') ? nombreBase : `${nombreBase} FRACCIONADO`,
                    precio_venta: fraccionForm.precio_venta ? parseInt(fraccionForm.precio_venta) : null,
                    precio_tarjeta: fraccionForm.precio_tarjeta ? parseInt(fraccionForm.precio_tarjeta) : null,
                    precio_compra: fraccionForm.precio_compra ? parseInt(fraccionForm.precio_compra) : null,
                }
            } else {
                payload.presentacion_destino_id = parseInt(fraccionForm.presentacion_destino_id)
                payload.precio_venta = fraccionForm.precio_venta ? parseInt(fraccionForm.precio_venta) : null
                payload.precio_tarjeta = fraccionForm.precio_tarjeta ? parseInt(fraccionForm.precio_tarjeta) : null
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

    // Ordena presentaciones numéricamente por el peso/cantidad del nombre
    function ordenarPresentaciones(presentaciones) {
        function pesoEnKg(nombre) {
            const s = String(nombre).toLowerCase().replace(',', '.')
            const num = parseFloat(s)
            if (isNaN(num)) return 9999
            // Si tiene 'gr' o termina en 'g' sin 'kg', convertir a kg
            if (/\d\s*gr?\b/.test(s) && !/kg/.test(s)) return num / 1000
            return num
        }
        return [...presentaciones].sort((a, b) => pesoEnKg(a.nombre) - pesoEnKg(b.nombre))
    }

    function getAgrupadorSecundario(p) {
        if (tipoActivo === 'con_calidad_especie' || tipoActivo === 'con_especie') return p.subcategoria_nombre || 'Sin Subcategoria'
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
        <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            Cargando inventario...
        </div>
    )

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Inventario</h1>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Gestioná productos, precios y stock.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setModalSecciones(true)} className={btnToolbarSecundarioCls}>Secciones</button>
                    <button onClick={() => setModalMarca(true)} className={btnToolbarSecundarioCls}>Marcas</button>
                    {pestanaActiva !== 'sin_categoria' && <button onClick={() => setModalSubcategorias(true)} className={btnToolbarSecundarioCls}>Subcategorías</button>}
                    <button onClick={() => descargarTemplatePrecios().catch(() => {})} className={btnToolbarSecundarioCls}><IconDescargar /> Template precios</button>
                    <button onClick={() => inputImportRef.current?.click()} className={btnToolbarSecundarioCls}><IconSubir /> Importar precios</button>
                    <input ref={inputImportRef} type="file" accept=".xlsx,.xls" onChange={handleSeleccionarExcel} className="hidden" />
                    <button onClick={() => descargarTemplateStock().catch(() => {})} className={btnToolbarSecundarioCls}><IconDescargar /> Template stock</button>
                    <button onClick={() => inputImportStockRef.current?.click()} className={btnToolbarSecundarioCls}><IconSubir /> Importar stock</button>
                    <input ref={inputImportStockRef} type="file" accept=".xlsx,.xls" onChange={handleSeleccionarExcelStock} className="hidden" />
                    <button onClick={() => { setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '', sku: '', especie: '', seccion_inventario: pestanaActiva !== 'sin_categoria' ? pestanaActiva : '', subcategoria_id: '' }); setModalProducto(true) }} className={btnToolbarPrimarioCls}>+ Producto</button>
                </div>
            </div>

            {/* Métricas */}
            <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total productos',  valor: totalProductos,      icono: 'box',     cls: 'text-slate-900 dark:text-slate-100', bgCls: 'bg-white dark:bg-slate-800' },
                    { label: 'Presentaciones',   valor: totalPresentaciones, icono: 'layers',  cls: 'text-slate-900 dark:text-slate-100', bgCls: 'bg-white dark:bg-slate-800' },
                    { label: 'Stock bajo',       valor: stockBajo,           icono: 'warning', cls: 'text-amber-500',                     bgCls: 'bg-amber-50 dark:bg-amber-950/40' },
                    { label: 'Sin stock',        valor: sinStock,            icono: 'banned',  cls: 'text-red-500',                       bgCls: 'bg-red-50 dark:bg-red-950/40' },
                ].map((m, i) => (
                    <div key={i} className={`rounded-xl border border-slate-200 p-5 shadow-sm dark:border-slate-700 ${m.bgCls}`}>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{m.label}</p>
                            <span className={`flex ${m.cls}`}>
                                {m.icono === 'box'     && <IconCaja />}
                                {m.icono === 'layers'  && <IconCapas />}
                                {m.icono === 'warning' && <IconAdvertencia />}
                                {m.icono === 'banned'  && <IconProhibido />}
                            </span>
                        </div>
                        <p className={`text-[28px] font-extrabold tracking-tight ${m.cls}`}>{m.valor}</p>
                    </div>
                ))}
            </div>

            {/* Pestanas tipo Chrome */}
            <div className="flex gap-1 border-b-2 border-slate-200 dark:border-slate-700">
                {PESTANAS.map(t => {
                    const activa = pestanaActiva === t.id
                    const color = t.color || '#1a1a2e'
                    const esSinCat = t.id === 'sin_categoria'
                    const contadorAlerta = esSinCat && contadorPorPestana[t.id] > 0
                    return (
                        <button key={t.id} onClick={() => { setPestanaActiva(t.id); setBuscar('') }}
                            className={`-mb-0.5 flex items-center gap-2 rounded-t-lg border-b-2 px-5 py-2.5 text-[13px] transition-colors ${activa ? 'bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100' : 'bg-transparent text-slate-500 dark:text-slate-400'}`}
                            style={{ borderBottomColor: activa ? color : 'transparent', fontWeight: activa ? 700 : 500 }}>
                            {!esSinCat && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color, opacity: activa ? 1 : 0.4 }} />}
                            {t.label}
                            <span className={`rounded-[10px] px-1.75 py-px text-[11px] font-bold ${activa ? 'text-white' : contadorAlerta ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`} style={activa ? { background: color } : undefined}>{contadorPorPestana[t.id]}</span>
                        </button>
                    )
                })}
            </div>

            {/* Buscador */}
            <div className="flex items-center gap-3 rounded-b-none rounded-t-none border border-b-0 border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="relative flex-1">
                    <input
                        placeholder="Buscar por nombre, marca, categoría o SKU..."
                        value={buscar}
                        onChange={e => setBuscar(e.target.value)}
                        className={`${inputCls} mb-0`}
                    />
                </div>
                <button onClick={cargarDatos} className={`${btnToolbarSecundarioCls} text-xs`}><IconRefrescar /> Actualizar</button>
            </div>

            {/* Vista agrupada: Marca → Categoría → Productos */}
            <div className="flex flex-col gap-3">
                {marcasOrdenadas.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
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
                        <div key={marca} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

                            {/* Header marca */}
                            <div onClick={() => toggleMarca(marca)}
                                className={`flex cursor-pointer select-none items-center justify-between bg-slate-50 px-5 py-4 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800/70 ${expandida ? 'border-b border-slate-200 dark:border-slate-700' : ''}`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-slate-900 dark:bg-slate-100">
                                        <span className="text-sm font-extrabold text-white dark:text-slate-900">{marca.charAt(0).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{marca}</p>
                                        <p className="mt-px text-[11px] text-slate-500 dark:text-slate-400">
                                            {totalProdsMarca} producto{totalProdsMarca !== 1 ? 's' : ''} · {catsOrdenadas.length} categoría{catsOrdenadas.length !== 1 ? 's' : ''} · Stock total: {totalStockMarca}
                                        </p>
                                    </div>
                                </div>
                                <span className="flex text-slate-400 dark:text-slate-500">
                                    {expandida ? <IconChevronUp /> : <IconChevronDown />}
                                </span>
                            </div>

                            {/* Categorías dentro de la marca */}
                            {expandida && catsOrdenadas.map((cat, catIdx) => (
                                <div key={cat} className={catIdx > 0 ? 'border-t border-slate-100 dark:border-slate-700' : ''}>

                                    {/* Sub-header */}
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-indigo-50/40 py-2 pl-[72px] pr-5 dark:border-slate-700 dark:bg-slate-900/50">
                                        <span className="rounded-[10px] bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">{cat}</span>
                                        <span className="text-[11px] text-slate-400 dark:text-slate-500">{catsPorMarca[cat].length} producto{catsPorMarca[cat].length !== 1 ? 's' : ''}</span>
                                    </div>

                                    {/* Tabla de productos */}
                                    <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-900">
                                                {(tipoActivo === 'con_calidad_especie'
                                                    ? ['Producto', 'SKU', 'Calidad', 'Especie', 'Presentaciones', 'Acciones']
                                                    : tipoActivo === 'con_especie'
                                                    ? ['Producto', 'SKU', 'Subcategoria', 'Especie', 'Presentaciones', 'Acciones']
                                                    : ['Producto', 'SKU', 'Presentaciones', 'Acciones']
                                                ).map(h => (
                                                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catsPorMarca[cat].map(producto => {
                                                const expandido = productoExpandido === producto.id
                                                const stockTotal = producto.presentaciones.reduce((sum, pr) => sum + pr.stock, 0)
                                                const alertas = producto.presentaciones.filter(pr => pr.stock <= 3).length
                                                return (
                                                    <Fragment key={producto.id}>
                                                        <tr
                                                            className={`cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60 ${expandido ? 'border-b border-transparent' : 'border-b border-slate-100 dark:border-slate-700'}`}
                                                            onClick={() => setProductoExpandido(expandido ? null : producto.id)}
                                                        >
                                                            <td className="px-4 py-3.5">
                                                                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{producto.nombre}</p>
                                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Stock: {stockTotal}</span>
                                                                    {alertas > 0 && <span className="rounded-[10px] bg-red-100 px-1.5 py-px text-[10px] font-bold text-red-500 dark:bg-red-950/60">{alertas} bajo stock</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                {producto.sku
                                                                    ? <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{producto.sku}</span>
                                                                    : <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>}
                                                            </td>
                                                            {tipoActivo === 'con_calidad_especie' && (
                                                                <td className="px-4 py-3.5">
                                                                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">{formatearCalidad(producto.calidad)}</span>
                                                                </td>
                                                            )}
                                                            {tipoActivo === 'con_especie' && (
                                                                <td className="px-4 py-3.5">
                                                                    <span className={`text-xs ${producto.subcategoria_nombre ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>{producto.subcategoria_nombre || '—'}</span>
                                                                </td>
                                                            )}
                                                            {(tipoActivo === 'con_calidad_especie' || tipoActivo === 'con_especie') && (
                                                                <td className="px-4 py-3.5">
                                                                    {producto.especie ? (
                                                                        <span className={`rounded-[10px] px-2 py-0.5 text-[10px] font-semibold ${producto.especie === 'perro' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300' : producto.especie === 'gato' ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-green-100 text-green-600 dark:bg-green-950/50 dark:text-green-300'}`}>
                                                                            {producto.especie === 'ambos' ? 'Perro/Gato' : producto.especie.charAt(0).toUpperCase() + producto.especie.slice(1)}
                                                                        </span>
                                                                    ) : <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>}
                                                                </td>
                                                            )}
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {ordenarPresentaciones(producto.presentaciones).map(pr => (
                                                                        <span key={pr.id} className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${pr.stock <= 3 ? 'border-red-300 text-red-500' : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400'} bg-slate-50 dark:bg-slate-900`}>
                                                                            {pr.nombre}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button onClick={e => { e.stopPropagation(); handleToggleDisponibleProducto(producto) }}
                                                                        className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${producto.disponible ? 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400' : 'border-red-300 bg-red-50 text-red-500 dark:bg-red-950/40'}`}>
                                                                        {producto.disponible ? 'Activo' : 'Inactivo'}
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); abrirModalEditar(producto) }}
                                                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                                                        <IconLapiz />
                                                                        Editar
                                                                    </button>
                                                                    <button onClick={e => { e.stopPropagation(); handleEliminarProducto(producto) }}
                                                                        className="flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 dark:bg-red-950/40">
                                                                        <IconBasura />
                                                                    </button>
                                                                    <span className="flex items-center text-slate-400 dark:text-slate-500">
                                                                        {expandido
                                                                            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15" /></svg>
                                                                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>

                                                        {expandido && (
                                                            <tr key={`${producto.id}-expand`}>
                                                                <td colSpan={tipoActivo === 'con_calidad_especie' ? 6 : tipoActivo === 'con_especie' ? 5 : 4} className="border-b border-slate-200 bg-slate-50 p-0 dark:border-slate-700 dark:bg-slate-900">
                                                                    <div className="p-5">
                                                                        <div className="mb-3 flex items-center justify-between">
                                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Presentaciones</p>
                                                                            <button onClick={() => setModalPresentacion(producto.id)}
                                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                                                                                + Agregar presentación
                                                                            </button>
                                                                        </div>
                                                                        <div className="overflow-x-auto">
                                                                        <table className="w-full border-collapse">
                                                                            <thead>
                                                                                <tr className="bg-white dark:bg-slate-800">
                                                                                    {['Nombre', 'Cod. Barras', 'P. Compra', 'P. Venta', 'P. Tarjeta', 'Descuento', 'Margen', 'Stock', 'Vencimiento', 'Acciones'].map(h => (
                                                                                        <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{h}</th>
                                                                                    ))}
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {ordenarPresentaciones(producto.presentaciones).map(pr => {
                                                                                    const { precio, conDescuento } = calcularPrecioEfectivo(pr)
                                                                                    const mg = margen(pr)
                                                                                    return (
                                                                                        <tr key={pr.id} className="border-t border-slate-100 dark:border-slate-700">
                                                                                            <td className="px-3 py-2.5 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{pr.nombre}</td>
                                                                                            <td className="px-3 py-2.5">
                                                                                                {pr.codigo_barras ? <span className="font-mono text-[11px] text-slate-900 dark:text-slate-100">{pr.codigo_barras}</span> : <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{pr.precio_compra ? `Gs. ${pr.precio_compra.toLocaleString()}` : '—'}</td>
                                                                                            <td className="px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100">
                                                                                                {conDescuento ? (
                                                                                                    <span>
                                                                                                        <span className="text-[11px] text-slate-400 line-through dark:text-slate-500">Gs. {pr.precio_venta.toLocaleString()}</span>
                                                                                                        <span className="ml-1.5 font-bold text-emerald-500">Gs. {precio.toLocaleString()}</span>
                                                                                                        <span className="ml-1 rounded-[8px] bg-emerald-100 px-1.5 py-px text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">%</span>
                                                                                                    </span>
                                                                                                ) : `Gs. ${(pr.precio_venta || 0).toLocaleString()}`}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                                                                                                {pr.precio_tarjeta ? `Gs. ${pr.precio_tarjeta.toLocaleString()}` : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5 text-xs">
                                                                                                {pr.descuento_activo && pr.precio_descuento ? <span className="font-semibold text-emerald-500">Activo hasta {new Date(pr.descuento_hasta).toLocaleDateString('es-PY')}</span> : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5">
                                                                                                {mg !== null ? (
                                                                                                    <div>
                                                                                                        <div className="mb-0.5 flex items-center gap-1.5">
                                                                                                            <span className={`text-xs font-bold ${mg.markup >= 20 ? 'text-emerald-500' : mg.markup >= 10 ? 'text-amber-500' : 'text-red-500'}`}>{mg.markup}%</span>
                                                                                                            <div className="h-1 w-10 overflow-hidden rounded-sm bg-slate-200 dark:bg-slate-700">
                                                                                                                <div className={`h-full rounded-sm ${mg.markup >= 20 ? 'bg-emerald-500' : mg.markup >= 10 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(mg.markup, 100)}%` }} />
                                                                                                            </div>
                                                                                                            <span className="text-[10px] text-slate-400 dark:text-slate-500">ganancia</span>
                                                                                                        </div>
                                                                                                        <div className="text-[10px] text-slate-400 dark:text-slate-500">{mg.margenVenta}% venta</div>
                                                                                                    </div>
                                                                                                ) : <span className="text-slate-400 dark:text-slate-500">—</span>}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <span className={`text-sm font-extrabold ${pr.stock === 0 ? 'text-red-500' : pr.stock <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>{pr.stock}</span>
                                                                                                    <div className="h-1 w-12 overflow-hidden rounded-sm bg-slate-200 dark:bg-slate-700">
                                                                                                        <div className={`h-full rounded-sm ${pr.stock === 0 ? 'bg-red-500' : pr.stock <= 3 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min((pr.stock / 20) * 100, 100)}%` }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5">
                                                                                                {(() => {
                                                                                                    if (!pr.fecha_vencimiento_proxima) return <span className="text-[11px] text-slate-400 dark:text-slate-500">—</span>
                                                                                                    const dias = Math.ceil((new Date(pr.fecha_vencimiento_proxima) - new Date()) / (1000 * 60 * 60 * 24))
                                                                                                    const cls = dias < 0 ? 'bg-red-100 text-red-500 dark:bg-red-950/50' : dias <= 7 ? 'bg-red-100 text-red-500 dark:bg-red-950/50' : dias <= 30 ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
                                                                                                    const count = parseInt(pr.lotes_con_vencimiento) || 0
                                                                                                    return (
                                                                                                        <div className="flex flex-col gap-0.5">
                                                                                                            <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
                                                                                                                {dias < 0 ? 'Vencido' : dias === 0 ? 'Hoy' : `${dias}d`}
                                                                                                            </span>
                                                                                                            {count > 1 && <span className="text-[10px] text-slate-400 dark:text-slate-500">{count} lotes</span>}
                                                                                                        </div>
                                                                                                    )
                                                                                                })()}
                                                                                            </td>
                                                                                            <td className="px-3 py-2.5">
                                                                                                <div className="flex flex-wrap gap-1">
                                                                                                    <button onClick={() => { setNuevoStockValor(String(pr.stock)); setModalStock({ id: pr.id, nombre: pr.nombre, stockActual: pr.stock }) }} className={chipBtnCls}>Stock</button>
                                                                                                    <button onClick={() => abrirModalPrecio(pr)} className={chipBtnCls}>Precio</button>
                                                                                                    <button onClick={() => abrirModalCodigoBarras(pr)} className={chipBtnCls}>Cod.</button>
                                                                                                    <button onClick={() => abrirModalLotes(pr)} className={chipBtnCls}>Lotes</button>
                                                                                                    <button onClick={() => abrirModalFraccionar(producto, pr)} className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-300">Fraccionar</button>
                                                                                                    <button onClick={() => handleToggleFraccion(pr)} title="Habilita vender por monto en Caja" className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${pr.permite_fraccion ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>{pr.permite_fraccion ? 'Por monto (activo)' : 'Por monto'}</button>
                                                                                                    <button onClick={e => { e.stopPropagation(); handleEliminarPresentacion(pr, producto) }} className={chipDeleteCls}>
                                                                                                        <IconBasura />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    )
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </Fragment>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                })}
            </div>

            <div className="mt-2 flex justify-between">
                <p className="text-xs text-slate-400 dark:text-slate-500">Mostrando <strong className="text-slate-900 dark:text-slate-100">{productosFiltrados.length}</strong> de <strong className="text-slate-900 dark:text-slate-100">{productos.length}</strong> productos</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{totalPresentaciones} presentaciones en total</p>
            </div>

            {/* ===== MODALES ===== */}

            {modalSecciones && (
                <Modal>
                    <div className="flex max-h-[82vh] w-[460px] flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Secciones de inventario</h3>
                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Las secciones son las pestañas principales del inventario.</p>
                            </div>
                            <button onClick={() => { setModalSecciones(false); setEditandoSeccion(null) }} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>

                        {/* Crear nueva seccion */}
                        <div className="mb-4 rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                            <label className={labelCls}>Nueva sección</label>
                            <div className="mb-2 flex gap-2">
                                <input
                                    value={nuevaSeccion.nombre}
                                    onChange={e => setNuevaSeccion({ ...nuevaSeccion, nombre: e.target.value })}
                                    placeholder="Ej: Reptiles, Aves, Peces..."
                                    className={`${inputCls} mb-0 flex-1`}
                                />
                                <input
                                    type="color"
                                    value={nuevaSeccion.color}
                                    onChange={e => setNuevaSeccion({ ...nuevaSeccion, color: e.target.value })}
                                    title="Color de la sección"
                                    className="h-[42px] w-[42px] shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5 dark:border-slate-700"
                                />
                            </div>
                            <label className={labelCls}>Comportamiento</label>
                            <Select value={nuevaSeccion.tipo} onValueChange={v => setNuevaSeccion({ ...nuevaSeccion, tipo: v })}>
                                <SelectTrigger className="mb-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="generico">Genérico — solo categoría (como Medicamentos)</SelectItem>
                                    <SelectItem value="con_especie">Con especie — categoría + especie (como Accesorios)</SelectItem>
                                    <SelectItem value="con_calidad_especie">Con calidad y especie — subcategoría + calidad + especie (como Balanceados)</SelectItem>
                                </SelectContent>
                            </Select>
                            {nuevaSeccion.nombre && (
                                <p className="mb-2 text-[11px] text-slate-400 dark:text-slate-500">
                                    Slug: <strong className="font-mono text-slate-900 dark:text-slate-100">{toSlug(nuevaSeccion.nombre)}</strong>
                                </p>
                            )}
                            <button onClick={handleCrearSeccion} disabled={!nuevaSeccion.nombre.trim()} className={`${btnPrimarioCls} w-full`}>
                                + Agregar sección
                            </button>
                        </div>

                        {/* Lista de secciones */}
                        <div className="flex-1 overflow-y-auto">
                            {secciones.map(sec => (
                                <div key={sec.id} className="flex items-center gap-2.5 border-b border-slate-100 py-2.5 px-3 dark:border-slate-700">
                                    {editandoSeccion?.id === sec.id ? (
                                        <div className="flex flex-1 flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={editandoSeccion.nombre}
                                                    onChange={e => setEditandoSeccion({ ...editandoSeccion, nombre: e.target.value })}
                                                    className={`${inputCls} mb-0 flex-1`}
                                                />
                                                <input
                                                    type="color"
                                                    value={editandoSeccion.color}
                                                    onChange={e => setEditandoSeccion({ ...editandoSeccion, color: e.target.value })}
                                                    className="h-[38px] w-[38px] shrink-0 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5 dark:border-slate-700"
                                                />
                                            </div>
                                            <Select value={editandoSeccion.tipo} onValueChange={v => setEditandoSeccion({ ...editandoSeccion, tipo: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="generico">Genérico (como Medicamentos)</SelectItem>
                                                    <SelectItem value="con_especie">Con especie (como Accesorios)</SelectItem>
                                                    <SelectItem value="con_calidad_especie">Con calidad y especie (como Balanceados)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleEditarSeccion(editandoSeccion)} className={`${btnPrimarioCls} flex-1 px-3 py-2 text-xs`}>Guardar</button>
                                                <button onClick={() => setEditandoSeccion(null)} className={`${btnSecundarioCls} px-2.5 py-2 text-xs`}>✕</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2" style={{ background: sec.color, borderColor: `${sec.color}40` }} />
                                            <div className="flex-1">
                                                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{sec.nombre}</p>
                                                <p className="font-mono text-[11px] text-slate-400 dark:text-slate-500">{sec.slug} · {contadorPorPestana[sec.slug] || 0} productos</p>
                                            </div>
                                            <button onClick={() => setEditandoSeccion({ ...sec })} className={`${btnSecundarioCls} px-2.5 py-1 text-xs`}>
                                                <IconLapiz />
                                            </button>
                                            <button onClick={() => handleEliminarSeccion(sec)} className={chipDeleteCls}>
                                                <IconBasura />
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
                <Modal>
                    <div className="flex max-h-[80vh] w-[400px] flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Gestión de marcas</h3>
                            <button onClick={() => { setModalMarca(false); setErrorMarca('') }} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="mb-4 rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                            <label className={labelCls}>Nueva marca</label>
                            <input value={nuevaMarca} onChange={e => { setNuevaMarca(e.target.value); setErrorMarca('') }} placeholder="Ej: CIBAU" className={inputCls} />
                            {errorMarca && <div className="mb-2 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">{errorMarca}</div>}
                            <button onClick={handleCrearMarca} className={`${btnPrimarioCls} w-full`}>+ Agregar marca</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {marcas.map(marca => (
                                <div key={marca.id} className="flex items-center gap-2 border-b border-slate-100 py-2.5 px-3 dark:border-slate-700">
                                    <p className="flex-1 text-[13px] font-medium text-slate-900 dark:text-slate-100">{marca.nombre}</p>
                                    <button onClick={() => handleEliminarMarca(marca)} className={chipDeleteCls}><IconBasura /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {modalProducto && (
                <Modal>
                    <div className="w-[420px]">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nuevo producto</h3>
                            <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-bold uppercase text-white ${nuevoProducto.seccion_inventario ? 'bg-slate-900 dark:bg-slate-700' : 'bg-red-600'}`}>{nuevoProducto.seccion_inventario || 'Sin categoria'}</span>
                        </div>
                        {!nuevoProducto.seccion_inventario && (
                            <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 dark:bg-red-950/30">
                                <label className={`${labelCls} mb-2 text-red-600`}>Categoria del producto</label>
                                <Select value={nuevoProducto.seccion_inventario} onValueChange={v => setNuevoProducto({ ...nuevoProducto, seccion_inventario: v })}>
                                    <SelectTrigger className="mb-0 border-red-300"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- Seleccionar --</SelectItem>
                                        {secciones.map(s => <SelectItem key={s.slug} value={s.slug}>{s.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <label className={labelCls}>Marca</label>
                        <Select value={String(nuevoProducto.marca_id)} onValueChange={v => setNuevoProducto({ ...nuevoProducto, marca_id: v })}>
                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin marca</SelectItem>
                                {marcas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <label className={labelCls}>Nombre</label>
                        <input value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} className={inputCls} />
                        <label className={labelCls}>SKU (codigo interno)</label>
                        <input value={nuevoProducto.sku} onChange={e => setNuevoProducto({ ...nuevoProducto, sku: e.target.value })} placeholder="Ej: CIBAU-ADU-15KG" className={inputCls} />
                        <label className={labelCls}>Descripción</label>
                        <input value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} className={inputCls} />

                        {/* Campos especificos por tipo de seccion */}
                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_calidad_especie' && (
                            <>
                                <div className="grid grid-cols-2 gap-x-3">
                                    <div>
                                        <label className={labelCls}>Calidad</label>
                                        <Select value={nuevoProducto.calidad} onValueChange={v => setNuevoProducto({ ...nuevoProducto, calidad: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                                <SelectItem value="premium_special">Premium Special</SelectItem>
                                                <SelectItem value="super_premium">Super Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Especie</label>
                                        <Select value={nuevoProducto.especie} onValueChange={v => setNuevoProducto({ ...nuevoProducto, especie: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin especificar</SelectItem>
                                                <SelectItem value="perro">Perro</SelectItem>
                                                <SelectItem value="gato">Gato</SelectItem>
                                                <SelectItem value="ambos">Perro y Gato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <label className={labelCls}>Subcategoria (tamaño)</label>
                                <Select value={String(nuevoProducto.subcategoria_id)} onValueChange={v => setNuevoProducto({ ...nuevoProducto, subcategoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin subcategoria</SelectItem>
                                        {subcatsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_especie' && (
                            <>
                                <label className={labelCls}>Categoria</label>
                                <Select value={String(nuevoProducto.categoria_id)} onValueChange={v => setNuevoProducto({ ...nuevoProducto, categoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin categoria</SelectItem>
                                        {catsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-x-3">
                                    <div>
                                        <label className={labelCls}>Especie</label>
                                        <Select value={nuevoProducto.especie} onValueChange={v => setNuevoProducto({ ...nuevoProducto, especie: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin especificar</SelectItem>
                                                <SelectItem value="perro">Perro</SelectItem>
                                                <SelectItem value="gato">Gato</SelectItem>
                                                <SelectItem value="ambos">Perro y Gato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tamaño</label>
                                        <Select value={String(nuevoProducto.subcategoria_id)} onValueChange={v => setNuevoProducto({ ...nuevoProducto, subcategoria_id: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin tamaño</SelectItem>
                                                {subcatsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}

                        {getTipoSeccion(nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'generico' && (nuevoProducto.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) && (
                            <>
                                <label className={labelCls}>Categoría</label>
                                <Select value={String(nuevoProducto.categoria_id)} onValueChange={v => setNuevoProducto({ ...nuevoProducto, categoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin categoría</SelectItem>
                                        {catsPara(nuevoProducto.seccion_inventario || pestanaActiva).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalProducto(false)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleCrearProducto} disabled={guardando} className={btnPrimarioCls}>{guardando ? 'Creando...' : 'Crear producto'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalEditarProducto && (
                <Modal>
                    <div className="w-[420px]">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Editar producto</h3>
                            <span className={`rounded-[10px] px-2.5 py-0.5 text-[11px] font-bold uppercase text-white ${editarForm.seccion_inventario ? 'bg-slate-900 dark:bg-slate-700' : 'bg-red-600'}`}>{editarForm.seccion_inventario || 'Sin categoria'}</span>
                        </div>
                        {!editarForm.seccion_inventario && (
                            <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 dark:bg-red-950/30">
                                <label className={`${labelCls} mb-2 text-red-600`}>Asignar categoria del producto</label>
                                <Select value={editarForm.seccion_inventario} onValueChange={v => setEditarForm({ ...editarForm, seccion_inventario: v })}>
                                    <SelectTrigger className="mb-0 border-red-300"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- Seleccionar --</SelectItem>
                                        {secciones.map(s => <SelectItem key={s.slug} value={s.slug}>{s.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <label className={labelCls}>Marca</label>
                        <Select value={String(editarForm.marca_id)} onValueChange={v => setEditarForm({ ...editarForm, marca_id: v })}>
                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin marca</SelectItem>
                                {marcas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <label className={labelCls}>Nombre</label>
                        <input value={editarForm.nombre} onChange={e => setEditarForm({ ...editarForm, nombre: e.target.value })} className={inputCls} />
                        <label className={labelCls}>SKU (codigo interno)</label>
                        <input value={editarForm.sku} onChange={e => setEditarForm({ ...editarForm, sku: e.target.value })} placeholder="Ej: CIBAU-ADU-15KG" className={inputCls} />
                        <label className={labelCls}>Descripción</label>
                        <input value={editarForm.descripcion} onChange={e => setEditarForm({ ...editarForm, descripcion: e.target.value })} className={inputCls} />

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_calidad_especie' && (
                            <>
                                <div className="grid grid-cols-2 gap-x-3">
                                    <div>
                                        <label className={labelCls}>Calidad</label>
                                        <Select value={editarForm.calidad} onValueChange={v => setEditarForm({ ...editarForm, calidad: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard</SelectItem>
                                                <SelectItem value="premium">Premium</SelectItem>
                                                <SelectItem value="premium_special">Premium Special</SelectItem>
                                                <SelectItem value="super_premium">Super Premium</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Especie</label>
                                        <Select value={editarForm.especie} onValueChange={v => setEditarForm({ ...editarForm, especie: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin especificar</SelectItem>
                                                <SelectItem value="perro">Perro</SelectItem>
                                                <SelectItem value="gato">Gato</SelectItem>
                                                <SelectItem value="ambos">Perro y Gato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <label className={labelCls}>Subcategoria (tamaño)</label>
                                <Select value={String(editarForm.subcategoria_id)} onValueChange={v => setEditarForm({ ...editarForm, subcategoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin subcategoria</SelectItem>
                                        {subcatsPara(editarForm.seccion_inventario).map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'con_especie' && (
                            <>
                                <label className={labelCls}>Categoria</label>
                                <Select value={String(editarForm.categoria_id)} onValueChange={v => setEditarForm({ ...editarForm, categoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin categoria</SelectItem>
                                        {catsPara(editarForm.seccion_inventario).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <div className="grid grid-cols-2 gap-x-3">
                                    <div>
                                        <label className={labelCls}>Especie</label>
                                        <Select value={editarForm.especie} onValueChange={v => setEditarForm({ ...editarForm, especie: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin especificar</SelectItem>
                                                <SelectItem value="perro">Perro</SelectItem>
                                                <SelectItem value="gato">Gato</SelectItem>
                                                <SelectItem value="ambos">Perro y Gato</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tamaño</label>
                                        <Select value={String(editarForm.subcategoria_id)} onValueChange={v => setEditarForm({ ...editarForm, subcategoria_id: v })}>
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Sin tamaño</SelectItem>
                                                {subcatsPara(editarForm.seccion_inventario).map(sub => <SelectItem key={sub.id} value={String(sub.id)}>{sub.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        )}

                        {getTipoSeccion(editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) === 'generico' && (editarForm.seccion_inventario || (pestanaActiva !== 'sin_categoria' ? pestanaActiva : '')) && (
                            <>
                                <label className={labelCls}>Categoría</label>
                                <Select value={String(editarForm.categoria_id)} onValueChange={v => setEditarForm({ ...editarForm, categoria_id: v })}>
                                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Sin categoría</SelectItem>
                                        {catsPara(editarForm.seccion_inventario || pestanaActiva).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalEditarProducto(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleEditarProducto} className={btnPrimarioCls}>Guardar cambios</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalPresentacion && (
                <Modal>
                    <div className="w-[400px]">
                        <h3 className="mb-5 text-base font-bold text-slate-900 dark:text-slate-100">Nueva presentación</h3>
                        <label className={labelCls}>Nombre</label>
                        <input placeholder="Ej: 3kg, 1KG, 15kg" value={nuevaPresentacion.nombre} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, nombre: e.target.value })} className={inputCls} />
                        <label className={labelCls}>Precio de compra (Gs.)</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 50.000" value={formatMiles(nuevaPresentacion.precio_compra)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_compra: parseMiles(e.target.value) })} className={inputCls} />
                        <label className={labelCls}>Precio efectivo / transferencia (Gs.)</label>
                        <input type="text" inputMode="numeric" placeholder="Ej: 75.000" value={formatMiles(nuevaPresentacion.precio_venta)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_venta: parseMiles(e.target.value) })} className={inputCls} />
                        <label className={labelCls}>Precio tarjeta (Gs.)</label>
                        <input type="text" inputMode="numeric" placeholder="Dejar vacío si es igual al efectivo" value={formatMiles(nuevaPresentacion.precio_tarjeta)} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_tarjeta: parseMiles(e.target.value) })} className={inputCls} />
                        {nuevaPresentacion.precio_venta && nuevaPresentacion.precio_tarjeta && parseInt(nuevaPresentacion.precio_tarjeta) > parseInt(nuevaPresentacion.precio_venta) && (
                            <div className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                Recargo tarjeta: {((parseInt(nuevaPresentacion.precio_tarjeta) - parseInt(nuevaPresentacion.precio_venta)) / parseInt(nuevaPresentacion.precio_venta) * 100).toFixed(2)}%
                            </div>
                        )}
                        {nuevaPresentacion.precio_compra && nuevaPresentacion.precio_venta && (
                            <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                                {(() => {
                                    const c = parseInt(nuevaPresentacion.precio_compra), v = parseInt(nuevaPresentacion.precio_venta)
                                    const t = nuevaPresentacion.precio_tarjeta ? parseInt(nuevaPresentacion.precio_tarjeta) : null
                                    return (
                                        <>
                                            <span>Ef. — M. ganancia: {Math.round(((v-c)/c)*100)}% · M. venta: {Math.round(((v-c)/v)*100)}%</span>
                                            {t > 0 && <span className="mt-0.5 block">Tarjeta — M. ganancia: {Math.round(((t-c)/c)*100)}% · M. venta: {Math.round(((t-c)/t)*100)}%</span>}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                        <label className={labelCls}>Stock inicial</label>
                        <input type="number" value={nuevaPresentacion.stock} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, stock: e.target.value })} className={inputCls} />
                        <label className={labelCls}>Codigo de barras (opcional)</label>
                        <input value={nuevaPresentacion.codigo_barras} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, codigo_barras: e.target.value })} placeholder="Escanea o ingresa manualmente" className={inputCls} />
                        <div className="my-1 mb-4 flex items-center gap-2">
                            <input type="checkbox" id="nuevaPresPermiteFraccion" checked={nuevaPresentacion.permite_fraccion} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, permite_fraccion: e.target.checked })} className="h-[15px] w-[15px] cursor-pointer" />
                            <label htmlFor="nuevaPresPermiteFraccion" className="cursor-pointer text-[13px] text-slate-900 dark:text-slate-100">Vendible por monto/fracción en Caja (ej. balanceado fraccionado en 1kg)</label>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalPresentacion(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={() => handleAgregarPresentacion(modalPresentacion)} disabled={guardando} className={btnPrimarioCls}>{guardando ? 'Agregando...' : 'Agregar'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalCodigoBarras && (
                <Modal zIndex={2000}>
                    <div className="w-[380px]">
                        <h3 className="mb-1.5 text-base font-bold text-slate-900 dark:text-slate-100">Codigo de barras</h3>
                        <p className="mb-5 text-[13px] text-slate-500 dark:text-slate-400">{modalCodigoBarras.nombre}</p>
                        <label className={labelCls}>Codigo de barras</label>
                        <input
                            value={codigoBarrasValor}
                            onChange={e => setCodigoBarrasValor(e.target.value)}
                            placeholder="Escanea con lector o ingresa manualmente"
                            className={inputCls}
                            autoFocus
                        />
                        <p className="mb-4 text-[11px] text-slate-400 dark:text-slate-500">
                            Si tenes un lector de codigo de barras, conectalo por USB y escanea el producto directamente en este campo.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalCodigoBarras(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleGuardarCodigoBarras} className={btnPrimarioCls}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalPrecio && (
                <Modal>
                    <div className="w-[420px]">
                        <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-slate-100">Precio y descuento</h3>
                        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">{modalPrecio.nombre}</p>
                        <div className="mb-3 grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>P. compra (Gs.)</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_compra)} onChange={e => setPrecioForm({ ...precioForm, precio_compra: parseMiles(e.target.value) })} className={`${inputCls} mb-0`} /></div>
                            <div><label className={labelCls}>P. efectivo / transferencia (Gs.)</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_venta)} onChange={e => setPrecioForm({ ...precioForm, precio_venta: parseMiles(e.target.value) })} className={`${inputCls} mb-0`} /></div>
                        </div>
                        <div className="mb-3">
                            <label className={labelCls}>P. tarjeta (Gs.)</label>
                            <input type="text" inputMode="numeric" placeholder="Dejar vacío si es igual al precio efectivo" value={formatMiles(precioForm.precio_tarjeta)} onChange={e => setPrecioForm({ ...precioForm, precio_tarjeta: parseMiles(e.target.value) })} className={`${inputCls} mb-0`} />
                        </div>
                        {precioForm.precio_venta && precioForm.precio_tarjeta && parseInt(precioForm.precio_tarjeta) > parseInt(precioForm.precio_venta) && (
                            <div className="mb-2 rounded-lg bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                Recargo tarjeta: {((parseInt(precioForm.precio_tarjeta) - parseInt(precioForm.precio_venta)) / parseInt(precioForm.precio_venta) * 100).toFixed(2)}% · Diferencia: Gs. {(parseInt(precioForm.precio_tarjeta) - parseInt(precioForm.precio_venta)).toLocaleString()}
                            </div>
                        )}
                        {precioForm.precio_compra && precioForm.precio_venta && (
                            <div className="mb-4 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
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
                                                <span className="mt-1 block">
                                                    Tarjeta — Ganancia: Gs. {(tarjeta - costo).toLocaleString()} · M. ganancia: {Math.round(((tarjeta - costo) / costo) * 100)}% · M. venta: {Math.round(((tarjeta - costo) / tarjeta) * 100)}%
                                                </span>
                                            )}
                                        </>
                                    )
                                })()}
                            </div>
                        )}
                        <div className="mb-3 border-t border-slate-100 pt-4 dark:border-slate-700">
                            <div className="mb-3.5 flex items-center gap-2">
                                <input type="checkbox" id="desc" checked={precioForm.descuento_activo} onChange={e => setPrecioForm({ ...precioForm, descuento_activo: e.target.checked })} />
                                <label htmlFor="desc" className="cursor-pointer text-[13px] font-semibold text-slate-900 dark:text-slate-100">Activar descuento temporal</label>
                            </div>
                            {precioForm.descuento_activo && (
                                <>
                                    <div className="mb-3 rounded-[10px] bg-blue-50 p-3.5 dark:bg-blue-950/30">
                                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">Precios con descuento</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className={labelCls}>P. compra descuento</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_compra_descuento || '')} onChange={e => setPrecioForm({ ...precioForm, precio_compra_descuento: parseMiles(e.target.value) })} className={`${inputCls} mb-0`} /></div>
                                            <div><label className={labelCls}>P. venta descuento</label><input type="text" inputMode="numeric" value={formatMiles(precioForm.precio_descuento)} onChange={e => setPrecioForm({ ...precioForm, precio_descuento: parseMiles(e.target.value) })} className={`${inputCls} mb-0`} /></div>
                                        </div>
                                    </div>
                                    <div className="mb-2 grid grid-cols-2 gap-2">
                                        <div><label className={labelCls}>Desde</label><input type="datetime-local" value={precioForm.descuento_desde} onChange={e => setPrecioForm({ ...precioForm, descuento_desde: e.target.value })} className={`${inputCls} mb-0`} /></div>
                                        <div><label className={labelCls}>Hasta</label><input type="datetime-local" value={precioForm.descuento_hasta} onChange={e => setPrecioForm({ ...precioForm, descuento_hasta: e.target.value })} className={`${inputCls} mb-0`} /></div>
                                    </div>
                                    <label className={labelCls}>Límite de stock (opcional)</label>
                                    <input type="number" placeholder="Sin límite" value={precioForm.descuento_stock} onChange={e => setPrecioForm({ ...precioForm, descuento_stock: e.target.value })} className={inputCls} />
                                </>
                            )}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalPrecio(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleGuardarPrecio} className={btnPrimarioCls}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalSubcategorias && (
                <Modal>
                    <div className="flex max-h-[80vh] w-[480px] flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Subcategorias — {pestanaActiva}</h3>
                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                    {tipoActivo === 'con_calidad_especie' ? 'Mini, Maxi, Cachorro, Senior...' : tipoActivo === 'con_especie' ? 'XS, S, M, L, XL...' : 'Tamaños o variantes'}
                                </p>
                            </div>
                            <button onClick={() => { setModalSubcategorias(false); setEditandoSubcategoria(null) }} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="mb-4 rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                            <label className={labelCls}>Nueva subcategoria</label>
                            <input placeholder="Nombre *" value={nuevaSubcategoria.nombre} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, nombre: e.target.value })} className={inputCls} />
                            <input placeholder="Descripción (opcional)" value={nuevaSubcategoria.descripcion} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, descripcion: e.target.value })} className={inputCls} />
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vinculación Tienda Web</p>
                            <div className="grid grid-cols-3 gap-2">
                                <Select value={nuevaSubcategoria.ecommerce_categoria} onValueChange={v => setNuevaSubcategoria({ ...nuevaSubcategoria, ecommerce_categoria: v })}>
                                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Cat. web</SelectItem>
                                        <SelectItem value="perros">Perros</SelectItem>
                                        <SelectItem value="gatos">Gatos</SelectItem>
                                        <SelectItem value="medicamentos">Medicamentos</SelectItem>
                                        <SelectItem value="accesorios">Accesorios</SelectItem>
                                        <SelectItem value="cuidado">Cuidado</SelectItem>
                                        <SelectItem value="ofertas">Ofertas</SelectItem>
                                    </SelectContent>
                                </Select>
                                <input placeholder="Filtro (ej: etapa_vida)" value={nuevaSubcategoria.ecommerce_campo} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, ecommerce_campo: e.target.value })} className={`${inputCls} mb-0 font-mono text-xs`} />
                                <input placeholder="Valor (ej: adulto)" value={nuevaSubcategoria.ecommerce_valor} onChange={e => setNuevaSubcategoria({ ...nuevaSubcategoria, ecommerce_valor: e.target.value })} className={`${inputCls} mb-0 font-mono text-xs`} />
                            </div>
                            <button onClick={handleCrearSubcategoria} className={`${btnPrimarioCls} mt-3 w-full`}>+ Agregar subcategoria</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {subcategoriasPestana.map(sub => (
                                <div key={sub.id} className="border-b border-slate-100 dark:border-slate-700">
                                    {editandoSubcategoria?.id === sub.id ? (
                                        <div className="p-3">
                                            <input value={editandoSubcategoria.nombre} onChange={e => setEditandoSubcategoria({ ...editandoSubcategoria, nombre: e.target.value })} placeholder="Nombre *" className={inputCls} />
                                            <input value={editandoSubcategoria.descripcion || ''} onChange={e => setEditandoSubcategoria({ ...editandoSubcategoria, descripcion: e.target.value })} placeholder="Descripción" className={inputCls} />
                                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vinculación Tienda Web</p>
                                            <div className="mb-2.5 grid grid-cols-3 gap-2">
                                                <Select value={editandoSubcategoria.ecommerce_categoria || ''} onValueChange={v => setEditandoSubcategoria({ ...editandoSubcategoria, ecommerce_categoria: v })}>
                                                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="">Cat. web</SelectItem>
                                                        <SelectItem value="perros">Perros</SelectItem>
                                                        <SelectItem value="gatos">Gatos</SelectItem>
                                                        <SelectItem value="medicamentos">Medicamentos</SelectItem>
                                                        <SelectItem value="accesorios">Accesorios</SelectItem>
                                                        <SelectItem value="cuidado">Cuidado</SelectItem>
                                                        <SelectItem value="ofertas">Ofertas</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <input value={editandoSubcategoria.ecommerce_campo || ''} onChange={e => setEditandoSubcategoria({ ...editandoSubcategoria, ecommerce_campo: e.target.value })} placeholder="Filtro" className={`${inputCls} mb-0 font-mono text-xs`} />
                                                <input value={editandoSubcategoria.ecommerce_valor || ''} onChange={e => setEditandoSubcategoria({ ...editandoSubcategoria, ecommerce_valor: e.target.value })} placeholder="Valor" className={`${inputCls} mb-0 font-mono text-xs`} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={handleEditarSubcategoria} className={`${btnPrimarioCls} px-3.5 py-1.5 text-xs`}>Guardar</button>
                                                <button onClick={() => setEditandoSubcategoria(null)} className={`${btnSecundarioCls} px-3.5 py-1.5 text-xs`}>Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 px-3 py-2.5">
                                            <div className="flex-1">
                                                <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{sub.nombre}</p>
                                                {sub.descripcion && <p className="text-[11px] text-slate-500 dark:text-slate-400">{sub.descripcion}</p>}
                                                {(sub.ecommerce_categoria || sub.ecommerce_campo) && (
                                                    <p className="mt-0.5 font-mono text-[10px] text-indigo-500">
                                                        web: {sub.ecommerce_categoria || '—'} · {sub.ecommerce_campo || '—'}={sub.ecommerce_valor || '—'}
                                                    </p>
                                                )}
                                            </div>
                                            <button onClick={() => setEditandoSubcategoria({ id: sub.id, nombre: sub.nombre, descripcion: sub.descripcion || '', ecommerce_categoria: sub.ecommerce_categoria || '', ecommerce_campo: sub.ecommerce_campo || '', ecommerce_valor: sub.ecommerce_valor || '' })} className={`${btnSecundarioCls} px-2.5 py-1 text-xs`}>
                                                <IconLapiz />
                                            </button>
                                            <button onClick={() => handleEliminarSubcategoria(sub)} className={chipDeleteCls}>
                                                <IconBasura />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {subcategoriasPestana.length === 0 && (
                                <p className="p-6 text-center text-[13px] text-slate-500 dark:text-slate-400">No hay subcategorias para {pestanaActiva} aún.</p>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {modalCategorias && (
                <Modal>
                    <div className="flex max-h-[80vh] w-[480px] flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Gestión de categorías</h3>
                            <button onClick={() => setModalCategorias(false)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="mb-4 rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                            <label className={labelCls}>Nueva categoría</label>
                            <input placeholder="Nombre" value={nuevaCategoria.nombre} onChange={e => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })} className={inputCls} />
                            <input placeholder="Descripción (opcional)" value={nuevaCategoria.descripcion} onChange={e => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })} className={inputCls} />
                            <label className={labelCls}>Sección</label>
                            <Select value={nuevaCategoria.seccion} onValueChange={v => setNuevaCategoria({ ...nuevaCategoria, seccion: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">General (todas las secciones)</SelectItem>
                                    {secciones.map(s => <SelectItem key={s.slug} value={s.slug}>{s.nombre}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <button onClick={handleCrearCategoria} className={`${btnPrimarioCls} mt-3 w-full`}>+ Agregar categoría</button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {categorias.map(cat => {
                                const seccionCls = cat.seccion === 'balanceados' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300' : cat.seccion === 'accesorios' ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300' : cat.seccion === 'medicamentos' ? 'bg-pink-100 text-pink-800 dark:bg-pink-500/15 dark:text-pink-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                const seccionLabel = cat.seccion ? cat.seccion.charAt(0).toUpperCase() + cat.seccion.slice(1) : 'General'
                                return (
                                <div key={cat.id} className="flex items-center gap-2 border-b border-slate-100 py-2.5 px-3 dark:border-slate-700">
                                    {editandoCategoria === cat.id ? (
                                        <div className="flex flex-1 flex-col gap-1.5">
                                            <input defaultValue={cat.nombre} id={`cat-edit-${cat.id}`} className={`${inputCls} mb-0`} />
                                            <select defaultValue={cat.seccion || ''} id={`cat-edit-seccion-${cat.id}`} className={`${inputCls} mb-0`}>
                                                <option value="">General (todas las secciones)</option>
                                                {secciones.map(s => <option key={s.slug} value={s.slug}>{s.nombre}</option>)}
                                            </select>
                                            <div className="flex gap-1.5">
                                                <button onClick={() => handleEditarCategoria(cat.id, { nombre: document.getElementById(`cat-edit-${cat.id}`).value, seccion: document.getElementById(`cat-edit-seccion-${cat.id}`).value || null })} className={`${btnPrimarioCls} flex-1 px-3 py-1.5`}>Guardar</button>
                                                <button onClick={() => setEditandoCategoria(null)} className={`${btnSecundarioCls} px-3 py-1.5`}>Cancelar</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[13px] font-medium text-slate-900 dark:text-slate-100">{cat.nombre}</p>
                                                    <span className={`rounded-[10px] px-1.75 py-px text-[10px] font-bold uppercase tracking-wide ${seccionCls}`}>{seccionLabel}</span>
                                                </div>
                                                {cat.descripcion && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{cat.descripcion}</p>}
                                            </div>
                                            <button onClick={() => setEditandoCategoria(cat.id)} className={`${btnSecundarioCls} px-2.5 py-1 text-xs`}>
                                                <IconLapiz />
                                            </button>
                                            <button onClick={() => handleEliminarCategoria(cat)} className={chipDeleteCls}><IconBasura /></button>
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
                <Modal zIndex={2000}>
                    <div className="w-[360px]">
                        <h3 className="mb-1.5 text-base font-bold text-slate-900 dark:text-slate-100">Actualizar stock</h3>
                        <p className="mb-5 text-[13px] text-slate-500 dark:text-slate-400">{modalStock.nombre}</p>
                        <div className="mb-4 flex items-center justify-between rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Stock actual</span>
                            <span className={`text-xl font-extrabold ${modalStock.stockActual <= 3 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>{modalStock.stockActual}</span>
                        </div>
                        <label className={labelCls}>Nuevo stock</label>
                        <input type="number" value={nuevoStockValor} onChange={e => setNuevoStockValor(e.target.value)} className={inputCls} autoFocus />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setModalStock(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleConfirmarStock} className={btnPrimarioCls}>Guardar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmEliminarMarca && (
                <Modal zIndex={1100}>
                    <div className="w-[400px]">
                        <h3 className={`mb-3 text-base font-bold ${confirmEliminarMarca.cantidad > 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {confirmEliminarMarca.cantidad > 0 ? <span className="inline-flex items-center gap-1.5"><IconAdvertencia /> Atención</span> : 'Eliminar marca'}
                        </h3>
                        {confirmEliminarMarca.cantidad > 0 ? (
                            <>
                                <p className="mb-3 text-[13px] text-slate-900 dark:text-slate-100">La marca <strong>{confirmEliminarMarca.nombre}</strong> tiene <strong>{confirmEliminarMarca.cantidad}</strong> productos asociados.</p>
                                <div className="mb-4 rounded-lg bg-red-100 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">Eliminar esta marca desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p className="mb-4 text-[13px] text-slate-900 dark:text-slate-100">¿Eliminar la marca <strong>{confirmEliminarMarca.nombre}</strong>?</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmEliminarMarca(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarMarca} className={`${btnPrimarioCls} bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600`}>Eliminar igual</button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmEliminarCategoria && (
                <Modal zIndex={1100}>
                    <div className="w-[400px]">
                        <h3 className={`mb-3 text-base font-bold ${confirmEliminarCategoria.cantidad > 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {confirmEliminarCategoria.cantidad > 0 ? <span className="inline-flex items-center gap-1.5"><IconAdvertencia /> Atención</span> : 'Eliminar categoría'}
                        </h3>
                        {confirmEliminarCategoria.cantidad > 0 ? (
                            <>
                                <p className="mb-3 text-[13px] text-slate-900 dark:text-slate-100">La categoría <strong>{confirmEliminarCategoria.nombre}</strong> tiene <strong>{confirmEliminarCategoria.cantidad}</strong> productos asociados.</p>
                                <div className="mb-4 rounded-lg bg-red-100 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">Eliminar esta categoría desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p className="mb-4 text-[13px] text-slate-900 dark:text-slate-100">¿Eliminar la categoría <strong>{confirmEliminarCategoria.nombre}</strong>?</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmEliminarCategoria(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarCategoria} className={`${btnPrimarioCls} bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600`}>Eliminar igual</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modalLotes && (
            <Modal zIndex={2000}>
                <div className="flex max-h-[85vh] w-[560px] flex-col">
                    <div className="mb-1.5 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Lotes — {modalLotes.nombre}</h3>
                        <button onClick={() => setModalLotes(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                    </div>
                    <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
                        Stock total: <strong className="text-slate-900 dark:text-slate-100">{modalLotes.stock}</strong> unidades · FEFO activo (vence primero, sale primero)
                    </p>
                    <div className="mb-4 rounded-[10px] bg-slate-50 p-4 dark:bg-slate-900">
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Agregar lote</p>
                        <div className="mb-2.5 grid grid-cols-3 gap-2.5">
                            <div>
                                <label className={labelCls}>N° de lote</label>
                                <input value={nuevoLote.numero_lote} onChange={e => setNuevoLote({ ...nuevoLote, numero_lote: e.target.value })}
                                    placeholder="Opcional" className={`${inputCls} mb-0`} />
                            </div>
                            <div>
                                <label className={labelCls}>Fecha de vencimiento *</label>
                                <input type="date" value={nuevoLote.fecha_vencimiento} onChange={e => setNuevoLote({ ...nuevoLote, fecha_vencimiento: e.target.value })}
                                    className={`${inputCls} mb-0`} />
                            </div>
                            <div>
                                <label className={labelCls}>Stock inicial *</label>
                                <input type="number" value={nuevoLote.stock_inicial} onChange={e => setNuevoLote({ ...nuevoLote, stock_inicial: e.target.value })}
                                    placeholder="Unidades" className={`${inputCls} mb-0`} />
                            </div>
                        </div>
                        <button onClick={handleCrearLote}
                            className={`${btnPrimarioCls} w-full text-xs`}>
                            + Agregar lote
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {cargandoLotes ? (
                            <p className="p-5 text-center text-slate-500 dark:text-slate-400">Cargando lotes...</p>
                        ) : lotes.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                <span className="mb-2 flex justify-center opacity-35"><IconCaja3D /></span>
                                <p className="text-[13px]">No hay lotes cargados para esta presentación.</p>
                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">El stock se gestiona de forma global hasta que cargues lotes.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900">
                                        {['N° Lote', 'Vencimiento', 'Días', 'Stock inicial', 'Stock actual', ''].map(h => (
                                            <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {lotes.map(lote => {
                                        const dias = parseInt(lote.dias_para_vencer)
                                        const vencido = dias < 0
                                        const cls = vencido ? 'bg-red-500/10 text-red-500' : dias <= 30 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                        return (
                                            <tr key={lote.id} className="border-t border-slate-100 dark:border-slate-700">
                                                <td className="px-3 py-2.5 font-mono text-xs text-slate-900 dark:text-slate-100">
                                                    {lote.numero_lote || <span className="text-slate-400 dark:text-slate-500">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100">
                                                    {new Date(lote.fecha_vencimiento).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${cls}`}>
                                                        {vencido ? `Vencido (${Math.abs(dias)}d)` : dias === 0 ? 'Vence hoy' : `${dias}d`}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">{lote.stock_inicial}</td>
                                                <td className="px-3 py-2.5">
                                                    <span className={`text-sm font-extrabold ${lote.stock_actual === 0 ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                                                        {lote.stock_actual}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <button onClick={() => handleEliminarLote(lote)}
                                                        className={chipDeleteCls}>
                                                        <IconBasura />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            </div>
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
                    <Modal zIndex={2000}>
                        <div className="w-[500px]">
                            <div className="mb-1 flex items-center justify-between">
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Fraccionar stock</h3>
                                <button onClick={() => setModalFraccionar(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                            </div>
                            <p className="mb-4.5 text-[13px] font-semibold text-violet-700 dark:text-violet-400">{producto.nombre}</p>

                            {/* Origen */}
                            <div className="mb-3 rounded-[10px] bg-slate-50 px-4 py-3.5 dark:bg-slate-900">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Origen — {pr.nombre}</p>
                                <div className="mb-2.5 flex items-center justify-between">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Stock disponible: <strong className="text-slate-900 dark:text-slate-100">{pr.stock}</strong></span>
                                    {cantOrigen > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">Quedará: <strong className={cantOrigen > pr.stock ? 'text-red-500' : 'text-emerald-500'}>{pr.stock - cantOrigen >= 0 ? pr.stock - cantOrigen : '—'}</strong></span>}
                                </div>
                                <label className={labelCls}>Cantidad a fraccionar</label>
                                <input
                                    type="number" min="1" max={pr.stock}
                                    value={fraccionForm.cantidad_origen}
                                    onChange={e => setFraccionForm({ ...fraccionForm, cantidad_origen: e.target.value })}
                                    placeholder={`Máx. ${pr.stock}`}
                                    className={`${inputCls} mb-0 ${cantOrigen > pr.stock ? 'border-red-500' : ''}`}
                                />
                                {cantOrigen > pr.stock && <p className="mt-1 text-[11px] text-red-500">Stock insuficiente</p>}
                            </div>

                            {/* Destino */}
                            <div className="mb-3 rounded-[10px] bg-slate-50 px-4 py-3.5 dark:bg-slate-900">
                                <div className="mb-3 flex items-center justify-between">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Producto fraccionado</p>
                                    {/* Toggle existente / nueva */}
                                    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px] font-semibold dark:border-slate-700">
                                        <button onClick={() => setFraccionForm({ ...fraccionForm, modo_destino: 'existente', nombre_nuevo: '' })}
                                            className={`px-3 py-1.5 ${!modoNueva ? 'bg-violet-700 text-white' : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            Existente
                                        </button>
                                        <button onClick={() => setFraccionForm({ ...fraccionForm, modo_destino: 'nueva', presentacion_destino_id: '' })}
                                            className={`px-3 py-1.5 ${modoNueva ? 'bg-violet-700 text-white' : 'bg-white text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            Nueva presentación
                                        </button>
                                    </div>
                                </div>

                                {modoNueva ? (
                                    <>
                                        <label className={labelCls}>Nombre de la presentación fraccionada</label>
                                        <input
                                            value={fraccionForm.nombre_nuevo}
                                            onChange={e => setFraccionForm({ ...fraccionForm, nombre_nuevo: e.target.value })}
                                            placeholder="Ej: Bolsa 1kg"
                                            className={inputCls}
                                        />
                                    </>
                                ) : otrasPresent.length === 0 ? (
                                    <p className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-500 dark:border-amber-500/30 dark:bg-amber-950/30">
                                        Este producto no tiene otras presentaciones. Usá "Nueva presentación" para crear una al fraccionar.
                                    </p>
                                ) : (
                                    <>
                                        <label className={labelCls}>Presentación destino</label>
                                        <Select
                                            value={String(fraccionForm.presentacion_destino_id)}
                                            onValueChange={v => setFraccionForm({ ...fraccionForm, presentacion_destino_id: v })}
                                        >
                                            <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="">Seleccionar...</SelectItem>
                                                {otrasPresent.map(p => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.nombre} (stock: {p.stock})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {destino && (
                                            <div className="mb-2.5 flex items-center justify-between">
                                                <span className="text-xs text-slate-500 dark:text-slate-400">Stock después:</span>
                                                <span className="text-[13px] font-bold text-emerald-500">{destino.stock + cantDestino}</span>
                                            </div>
                                        )}
                                    </>
                                )}

                                <label className={labelCls}>Cantidad resultante</label>
                                <input
                                    type="number" min="1"
                                    value={fraccionForm.cantidad_destino}
                                    onChange={e => setFraccionForm({ ...fraccionForm, cantidad_destino: e.target.value })}
                                    placeholder="Unidades que se generan"
                                    className={`${inputCls} mb-2.5`}
                                />
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                        <label className={labelCls}>Precio compra {modoNueva ? '' : '(opcional)'}</label>
                                        <input
                                            type="number" min="0"
                                            value={fraccionForm.precio_compra}
                                            onChange={e => setFraccionForm({ ...fraccionForm, precio_compra: e.target.value })}
                                            placeholder="Gs. 0"
                                            className={`${inputCls} mb-0`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Precio efectivo {modoNueva ? '' : '(opcional)'}</label>
                                        <input
                                            type="number" min="0"
                                            value={fraccionForm.precio_venta}
                                            onChange={e => setFraccionForm({ ...fraccionForm, precio_venta: e.target.value })}
                                            placeholder="Gs. 0"
                                            className={`${inputCls} mb-0`}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Precio tarjeta {modoNueva ? '' : '(opcional)'}</label>
                                        <input
                                            type="number" min="0"
                                            value={fraccionForm.precio_tarjeta}
                                            onChange={e => setFraccionForm({ ...fraccionForm, precio_tarjeta: e.target.value })}
                                            placeholder="Gs. 0"
                                            className={`${inputCls} mb-0`}
                                        />
                                    </div>
                                </div>
                                {fraccionForm.precio_venta && fraccionForm.precio_tarjeta && parseInt(fraccionForm.precio_tarjeta) > parseInt(fraccionForm.precio_venta) && (
                                    <p className="mt-1.5 text-[11px] font-semibold text-violet-700 dark:text-violet-400">
                                        Recargo tarjeta: {((parseInt(fraccionForm.precio_tarjeta) - parseInt(fraccionForm.precio_venta)) / parseInt(fraccionForm.precio_venta) * 100).toFixed(2)}%
                                    </p>
                                )}
                                {cantOrigen > 0 && cantDestino > 0 && fraccionForm.precio_venta && (
                                    <p className="mt-1 text-[11px] font-semibold text-emerald-500">
                                        Total fraccionado: Gs. {(cantDestino * parseInt(fraccionForm.precio_venta || 0)).toLocaleString('es-PY')}
                                        {pr.precio_venta && ` (original: Gs. ${(cantOrigen * pr.precio_venta).toLocaleString('es-PY')})`}
                                    </p>
                                )}
                            </div>

                            {/* Nota */}
                            <label className={labelCls}>Nota (opcional)</label>
                            <input
                                value={fraccionForm.nota}
                                onChange={e => setFraccionForm({ ...fraccionForm, nota: e.target.value })}
                                placeholder="Ej: Bolsa 15kg → 15 bolsas 1kg"
                                className={inputCls}
                            />

                            <div className="mt-1 flex justify-end gap-2">
                                <button onClick={() => setModalFraccionar(null)} className={btnSecundarioCls}>Cancelar</button>
                                <button
                                    onClick={handleConfirmarFraccion}
                                    disabled={btnDisabled}
                                    className={`${btnPrimarioCls} bg-violet-700 hover:bg-violet-800 dark:bg-violet-700 dark:hover:bg-violet-800 dark:text-white`}
                                >
                                    {fraccionando ? 'Fraccionando...' : 'Confirmar fraccionamiento'}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )
            })()}

            {confirmEliminarSubcategoria && (
                <Modal zIndex={1100}>
                    <div className="w-[400px]">
                        <h3 className={`mb-3 text-base font-bold ${confirmEliminarSubcategoria.cantidad > 0 ? 'text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {confirmEliminarSubcategoria.cantidad > 0 ? 'Atención' : 'Eliminar subcategoria'}
                        </h3>
                        {confirmEliminarSubcategoria.cantidad > 0 ? (
                            <>
                                <p className="mb-3 text-[13px] text-slate-900 dark:text-slate-100">La subcategoria <strong>{confirmEliminarSubcategoria.nombre}</strong> tiene <strong>{confirmEliminarSubcategoria.cantidad}</strong> productos asociados.</p>
                                <div className="mb-4 rounded-lg bg-red-100 p-3 text-xs text-red-800 dark:bg-red-950/50 dark:text-red-300">Eliminar esta subcategoria desvinculará todos sus productos.</div>
                            </>
                        ) : (
                            <p className="mb-4 text-[13px] text-slate-900 dark:text-slate-100">¿Eliminar la subcategoria <strong>{confirmEliminarSubcategoria.nombre}</strong>?</p>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setConfirmEliminarSubcategoria(null)} className={btnSecundarioCls}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarSubcategoria} className={`${btnPrimarioCls} bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600`}>Eliminar igual</button>
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
            <Modal zIndex={3000}>
                <div className="flex max-h-[80vh] w-[720px] flex-col">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="mb-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
                                {importResultado ? 'Importación completada' : 'Vista previa de importación'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {importResultado
                                    ? `${importResultado.productosCreados ?? importResultado.creados ?? 0} productos nuevos · ${importResultado.presentacionesActualizadas ?? importResultado.actualizados ?? 0} precios actualizados · ${importResultado.presentacionesCreadas ?? 0} presentaciones nuevas · ${importResultado.errores.length} errores`
                                    : `${modalImportar.filas.length} filas detectadas`}
                            </p>
                        </div>
                        <button onClick={() => { setModalImportar(null); setImportResultado(null) }} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                    </div>

                    {importResultado ? (
                        <div className="flex-1">
                            <div className={`mb-4 grid gap-3 ${importResultado.modo === 'stock' ? 'grid-cols-3' : 'grid-cols-4'}`}>
                                {(importResultado.modo === 'stock' ? [
                                    { label: 'Presentaciones actualizadas', val: importResultado.actualizados, cls: 'text-emerald-500' },
                                    { label: 'Lotes creados', val: importResultado.lotesCreados, cls: 'text-blue-500' },
                                    { label: 'Errores', val: importResultado.errores.length, cls: importResultado.errores.length > 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400' },
                                ] : [
                                    { label: 'Productos nuevos', val: importResultado.productosCreados ?? importResultado.creados ?? 0, cls: 'text-emerald-500' },
                                    { label: 'Precios actualizados', val: importResultado.presentacionesActualizadas ?? importResultado.actualizados ?? 0, cls: 'text-blue-500' },
                                    { label: 'Presentaciones nuevas', val: importResultado.presentacionesCreadas ?? 0, cls: 'text-violet-500' },
                                    { label: 'Errores', val: importResultado.errores.length, cls: importResultado.errores.length > 0 ? 'text-red-500' : 'text-slate-500 dark:text-slate-400' },
                                ]).map(k => (
                                    <div key={k.label} className="rounded-[10px] border border-slate-200 bg-slate-50 p-3.5 text-center dark:border-slate-700 dark:bg-slate-900">
                                        <p className={`text-2xl font-extrabold ${k.cls}`}>{k.val}</p>
                                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{k.label}</p>
                                    </div>
                                ))}
                            </div>
                            {importResultado.errores.length > 0 && (
                                <div className="max-h-40 overflow-y-auto rounded-lg bg-red-100 p-3 dark:bg-red-950/40">
                                    {importResultado.errores.map((e, i) => (
                                        <p key={i} className="mb-1 text-xs text-red-800 dark:text-red-300">Fila {e.fila}: {e.mensaje}</p>
                                    ))}
                                </div>
                            )}
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => { setModalImportar(null); setImportResultado(null) }} className={btnPrimarioCls}>Cerrar</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900">
                                            {(modalImportar.modo === 'stock'
                                                ? ['Producto', 'Presentación', 'Cód. Barras', '+Stock', 'Vencimiento', 'N° Lote']
                                                : ['Producto', 'Marca', 'Subcategoría', 'SKU', 'Presentación', 'P. Compra', 'P. Venta', 'P. Tarjeta']
                                            ).map(h => (
                                                <th key={h} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 text-left text-[10px] font-bold uppercase text-slate-500 dark:border-slate-700 dark:text-slate-400">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {modalImportar.filas.map((f, i) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                                                {modalImportar.modo === 'stock' ? <>
                                                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{f.producto}</td>
                                                    <td className="px-3 py-2 text-slate-900 dark:text-slate-100">{f.presentacion}</td>
                                                    <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{f.codigo_barras || '—'}</td>
                                                    <td className="px-3 py-2 font-bold text-emerald-500">+{f.stock_a_agregar}</td>
                                                    <td className={`px-3 py-2 ${f.fecha_vencimiento ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'}`}>{f.fecha_vencimiento || '—'}</td>
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.numero_lote || '—'}</td>
                                                </> : <>
                                                    <td className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{f.nombre_producto}</td>
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.marca || '—'}</td>
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.subcategoria || '—'}</td>
                                                    <td className="px-3 py-2 font-mono text-slate-500 dark:text-slate-400">{f.sku || '—'}</td>
                                                    <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{f.presentacion}</td>
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.precio_compra ? `Gs. ${parseInt(f.precio_compra).toLocaleString()}` : '—'}</td>
                                                    <td className="px-3 py-2 font-bold text-emerald-500">{f.precio_venta ? `Gs. ${parseInt(f.precio_venta).toLocaleString()}` : <span className="text-red-500">Requerido</span>}</td>
                                                    <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{f.precio_tarjeta ? `Gs. ${parseInt(f.precio_tarjeta).toLocaleString()}` : '—'}</td>
                                                </>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setModalImportar(null)} className={btnSecundarioCls}>Cancelar</button>
                                <button onClick={handleConfirmarImport} disabled={importando} className={btnPrimarioCls}>
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
