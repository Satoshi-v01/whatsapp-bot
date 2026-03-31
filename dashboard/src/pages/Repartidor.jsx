import { useState, useEffect } from 'react'
import { getMisDeliveries, cambiarEstadoRepartidor } from '../services/deliveries'

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
            pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
            confirmado: { bg: '#dbeafe', color: '#1d4ed8', label: 'Confirmado' },
            en_camino: { bg: '#ede9fe', color: '#5b21b6', label: 'En camino' },
            entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado' },
        }[estado] || { bg: '#f1f5f9', color: '#475569', label: estado }
    }

    const pendientes = deliveries.filter(d => d.estado !== 'entregado')
    const entregados = deliveries.filter(d => d.estado === 'entregado')
    const lista = filtro === 'pendientes' ? pendientes : deliveries

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>

            {/* Header */}
            <div style={{ background: '#1e293b', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', position: 'sticky', top: 0, zIndex: 100 }}>
                <div>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Repartidor</p>
                    <p style={{ fontSize: '16px', fontWeight: '700' }}>{usuario.nombre}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={cargarDeliveries}
                        style={{ background: '#334155', border: 'none', color: '#94a3b8', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                        ↻
                    </button>
                    <button onClick={onLogout}
                        style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
                        Salir
                    </button>
                </div>
            </div>

            {/* Métricas rápidas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px' }}>
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #334155' }}>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: '#f59e0b' }}>{pendientes.length}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pendientes</p>
                </div>
                <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', textAlign: 'center', border: '1px solid #334155' }}>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: '#10b981' }}>{entregados.length}</p>
                    <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Entregados</p>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', padding: '0 16px 16px' }}>
                {[{ val: 'pendientes', label: 'Pendientes' }, { val: 'todos', label: 'Todos hoy' }].map(f => (
                    <button key={f.val} onClick={() => setFiltro(f.val)}
                        style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: filtro === f.val ? '#4f46e5' : '#1e293b', color: filtro === f.val ? 'white' : '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Lista deliveries */}
            <div style={{ padding: '0 16px 100px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {cargando ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Cargando...</div>
                ) : lista.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                        <p style={{ fontSize: '15px', fontWeight: '600' }}>No hay deliveries pendientes</p>
                        <p style={{ fontSize: '13px', marginTop: '4px' }}>Buen trabajo!</p>
                    </div>
                ) : lista.map(d => {
                    const cfg = colorEstado(d.estado)
                    const entregado = d.estado === 'entregado'
                    return (
                        <div key={d.id} style={{ background: '#1e293b', borderRadius: '16px', padding: '18px', border: `1px solid ${entregado ? '#1e3a2f' : '#334155'}`, opacity: entregado ? 0.7 : 1 }}>

                            {/* Estado + ID */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '20px', background: cfg.bg, color: cfg.color }}>
                                    {cfg.label}
                                </span>
                                <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>#{d.id}</span>
                            </div>

                            {/* Cliente */}
                            <div style={{ marginBottom: '14px' }}>
                                <p style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>{d.cliente_nombre || 'Sin nombre'}</p>
                                {d.cliente_telefono && (
                                    <a href={`tel:${d.cliente_telefono}`}
                                        style={{ fontSize: '14px', color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.64 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.81-.81a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {d.cliente_telefono}
                                    </a>
                                )}
                            </div>

                            {/* Dirección */}
                            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                                <p style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Dirección</p>
                                <p style={{ fontSize: '14px', fontWeight: '500', lineHeight: '1.5' }}>{d.ubicacion || '—'}</p>
                                {d.referencia && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Ref: {d.referencia}</p>}
                                {d.horario && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{d.horario}</p>}
                                {d.contacto_entrega && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{d.contacto_entrega}</p>}
                                {d.ubicacion && (
                                    <a href={d.ubicacion.startsWith('http') ? d.ubicacion : `https://maps.google.com/?q=${encodeURIComponent(d.ubicacion)}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: '#34d399', textDecoration: 'none', fontWeight: '600' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Abrir en Maps
                                    </a>
                                )}
                            </div>

                            {/* Pago */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ flex: 1, background: '#0f172a', borderRadius: '10px', padding: '10px 12px' }}>
                                    <p style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Monto</p>
                                    <p style={{ fontSize: '18px', fontWeight: '800', color: '#10b981' }}>
                                        Gs. {parseInt(d.monto || 0).toLocaleString('es-PY')}
                                    </p>
                                </div>
                                <div style={{ flex: 1, background: '#0f172a', borderRadius: '10px', padding: '10px 12px' }}>
                                    <p style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Método de pago</p>
                                    <p style={{ fontSize: '14px', fontWeight: '700', color: d.metodo_pago === 'efectivo' ? '#fbbf24' : '#60a5fa' }}>
                                        {d.metodo_pago === 'efectivo' ? 'Efectivo' : d.metodo_pago === 'transferencia' ? 'Transferencia' : d.metodo_pago || '—'}
                                    </p>
                                </div>
                            </div>

                            {/* Producto */}
                            {d.producto_nombre && (
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>{d.producto_nombre} {d.presentacion_nombre}
                                </p>
                            )}

                            {/* Botones de acción */}
                            {!entregado && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {d.estado !== 'en_camino' && (
                                        <button
                                            onClick={() => handleCambiarEstado(d.id, 'en_camino')}
                                            disabled={actualizando === d.id}
                                            style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#4f46e5', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '700', opacity: actualizando === d.id ? 0.6 : 1 }}>
                                            En camino
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleCambiarEstado(d.id, 'entregado')}
                                        disabled={actualizando === d.id}
                                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '700', opacity: actualizando === d.id ? 0.6 : 1 }}>
                                        Entregado
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default Repartidor