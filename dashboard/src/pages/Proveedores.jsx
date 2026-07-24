import { useState, useEffect } from 'react'
import { getProveedores, crearProveedor, editarProveedor, getFacturas, crearFactura, editarFactura, registrarPago, getReportes, eliminarProveedor } from '../services/proveedores'
import ModalConfirmar from '../components/ModalConfirmar'
import { formatearFecha, formatearSoloFecha, fechaHoyPY, fechaInicioMesPY } from '../utils/fecha'
import * as XLSX from 'xlsx'
import api from '../services/api'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'

const inputCls = 'mb-2.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-slate-100/10'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const IconBuscar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
const IconEdificio = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
const IconFactura = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
const IconLapiz = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
const IconTarjeta = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
const IconReloj = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>

function formatearMiles(valor) {
    if (!valor && valor !== 0) return ''
    return parseInt(valor.toString().replace(/\D/g, '') || '0').toLocaleString('es-PY')
}

function parsearMiles(valor) {
    return valor.replace(/\D/g, '')
}

function Proveedores() {
    const [pestana, setPestana] = useState('proveedores')
    const [proveedores, setProveedores] = useState([])
    const [facturas, setFacturas] = useState([])
    const [reportes, setReportes] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [buscar, setBuscar] = useState('')
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
    const [buscarFactura, setBuscarFactura] = useState('')
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalProveedor, setModalProveedor] = useState(null) // null | 'nuevo' | proveedor
    const [modalFactura, setModalFactura] = useState(null) // null | proveedorId
    const [modalPago, setModalPago] = useState(null) // null | factura
    const [sumaIva, setSumaIva] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroProveedor, setFiltroProveedor] = useState(null) // null | { id, nombre }
    const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [modalLibroCompras, setModalLibroCompras] = useState(false)
    const [libroComprasFechaDesde, setLibroComprasFechaDesde] = useState(fechaInicioMesPY())
    const [libroComprasFechaHasta, setLibroComprasFechaHasta] = useState(fechaHoyPY())
    const [exportandoLibroCompras, setExportandoLibroCompras] = useState(false)

    const [formProveedor, setFormProveedor] = useState({ nombre: '', ruc: '', telefono: '', email: '', banco: '', numero_cuenta: '', direccion: '', notas: '' })
    const [formFactura, setFormFactura] = useState({ numero_factura: '', timbrado_proveedor: '', fecha_emision: fechaHoyPY(), tipo: 'contado', plazo_dias: '', monto_total: '', iva_10: '', iva_5: '', exentas: '', metodo_pago: 'efectivo', gravada_10: '', gravada_5: '', notas: '' })
    const [formPago, setFormPago] = useState({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', fecha_pago: fechaHoyPY(), tipo_pago: 'parcial', notas: '' })

    useEffect(() => { cargarDatos() }, [])
    useEffect(() => { if (pestana === 'facturas') cargarFacturas() }, [pestana, filtroEstado, filtroTipo, filtroProveedor])
    useEffect(() => { if (pestana === 'reportes') cargarReportes() }, [pestana, filtroPeriodo, fechaDesde, fechaHasta])

    async function cargarDatos() {
        try {
            setCargando(true)
            const datos = await getProveedores()
            setProveedores(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los proveedores.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function cargarFacturas() {
        try {
            const params = {}
            if (filtroEstado) params.estado = filtroEstado
            if (filtroTipo) params.tipo = filtroTipo
            if (filtroProveedor) params.proveedor_id = filtroProveedor.id
            const datos = await getFacturas(params)
            setFacturas(datos)
        } catch (err) {}
    }

    async function cargarReportes() {
        try {
            const params = { periodo: filtroPeriodo }
            if (filtroPeriodo === 'personalizado') { params.fecha_desde = fechaDesde; params.fecha_hasta = fechaHasta }
            const datos = await getReportes(params)
            setReportes(datos)
        } catch (err) {}
    }

    async function handleExportarLibroCompras() {
        setExportandoLibroCompras(true)
        try {
            const res = await api.get(`/proveedores/libro-compras?fecha_desde=${libroComprasFechaDesde}&fecha_hasta=${libroComprasFechaHasta}`)
            const datos = res.data

            const filas = datos.map((f, idx) => {
                const total = parseInt(f.total || 0)
                const iva10 = parseInt(f.iva_10 || 0)
                const iva5 = parseInt(f.iva_5 || 0)
                const exenta = parseInt(f.exentas || 0)
                const grav10 = iva10 > 0 ? total - iva10 - iva5 - exenta : 0
                const grav5 = iva5 > 0 ? (total - iva10 - exenta) - iva5 : 0

                return {
                    'N°': idx + 1,
                    'Fecha': new Date(f.fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' }),
                    'Tipo Documento': 'Factura',
                    'N° Factura': f.numero_factura || '—',
                    'Timbrado': f.timbrado_proveedor || '—',
                    'Proveedor': f.proveedor_nombre || '—',
                    'RUC': f.proveedor_ruc || '—',
                    'Gravada 10%': grav10,
                    'IVA 10%': iva10,
                    'Gravada 5%': grav5,
                    'IVA 5%': iva5,
                    'Exentas': exenta,
                    'Total': total
                }
            })

            const totales = {
                'N°': '', 'Fecha': '', 'Tipo Documento': '', 'N° Factura': '', 'Timbrado': '',
                'Proveedor': 'TOTALES', 'RUC': '',
                'Gravada 10%': filas.reduce((s, f) => s + f['Gravada 10%'], 0),
                'IVA 10%': filas.reduce((s, f) => s + f['IVA 10%'], 0),
                'Gravada 5%': filas.reduce((s, f) => s + f['Gravada 5%'], 0),
                'IVA 5%': filas.reduce((s, f) => s + f['IVA 5%'], 0),
                'Exentas': filas.reduce((s, f) => s + f['Exentas'], 0),
                'Total': filas.reduce((s, f) => s + f['Total'], 0),
            }

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet([...filas, totales])
            ws['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
                { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
                { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
            ]
            XLSX.utils.book_append_sheet(wb, ws, 'Libro de Compras')
            XLSX.writeFile(wb, `libro_compras_${libroComprasFechaDesde}_${libroComprasFechaHasta}.xlsx`)
            setModalLibroCompras(false)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar el libro de compras.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportandoLibroCompras(false) }
    }

    async function handleGuardarProveedor() {
        try {
            if (modalProveedor === 'nuevo') {
                await crearProveedor(formProveedor)
            } else {
                await editarProveedor(modalProveedor.id, formProveedor)
            }
            setModalProveedor(null)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo guardar el proveedor.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleGuardarFactura() {
        try {
            await crearFactura(modalFactura, formFactura)
            setModalFactura(null)
            setSumaIva(true)
            setFormFactura({ numero_factura: '', timbrado_proveedor: '', fecha_emision: fechaHoyPY(), tipo: 'contado', plazo_dias: '', monto_total: '', iva_10: '', iva_5: '', exentas: '', metodo_pago: 'efectivo', notas: '' })
            await cargarDatos()
            if (pestana === 'facturas') await cargarFacturas()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo guardar la factura.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleRegistrarPago() {
        try {
            await registrarPago(modalPago.id, formPago)
            setModalPago(null)
            setFormPago({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', fecha_pago: fechaHoyPY(), tipo_pago: 'parcial', notas: '' })
            await cargarFacturas()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar el pago.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function abrirModalEditar(proveedor) {
        setFormProveedor({ nombre: proveedor.nombre, ruc: proveedor.ruc||'', telefono: proveedor.telefono||'', email: proveedor.email||'', banco: proveedor.banco||'', numero_cuenta: proveedor.numero_cuenta||'', direccion: proveedor.direccion||'', notas: proveedor.notas||'' })
        setModalProveedor(proveedor)
    }

    function estadoConfig(estado) {
        return {
            pendiente: { label: 'Pendiente', badgeCls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' },
            pagado_parcial: { label: 'Pago parcial', badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400' },
            pagado: { label: 'Pagado', badgeCls: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400' },
            vencido: { label: 'Vencido', badgeCls: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400' },
        }[estado] || { label: estado, badgeCls: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' }
    }

    function diasParaVencer(fecha) {
        if (!fecha) return null
        const diff = new Date(fecha) - new Date()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    function calcularTotal(form) {
        const grav10 = parseInt(form.gravada_10 || 0)
        const iva10 = parseInt(form.iva_10 || 0)
        const grav5 = parseInt(form.gravada_5 || 0)
        const iva5 = parseInt(form.iva_5 || 0)
        const exentas = parseInt(form.exentas || 0)
        return String(grav10 + iva10 + grav5 + iva5 + exentas)
    }

    const facturasFiltradas = facturas.filter(f =>
        !buscarFactura || f.numero_factura.toLowerCase().includes(buscarFactura.toLowerCase()) ||
        f.proveedor_nombre.toLowerCase().includes(buscarFactura.toLowerCase())
    )


    const proveedoresFiltrados = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        (p.ruc && p.ruc.toLowerCase().includes(buscar.toLowerCase()))
    )

    if (cargando) return (
        <div className="flex h-full items-center justify-center bg-slate-50 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            Cargando proveedores...
        </div>
    )

    return (
        <div className="proveedores-wrap flex h-[calc(100vh-56px)] flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">

            {/* Pestañas */}
            <div className="flex flex-shrink-0 gap-0 border-b border-slate-200 bg-white px-8 dark:border-slate-700 dark:bg-slate-800">
                {[
                    { id: 'proveedores', label: 'Proveedores' },
                    { id: 'facturas', label: 'Facturas' },
                    { id: 'reportes', label: 'Reportes' },
                ].map(p => (
                    <button key={p.id} onClick={() => setPestana(p.id)}
                        className={`border-b-2 px-5 py-4 text-[13px] transition-colors ${pestana === p.id ? 'border-slate-900 font-bold text-slate-900 dark:border-slate-100 dark:text-slate-100' : 'border-transparent font-medium text-slate-500 dark:text-slate-400'}`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* ── PROVEEDORES ── */}
            {pestana === 'proveedores' && (
                <div className="page-scroll flex-1 overflow-y-auto p-8">
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-slate-100">Proveedores</h1>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{proveedores.length} proveedores registrados</p>
                        </div>
                        <Button onClick={() => { setFormProveedor({ nombre: '', ruc: '', telefono: '', email: '', banco: '', numero_cuenta: '', direccion: '', notas: '' }); setModalProveedor('nuevo') }}>
                            + Nuevo proveedor
                        </Button>
                    </div>

                    {/* Buscador */}
                    <div className="relative mb-5">
                        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-slate-400 dark:text-slate-500"><IconBuscar /></span>
                        <input placeholder="Buscar por nombre o RUC..." value={buscar} onChange={e => setBuscar(e.target.value)}
                            className={`${inputCls} mb-0 bg-white pl-9 dark:bg-slate-800`} />
                    </div>

                    {/* Lista proveedores */}
                    <div className="flex flex-col gap-2.5">
                        {proveedoresFiltrados.length === 0 ? (
                            <div className="p-15 text-center text-slate-500 dark:text-slate-400">
                                <span className="mb-2 flex justify-center opacity-35"><IconEdificio /></span>
                                <p>No hay proveedores registrados.</p>
                            </div>
                        ) : proveedoresFiltrados.map(p => (
                            <Card key={p.id} className="rounded-xl shadow-sm">
                                <CardContent className="px-5 py-[18px]">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="mb-1.5 flex items-center gap-2.5">
                                            <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">{p.nombre}</h3>
                                            {p.ruc && <span className="text-[11px] text-slate-500 dark:text-slate-400">RUC: {p.ruc}</span>}
                                        </div>
                                        <div className="flex flex-wrap gap-4">
                                            {p.telefono && <span className="text-xs text-slate-500 dark:text-slate-400">{p.telefono}</span>}
                                            {p.email && <span className="text-xs text-slate-500 dark:text-slate-400">{p.email}</span>}
                                            {p.banco && <span className="text-xs text-slate-500 dark:text-slate-400">{p.banco}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-5">
                                        <div className="text-right">
                                            <p className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">Total comprado</p>
                                            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">Gs. {parseInt(p.total_comprado||0).toLocaleString('es-PY')}</p>
                                        </div>
                                        {parseInt(p.deuda_total) > 0 && (
                                            <div className="text-right">
                                                <p className="mb-0.5 text-[11px] text-slate-400 dark:text-slate-500">Deuda</p>
                                                <p className="text-sm font-extrabold text-red-500">Gs. {parseInt(p.deuda_total).toLocaleString('es-PY')}</p>
                                            </div>
                                        )}
                                        <div className="flex gap-1.5">
                                            <Button variant="outline" size="sm" onClick={() => { setPestana('facturas'); setFiltroTipo(''); setFiltroEstado(''); setFiltroProveedor({ id: p.id, nombre: p.nombre }) }}>
                                                Facturas
                                            </Button>
                                            <Button variant="outline" size="sm" className="gap-1" onClick={() => abrirModalEditar(p)}>
                                                <IconLapiz /> Editar
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => setModalConfirmar({
                                                titulo: 'Eliminar proveedor',
                                                mensaje: `¿Eliminar "${p.nombre}"? Se eliminaran todas sus facturas pagadas. No se puede eliminar si tiene facturas pendientes.`,
                                                textoBoton: 'Eliminar', colorBoton: '#ef4444',
                                                onConfirmar: async () => {
                                                    try {
                                                        await eliminarProveedor(p.id)
                                                        setModalConfirmar(null)
                                                        await cargarDatos()
                                                    } catch (err) {
                                                        setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar el proveedor.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                                                    }
                                                }
                                            })}>
                                                Eliminar
                                            </Button>
                                            <Button size="sm" onClick={() => { setModalFactura(p.id); setSumaIva(true) }}>
                                                + Factura
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FACTURAS ── */}
            {pestana === 'facturas' && (
                <div className="page-scroll flex-1 overflow-y-auto p-8">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-slate-100">Facturas de Compra</h1>
                            {filtroProveedor && (
                                <button onClick={() => setFiltroProveedor(null)}
                                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400">
                                    Proveedor: {filtroProveedor.nombre} <span className="text-sm leading-none">✕</span>
                                </button>
                            )}
                        </div>
                        <Button variant="outline" onClick={() => setModalLibroCompras(true)}>
                            Libro de Compras
                        </Button>
                    </div>

                    {/* Filtros */}
                    <div className="mb-5 flex flex-wrap items-center gap-2">
                        {[
                            { val: '', label: 'Todos los estados' },
                            { val: 'pendiente', label: 'Pendiente' },
                            { val: 'pagado_parcial', label: 'Pago parcial' },
                            { val: 'pagado', label: 'Pagado' },
                            { val: 'vencido', label: 'Vencido' },
                        ].map(f => (
                            <button key={f.val} onClick={() => setFiltroEstado(f.val)}
                                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold ${filtroEstado === f.val ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                {f.label}
                            </button>
                        ))}
                        <div className="mx-1 self-stretch border-l border-slate-200 dark:border-slate-700" />
                        {[
                            { val: '', label: 'Todos' },
                            { val: 'contado', label: 'Contado' },
                            { val: 'credito', label: 'Crédito' },
                        ].map(f => (
                            <button key={f.val} onClick={() => setFiltroTipo(f.val)}
                                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold ${filtroTipo === f.val ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                {f.label}
                            </button>
                        ))}
                        <input
                            placeholder="Buscar por número de factura..."
                            value={buscarFactura}
                            onChange={e => setBuscarFactura(e.target.value)}
                            className={`${inputCls} mb-0 flex-1`}
                        />
                    </div>

                    {/* Tabla facturas */}
                    <Card className="rounded-xl shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-200 bg-slate-50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-900">
                                    {['Proveedor', 'N° Factura', 'Emisión', 'Vencimiento', 'Monto', 'Saldo', 'Tipo', 'Estado', ''].map(h => (
                                        <TableHead key={h} className="h-auto px-4 py-3 text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">{h}</TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {facturasFiltradas.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="p-12 text-center whitespace-normal text-slate-500 dark:text-slate-400">
                                            <span className="mb-2 flex justify-center opacity-40"><IconFactura /></span>
                                            <p>No hay facturas que coincidan.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : facturasFiltradas.map(f => {
                                    const cfg = estadoConfig(f.estado)
                                    const dias = diasParaVencer(f.fecha_vencimiento)
                                    const proxima = dias !== null && dias >= 0 && dias <= 10
                                    const vencida = dias !== null && dias < 0
                                    const seleccionada = facturaSeleccionada?.id === f.id

                                    return (
                                        <>
                                        <TableRow key={f.id}
                                            className={`cursor-pointer border-slate-100 dark:border-slate-700 ${seleccionada ? 'bg-blue-50 hover:bg-blue-50 dark:bg-blue-950/40 dark:hover:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                                            onClick={() => setFacturaSeleccionada(seleccionada ? null : f)}>
                                            <TableCell className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap text-slate-900 dark:text-slate-100">{f.proveedor_nombre}</TableCell>
                                            <TableCell className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-900 dark:text-slate-100">{f.numero_factura}</TableCell>
                                            <TableCell className="px-4 py-3 text-xs whitespace-nowrap text-slate-500 dark:text-slate-400">{formatearSoloFecha(f.fecha_emision)}</TableCell>
                                            <TableCell className="px-4 py-3 text-xs whitespace-nowrap">
                                                {f.fecha_vencimiento ? (
                                                    <span className={`font-semibold ${vencida ? 'text-red-500' : proxima ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {formatearSoloFecha(f.fecha_vencimiento)}
                                                        {vencida && <span className="ml-1 text-[10px]">({Math.abs(dias)}d vencida)</span>}
                                                        {proxima && !vencida && <span className="ml-1 text-[10px]">({dias}d)</span>}
                                                    </span>
                                                ) : '—'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-[13px] font-bold whitespace-nowrap text-slate-900 dark:text-slate-100">Gs. {parseInt(f.monto_total).toLocaleString('es-PY')}</TableCell>
                                            <TableCell className={`px-4 py-3 text-[13px] font-bold whitespace-nowrap ${parseInt(f.saldo) > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                                {parseInt(f.saldo) > 0 ? `Gs. ${parseInt(f.saldo).toLocaleString('es-PY')}` : '—'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 whitespace-nowrap">
                                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${f.tipo === 'contado' ? 'bg-green-100 text-green-600 dark:bg-green-500/15' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/15'}`}>
                                                    {f.tipo === 'contado' ? 'Contado' : 'Crédito'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 whitespace-nowrap">
                                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.badgeCls}`}>
                                                    {cfg.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 whitespace-nowrap">
                                                {f.tipo === 'credito' && f.estado !== 'pagado' && (
                                                    <Button size="sm" className="gap-1 bg-green-600 text-white hover:bg-green-700" onClick={e => { e.stopPropagation(); setFormPago({ numero_recibo: '', monto: f.saldo, metodo_pago: 'efectivo', fecha_pago: fechaHoyPY(), tipo_pago: 'total', notas: '' }); setModalPago(f) }}>
                                                        <IconTarjeta /> Pagar
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>

                                        {/* Fila expandida — pagos */}
                                        {seleccionada && f.pagos?.length > 0 && (
                                            <TableRow key={`${f.id}-pagos`} className="border-slate-100 hover:bg-transparent dark:border-slate-700">
                                                <TableCell colSpan={9} className="whitespace-normal bg-slate-50 p-0 dark:bg-slate-900">
                                                    <div className="p-4 px-5">
                                                        <p className="mb-2.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                                                            Historial de pagos
                                                        </p>
                                                        <div className="flex flex-col gap-1.5">
                                                            {f.pagos.map((pago, i) => (
                                                                <div key={i} className="flex items-center gap-4 rounded-lg bg-white px-3 py-2 text-xs dark:bg-slate-800">
                                                                    <span className="min-w-[80px] text-slate-400 dark:text-slate-500">{formatearSoloFecha(pago.fecha_pago)}</span>
                                                                    {pago.numero_recibo && <span className="font-mono text-slate-500 dark:text-slate-400">Recibo: {pago.numero_recibo}</span>}
                                                                    <span className="font-bold text-green-500">Gs. {parseInt(pago.monto).toLocaleString('es-PY')}</span>
                                                                    <span className="text-slate-500 dark:text-slate-400">{pago.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</span>
                                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${pago.tipo_pago === 'total' ? 'bg-green-100 text-green-600 dark:bg-green-500/15' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/15'}`}>
                                                                        {pago.tipo_pago === 'total' ? 'Pago total' : 'Pago parcial'}
                                                                    </span>
                                                                    {pago.notas && <span className="text-slate-400 dark:text-slate-500">{pago.notas}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        </>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            )}

            {/* ── REPORTES ── */}
            {pestana === 'reportes' && (
                <div className="page-scroll flex-1 overflow-y-auto p-8">
                    <div className="mx-auto max-w-[900px]">
                        <div className="mb-6 flex items-center justify-between">
                            <h1 className="text-[22px] font-extrabold text-slate-900 dark:text-slate-100">Reportes de Compras</h1>
                            <div className="flex items-center gap-1.5">
                                {['semana', 'mes', 'anual', 'personalizado'].map(p => (
                                    <button key={p} onClick={() => setFiltroPeriodo(p)}
                                        className={`cursor-pointer rounded-full border px-3.5 py-[7px] text-xs font-semibold capitalize ${filtroPeriodo === p ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                        {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : p === 'anual' ? 'Año' : 'Personalizado'}
                                    </button>
                                ))}
                                {filtroPeriodo === 'personalizado' && (
                                    <>
                                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-[7px] text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                                    </>
                                )}
                            </div>
                        </div>

                        {!reportes ? (
                            <div className="p-15 text-center text-slate-500 dark:text-slate-400">Cargando reportes...</div>
                        ) : (
                            <div className="flex flex-col gap-4">

                                {/* Métricas */}
                                <div className="grid grid-cols-4 gap-3">
                                    {[
                                        { label: 'Total comprado', val: `Gs. ${parseInt(reportes.resumen.total_comprado||0).toLocaleString('es-PY')}`, colorCls: 'text-slate-900 dark:text-slate-100' },
                                        { label: 'Facturas', val: reportes.resumen.total_facturas, colorCls: 'text-blue-500' },
                                        { label: 'Promedio factura', val: `Gs. ${parseInt(reportes.resumen.promedio_factura||0).toLocaleString('es-PY')}`, colorCls: 'text-amber-500' },
                                        { label: 'Total crédito', val: `Gs. ${parseInt(reportes.resumen.total_credito||0).toLocaleString('es-PY')}`, colorCls: 'text-red-500' },
                                    ].map((m, i) => (
                                        <Card key={i} className="rounded-xl shadow-sm">
                                            <CardContent className="p-[18px]">
                                                <p className="mb-2 text-[10px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">{m.label}</p>
                                                <p className={`text-lg font-extrabold ${m.colorCls}`}>{m.val}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                {/* Por proveedor */}
                                <Card className="rounded-xl shadow-sm">
                                    <div className="border-b border-slate-100 bg-slate-50 px-[18px] py-3.5 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Compras por proveedor</p>
                                    </div>
                                    {reportes.por_proveedor.length === 0 ? (
                                        <p className="p-5 text-center text-[13px] text-slate-500 dark:text-slate-400">Sin datos para este período.</p>
                                    ) : reportes.por_proveedor.map(p => {
                                        const maxTotal = Math.max(...reportes.por_proveedor.map(x => parseInt(x.total)))
                                        const pct = maxTotal > 0 ? Math.round((parseInt(p.total) / maxTotal) * 100) : 0
                                        return (
                                            <div key={p.id} className="border-b border-slate-100 px-[18px] py-3.5 dark:border-slate-700">
                                                <div className="mb-1.5 flex items-center justify-between">
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{p.nombre}</span>
                                                    <div className="text-right">
                                                        <p className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">Gs. {parseInt(p.total).toLocaleString('es-PY')}</p>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{p.cantidad} facturas · Prom. Gs. {parseInt(p.promedio).toLocaleString('es-PY')}</p>
                                                        {parseInt(p.deuda) > 0 && <p className="text-[11px] font-semibold text-red-500">Deuda: Gs. {parseInt(p.deuda).toLocaleString('es-PY')}</p>}
                                                    </div>
                                                </div>
                                                <div className="h-1 overflow-hidden rounded-full bg-slate-50 dark:bg-slate-900">
                                                    <div className="h-full rounded-full bg-slate-900 dark:bg-slate-100" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </Card>

                                {/* Por mes */}
                                <Card className="rounded-xl shadow-sm">
                                    <div className="border-b border-slate-100 bg-slate-50 px-[18px] py-3.5 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Compras por mes (últimos 12 meses)</p>
                                    </div>
                                    <div className="flex min-h-[100px] items-end gap-1.5 px-[18px] py-3.5">
                                        {reportes.por_mes.map((m, i) => {
                                            const maxVal = Math.max(...reportes.por_mes.map(x => parseInt(x.total)))
                                            const pct = maxVal > 0 ? Math.round((parseInt(m.total) / maxVal) * 80) + 10 : 10
                                            const mes = new Date(m.mes).toLocaleDateString('es-PY', { month: 'short', year: '2-digit', timeZone: 'America/Asuncion' })
                                            return (
                                                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                                                    <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Gs. {(parseInt(m.total)/1000000).toFixed(1)}M</p>
                                                    <div className="w-full min-h-[4px] rounded-t bg-slate-900 dark:bg-slate-100" style={{ height: `${pct}px` }} />
                                                    <p className="text-[9px] text-slate-400 dark:text-slate-500">{mes}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </Card>

                                {/* Próximas a vencer */}
                                {reportes.proximas_vencer.length > 0 && (
                                    <Card className="rounded-xl border-amber-200 shadow-sm">
                                        <div className="border-b border-amber-200 bg-amber-50 px-[18px] py-3.5 dark:bg-amber-500/10">
                                            <p className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400"><IconReloj /> Próximas a vencer (10 días)</p>
                                        </div>
                                        {reportes.proximas_vencer.map(f => (
                                            <div key={f.id} className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-[18px] py-3 dark:border-slate-700"
                                                onClick={() => { setPestana('facturas'); setFiltroEstado('pendiente') }}>
                                                <div>
                                                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p className="text-[11px] text-amber-500">Vence: {formatearSoloFecha(f.fecha_vencimiento)} ({diasParaVencer(f.fecha_vencimiento)} días)</p>
                                                </div>
                                                <p className="text-sm font-extrabold text-amber-500">Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                            </div>
                                        ))}
                                    </Card>
                                )}

                                {/* Vencidas */}
                                {reportes.vencidas.length > 0 && (
                                    <Card className="rounded-xl border-red-300 shadow-sm">
                                        <div className="border-b border-red-300 bg-red-100 px-[18px] py-3.5 dark:bg-red-500/10">
                                            <p className="text-xs font-bold text-red-800 dark:text-red-400">Facturas vencidas ({reportes.vencidas.length})</p>
                                        </div>
                                        {reportes.vencidas.map(f => (
                                            <div key={f.id} className="flex cursor-pointer items-center justify-between border-b border-slate-100 px-[18px] py-3 dark:border-slate-700"
                                                onClick={() => { setPestana('facturas'); setFiltroEstado('vencido') }}>
                                                <div>
                                                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p className="text-[11px] text-red-500">Venció el {formatearSoloFecha(f.fecha_vencimiento)} — {f.dias_vencida} días vencida</p>
                                                </div>
                                                <p className="text-sm font-extrabold text-red-500">Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                            </div>
                                        ))}
                                    </Card>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL PROVEEDOR ── */}
            {modalProveedor && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-[520px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{modalProveedor === 'nuevo' ? 'Nuevo proveedor' : 'Editar proveedor'}</h3>
                            <button onClick={() => setModalProveedor(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <label className={labelCls}>Nombre / Razón social *</label>
                        <input value={formProveedor.nombre} onChange={e => setFormProveedor({...formProveedor, nombre: e.target.value})} className={inputCls} />
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>RUC</label><input value={formProveedor.ruc} onChange={e => setFormProveedor({...formProveedor, ruc: e.target.value})} className={inputCls} /></div>
                            <div><label className={labelCls}>Teléfono</label><input value={formProveedor.telefono} onChange={e => setFormProveedor({...formProveedor, telefono: e.target.value})} className={inputCls} /></div>
                            <div><label className={labelCls}>Email</label><input value={formProveedor.email} onChange={e => setFormProveedor({...formProveedor, email: e.target.value})} className={inputCls} /></div>
                            <div><label className={labelCls}>Banco</label><input value={formProveedor.banco} onChange={e => setFormProveedor({...formProveedor, banco: e.target.value})} className={inputCls} /></div>
                            <div className="col-span-2"><label className={labelCls}>Número de cuenta</label><input value={formProveedor.numero_cuenta} onChange={e => setFormProveedor({...formProveedor, numero_cuenta: e.target.value})} className={inputCls} /></div>
                            <div className="col-span-2"><label className={labelCls}>Dirección</label><input value={formProveedor.direccion} onChange={e => setFormProveedor({...formProveedor, direccion: e.target.value})} className={inputCls} /></div>
                            <div className="col-span-2"><label className={labelCls}>Notas</label><textarea value={formProveedor.notas} onChange={e => setFormProveedor({...formProveedor, notas: e.target.value})} rows={2} className={`${inputCls} resize-none font-sans`} /></div>
                        </div>
                        <div className="mt-1 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalProveedor(null)}>Cancelar</Button>
                            <Button onClick={handleGuardarProveedor}>Guardar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL FACTURA ── */}
            {modalFactura && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="max-h-[90vh] w-[560px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nueva factura de compra</h3>
                            <button onClick={() => setModalFactura(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className={labelCls}>Timbrado del proveedor</label>
                                <input value={formFactura.timbrado_proveedor || ''} onChange={e => setFormFactura({...formFactura, timbrado_proveedor: e.target.value})} placeholder="Ej: 18138433" className={inputCls} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Número de factura *</label>
                                <input value={formFactura.numero_factura} onChange={e => setFormFactura({...formFactura, numero_factura: e.target.value})} placeholder="Ej: 001-001-0000123" className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Fecha de emisión *</label>
                                <input type="date" value={formFactura.fecha_emision} onChange={e => setFormFactura({...formFactura, fecha_emision: e.target.value})} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Tipo *</label>
                                <select value={formFactura.tipo} onChange={e => setFormFactura({...formFactura, tipo: e.target.value, metodo_pago: e.target.value === 'credito' ? '' : 'efectivo'})} className={inputCls}>
                                    <option value="contado">Contado</option>
                                    <option value="credito">Crédito</option>
                                </select>
                            </div>
                            {formFactura.tipo === 'credito' ? (
                                <div>
                                    <label className={labelCls}>Plazo (días)</label>
                                    <input type="number" value={formFactura.plazo_dias} onChange={e => setFormFactura({...formFactura, plazo_dias: e.target.value})} placeholder="Ej: 30, 60, 90" className={inputCls} />
                                </div>
                            ) : (
                                <div>
                                    <label className={labelCls}>Método de pago *</label>
                                    <select value={formFactura.metodo_pago} onChange={e => setFormFactura({...formFactura, metodo_pago: e.target.value})} className={inputCls}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                            )}

                            {/* Montos */}
                            <div className="col-span-2 mt-1 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-700">
                                <p className="text-[11px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">Montos</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 dark:text-slate-400">Suma IVA</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nuevo = !sumaIva
                                            setSumaIva(nuevo)
                                            if (!nuevo) {
                                                setFormFactura(prev => {
                                                    const total = prev.monto_total || ''
                                                    return { ...prev, gravada_10: '', iva_10: '', gravada_5: '', iva_5: '', exentas: total }
                                                })
                                            } else {
                                                setFormFactura(prev => ({ ...prev, exentas: '', monto_total: '' }))
                                            }
                                        }}
                                        className={`relative h-[22px] w-10 flex-shrink-0 cursor-pointer rounded-full border-none transition-colors ${sumaIva ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                    >
                                        <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${sumaIva ? 'left-[21px]' : 'left-[3px]'}`} />
                                    </button>
                                </div>
                            </div>

                            {sumaIva ? (
                                <>
                                {/* Gravada 10% */}
                                <div>
                                    <label className={labelCls}>Gravada 10%</label>
                                    <input
                                        value={formFactura.gravada_10 ? parseInt(formFactura.gravada_10).toLocaleString('es-PY') : ''}
                                        onChange={e => {
                                            const grav10 = parsearMiles(e.target.value)
                                            const iva10 = grav10 ? String(Math.floor(parseInt(grav10) / 11)) : ''
                                            setFormFactura(prev => {
                                                const next = { ...prev, gravada_10: grav10, iva_10: iva10 }
                                                return { ...next, monto_total: calcularTotal(next) }
                                            })
                                        }}
                                        placeholder="Gs. 0"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>IVA 10% (auto)</label>
                                    <input
                                        value={formFactura.iva_10 ? parseInt(formFactura.iva_10).toLocaleString('es-PY') : ''}
                                        readOnly
                                        className={`${inputCls} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400`}
                                    />
                                </div>

                                {/* Gravada 5% */}
                                <div>
                                    <label className={labelCls}>Gravada 5%</label>
                                    <input
                                        value={formFactura.gravada_5 ? parseInt(formFactura.gravada_5).toLocaleString('es-PY') : ''}
                                        onChange={e => {
                                            const grav5 = parsearMiles(e.target.value)
                                            const iva5 = grav5 ? String(Math.floor(parseInt(grav5) / 21)) : ''
                                            setFormFactura(prev => {
                                                const next = { ...prev, gravada_5: grav5, iva_5: iva5 }
                                                return { ...next, monto_total: calcularTotal(next) }
                                            })
                                        }}
                                        placeholder="Gs. 0"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>IVA 5% (auto)</label>
                                    <input
                                        value={formFactura.iva_5 ? parseInt(formFactura.iva_5).toLocaleString('es-PY') : ''}
                                        readOnly
                                        className={`${inputCls} cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400`}
                                    />
                                </div>

                                {/* Exentas */}
                                <div className="col-span-2">
                                    <label className={labelCls}>Exentas</label>
                                    <input
                                        value={formFactura.exentas ? parseInt(formFactura.exentas).toLocaleString('es-PY') : ''}
                                        onChange={e => {
                                            const exentas = parsearMiles(e.target.value)
                                            setFormFactura(prev => {
                                                const next = { ...prev, exentas }
                                                return { ...next, monto_total: calcularTotal(next) }
                                            })
                                        }}
                                        placeholder="Gs. 0"
                                        className={inputCls}
                                    />
                                </div>
                                </>
                            ) : (
                                <div className="col-span-2">
                                    <label className={labelCls}>Monto total</label>
                                    <input
                                        value={formFactura.exentas ? parseInt(formFactura.exentas).toLocaleString('es-PY') : ''}
                                        onChange={e => {
                                            const monto = parsearMiles(e.target.value)
                                            setFormFactura(prev => ({ ...prev, exentas: monto, gravada_10: '', iva_10: '', gravada_5: '', iva_5: '', monto_total: monto }))
                                        }}
                                        placeholder="Gs. 0"
                                        className={inputCls}
                                    />
                                </div>
                            )}

                            {/* Total calculado */}
                            <div className="col-span-2 flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                <span className="text-[13px] font-bold tracking-wide text-slate-500 uppercase dark:text-slate-400">Total</span>
                                <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                                    Gs. {formFactura.monto_total ? parseInt(formFactura.monto_total).toLocaleString('es-PY') : '0'}
                                </span>
                            </div>

                            {/* Notas */}
                            <div className="col-span-2">
                                <label className={labelCls}>Notas</label>
                                <textarea value={formFactura.notas} onChange={e => setFormFactura({...formFactura, notas: e.target.value})} rows={2} className={`${inputCls} resize-none font-sans`} />
                            </div>
                        </div>

                        {formFactura.tipo === 'credito' && formFactura.plazo_dias && formFactura.fecha_emision && (
                            <div className="mt-1 rounded-lg bg-blue-50 px-3.5 py-2.5 text-xs text-blue-500 dark:bg-blue-500/10">
                                Vence el {new Date(new Date(formFactura.fecha_emision).setDate(new Date(formFactura.fecha_emision).getDate() + parseInt(formFactura.plazo_dias))).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                            </div>
                        )}

                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalFactura(null)}>Cancelar</Button>
                            <Button onClick={handleGuardarFactura}>Guardar factura</Button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL PAGO ── */}
            {modalPago && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[440px] rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Registrar pago</h3>
                            <button onClick={() => setModalPago(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="mb-4 rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-900">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Factura: <strong className="text-slate-900 dark:text-slate-100">{modalPago.numero_factura}</strong></p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Saldo pendiente: <strong className="text-red-500">Gs. {parseInt(modalPago.saldo).toLocaleString('es-PY')}</strong></p>
                        </div>

                        <label className={labelCls}>Número de recibo</label>
                        <input value={formPago.numero_recibo} onChange={e => setFormPago({...formPago, numero_recibo: e.target.value})} placeholder="Opcional" className={inputCls} />
                        <label className={labelCls}>Monto *</label>
                        <input
                            value={formPago.monto ? parseInt(formPago.monto).toLocaleString('es-PY') : ''}
                            onChange={e => setFormPago({...formPago, monto: parsearMiles(e.target.value)})}
                            placeholder="Gs. 0"
                            className={inputCls}
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Método de pago *</label>
                                <select value={formPago.metodo_pago} onChange={e => setFormPago({...formPago, metodo_pago: e.target.value})} className={inputCls}>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Fecha de pago *</label>
                                <input type="date" value={formPago.fecha_pago} onChange={e => setFormPago({...formPago, fecha_pago: e.target.value})} className={inputCls} />
                            </div>
                        </div>
                        <label className={labelCls}>Tipo de pago *</label>
                        <div className="mb-2.5 grid grid-cols-2 gap-2">
                            {[{ val: 'parcial', label: 'Pago parcial' }, { val: 'total', label: 'Pago total' }].map(t => (
                                <button key={t.val} onClick={() => setFormPago({...formPago, tipo_pago: t.val, monto: t.val === 'total' ? modalPago.saldo.toString() : formPago.monto})}
                                className={`cursor-pointer rounded-lg border-2 p-2.5 text-[13px] ${formPago.tipo_pago === t.val ? 'border-blue-500 bg-blue-50 font-bold text-blue-500 dark:bg-blue-500/15' : 'border-slate-200 font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400'}`}>
                                {t.label}
                            </button>
                            ))}
                        </div>
                        <label className={labelCls}>Notas</label>
                        <textarea value={formPago.notas} onChange={e => setFormPago({...formPago, notas: e.target.value})} rows={2} className={`${inputCls} resize-none font-sans`} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalPago(null)}>Cancelar</Button>
                            <Button className="bg-green-600 text-white hover:bg-green-700" onClick={handleRegistrarPago}>Registrar pago</Button>
                        </div>
                    </div>
                </div>
            )}

            {modalLibroCompras && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[420px] rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Libro de Compras</h3>
                            <button onClick={() => setModalLibroCompras(false)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
                            Exportá el libro de compras en formato DNIT con IVA discriminado.
                        </p>
                        <label className={labelCls}>Fecha desde</label>
                        <input type="date" value={libroComprasFechaDesde} onChange={e => setLibroComprasFechaDesde(e.target.value)} className={`${inputCls} mb-3`} />
                        <label className={labelCls}>Fecha hasta</label>
                        <input type="date" value={libroComprasFechaHasta} onChange={e => setLibroComprasFechaHasta(e.target.value)} className={`${inputCls} mb-5`} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalLibroCompras(false)}>
                                Cancelar
                            </Button>
                            <Button disabled={exportandoLibroCompras} className="bg-green-600 text-white hover:bg-green-700" onClick={handleExportarLibroCompras}>
                                {exportandoLibroCompras ? 'Exportando...' : '⬇ Descargar Excel'}
                            </Button>
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

export default Proveedores
