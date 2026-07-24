import { useState, useEffect } from 'react'
import { getAlertasReposicion } from '../services/reposicion'
import { getCliente } from '../services/clientes'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

function estadoAlertaCls(diasRestantes) {
    if (diasRestantes < 0) return 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400'
    return 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
}

function estadoAlertaTexto(diasRestantes) {
    if (diasRestantes < 0) return `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? '' : 's'}`
    if (diasRestantes === 0) return 'Hoy'
    return `En ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`
}

function Reposicion() {
    const [alertas, setAlertas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(false)
    const [diasUmbral, setDiasUmbral] = useState(5)
    const [clienteModal, setClienteModal] = useState(null)
    const [cargandoCliente, setCargandoCliente] = useState(false)

    useEffect(() => { cargarAlertas() }, [diasUmbral])

    async function cargarAlertas() {
        try {
            setCargando(true)
            setError(false)
            const datos = await getAlertasReposicion(diasUmbral)
            setAlertas(datos)
        } catch (err) {
            setError(true)
        } finally {
            setCargando(false)
        }
    }

    async function abrirHistorial(clienteId) {
        try {
            setCargandoCliente(true)
            setClienteModal({ cargando: true })
            const cliente = await getCliente(clienteId)
            setClienteModal(cliente)
        } catch (err) {
            setClienteModal(null)
        } finally {
            setCargandoCliente(false)
        }
    }

    function formatFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Reposiciones</h1>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Clientes que probablemente necesiten reponer balanceados pronto, según su historial de compra</p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avisar con</label>
                    <Select value={String(diasUmbral)} onValueChange={v => setDiasUmbral(parseInt(v))}>
                        <SelectTrigger className="w-auto text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="5">5 días de anticipación</SelectItem>
                            <SelectItem value="7">7 días de anticipación</SelectItem>
                            <SelectItem value="10">10 días de anticipación</SelectItem>
                            <SelectItem value="15">15 días de anticipación</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Tabla */}
            <Card className="overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900">
                            {['Cliente', 'Producto', 'Última compra', 'Frecuencia estimada', 'Próxima reposición', 'Estado'].map(h => (
                                <TableHead key={h}>{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cargando ? (
                            <TableRow><TableCell colSpan={6} className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando...</TableCell></TableRow>
                        ) : error ? (
                            <TableRow><TableCell colSpan={6} className="p-10 text-center text-red-500">No se pudieron cargar las alertas.</TableCell></TableRow>
                        ) : alertas.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="p-12 text-center text-slate-500 dark:text-slate-400">
                                <span className="mb-2 flex justify-center opacity-40"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                                <p>No hay clientes que necesiten reponer balanceados en los próximos {diasUmbral} días.</p>
                            </TableCell></TableRow>
                        ) : alertas.map(a => (
                            <TableRow key={`${a.cliente_id}-${a.presentacion_id}`} className="cursor-pointer" onClick={() => abrirHistorial(a.cliente_id)}>
                                <TableCell>
                                    <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{a.cliente_nombre}</span>
                                    {a.cliente_telefono && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{a.cliente_telefono}</p>}
                                </TableCell>
                                <TableCell>
                                    <span className="text-xs text-slate-900 dark:text-slate-100">{a.producto_nombre}{a.marca_nombre ? ` — ${a.marca_nombre}` : ''}</span>
                                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">{a.presentacion_nombre}</p>
                                    <p className="mt-1">
                                        {parseInt(a.stock_disponible) > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-500/15 dark:text-green-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Stock disponible ({a.stock_disponible})
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Sin stock — reponer inventario
                                            </span>
                                        )}
                                    </p>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                                    {formatFecha(a.ultima_compra)}
                                </TableCell>
                                <TableCell className="text-slate-900 dark:text-slate-100">
                                    cada {a.dias_estimados} días
                                    {!a.con_historial_propio && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">estimado (1ra compra)</p>}
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-slate-500 dark:text-slate-400">
                                    {formatFecha(a.proxima_reposicion_estimada)}
                                </TableCell>
                                <TableCell>
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${estadoAlertaCls(a.dias_restantes)}`}>
                                        {estadoAlertaTexto(a.dias_restantes)}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>

            {/* Modal historial cliente */}
            {clienteModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={() => setClienteModal(null)}>
                    <div className="max-h-[85vh] w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                        {cargandoCliente ? (
                            <p className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando historial...</p>
                        ) : (
                            <>
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{clienteModal.nombre}</h3>
                                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{clienteModal.telefono || '—'}</p>
                                    </div>
                                    <button onClick={() => setClienteModal(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                                </div>

                                <div className="mb-4.5 grid grid-cols-3 gap-2.5">
                                    <div className="rounded-[10px] bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Compras totales</p>
                                        <p className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">{clienteModal.estadisticas?.total_compras ?? '—'}</p>
                                    </div>
                                    <div className="rounded-[10px] bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Ticket promedio</p>
                                        <p className="text-[15px] font-extrabold text-slate-900 dark:text-slate-100">Gs. {Math.round(clienteModal.estadisticas?.ticket_promedio || 0).toLocaleString('es-PY')}</p>
                                    </div>
                                    <div className="rounded-[10px] bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">Última compra</p>
                                        <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{formatFecha(clienteModal.estadisticas?.ultima_compra)}</p>
                                    </div>
                                </div>

                                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Historial de compras</p>
                                <div className="flex flex-col gap-1.5">
                                    {(clienteModal.ventas || []).map(v => (
                                        <div key={v.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-xs dark:bg-slate-900">
                                            <div>
                                                <span className="font-semibold text-slate-900 dark:text-slate-100">{v.producto_nombre || '—'}</span>
                                                <span className="text-slate-400 dark:text-slate-500"> · {v.presentacion_nombre || '—'}</span>
                                            </div>
                                            <span className="ml-3 whitespace-nowrap text-slate-500 dark:text-slate-400">{formatFecha(v.created_at)}</span>
                                        </div>
                                    ))}
                                    {(!clienteModal.ventas || clienteModal.ventas.length === 0) && (
                                        <p className="p-4 text-center text-xs text-slate-400 dark:text-slate-500">Sin compras registradas.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Reposicion
