import { useState, useEffect } from 'react'
import { getDeliveries, actualizarEstadoDelivery } from '../services/deliveries'
import ModalConfirmar from '../components/ModalConfirmar'

function Delivery() {
    const [deliveries, setDeliveries] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [detalle, setDetalle] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)

    useEffect(() => {
        cargarDeliveries()
    }, [])

    async function cargarDeliveries() {
        try {
            setCargando(true)
            const datos = await getDeliveries()
            setDeliveries(datos)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los deliveries.',
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
            await actualizarEstadoDelivery(id, nuevoEstado)
            await cargarDeliveries()
            if (detalle?.id === id) {
                setDetalle(prev => ({ ...prev, estado: nuevoEstado }))
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

    function colorEstado(estado) {
        const colores = {
            pendiente: '#f59e0b',
            confirmado: '#3b82f6',
            en_camino: '#8b5cf6',
            entregado: '#10b981',
            cancelado: '#ef4444'
        }
        return colores[estado] || '#888'
    }

    function labelEstado(estado) {
        const labels = {
            pendiente: 'Pendiente',
            confirmado: 'Confirmado',
            en_camino: 'En camino',
            entregado: 'Entregado',
            cancelado: 'Cancelado'
        }
        return labels[estado] || estado
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleString('es-PY', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    }

    const filtros = [
        { valor: 'todos', label: 'Todos' },
        { valor: 'pendiente', label: 'Pendiente' },
        { valor: 'confirmado', label: 'Confirmado' },
        { valor: 'en_camino', label: 'En camino' },
        { valor: 'entregado', label: 'Entregado' },
        { valor: 'cancelado', label: 'Cancelado' },
    ]

    const deliveriesFiltrados = filtroEstado === 'todos'
        ? deliveries
        : deliveries.filter(d => d.estado === filtroEstado)

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando deliveries...</p></div>

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

            <div style={{ width: '420px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Deliveries</h2>
                        <button onClick={cargarDeliveries} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', fontSize: '12px', cursor: 'pointer' }}>
                            Actualizar
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {filtros.map(f => (
                            <button
                                key={f.valor}
                                onClick={() => setFiltroEstado(f.valor)}
                                style={{
                                    padding: '4px 10px', borderRadius: '20px', border: '1px solid',
                                    fontSize: '11px', cursor: 'pointer',
                                    background: filtroEstado === f.valor ? '#1a1a2e' : 'white',
                                    color: filtroEstado === f.valor ? 'white' : '#555',
                                    borderColor: filtroEstado === f.valor ? '#1a1a2e' : '#ddd'
                                }}
                            >
                                {f.label}
                                {f.valor !== 'todos' && (
                                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                                        ({deliveries.filter(d => d.estado === f.valor).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {deliveriesFiltrados.length === 0 ? (
                        <p style={{ padding: '20px', color: '#888', fontSize: '13px', textAlign: 'center' }}>No hay deliveries.</p>
                    ) : (
                        deliveriesFiltrados.map(d => (
                            <div
                                key={d.id}
                                onClick={() => setDetalle(d)}
                                style={{
                                    padding: '14px 20px',
                                    borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                    background: detalle?.id === d.id ? '#f0f4ff' : 'white'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>
                                        {d.cliente_nombre || d.cliente_numero}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '20px', fontSize: '10px',
                                        fontWeight: '500', color: 'white',
                                        backgroundColor: colorEstado(d.estado)
                                    }}>
                                        {labelEstado(d.estado)}
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#555', marginBottom: '2px' }}>
                                    {d.producto_nombre} — {d.presentacion_nombre}
                                </p>
                                <p style={{ fontSize: '11px', color: '#888' }}>
                                    Gs. {parseInt(d.precio).toLocaleString()} · {formatearFecha(d.created_at)}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div style={{ flex: 1, background: '#f9fafb', overflowY: 'auto' }}>
                {!detalle ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        <p>Seleccioná un delivery para ver los detalles</p>
                    </div>
                ) : (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>
                                    {detalle.cliente_nombre || detalle.cliente_numero}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                                    {detalle.producto_nombre} — {detalle.presentacion_nombre} · Gs. {parseInt(detalle.precio).toLocaleString()}
                                </p>
                            </div>
                            <span style={{
                                padding: '4px 12px', borderRadius: '20px', fontSize: '12px',
                                fontWeight: '500', color: 'white',
                                backgroundColor: colorEstado(detalle.estado)
                            }}>
                                {labelEstado(detalle.estado)}
                            </span>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: '#888' }}>DATOS DE ENTREGA</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {detalle.cliente_nombre && (
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Cliente</p>
                                        <p style={{ fontSize: '13px' }}>{detalle.cliente_nombre}</p>
                                    </div>
                                )}
                                {detalle.cliente_ruc && (
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>RUC</p>
                                        <p style={{ fontSize: '13px' }}>{detalle.cliente_ruc}</p>
                                    </div>
                                )}
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Ubicación</p>
                                    <p style={{ fontSize: '13px' }}>{detalle.ubicacion || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Referencia</p>
                                    <p style={{ fontSize: '13px' }}>{detalle.referencia || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Horario</p>
                                    <p style={{ fontSize: '13px' }}>{detalle.horario || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Contacto</p>
                                    <p style={{ fontSize: '13px' }}>{detalle.contacto_entrega || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Método de pago</p>
                                    <p style={{ fontSize: '13px' }}>{detalle.metodo_pago || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Fecha del pedido</p>
                                    <p style={{ fontSize: '13px' }}>{formatearFecha(detalle.created_at)}</p>
                                </div>
                            </div>

                            {detalle.ubicacion?.includes('maps.google.com') && (<a
                                
                                    href={detalle.ubicacion.replace(/^.*?(https:\/\/)/, 'https://')}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ display: 'inline-block', marginTop: '12px', padding: '8px 14px', borderRadius: '8px', background: '#1a1a2e', color: 'white', fontSize: '12px', textDecoration: 'none' }}
                                >
                                    Ver en Google Maps
                                </a>
                            )}
                        </div>

                        {detalle.notas && (
                            <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '16px', border: '1px solid #fde68a' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Notas</p>
                                <p style={{ fontSize: '13px', color: '#78350f' }}>{detalle.notas}</p>
                            </div>
                        )}

                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '14px', color: '#888' }}>CAMBIAR ESTADO</h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'].map(estado => (
                                    <button
                                        key={estado}
                                        onClick={() => cambiarEstado(detalle.id, estado)}
                                        disabled={detalle.estado === estado}
                                        style={{
                                            padding: '8px 14px', borderRadius: '8px', border: 'none',
                                            fontSize: '12px', cursor: detalle.estado === estado ? 'not-allowed' : 'pointer',
                                            background: detalle.estado === estado ? colorEstado(estado) : '#f0f0f0',
                                            color: detalle.estado === estado ? 'white' : '#555',
                                            fontWeight: detalle.estado === estado ? '600' : '400',
                                            opacity: detalle.estado === estado ? 1 : 0.8
                                        }}
                                    >
                                        {labelEstado(estado)}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>

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

export default Delivery