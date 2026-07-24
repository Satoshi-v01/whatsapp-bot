import { useState, useEffect } from 'react'
import { getMisDeliveries, cambiarEstadoRepartidor } from '../services/deliveries'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function Repartidor({ usuario, onLogout }) {
    const [deliveries, setDeliveries] = useState([])
    const [cargando, setCargando] = useState(true)
    const [actualizando, setActualizando] = useState(null)
    const [filtro, setFiltro] = useState('pendientes') // 'pendientes' | 'todos'

    useEffect(() => {
        cargarDeliveries()
        const intervalo = setInterval(cargarDeliveries, 30000)
        return () => clearInterval(intervalo)
    }, [])

    async function cargarDeliveries() {
        try {
            const datos = await getMisDeliveries(usuario.id)
            setDeliveries(datos)
        } catch (err) {
            console.error(err)
        } finally { setCargando(false) }
    }

    async function handleCambiarEstado(id, estado) {
        try {
            setActualizando(id)
            await cambiarEstadoRepartidor(id, estado)
            await cargarDeliveries()
        } catch (err) {
            alert('No se pudo actualizar el estado.')
        } finally { setActualizando(null) }
    }

    function colorEstado(estado) {
        return {
            pendiente: { cls: 'bg-amber-100 text-amber-800', label: 'Pendiente' },
            confirmado: { cls: 'bg-blue-100 text-blue-700', label: 'Confirmado' },
            en_camino: { cls: 'bg-violet-100 text-violet-800', label: 'En camino' },
            entregado: { cls: 'bg-green-100 text-green-800', label: 'Entregado' },
        }[estado] || { cls: 'bg-slate-100 text-slate-600', label: estado }
    }

    const pendientes = deliveries.filter(d => d.estado !== 'entregado')
    const entregados = deliveries.filter(d => d.estado === 'entregado')
    const lista = filtro === 'pendientes' ? pendientes : deliveries

    return (
        <div className="min-h-screen bg-slate-900 font-sans text-white">

            {/* Header */}
            <div className="sticky top-0 z-[100] flex items-center justify-between border-b border-slate-700 bg-slate-800 px-5 py-4">
                <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Repartidor</p>
                    <p className="text-base font-bold">{usuario.nombre}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="icon" onClick={cargarDeliveries} className="bg-slate-700 text-slate-300 hover:bg-slate-600">↻</Button>
                    <Button variant="outline" size="sm" onClick={onLogout} className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">Salir</Button>
                </div>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-2 gap-3 p-4">
                <Card className="border-slate-700 bg-slate-800 text-center">
                    <CardContent className="py-4">
                        <p className="text-3xl font-extrabold text-amber-500">{pendientes.length}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Pendientes</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-700 bg-slate-800 text-center">
                    <CardContent className="py-4">
                        <p className="text-3xl font-extrabold text-green-500">{entregados.length}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Entregados</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <div className="flex gap-2 px-4 pb-4">
                {[{ val: 'pendientes', label: 'Pendientes' }, { val: 'todos', label: 'Todos hoy' }].map(f => (
                    <button key={f.val} onClick={() => setFiltro(f.val)}
                        className={`flex-1 rounded-[10px] py-2.5 text-[13px] font-semibold transition-colors ${filtro === f.val ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Lista deliveries */}
            <div className="flex flex-col gap-3 px-4 pb-24">
                {cargando ? (
                    <div className="p-16 text-center text-slate-500">Cargando...</div>
                ) : lista.length === 0 ? (
                    <div className="p-16 text-center text-slate-500">
                        <span className="mb-3 flex justify-center"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                        <p className="text-[15px] font-semibold">No hay deliveries pendientes</p>
                        <p className="mt-1 text-[13px]">Buen trabajo!</p>
                    </div>
                ) : lista.map(d => {
                    const cfg = colorEstado(d.estado)
                    const entregado = d.estado === 'entregado'
                    return (
                        <Card key={d.id} className={`border-slate-700 bg-slate-800 ${entregado ? 'border-green-900/60 opacity-70' : ''}`}>
                            <CardContent className="p-[18px]">

                                {/* Estado + ID */}
                                <div className="mb-3.5 flex items-center justify-between">
                                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cfg.cls}`}>
                                        {cfg.label}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-600">#{d.id}</span>
                                </div>

                                {/* Cliente */}
                                <div className="mb-3.5">
                                    <p className="mb-1 text-[17px] font-bold">{d.cliente_nombre || 'Sin nombre'}</p>
                                    {d.cliente_telefono && (
                                        <a href={`tel:${d.cliente_telefono}`}
                                            className="flex items-center gap-1.5 text-sm text-blue-400 no-underline">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {d.cliente_telefono}
                                        </a>
                                    )}
                                </div>

                                {/* Dirección */}
                                <div className="mb-3.5 rounded-[10px] bg-slate-900 p-3">
                                    <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-600">Dirección</p>
                                    <p className="text-sm font-medium leading-relaxed">{d.ubicacion || '—'}</p>
                                    {d.referencia && <p className="mt-1 text-xs text-slate-500">Ref: {d.referencia}</p>}
                                    {d.horario && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{d.horario}</p>}
                                    {d.contacto_entrega && <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{d.contacto_entrega}</p>}
                                    {d.ubicacion && (
                                        <a href={d.ubicacion.startsWith('http') ? d.ubicacion : `https://maps.google.com/?q=${encodeURIComponent(d.ubicacion)}`}
                                            target="_blank" rel="noreferrer"
                                            className="mt-2 inline-block text-xs font-semibold text-emerald-400 no-underline">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 inline"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Abrir en Maps
                                        </a>
                                    )}
                                </div>

                                {/* Pago */}
                                <div className="mb-4 flex gap-2.5">
                                    <div className="flex-1 rounded-[10px] bg-slate-900 px-3 py-2.5">
                                        <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-600">Monto</p>
                                        <p className="text-lg font-extrabold text-green-500">
                                            Gs. {parseInt(d.monto || 0).toLocaleString('es-PY')}
                                        </p>
                                    </div>
                                    <div className="flex-1 rounded-[10px] bg-slate-900 px-3 py-2.5">
                                        <p className="mb-0.5 text-[10px] uppercase tracking-wide text-slate-600">Método de pago</p>
                                        <p className={`text-sm font-bold ${d.metodo_pago === 'efectivo' ? 'text-amber-400' : 'text-blue-400'}`}>
                                            {d.metodo_pago === 'efectivo' ? 'Efectivo' : d.metodo_pago === 'transferencia' ? 'Transferencia' : d.metodo_pago || '—'}
                                        </p>
                                    </div>
                                </div>

                                {/* Producto */}
                                {d.producto_nombre && (
                                    <p className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>{d.producto_nombre} {d.presentacion_nombre}
                                    </p>
                                )}

                                {/* Botones de acción */}
                                {!entregado && (
                                    <div className="flex gap-2">
                                        {d.estado !== 'en_camino' && (
                                            <Button
                                                onClick={() => handleCambiarEstado(d.id, 'en_camino')}
                                                disabled={actualizando === d.id}
                                                className="flex-1 bg-indigo-600 py-6 text-sm font-bold hover:bg-indigo-700">
                                                En camino
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleCambiarEstado(d.id, 'entregado')}
                                            disabled={actualizando === d.id}
                                            className="flex-1 bg-green-600 py-6 text-sm font-bold hover:bg-green-700">
                                            Entregado
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}

export default Repartidor
