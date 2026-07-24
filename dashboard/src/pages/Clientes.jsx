import { useState, useEffect, useRef } from 'react'
import { getClientes, getCliente, crearCliente, editarCliente, eliminarCliente } from '../services/clientes'
import ModalConfirmar from '../components/ModalConfirmar'
import api from '../services/api'
import { formatearFecha } from '../utils/fecha'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const inputCls = 'mb-2.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[13px] text-slate-900 outline-none transition-shadow focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-100/5'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'

const IconLapiz = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
const IconEstrella = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.9 6.6L22 9.3l-5 4.9 1.2 7-6.2-3.4L5.8 21.2 7 14.2 2 9.3l7.1-.7L12 2z" /></svg>
const IconAdvertencia = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
const IconReloj = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const IconCheckCirculo = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
const IconUsuarios = () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>

function formatearRUC(valor) {
    const partes = valor.split('-')
    const cuerpo = partes[0].replace(/[^\d]/g, '')
    const dv = partes.length > 1 ? partes[1].replace(/[^\d]/g, '').slice(0, 1) : ''

    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    if (partes.length > 1) return `${cuerpoFormateado}-${dv}`
    if (valor.endsWith('-')) return `${cuerpoFormateado}-`
    return cuerpoFormateado
}

function FormModal({ titulo, onClose, onSubmit, submitLabel, form, setForm, guardando }) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={onClose}>
            <div className="max-h-[90vh] w-[480px] overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{titulo}</h3>
                    <button onClick={onClose} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                </div>
                <label className={labelCls}>Tipo</label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                    <SelectTrigger className="mb-2.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="persona">Persona física</SelectItem>
                        <SelectItem value="empresa">Empresa</SelectItem>
                    </SelectContent>
                </Select>
                <label className={labelCls}>Nombre / Razón social *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputCls} />
                <label className={labelCls}>RUC</label>
                <input value={form.ruc} onChange={e => setForm({ ...form, ruc: formatearRUC(e.target.value) })} className={inputCls} />
                <label className={labelCls}>Teléfono / WhatsApp</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className={inputCls} />
                <label className={labelCls}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Ciudad</label><input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} className={`${inputCls} mb-0`} /></div>
                    <div><label className={labelCls}>Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className={`${inputCls} mb-0`} /></div>
                </div>
                <label className={`${labelCls} mt-2.5`}>Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} className={`${inputCls} resize-none font-sans`} />
                <div className="mt-1 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={onSubmit} disabled={guardando}>{guardando ? 'Guardando...' : submitLabel}</Button>
                </div>
            </div>
        </div>
    )
}

function Clientes() {
    const [clientes, setClientes] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [cargandoPerfil, setCargandoPerfil] = useState(false)
    const [buscar, setBuscar] = useState('')
    const [filtroActividad, setFiltroActividad] = useState('todos')
    const [modalNuevo, setModalNuevo] = useState(false)
    const [modalEditar, setModalEditar] = useState(false)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [cuentaCorriente, setCuentaCorriente] = useState(null)
    const [cargandoCC, setCargandoCC] = useState(false)
    const [modalPagoCC, setModalPagoCC] = useState(null)
    const [formPago, setFormPago] = useState({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', tipo_pago: 'parcial', notas: '' })
    const [form, setForm] = useState({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })
    const [guardandoCliente, setGuardandoCliente] = useState(false)
    const procesandoCliente = useRef(false)
    const [pestanaHistorial, setPestanaHistorial] = useState('historial') // 'historial' | 'cuenta_corriente'
    const [paginaHistorial, setPaginaHistorial] = useState(1)
    const POR_PAGINA_HISTORIAL = 10

    useEffect(() => { cargarClientes() }, [filtroActividad])
    useEffect(() => {
        const timeout = setTimeout(() => cargarClientes(), 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function cargarClientes() {
        try {
            setCargando(true)
            const params = {}
            if (buscar) params.buscar = buscar
            if (filtroActividad !== 'todos') params.estado_actividad = filtroActividad
            const datos = await getClientes(params)
            setClientes(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los clientes.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function verPerfil(id) {
        try {
            setCargandoPerfil(true)
            const datos = await getCliente(id)
            setClienteSeleccionado(datos)
            cargarCuentaCorriente(id)
            setPaginaHistorial(1)
            setPestanaHistorial('historial')
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cargar el perfil.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargandoPerfil(false) }
    }

    async function cargarCuentaCorriente(clienteId) {
        try {
            setCargandoCC(true)
            const res = await api.get(`/clientes/${clienteId}/cuenta-corriente`)
            setCuentaCorriente(res.data)
        } catch (err) {
            setCuentaCorriente(null)
        } finally { setCargandoCC(false) }
    }

    async function handleRegistrarPago() {
        if (!formPago.monto || !modalPagoCC) return
        try {
            await api.post(`/clientes/${clienteSeleccionado.id}/cuenta-corriente/pagos`, {
                venta_id: modalPagoCC.id,
                ...formPago,
                monto: parseInt(formPago.monto)
            })
            setModalPagoCC(null)
            setFormPago({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', tipo_pago: 'parcial', notas: '' })
            await cargarCuentaCorriente(clienteSeleccionado.id)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar el pago.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleCrearCliente() {
        if (!form.nombre.trim()) return
        if (procesandoCliente.current) return
        procesandoCliente.current = true
        setGuardandoCliente(true)
        try {
            await crearCliente(form)
            setModalNuevo(false)
            setForm({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            procesandoCliente.current = false
            setGuardandoCliente(false)
        }
    }

    async function handleEditarCliente() {
        if (procesandoCliente.current) return
        procesandoCliente.current = true
        setGuardandoCliente(true)
        try {
            await editarCliente(clienteSeleccionado.id, form)
            setModalEditar(false)
            await verPerfil(clienteSeleccionado.id)
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo editar el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally {
            procesandoCliente.current = false
            setGuardandoCliente(false)
        }
    }

    function abrirModalEditar() {
        setForm({ tipo: clienteSeleccionado.tipo, nombre: clienteSeleccionado.nombre, ruc: clienteSeleccionado.ruc || '', telefono: clienteSeleccionado.telefono || '', email: clienteSeleccionado.email || '', direccion: clienteSeleccionado.direccion || '', ciudad: clienteSeleccionado.ciudad || '', notas: clienteSeleccionado.notas || '' })
        setModalEditar(true)
    }

    function formatearGs(numero) { return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}` }

    function iniciales(nombre) {
        if (!nombre) return '?'
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    function colorOrigenCls(origen) {
        return {
            bot: 'text-green-600 bg-green-100 dark:bg-green-500/15 dark:text-green-400',
            presencial: 'text-blue-600 bg-blue-100 dark:bg-blue-500/15 dark:text-blue-400',
            manual: 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300',
            ecommerce: 'text-amber-600 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-400',
        }[origen] || 'text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300'
    }

    function colorEstadoCls(estado) {
        return {
            pendiente_pago: 'bg-amber-500',
            pagado: 'bg-green-500',
            entregado: 'bg-blue-500',
            cancelado: 'bg-red-500',
        }[estado] || 'bg-slate-400'
    }

    function diasDesde(fecha) {
        if (!fecha) return null
        return Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24))
    }

    function diasHasta(fecha) {
        if (!fecha) return null
        return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
    }

    // Métricas
    const totalClientes = clientes.length
    const clientesActivos = clientes.filter(c => c.cliente_activo).length
    const totalMonto = clientes.reduce((sum, c) => sum + parseInt(c.monto_total || 0), 0)
    const ticketPromedio = totalClientes > 0 ? Math.round(totalMonto / totalClientes) : 0

    // Panel de actividad del cliente seleccionado
    function PanelActividad({ cliente }) {
        const activo = cliente.cliente_activo
        const frecuencia = cliente.frecuencia_dias
        const proximaCompra = cliente.proxima_compra_estimada
        const diasUltimaCompra = diasDesde(cliente.estadisticas?.ultima_compra)
        const diasProxima = diasHasta(proximaCompra)

        return (
            <div className="flex flex-col gap-3">

                {/* Estado activo/inactivo */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Estado de actividad</p>

                    <div className="mb-4 flex items-center gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${activo ? 'bg-green-100 text-green-500 dark:bg-green-500/15' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{activo ? <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></> : <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>}</svg>
                        </div>
                        <div>
                            <p className={`text-base font-extrabold ${activo ? 'text-green-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                {activo ? 'Cliente activo' : 'Cliente inactivo'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                                {diasUltimaCompra !== null
                                    ? `Última compra hace ${diasUltimaCompra} días`
                                    : 'Sin compras registradas'}
                            </p>
                        </div>
                    </div>

                    {/* Barra de actividad */}
                    {diasUltimaCompra !== null && (
                        <div>
                            <div className="mb-1.5 flex justify-between">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">Hoy</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">60 días</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900">
                                <div className={`h-full rounded-full transition-[width] duration-500 ${activo ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min((diasUltimaCompra / 60) * 100, 100)}%` }} />
                            </div>
                            <p className="mt-1 text-right text-[10px] text-slate-400 dark:text-slate-500">
                                {diasUltimaCompra} / 60 días
                            </p>
                        </div>
                    )}
                </div>

                {/* Predicción próxima compra */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Predicción de compra</p>

                    {frecuencia ? (
                        <div className="flex flex-col gap-3">
                            <div className="rounded-[10px] bg-slate-50 px-4 py-3 dark:bg-slate-900">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Frecuencia promedio</p>
                                <p className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">cada {frecuencia} días</p>
                            </div>

                            {proximaCompra && (
                                <div className={`rounded-[10px] px-4 py-3 ${diasProxima !== null && diasProxima <= 7 ? 'border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border border-transparent bg-slate-50 dark:bg-slate-900'}`}>
                                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Próxima compra estimada</p>
                                    <p className={`text-base font-extrabold ${diasProxima !== null && diasProxima <= 0 ? 'text-red-500' : diasProxima !== null && diasProxima <= 7 ? 'text-amber-500' : 'text-green-500'}`}>
                                        {formatearFecha(proximaCompra)}
                                    </p>
                                    {diasProxima !== null && (
                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                                            {diasProxima <= 0
                                                ? <><IconAdvertencia />{`Debería haber comprado hace ${Math.abs(diasProxima)} días`}</>
                                                : diasProxima <= 7
                                                    ? <><IconReloj />{`En ${diasProxima} días`}</>
                                                    : `En ${diasProxima} días`}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-5 text-center text-slate-400 dark:text-slate-500">
                            <span className="mb-2 flex justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg></span>
                            <p className="text-xs">Se necesitan al menos 2 compras para calcular la frecuencia.</p>
                        </div>
                    )}
                </div>

                {/* Línea de tiempo */}
                {cliente.ventas?.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                        <p className="mb-4 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Últimas actividades</p>
                        <div className="flex flex-col">
                            {cliente.ventas.slice(0, 5).map((v, i) => (
                                <div key={v.id} className={`flex items-start gap-3 ${i < Math.min(cliente.ventas.length, 5) - 1 ? 'pb-3' : ''}`}>
                                    <div className="flex shrink-0 flex-col items-center">
                                        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${colorEstadoCls(v.estado)}`} />
                                        {i < Math.min(cliente.ventas.length, 5) - 1 && (
                                            <div className="mt-1 min-h-[20px] w-0.5 flex-1 bg-slate-100 dark:bg-slate-700" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {v.producto_nombre} {v.presentacion_nombre}
                                        </p>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{formatearFecha(v.created_at)} · {formatearGs(v.precio)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="page-scroll min-h-full bg-slate-50 dark:bg-slate-900">

            {clienteSeleccionado ? (
                <div className="split-content flex h-[calc(100vh-56px)]">

                    {/* Lista lateral */}
                    <div className="split-list has-detail flex w-[320px] shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                        <div className="border-b border-slate-200 p-3 dark:border-slate-700">
                            <div className="relative">
                                <input placeholder="Buscar..." value={buscar} onChange={e => setBuscar(e.target.value)} autoComplete="off"
                                    className={`${inputCls} mb-0`} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {clientes.map(c => (
                                <div key={c.id} onClick={() => verPerfil(c.id)}
                                    className={`cursor-pointer border-b border-slate-100 px-3.5 py-3 transition-colors dark:border-slate-700 ${clienteSeleccionado?.id === c.id ? 'border-l-[3px] border-l-indigo-500 bg-indigo-50 dark:bg-indigo-500/10' : 'border-l-[3px] border-l-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="relative shrink-0">
                                            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-indigo-100 text-[11px] font-extrabold text-indigo-800 dark:bg-slate-700 dark:text-indigo-300">
                                                {iniciales(c.nombre)}
                                            </div>
                                            <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-slate-800 ${c.cliente_activo ? 'bg-green-500' : 'bg-slate-400'}`} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.nombre}</span>
                                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{c.total_compras} compras</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Perfil — layout de 2 columnas */}
                    <div className="split-detail has-detail flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                        {cargandoPerfil ? (
                            <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Cargando perfil...</div>
                        ) : (
                            <div className="p-6">

                                {/* Header */}
                                <div className="mb-5 flex items-start justify-between">
                                    <div className="flex items-center gap-3.5">
                                        <div className="relative">
                                            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-indigo-100 text-base font-extrabold text-indigo-800 dark:bg-slate-700 dark:text-indigo-300">
                                                {iniciales(clienteSeleccionado.nombre)}
                                            </div>
                                            <div className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-slate-50 dark:border-slate-950 ${clienteSeleccionado.cliente_activo ? 'bg-green-500' : 'bg-slate-400'}`} />
                                        </div>
                                        <div>
                                            <div className="mb-0.5 flex items-center gap-2">
                                                <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{clienteSeleccionado.nombre}</h2>
                                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colorOrigenCls(clienteSeleccionado.origen)}`}>{clienteSeleccionado.origen}</span>
                                                {clienteSeleccionado.origen === 'ecommerce' && (
                                                    <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-500/15 dark:text-violet-400" title="Tiene cuenta en el ecommerce">Ecommerce</span>
                                                )}
                                                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${clienteSeleccionado.cliente_activo ? 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                    {clienteSeleccionado.cliente_activo ? '● Activo' : '○ Inactivo'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">Cliente desde {formatearFecha(clienteSeleccionado.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setClienteSeleccionado(null)}>← Volver</Button>
                                        <Button variant="outline" size="sm" onClick={abrirModalEditar}><IconLapiz /> Editar</Button>
                                        <Button variant="destructive" size="sm" onClick={() => {
                                            setModalConfirmar({
                                                titulo: 'Eliminar cliente',
                                                mensaje: `¿Eliminar a "${clienteSeleccionado.nombre}"? El historial de ventas se conserva pero el cliente no aparecera en listados.`,
                                                textoBoton: 'Eliminar', colorBoton: '#ef4444',
                                                onConfirmar: async () => {
                                                    try {
                                                        await eliminarCliente(clienteSeleccionado.id)
                                                        setModalConfirmar(null)
                                                        setClienteSeleccionado(null)
                                                        await cargarClientes()
                                                    } catch (err) {
                                                        setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo eliminar el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
                                                    }
                                                }
                                            })
                                        }}>Eliminar</Button>
                                    </div>
                                </div>

                                {/* Grid 2 columnas */}
                                <div className="grid grid-cols-[1fr_300px] items-start gap-4">

                                    {/* Columna izquierda */}
                                    <div className="flex flex-col gap-3.5">

                                        {/* Datos contacto */}
                                        <div className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                            <p className="mb-3.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">Datos y contacto</p>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                {[
                                                    { label: 'RUC', val: clienteSeleccionado.ruc },
                                                    { label: 'Teléfono / WhatsApp', val: clienteSeleccionado.telefono },
                                                    { label: 'Email', val: clienteSeleccionado.email },
                                                    { label: 'Ciudad', val: clienteSeleccionado.ciudad },
                                                ].map((item, i) => (
                                                    <div key={i} className="rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                                                        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{item.label}</p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.val || '—'}</p>
                                                    </div>
                                                ))}
                                                {clienteSeleccionado.direccion && (
                                                    <div className="col-span-2 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-900">
                                                        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Dirección</p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{clienteSeleccionado.direccion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Estadísticas */}
                                        <div className="grid grid-cols-4 gap-2.5">
                                            {[
                                                { label: 'Compras', val: clienteSeleccionado.estadisticas?.total_compras || 0, cls: 'border-l-green-500 text-green-500', big: true },
                                                { label: 'Monto total', val: formatearGs(clienteSeleccionado.estadisticas?.monto_total), cls: 'border-l-blue-500 text-blue-500' },
                                                { label: 'Ticket prom.', val: formatearGs(clienteSeleccionado.estadisticas?.ticket_promedio), cls: 'border-l-amber-500 text-amber-500' },
                                                { label: 'Última compra', val: formatearFecha(clienteSeleccionado.estadisticas?.ultima_compra), cls: 'border-l-violet-500 text-violet-500' },
                                            ].map((stat, i) => (
                                                <div key={i} className={`rounded-xl border border-slate-200 border-l-[3px] bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-800 ${stat.cls.split(' ')[0]}`}>
                                                    <p className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</p>
                                                    <p className={`font-extrabold ${stat.big ? 'text-xl' : 'text-[13px]'} ${stat.cls.split(' ')[1]}`}>{stat.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Producto favorito */}
                                        {clienteSeleccionado.producto_favorito && (
                                            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-amber-100 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400"><IconEstrella /></div>
                                                <div>
                                                    <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Producto favorito</p>
                                                    <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">
                                                        {clienteSeleccionado.producto_favorito.marca && <span className="text-slate-500 dark:text-slate-400">{clienteSeleccionado.producto_favorito.marca} — </span>}
                                                        {clienteSeleccionado.producto_favorito.producto}
                                                    </p>
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">{clienteSeleccionado.producto_favorito.cantidad} veces comprado</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Notas */}
                                        {clienteSeleccionado.notas && (
                                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                                                <p className="mb-1 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-400"><IconAdvertencia /> Notas internas</p>
                                                <p className="text-xs text-amber-900 dark:text-amber-200">{clienteSeleccionado.notas}</p>
                                            </div>
                                        )}

                                        {/* Historial + Cuenta corriente */}
                                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">

                                            {/* Pestañas */}
                                            <div className="flex border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
                                                <button onClick={() => setPestanaHistorial('historial')}
                                                    className={`border-b-2 px-5 py-3 text-xs transition-colors ${pestanaHistorial === 'historial' ? 'border-slate-900 font-bold text-slate-900 dark:border-slate-100 dark:text-slate-100' : 'border-transparent font-medium text-slate-500 dark:text-slate-400'}`}>
                                                    Historial de compras
                                                </button>
                                                <button onClick={() => setPestanaHistorial('cuenta_corriente')}
                                                    className={`flex items-center gap-1.5 border-b-2 px-5 py-3 text-xs transition-colors ${pestanaHistorial === 'cuenta_corriente' ? 'border-amber-500 font-bold text-slate-900 dark:text-slate-100' : 'border-transparent font-medium text-slate-500 dark:text-slate-400'}`}>
                                                    Cuenta corriente
                                                    {cuentaCorriente?.resumen?.deuda_total > 0 && (
                                                        <span className="rounded-full bg-amber-100 px-1.75 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                                                            {formatearGs(cuentaCorriente.resumen.deuda_total)}
                                                        </span>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Pestaña Historial */}
                                            {pestanaHistorial === 'historial' && (
                                                <>
                                                    {!clienteSeleccionado.ventas?.length ? (
                                                        <p className="p-5 text-center text-[13px] text-slate-500 dark:text-slate-400">Sin compras registradas.</p>
                                                    ) : (
                                                        <>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                                                                        {['Fecha', 'Producto', 'Precio', 'Canal', 'Estado'].map((h, i) => (
                                                                            <TableHead key={i}>{h}</TableHead>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {clienteSeleccionado.ventas
                                                                        .slice((paginaHistorial - 1) * POR_PAGINA_HISTORIAL, paginaHistorial * POR_PAGINA_HISTORIAL)
                                                                        .map(v => (
                                                                            <TableRow key={v.id}>
                                                                                <TableCell className="text-slate-700 dark:text-slate-300">{formatearFecha(v.created_at)}</TableCell>
                                                                                <TableCell className="text-slate-700 dark:text-slate-300">{v.marca_nombre && `${v.marca_nombre} — `}{v.producto_nombre} {v.presentacion_nombre}</TableCell>
                                                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">Gs. {parseInt(v.precio).toLocaleString()}</TableCell>
                                                                                <TableCell className="text-slate-500 dark:text-slate-400">{v.canal}</TableCell>
                                                                                <TableCell>
                                                                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold text-white ${colorEstadoCls(v.estado)}`}>{v.estado}</span>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                </TableBody>
                                                            </Table>
                                                            {/* Paginación historial */}
                                                            {clienteSeleccionado.ventas.length > POR_PAGINA_HISTORIAL && (
                                                                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                                        {(paginaHistorial - 1) * POR_PAGINA_HISTORIAL + 1}–{Math.min(paginaHistorial * POR_PAGINA_HISTORIAL, clienteSeleccionado.ventas.length)} de {clienteSeleccionado.ventas.length}
                                                                    </p>
                                                                    <div className="flex gap-1.5">
                                                                        <button onClick={() => setPaginaHistorial(p => Math.max(1, p - 1))} disabled={paginaHistorial === 1}
                                                                            className={`rounded-md border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 ${paginaHistorial === 1 ? 'cursor-not-allowed text-slate-300 dark:text-slate-600' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'}`}>
                                                                            ← Ant
                                                                        </button>
                                                                        <button onClick={() => setPaginaHistorial(p => Math.min(Math.ceil(clienteSeleccionado.ventas.length / POR_PAGINA_HISTORIAL), p + 1))}
                                                                            disabled={paginaHistorial >= Math.ceil(clienteSeleccionado.ventas.length / POR_PAGINA_HISTORIAL)}
                                                                            className={`rounded-md border border-slate-200 px-2.5 py-1 text-xs dark:border-slate-700 ${paginaHistorial >= Math.ceil(clienteSeleccionado.ventas.length / POR_PAGINA_HISTORIAL) ? 'cursor-not-allowed text-slate-300 dark:text-slate-600' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'}`}>
                                                                            Sig →
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </>
                                            )}

                                            {/* Pestaña Cuenta corriente */}
                                            {pestanaHistorial === 'cuenta_corriente' && (
                                                <>
                                                    {cargandoCC ? (
                                                        <p className="p-5 text-center text-slate-500 dark:text-slate-400">Cargando...</p>
                                                    ) : !cuentaCorriente?.ventas?.filter(v => v.saldo > 0).length ? (
                                                        <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                                            <p className="mb-2 flex justify-center text-green-500"><IconCheckCirculo /></p>
                                                            <p className="text-[13px]">No hay deudas pendientes.</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center justify-between border-b border-slate-100 bg-amber-50 px-4 py-3 dark:border-slate-700 dark:bg-amber-500/10">
                                                                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">{cuentaCorriente.ventas.filter(v => v.saldo > 0).length} créditos pendientes</span>
                                                                <span className="text-sm font-extrabold text-amber-500">Deuda total: {formatearGs(cuentaCorriente.resumen?.deuda_total)}</span>
                                                            </div>
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-slate-50 dark:bg-slate-900">
                                                                        {['Fecha', 'Producto', 'Total', 'Saldo', 'Vence', ''].map(h => (
                                                                            <TableHead key={h}>{h}</TableHead>
                                                                        ))}
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {cuentaCorriente.ventas.filter(v => v.saldo > 0).map(v => {
                                                                        const vencido = v.fecha_vencimiento_credito && new Date(v.fecha_vencimiento_credito) < new Date()
                                                                        return (
                                                                            <TableRow key={v.id}>
                                                                                <TableCell className="text-slate-500 dark:text-slate-400">{formatearFecha(v.created_at)}</TableCell>
                                                                                <TableCell className="text-slate-700 dark:text-slate-300">{v.producto_nombre} {v.presentacion_nombre}</TableCell>
                                                                                <TableCell className="text-slate-700 dark:text-slate-300">{formatearGs(v.precio)}</TableCell>
                                                                                <TableCell>
                                                                                    <span className="text-xs font-extrabold text-amber-500">{formatearGs(v.saldo)}</span>
                                                                                </TableCell>
                                                                                <TableCell className={`flex items-center gap-1 ${vencido ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                                                                                    {v.fecha_vencimiento_credito ? new Date(v.fecha_vencimiento_credito).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' }) : '—'}
                                                                                    {vencido && <IconAdvertencia />}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Button size="sm" onClick={() => setModalPagoCC(v)}>Pagar</Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Columna derecha — Panel de actividad */}
                                    <div className="sticky top-6">
                                        <PanelActividad cliente={clienteSeleccionado} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Vista tabla
                <div className="page-scroll p-4 sm:p-6 lg:p-8">

                    <div className="mb-7 flex items-end justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">Gestión de Clientes</h1>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Visualizá, editá y fidelizá tu base de clientes registrados.</p>
                        </div>
                        <Button onClick={() => setModalNuevo(true)}>+ Añadir nuevo cliente</Button>
                    </div>

                    {/* Métricas */}
                    <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Total clientes', val: totalClientes, cls: 'text-slate-900 dark:text-slate-100' },
                            { label: 'Clientes activos', val: clientesActivos, cls: 'text-green-500' },
                            { label: 'Monto total acumulado', val: formatearGs(totalMonto), cls: 'text-slate-900 dark:text-slate-100' },
                            { label: 'Ticket promedio', val: formatearGs(ticketPromedio), cls: 'text-slate-900 dark:text-slate-100' },
                        ].map((m, i) => (
                            <Card key={i} className="transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                <CardContent>
                                    <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{m.label}</p>
                                    <p className={`text-2xl font-extrabold tracking-tight ${m.cls}`}>{m.val}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Tabla */}
                    <Card className="overflow-hidden py-0">
                        {/* Buscador + filtros */}
                        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
                            <div className="relative min-w-[200px] flex-1">
                                <input placeholder="Buscar por nombre, RUC o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)} autoComplete="off"
                                    className={`${inputCls} mb-0 bg-slate-50 dark:bg-slate-900`} />
                            </div>

                            {/* Filtro activo/inactivo */}
                            <div className="flex gap-1">
                                {[
                                    { val: 'todos', label: 'Todos' },
                                    { val: 'activo', label: '● Activos' },
                                    { val: 'inactivo', label: '○ Inactivos' },
                                ].map(f => (
                                    <button key={f.val} onClick={() => setFiltroActividad(f.val)}
                                        className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${filtroActividad === f.val ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 bg-transparent text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700/40'}`}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80 dark:bg-slate-900/50">
                                        {['Nombre del cliente', 'Teléfono', 'RUC', 'Compras', 'Monto total', 'Estado', 'Origen', ''].map((h, i) => (
                                            <TableHead key={i} className="whitespace-nowrap">{h}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cargando ? (
                                        <TableRow><TableCell colSpan={8} className="p-10 text-center text-slate-500 dark:text-slate-400">Cargando...</TableCell></TableRow>
                                    ) : clientes.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="p-12 text-center text-slate-500 dark:text-slate-400">
                                            <p className="mb-2 flex justify-center text-slate-300 dark:text-slate-600"><IconUsuarios /></p>
                                            <p>No hay clientes registrados.</p>
                                        </TableCell></TableRow>
                                    ) : (
                                        clientes.map(c => (
                                            <TableRow key={c.id} className="cursor-pointer" onClick={() => verPerfil(c.id)}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="relative shrink-0">
                                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-extrabold text-indigo-800 dark:bg-slate-700 dark:text-indigo-300">
                                                                {iniciales(c.nombre)}
                                                            </div>
                                                            <div className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-slate-800 ${c.cliente_activo ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                        </div>
                                                        <span className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{c.nombre}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-slate-500 dark:text-slate-400">{c.telefono || '—'}</TableCell>
                                                <TableCell className="text-slate-500 dark:text-slate-400">{c.ruc || '—'}</TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{c.total_compras}</TableCell>
                                                <TableCell className="font-semibold text-slate-900 dark:text-slate-100">{formatearGs(c.monto_total)}</TableCell>
                                                <TableCell>
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${c.cliente_activo ? 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
                                                        {c.cliente_activo ? '● Activo' : '○ Inactivo'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${colorOrigenCls(c.origen)}`}>
                                                        {c.origen}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right text-slate-300 dark:text-slate-600">→</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                <strong className="text-slate-900 dark:text-slate-100">{clientes.length}</strong> clientes
                                {filtroActividad !== 'todos' && ` · filtro: ${filtroActividad}`}
                                {buscar && ` · búsqueda: "${buscar}"`}
                            </p>
                        </div>
                    </Card>
                </div>
            )}

            {modalPagoCC && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50" onClick={() => setModalPagoCC(null)}>
                    <div className="w-[440px] rounded-2xl bg-white p-7 shadow-2xl dark:bg-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Registrar pago</h3>
                            <button onClick={() => setModalPagoCC(null)} className="text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="mb-4 rounded-[10px] bg-slate-50 p-3.5 dark:bg-slate-900">
                            <p className="text-xs text-slate-500 dark:text-slate-400">Venta #{modalPagoCC.id} — {modalPagoCC.producto_nombre}</p>
                            <p className="mt-1 text-sm font-extrabold text-amber-500">Saldo: {formatearGs(modalPagoCC.saldo)}</p>
                        </div>
                        <label className={labelCls}>N° de recibo</label>
                        <input value={formPago.numero_recibo} onChange={e => setFormPago({ ...formPago, numero_recibo: e.target.value })} placeholder="Opcional" className={inputCls} />
                        <label className={labelCls}>Monto *</label>
                        <input type="number" value={formPago.monto} onChange={e => setFormPago({ ...formPago, monto: e.target.value })} placeholder="Gs." className={inputCls} />
                        <div className="mb-3 grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Método de pago</label>
                                <Select value={formPago.metodo_pago} onValueChange={v => setFormPago({ ...formPago, metodo_pago: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className={labelCls}>Tipo de pago</label>
                                <Select value={formPago.tipo_pago} onValueChange={v => setFormPago({ ...formPago, tipo_pago: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="parcial">Parcial</SelectItem>
                                        <SelectItem value="total">Total</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <label className={labelCls}>Notas</label>
                        <input value={formPago.notas} onChange={e => setFormPago({ ...formPago, notas: e.target.value })} placeholder="Opcional" className={inputCls} />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalPagoCC(null)}>Cancelar</Button>
                            <Button onClick={handleRegistrarPago}>Registrar pago</Button>
                        </div>
                    </div>
                </div>
            )}

            {modalNuevo && (
                <FormModal
                    titulo="Nuevo cliente"
                    onClose={() => setModalNuevo(false)}
                    onSubmit={handleCrearCliente}
                    submitLabel="Crear cliente"
                    form={form}
                    setForm={setForm}
                    guardando={guardandoCliente}
                />
            )}
            {modalEditar && (
                <FormModal
                    titulo="Editar cliente"
                    onClose={() => setModalEditar(false)}
                    onSubmit={handleEditarCliente}
                    submitLabel="Guardar cambios"
                    form={form}
                    setForm={setForm}
                    guardando={guardandoCliente}
                />
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

export default Clientes
