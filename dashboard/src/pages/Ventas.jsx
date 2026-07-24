import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getHistorial, actualizarEstadoVenta, anularVenta, actualizarMetodoPago } from '../services/ventas'
import { getCuentasTransferencia } from '../services/cuentasTransferencia'
import ModalConfirmar from '../components/ModalConfirmar'
import * as XLSX from 'xlsx'
import { getLibroVentas } from '../services/ventas'
import { formatearFecha, fechaHoyPY, fechaInicioMesPY } from '../utils/fecha'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-[13px] text-slate-900 dark:text-slate-100 outline-none transition-shadow focus:border-slate-300 dark:focus:border-slate-600 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-slate-100/5'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

function colorMetodoPago(metodo) {
    return {
        efectivo: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
        tarjeta: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400',
        transferencia: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
    }[metodo] || 'bg-slate-100 text-slate-500 dark:bg-slate-700'
}

function colorEstado(estado) {
    return {
        pendiente_pago: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400',
        pagado: 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400',
        entregado: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400',
        cancelado: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400',
    }[estado] || 'bg-slate-100 text-slate-500 dark:bg-slate-700'
}

function Ventas() {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [ventaDetalle, setVentaDetalle] = useState(null)
    const [modalLibro, setModalLibro] = useState(false)
    const [libroFechaDesde, setLibroFechaDesde] = useState(fechaInicioMesPY())
    const [libroFechaHasta, setLibroFechaHasta] = useState(fechaHoyPY())
    const [exportandoLibro, setExportandoLibro] = useState(false)

    const [periodo, setPeriodo] = useState('hoy')
    const [buscar, setBuscar] = useState('')
    const [metodoPago, setMetodoPago] = useState('')
    const [canal, setCanal] = useState('')
    const [pagina, setPagina] = useState(1)
    const [estadoFiltro, setEstadoFiltro] = useState('')
    const [cuentasTransferencia, setCuentasTransferencia] = useState([])

   useEffect(() => {
        cargarHistorial()
    }, [periodo, metodoPago, canal, pagina, estadoFiltro])

    useEffect(() => {
        getCuentasTransferencia().then(setCuentasTransferencia).catch(() => {})
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => cargarHistorial(), 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function handleExportarLibroVentas() {
        setExportandoLibro(true)
        try {
            const datos = await getLibroVentas(libroFechaDesde, libroFechaHasta)

            const filas = datos.map((v, idx) => {
                const anulada = v.estado === 'cancelado'
                const total = anulada ? 0 : parseInt(v.total || 0)
                const tipoIva = v.tipo_iva || '10'

                let grav10 = 0, iva10 = 0, grav5 = 0, iva5 = 0, exenta = 0

                if (!anulada) {
                    if (tipoIva === '10') {
                        iva10 = Math.floor(total / 11)
                        grav10 = total - iva10
                    } else if (tipoIva === '5') {
                        iva5 = Math.floor(total / 21)
                        grav5 = total - iva5
                    } else {
                        exenta = total
                    }
                }

                const cliente = anulada ? '—' : (v.es_ticket ? 'CONSUMIDOR FINAL' : (v.razon_social || v.cliente_nombre || 'CONSUMIDOR FINAL'))
                const ruc = anulada || v.es_ticket ? '—' : (v.ruc_factura || v.cliente_ruc || '—')
                const nroFactura = v.es_ticket ? '' : (v.numero_factura || `#${String(v.id).padStart(7, '0')}`)

                return {
                    'N°': idx + 1,
                    'Fecha': new Date(v.fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' }),
                    'Tipo Documento': v.es_ticket ? 'Ticket' : 'Factura',
                    'N° Factura': nroFactura,
                    'Cliente': cliente,
                    'RUC / CI': ruc,
                    'Gravada 10%': grav10,
                    'IVA 10%': iva10,
                    'Gravada 5%': grav5,
                    'IVA 5%': iva5,
                    'Exentas': exenta,
                    'Total': total,
                    'Observación': anulada ? 'ANULADA' : ''
                }
            })

            // Totales solo sobre facturas vigentes
            const filasVigentes = filas.filter(f => f['Observación'] !== 'ANULADA')
            const totales = {
                'N°': '',
                'Fecha': '',
                'Tipo Documento': '',
                'N° Factura': '',
                'Cliente': 'TOTALES',
                'RUC / CI': '',
                'Gravada 10%': filasVigentes.reduce((s, f) => s + f['Gravada 10%'], 0),
                'IVA 10%': filasVigentes.reduce((s, f) => s + f['IVA 10%'], 0),
                'Gravada 5%': filasVigentes.reduce((s, f) => s + f['Gravada 5%'], 0),
                'IVA 5%': filasVigentes.reduce((s, f) => s + f['IVA 5%'], 0),
                'Exentas': filasVigentes.reduce((s, f) => s + f['Exentas'], 0),
                'Total': filasVigentes.reduce((s, f) => s + f['Total'], 0),
                'Observación': ''
            }

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet([...filas, totales])

            // Anchos de columna
            ws['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
                { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
                { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
            ]

            // Colorear en rojo las filas anuladas (fila 0 = header, datos desde fila 1)
            const numCols = Object.keys(filas[0] || {}).length
            const estiloAnulada = {
                font: { color: { rgb: 'C0392B' } },
                fill: { patternType: 'solid', fgColor: { rgb: 'FDECEA' } }
            }
            filas.forEach((fila, rowIdx) => {
                if (fila['Observación'] === 'ANULADA') {
                    for (let c = 0; c < numCols; c++) {
                        const addr = XLSX.utils.encode_cell({ r: rowIdx + 1, c })
                        if (ws[addr]) ws[addr].s = estiloAnulada
                    }
                }
            })

            XLSX.utils.book_append_sheet(wb, ws, 'Libro de Ventas')
            XLSX.writeFile(wb, `libro_ventas_${libroFechaDesde}_${libroFechaHasta}.xlsx`, { cellStyles: true })
            setModalLibro(false)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar el libro de ventas.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportandoLibro(false) }
    }

    async function cargarHistorial() {
        try {
            setCargando(true)
            const params = { periodo, pagina }
            if (estadoFiltro) params.estado = estadoFiltro
            if (buscar) params.buscar = buscar
            if (metodoPago) params.metodo_pago = metodoPago
            if (canal) params.canal = canal
            const resultado = await getHistorial(params)
            setDatos(resultado)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo cargar el historial.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargando(false)
        }
    }

    async function cambiarEstado(id, nuevoEstado) {
        try {
            await actualizarEstadoVenta(id, nuevoEstado)
            await cargarHistorial()
            if (ventaDetalle?.id === id) {
                setVentaDetalle(prev => ({ ...prev, estado: nuevoEstado }))
            }
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo actualizar el estado.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function cambiarMetodoPago(id, nuevoMetodo, cuentaTransferenciaId = null, subtipoPago = null) {
        try {
            await actualizarMetodoPago(id, nuevoMetodo, cuentaTransferenciaId, subtipoPago)
            await cargarHistorial()
            const cuenta = cuentasTransferencia.find(c => c.id === parseInt(cuentaTransferenciaId))
            setVentaDetalle(prev => prev?.id === id ? {
                ...prev,
                metodo_pago: nuevoMetodo,
                cuenta_transferencia_id: cuentaTransferenciaId ? parseInt(cuentaTransferenciaId) : null,
                cuenta_transferencia_banco: cuenta?.banco || null,
                cuenta_transferencia_titular: cuenta?.titular || null,
                cuenta_transferencia_alias: cuenta?.alias || null,
                subtipo_pago: nuevoMetodo === 'tarjeta' ? subtipoPago : null,
            } : prev)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: err.response?.data?.error || 'No se pudo cambiar el método de pago.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function confirmarAnular(venta) {
        setModalConfirmar({
            titulo: 'Anular venta',
            mensaje: `¿Anular la venta #${venta.id} por Gs. ${parseInt(venta.precio).toLocaleString('es-PY')}? El stock de los productos volverá al inventario. Esta acción no se puede deshacer.`,
            textoBoton: 'Anular venta',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await anularVenta(venta.id)
                    setModalConfirmar(null)
                    if (ventaDetalle?.id === venta.id) setVentaDetalle(prev => ({ ...prev, estado: 'cancelado' }))
                    await cargarHistorial()
                } catch (err) {
                    setModalConfirmar({
                        titulo: 'Error',
                        mensaje: err.response?.data?.error || 'No se pudo anular la venta.',
                        textoBoton: 'Cerrar',
                        colorBoton: '#888',
                        onConfirmar: () => setModalConfirmar(null)
                    })
                }
            }
        })
    }

   function formatearGs(numero) {
        return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}`
    }

    function iniciales(nombre) {
        if (!nombre) return 'CF'
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    function labelCanal(canal) {
        const labels = {
            en_tienda: 'En tienda', whatsapp_bot: 'Bot',
            whatsapp: 'WhatsApp', whatsapp_delivery: 'Delivery',
            pagina_web: 'Web', presencial: 'Presencial', otro: 'Otro'
        }
        return labels[canal] || (canal ? canal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—')
    }

    const tabs = [
        { valor: 'hoy', label: 'Hoy' },
        { valor: 'semanal', label: 'Semanal' },
        { valor: 'mensual', label: 'Mensual' },
        { valor: 'anual', label: 'Anual' },
    ]

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:mx-auto lg:max-w-[1400px] lg:p-8">

            <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Historial de Ventas</h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gestioná y supervisá todas las transacciones realizadas.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setModalLibro(true)}>Libro de Ventas</Button>
                    <Button onClick={() => navigate('/dashboard/caja')}>+ Nueva venta</Button>
                </div>
            </div>

            {/* Tarjetas resumen */}
            {datos?.resumen && (
                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Total del Día', valor: formatearGs(datos.resumen.dia.total), sub: `${datos.resumen.dia.cantidad} transacciones hoy`, accent: 'border-b-slate-900 dark:border-b-indigo-500' },
                        { label: 'Total de la Semana', valor: formatearGs(datos.resumen.semana.total), sub: `${datos.resumen.semana.cantidad} transacciones esta semana`, accent: 'border-b-indigo-500' },
                        { label: 'Ventas del Mes', valor: formatearGs(datos.resumen.mes.total), sub: `${datos.resumen.mes.cantidad} transacciones este mes`, accent: 'border-b-slate-400' },
                    ].map((t, i) => (
                        <Card key={i} className={`border-b-4 ${t.accent}`}>
                            <CardContent>
                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t.label}</span>
                                <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100">{t.valor}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.sub}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Tabla */}
            <Card className="py-0 gap-0">

                {/* Tabs */}
                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-4 dark:border-slate-700 sm:px-6">
                    {tabs.map(tab => (
                        <button key={tab.valor} onClick={() => { setPeriodo(tab.valor); setPagina(1) }}
                            className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-[13px] transition-colors ${periodo === tab.valor ? 'border-slate-900 font-bold text-slate-900 dark:border-indigo-500 dark:text-slate-100' : 'border-transparent font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 items-end gap-3 border-b border-slate-100 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/40 sm:grid-cols-2 lg:grid-cols-5">
                    <div>
                        <label className={labelCls}>Buscar transacción / cliente</label>
                        <input placeholder="ID, nombre o número..." value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(1) }} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Método de pago</label>
                        <Select value={metodoPago} onValueChange={v => { setMetodoPago(v); setPagina(1) }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Todos</SelectItem>
                                <SelectItem value="efectivo">Efectivo</SelectItem>
                                <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                <SelectItem value="transferencia">Transferencia</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className={labelCls}>Canal</label>
                        <Select value={canal} onValueChange={v => { setCanal(v); setPagina(1) }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Todos</SelectItem>
                                <SelectItem value="en_tienda">En tienda</SelectItem>
                                <SelectItem value="whatsapp_bot">WhatsApp Bot</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="presencial">Presencial</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className={labelCls}>Estado</label>
                        <Select value={estadoFiltro} onValueChange={v => { setEstadoFiltro(v); setPagina(1) }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Todos</SelectItem>
                                <SelectItem value="pendiente_pago">Pendiente de pago</SelectItem>
                                <SelectItem value="pagado">Pagado</SelectItem>
                                <SelectItem value="entregado">Entregado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Button variant="outline" onClick={() => { setBuscar(''); setMetodoPago(''); setCanal(''); setEstadoFiltro(''); setPagina(1) }} className="w-full">
                            Limpiar filtros
                        </Button>
                    </div>
                </div>

                {cargando ? (
                    <div className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando...</div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                {['ID', 'Cliente', 'Producto', 'Fecha', 'Método / Canal', 'Estado', 'Total', ''].map((h, i) => (
                                    <TableHead key={i} className={`text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2.5 px-3 ${i === 4 || i === 5 ? 'text-center' : i === 6 ? 'text-right' : ''}`}>{h}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {datos?.ventas?.length === 0 ? (
                                <TableRow><TableCell colSpan={8} className="p-10 text-center text-[13px] text-slate-500 dark:text-slate-400">No hay ventas en este período.</TableCell></TableRow>
                            ) : (
                                datos?.ventas?.map(venta => {
                                    const nombreCliente = venta.cliente_nombre || venta.razon_social || venta.cliente_numero || 'Consumidor final'
                                    return (
                                        <TableRow key={venta.id} className="border-slate-100 dark:border-slate-700">
                                            <TableCell className="px-3 py-3">
                                                <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">#{String(venta.id).padStart(4, '0')}</span>
                                                {venta.numero_factura && (
                                                    <p className="mt-0.5 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                                                        {venta.numero_factura.startsWith('TICKET-') ? 'Ticket' : venta.numero_factura}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="max-w-[130px] whitespace-normal px-3 py-3 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                                                        {iniciales(nombreCliente)}
                                                    </div>
                                                    <span className="truncate font-medium text-slate-900 dark:text-slate-100">{nombreCliente}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[220px] whitespace-normal px-3 py-3 text-xs leading-snug text-slate-500 dark:text-slate-400">
                                                {Array.isArray(venta.items) && venta.items.length > 1
                                                    ? <span className="font-semibold text-slate-900 dark:text-slate-100">{venta.items.length} productos</span>
                                                    : <>{venta.marca_nombre && `${venta.marca_nombre} — `}{venta.producto_nombre} {venta.presentacion_nombre}</>
                                                }
                                            </TableCell>
                                            <TableCell className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">{formatearFecha(venta.created_at)}</TableCell>
                                            <TableCell className="px-3 py-3 text-center">
                                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${colorMetodoPago(venta.metodo_pago)}`}>
                                                    {venta.metodo_pago || '—'}
                                                </span>
                                                <p className="mt-1 text-[9px] text-slate-400 dark:text-slate-500">{labelCanal(venta.canal)}</p>
                                                {venta.metodo_pago === 'transferencia' && venta.cuenta_transferencia_banco && (
                                                    <p className="mt-0.5 text-[9px] font-semibold text-indigo-500 dark:text-indigo-400">{venta.cuenta_transferencia_banco}</p>
                                                )}
                                                {venta.metodo_pago === 'tarjeta' && venta.subtipo_pago && (
                                                    <p className="mt-0.5 text-[9px] font-semibold text-indigo-500 dark:text-indigo-400">{venta.subtipo_pago === 'debito' ? 'Débito' : 'Crédito'}</p>
                                                )}
                                                {venta.tipo_venta === 'credito' && (
                                                    <span className="mt-1 block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                                                        Crédito
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 py-3 text-center">
                                                {venta.estado === 'cancelado' ? (
                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${colorEstado(venta.estado)}`}>ANULADA</span>
                                                ) : (
                                                    <Select value={venta.estado} onValueChange={v => cambiarEstado(venta.id, v)}>
                                                        <SelectTrigger className={`h-auto w-auto gap-1 px-1.5 py-1 text-[9px] font-bold uppercase ${colorEstado(venta.estado)}`}><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pendiente_pago">PENDIENTE</SelectItem>
                                                            <SelectItem value="pagado">PAGADO</SelectItem>
                                                            <SelectItem value="entregado">ENTREGADO</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-3 py-3 text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">{formatearGs(venta.precio)}</TableCell>
                                            <TableCell className="px-2 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => setVentaDetalle(venta)}
                                                        className="flex items-center rounded-md p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                    </button>
                                                    {venta.estado !== 'cancelado' && (
                                                        <button onClick={() => confirmarAnular(venta)}
                                                            title="Anular venta"
                                                            className="flex items-center rounded-md p-1 text-red-500 opacity-70 hover:opacity-100">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                )}

                {/* Paginación */}
                {datos?.paginacion && datos.paginacion.total > 0 && (
                    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-800/40 sm:flex-row">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Mostrando <strong>{((pagina - 1) * 20) + 1}–{Math.min(pagina * 20, datos.paginacion.total)}</strong> de <strong>{datos.paginacion.total}</strong> ventas
                        </p>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="icon-sm" onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1}>‹</Button>
                            {Array.from({ length: Math.min(5, datos.paginacion.total_paginas) }, (_, i) => {
                                const num = i + 1
                                return (
                                    <button key={num} onClick={() => setPagina(num)}
                                        className={`h-8 w-8 rounded-lg border text-xs font-semibold ${pagina === num ? 'border-slate-900 bg-slate-900 text-white dark:border-indigo-500 dark:bg-indigo-500' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'}`}>
                                        {num}
                                    </button>
                                )
                            })}
                            <Button variant="outline" size="icon-sm" onClick={() => setPagina(Math.min(datos.paginacion.total_paginas, pagina + 1))} disabled={pagina === datos.paginacion.total_paginas}>›</Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Panel detalle */}
            {ventaDetalle && (
                <div onClick={() => setVentaDetalle(null)} className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4 sm:p-10">
                <div onClick={e => e.stopPropagation()} className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-slate-800">

                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 px-5.5 py-4.5 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                                {iniciales(ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'CF')}
                            </div>
                            <div>
                                <p className="m-0 text-[15px] font-semibold text-slate-900 dark:text-slate-100">{ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'Cliente'}</p>
                                {ventaDetalle.cliente_ruc && <p className="m-0 mt-0.5 text-xs text-slate-500 dark:text-slate-400">RUC {ventaDetalle.cliente_ruc}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {ventaDetalle.numero_factura && <p className="m-0 font-mono text-[11px] text-slate-400 dark:text-slate-500">{ventaDetalle.numero_factura.startsWith('TICKET-') ? 'Ticket' : ventaDetalle.numero_factura}</p>}
                            <div className="flex items-center gap-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ventaDetalle.tipo_venta === 'credito' ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400'}`}>
                                    {ventaDetalle.tipo_venta === 'credito' ? `Crédito ${ventaDetalle.plazo_dias}d` : 'Contado'}
                                </span>
                                <button onClick={() => setVentaDetalle(null)} className="px-1 text-base leading-none text-slate-400 hover:text-slate-600">✕</button>
                            </div>
                        </div>
                    </div>

                    {/* Productos */}
                    <div className="px-5.5 pb-1.5 pt-4">
                        <div className="mb-2 flex items-center justify-between">
                            <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Productos</p>
                            {Array.isArray(ventaDetalle.items) && ventaDetalle.items.length > 0 && (
                                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{ventaDetalle.items.length} {ventaDetalle.items.length === 1 ? 'ítem' : 'ítems'}</span>
                            )}
                        </div>
                        {/* Cabecera de tabla */}
                        <div className="grid grid-cols-[34px_1fr_92px_92px] gap-2 border-b border-slate-100 px-1 pb-1.5 dark:border-slate-700">
                            <span className="text-center text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Cant</span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Producto</span>
                            <span className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">P. unit.</span>
                            <span className="text-right text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total</span>
                        </div>
                        {/* Filas */}
                        {(Array.isArray(ventaDetalle.items) && ventaDetalle.items.length > 0
                            ? ventaDetalle.items
                            : [{ producto_nombre: ventaDetalle.producto_nombre, presentacion_nombre: ventaDetalle.presentacion_nombre, cantidad: ventaDetalle.cantidad, precio_unitario: ventaDetalle.precio, precio_total: ventaDetalle.precio }]
                        ).map((item, idx) => (
                            <div key={idx} className="grid grid-cols-[34px_1fr_92px_92px] items-center gap-2 border-b border-slate-50 px-1 py-2.5 dark:border-slate-700/60">
                                <span className="rounded-md bg-indigo-100 py-0.5 text-center text-[13px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">{item.cantidad}</span>
                                <div className="min-w-0">
                                    <p className="m-0 text-[13px] font-semibold leading-tight text-slate-900 dark:text-slate-100">{item.producto_nombre}</p>
                                    <p className="m-0 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{item.presentacion_nombre}</p>
                                    {item.es_precio_especial && (
                                        <span className="mt-0.5 inline-block rounded-[5px] border border-red-300 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
                                            Precio especial {item.diferencial_precio > 0 ? '(-' : '(+'}{formatearGs(Math.abs(item.diferencial_precio))})
                                        </span>
                                    )}
                                </div>
                                <span className="text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
                                    {item.precio_unitario ? formatearGs(item.precio_unitario) : '—'}
                                </span>
                                <span className="text-right text-[13px] font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                    {formatearGs(item.precio_total || item.precio_unitario)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Totales */}
                    <div className="mx-5.5 mt-2 rounded-xl bg-slate-50 px-4 py-3.5 dark:bg-slate-900">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-slate-500 dark:text-slate-400">Total</span>
                            <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">{formatearGs(ventaDetalle.precio)}</span>
                        </div>
                        {ventaDetalle.ganancia > 0 && (
                            <div className="mt-1.5 flex items-center justify-between">
                                <span className="text-xs text-slate-500 dark:text-slate-400">Ganancia</span>
                                <span className="text-[13px] font-semibold tabular-nums text-green-600 dark:text-green-400">{formatearGs(ventaDetalle.ganancia)}</span>
                            </div>
                        )}
                    </div>

                    {/* Meta row */}
                    <div className="grid grid-cols-2 gap-x-5.5 gap-y-2.5 px-5.5 pb-1 pt-4">
                        <div>
                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Método de pago</p>
                            {ventaDetalle.estado === 'cancelado' ? (
                                <p className="m-0 text-[13px] font-semibold capitalize text-slate-900 dark:text-slate-100">{ventaDetalle.metodo_pago || '—'}</p>
                            ) : (
                                <Select
                                    value={ventaDetalle.metodo_pago || ''}
                                    onValueChange={v => cambiarMetodoPago(ventaDetalle.id, v, v === 'transferencia' ? ventaDetalle.cuenta_transferencia_id : null)}
                                >
                                    <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">— Sin definir —</SelectItem>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div>
                            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Canal</p>
                            <p className="m-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{labelCanal(ventaDetalle.canal)}</p>
                        </div>
                        {ventaDetalle.metodo_pago === 'transferencia' && (
                            <div className="col-span-2">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Cuenta receptora</p>
                                {ventaDetalle.estado === 'cancelado' ? (
                                    <p className="m-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                        {ventaDetalle.cuenta_transferencia_banco ? `${ventaDetalle.cuenta_transferencia_banco} — ${ventaDetalle.cuenta_transferencia_titular}` : '— Sin definir —'}
                                    </p>
                                ) : (
                                    <Select
                                        value={String(ventaDetalle.cuenta_transferencia_id || '')}
                                        onValueChange={v => cambiarMetodoPago(ventaDetalle.id, 'transferencia', v || null)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">¿A qué cuenta se transfirió?</SelectItem>
                                            {cuentasTransferencia.map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.banco} — {c.titular}{c.alias ? ` (${c.alias})` : ''}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}
                        {ventaDetalle.metodo_pago === 'tarjeta' && (
                            <div className="col-span-2">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Tipo de tarjeta</p>
                                {ventaDetalle.estado === 'cancelado' ? (
                                    <p className="m-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                        {ventaDetalle.subtipo_pago === 'debito' ? 'Débito' : ventaDetalle.subtipo_pago === 'credito' ? 'Crédito' : '— Sin definir —'}
                                    </p>
                                ) : (
                                    <Select
                                        value={ventaDetalle.subtipo_pago || ''}
                                        onValueChange={v => cambiarMetodoPago(ventaDetalle.id, 'tarjeta', null, v || null)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">— Sin definir —</SelectItem>
                                            <SelectItem value="debito">Débito</SelectItem>
                                            <SelectItem value="credito">Crédito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                        )}
                        {ventaDetalle.tipo_venta === 'credito' && ventaDetalle.fecha_vencimiento_credito && (
                            <div>
                                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Vencimiento</p>
                                <p className={`m-0 text-[13px] font-semibold ${new Date(ventaDetalle.fecha_vencimiento_credito) < new Date() ? 'text-red-600' : 'text-amber-700'}`}>
                                    {new Date(ventaDetalle.fecha_vencimiento_credito).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                                </p>
                            </div>
                        )}
                        {ventaDetalle.quiere_factura && ventaDetalle.ruc_factura && (
                            <div>
                                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">RUC factura</p>
                                <p className="m-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100">{ventaDetalle.ruc_factura}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    {ventaDetalle.estado === 'cancelado' ? (
                        <div className="mx-5.5 mb-5 mt-3 rounded-lg bg-red-50 px-4 py-2.5 text-center text-[13px] font-bold text-red-800 dark:bg-red-500/10 dark:text-red-400">
                            VENTA ANULADA
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5 px-5.5 pb-5 pt-4">
                            <Select value={ventaDetalle.estado} onValueChange={v => cambiarEstado(ventaDetalle.id, v)}>
                                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pendiente_pago">Pendiente de pago</SelectItem>
                                    <SelectItem value="pagado">Pagado</SelectItem>
                                    <SelectItem value="entregado">Entregado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" onClick={() => confirmarAnular(ventaDetalle)} className="whitespace-nowrap border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:hover:bg-red-500/10">
                                Anular
                            </Button>
                        </div>
                    )}

                </div>
                </div>
            )}

            {modalLibro && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[420px] rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Libro de Ventas</h3>
                            <button onClick={() => setModalLibro(false)} className="text-lg text-slate-400 hover:text-slate-600">✕</button>
                        </div>
                        <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
                            Exportá el libro de ventas en formato DNIT con IVA discriminado.
                        </p>
                        <label className={labelCls}>Fecha desde</label>
                        <input type="date" value={libroFechaDesde} onChange={e => setLibroFechaDesde(e.target.value)}
                            className={`${inputCls} mb-3`} />
                        <label className={labelCls}>Fecha hasta</label>
                        <input type="date" value={libroFechaHasta} onChange={e => setLibroFechaHasta(e.target.value)}
                            className={`${inputCls} mb-5`} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalLibro(false)}>Cancelar</Button>
                            <Button onClick={handleExportarLibroVentas} disabled={exportandoLibro} className={exportandoLibro ? '' : 'bg-green-600 hover:bg-green-700'}>
                                {exportandoLibro ? 'Exportando...' : '⬇ Descargar Excel'}
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

export default Ventas
