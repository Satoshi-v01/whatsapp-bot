import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getLogs } from '../services/auditoria'
import ModalConfirmar from '../components/ModalConfirmar'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const inputCls = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none transition-shadow focus:border-slate-300 dark:focus:border-slate-600 focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-slate-100/5'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

function Auditoria() {
    const [logs, setLogs] = useState([])
    const [paginacion, setPaginacion] = useState(null)
    const [filtrosDisponibles, setFiltrosDisponibles] = useState({ modulos: [], acciones: [], usuarios: [] })
    const [cargando, setCargando] = useState(true)
    const [modalDetalle, setModalDetalle] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [exportando, setExportando] = useState(false)

    const [filtros, setFiltros] = useState({
        periodo: 'hoy',
        usuario_id: '',
        modulo: '',
        accion: '',
        fecha_desde: '',
        fecha_hasta: '',
        pagina: 1
    })

    useEffect(() => { cargarLogs() }, [filtros])

    async function cargarLogs() {
        try {
            setCargando(true)
            const params = { ...filtros }
            if (filtros.periodo !== 'personalizado') { delete params.fecha_desde; delete params.fecha_hasta }
            Object.keys(params).forEach(k => !params[k] && delete params[k])
            // Los dropdowns de filtro (modulos/acciones/usuarios) son casi fijos --
            // solo se piden la primera vez, no en cada pagina/filtro nuevo.
            const necesitaFiltros = filtrosDisponibles.modulos.length === 0
            if (necesitaFiltros) params.incluir_filtros = '1'
            const datos = await getLogs(params)
            setLogs(datos.logs)
            setPaginacion(datos.paginacion)
            if (necesitaFiltros) setFiltrosDisponibles(datos.filtros_disponibles)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los logs.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function setFiltro(key, value) {
        setFiltros(prev => ({ ...prev, [key]: value, pagina: 1 }))
    }

    function colorAccion(accion) {
        return {
            crear: 'bg-green-100 text-green-600 dark:bg-green-500/15',
            editar: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15',
            eliminar: 'bg-red-100 text-red-600 dark:bg-red-500/15',
            cancelar: 'bg-red-100 text-red-600 dark:bg-red-500/15',
            login: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15',
            login_fallido: 'bg-red-100 text-red-600 dark:bg-red-500/15',
            nota: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15',
        }[accion] || 'bg-slate-100 text-slate-500 dark:bg-slate-700'
    }

    function colorModulo(modulo) {
        return {
            ventas: 'text-green-600',
            inventario: 'text-blue-600',
            clientes: 'text-violet-600',
            delivery: 'text-amber-600',
            proveedores: 'text-red-500',
            sistema: 'text-slate-500',
        }[modulo] || 'text-slate-400'
    }

    // Excel interpreta como formula cualquier celda de texto que empiece con
    // = + - @ -- si un campo de texto libre (ej. descripcion, notas) llegara
    // a empezar asi, se antepone un ' para forzarlo a texto plano.
    function sanitizarCeldaExcel(valor) {
        const texto = String(valor)
        return /^[=+\-@]/.test(texto) ? `'${texto}` : texto
    }

    async function handleExportar() {
        try {
            setExportando(true)
            // export:'1' habilita un cap mucho mayor en el backend (200 filas
            // es el limite normal del panel, no de un export que debe traer
            // todo el historico filtrado)
            const params = { ...filtros, por_pagina: 50000, pagina: 1, export: '1' }
            if (filtros.periodo !== 'personalizado') { delete params.fecha_desde; delete params.fecha_hasta }
            Object.keys(params).forEach(k => !params[k] && delete params[k])
            const datos = await getLogs(params)

            const filas = datos.logs.map(l => ({
                'Fecha y hora': new Date(l.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' }),
                'Usuario': sanitizarCeldaExcel(l.usuario_nombre || '—'),
                'Acción': l.accion,
                'Módulo': l.modulo,
                'Entidad': l.entidad || '—',
                'ID Entidad': l.entidad_id || '—',
                'Descripción': sanitizarCeldaExcel(l.descripcion || '—'),
                'Dato anterior': sanitizarCeldaExcel(l.dato_anterior ? JSON.stringify(l.dato_anterior) : '—'),
                'Dato nuevo': sanitizarCeldaExcel(l.dato_nuevo ? JSON.stringify(l.dato_nuevo) : '—'),
                'IP': l.ip || '—'
            }))

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(filas)
            ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 15 }]
            XLSX.utils.book_append_sheet(wb, ws, 'Auditoría')
            XLSX.writeFile(wb, `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportando(false) }
    }

    return (
        <div className="page-scroll min-h-full bg-slate-50 p-4 dark:bg-slate-900 sm:p-6 lg:p-8">

            {/* Header */}
            <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Log de Auditoría</h1>
                    <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Registro completo de acciones del sistema</p>
                </div>
                <Button onClick={handleExportar} disabled={exportando} className={exportando ? '' : 'bg-green-600 hover:bg-green-700'}>
                    {exportando ? 'Exportando...' : '⬇ Exportar Excel'}
                </Button>
            </div>

            {/* Filtros */}
            <Card className="mb-5">
                <CardContent>
                    <div className="mb-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                            <label className={labelCls}>Período</label>
                            <Select value={filtros.periodo} onValueChange={v => setFiltro('periodo', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hoy">Hoy</SelectItem>
                                    <SelectItem value="semana">Esta semana</SelectItem>
                                    <SelectItem value="mes">Este mes</SelectItem>
                                    <SelectItem value="personalizado">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={labelCls}>Usuario</label>
                            <Select value={filtros.usuario_id} onValueChange={v => setFiltro('usuario_id', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    {filtrosDisponibles.usuarios.map(u => (
                                        <SelectItem key={u.usuario_id} value={String(u.usuario_id)}>{u.usuario_nombre}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={labelCls}>Módulo</label>
                            <Select value={filtros.modulo} onValueChange={v => setFiltro('modulo', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todos</SelectItem>
                                    {filtrosDisponibles.modulos.map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={labelCls}>Acción</label>
                            <Select value={filtros.accion} onValueChange={v => setFiltro('accion', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Todas</SelectItem>
                                    {filtrosDisponibles.acciones.map(a => (
                                        <SelectItem key={a} value={a}>{a}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <Button variant="outline" onClick={() => setFiltros({ periodo: 'hoy', usuario_id: '', modulo: '', accion: '', fecha_desde: '', fecha_hasta: '', pagina: 1 })} className="w-full">
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>

                    {filtros.periodo === 'personalizado' && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                                <label className={labelCls}>Desde</label>
                                <input type="date" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Hasta</label>
                                <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} className={inputCls} />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Tabla */}
            <Card className="py-0 gap-0">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            {['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Descripción', 'IP', ''].map(h => (
                                <TableHead key={h} className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400 py-3 px-4">{h}</TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {cargando ? (
                            <TableRow><TableCell colSpan={7} className="p-10 text-center text-slate-400">Cargando...</TableCell></TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="p-12 text-center text-slate-400">
                                <span className="mb-2 flex justify-center opacity-40"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                                <p>No hay registros para los filtros seleccionados.</p>
                            </TableCell></TableRow>
                        ) : logs.map(log => (
                            <TableRow key={log.id} className="border-slate-100 dark:border-slate-700">
                                <TableCell className="whitespace-nowrap py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                                    {new Date(log.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-extrabold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300">
                                            {log.usuario_nombre?.slice(0, 2).toUpperCase() || '??'}
                                        </div>
                                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{log.usuario_nombre || 'Sistema'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${colorAccion(log.accion)}`}>
                                        {log.accion}
                                    </span>
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                    <span className={`text-[11px] font-semibold ${colorModulo(log.modulo)}`}>
                                        {log.modulo}
                                    </span>
                                    {log.entidad && <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">{log.entidad} {log.entidad_id ? `#${log.entidad_id}` : ''}</p>}
                                </TableCell>
                                <TableCell className="max-w-[300px] py-3 px-4 text-xs text-slate-900 dark:text-slate-100">
                                    <p className="truncate">{log.descripcion || '—'}</p>
                                </TableCell>
                                <TableCell className="py-3 px-4 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                                    {log.ip || '—'}
                                </TableCell>
                                <TableCell className="py-3 px-4">
                                    {(log.dato_anterior || log.dato_nuevo) && (
                                        <Button variant="outline" size="xs" onClick={() => setModalDetalle(log)}>
                                            Ver cambios
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                {/* Paginación */}
                {paginacion && paginacion.total_paginas > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 dark:border-slate-700">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                            {paginacion.total} registros · Página {paginacion.pagina} de {paginacion.total_paginas}
                        </p>
                        <div className="flex gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => setFiltro('pagina', filtros.pagina - 1)} disabled={filtros.pagina <= 1}>
                                ← Anterior
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setFiltro('pagina', filtros.pagina + 1)} disabled={filtros.pagina >= paginacion.total_paginas}>
                                Siguiente →
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal detalle cambios */}
            {modalDetalle && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={() => setModalDetalle(null)}>
                    <div className="max-h-[85vh] w-[640px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Detalle del cambio</h3>
                                <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{modalDetalle.descripcion}</p>
                            </div>
                            <button onClick={() => setModalDetalle(null)} className="text-lg text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {modalDetalle.dato_anterior && (
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-red-500">Antes</p>
                                    <div className="rounded-[10px] border border-red-300 bg-red-50 p-3 dark:border-red-500/40 dark:bg-red-500/10">
                                        {Object.entries(modalDetalle.dato_anterior).map(([k, v]) => (
                                            <div key={k} className="mb-1.5 flex gap-2 text-xs">
                                                <span className="min-w-[120px] font-semibold text-slate-400 dark:text-slate-500">{k}:</span>
                                                <span className="break-all text-slate-900 dark:text-slate-100">{v === null ? 'null' : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {modalDetalle.dato_nuevo && (
                                <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-green-600">Después</p>
                                    <div className="rounded-[10px] border border-green-300 bg-green-50 p-3 dark:border-green-500/40 dark:bg-green-500/10">
                                        {Object.entries(modalDetalle.dato_nuevo).map(([k, v]) => (
                                            <div key={k} className="mb-1.5 flex gap-2 text-xs">
                                                <span className="min-w-[120px] font-semibold text-slate-400 dark:text-slate-500">{k}:</span>
                                                <span className="break-all text-slate-900 dark:text-slate-100">{v === null ? 'null' : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-4 rounded-lg bg-slate-50 px-3.5 py-2.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1.5"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{modalDetalle.usuario_nombre || 'Sistema'}</span>
                            <span className="inline-flex items-center gap-1.5"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{new Date(modalDetalle.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}</span>
                            <span className="inline-flex items-center gap-1.5"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>{modalDetalle.ip || '—'}</span>
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

export default Auditoria
