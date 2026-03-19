import { useState, useEffect } from 'react'
import { getVentas, actualizarEstadoVenta } from '../services/ventas'
import { useSearchParams } from 'react-router-dom'
import ModalConfirmar from '../components/ModalConfirmar'

function Ventas() {
    const [ventas, setVentas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [searchParams] = useSearchParams()
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [modalConfirmar, setModalConfirmar] = useState(null)

    const ventasFiltradas = filtroEstado === 'todos'
        ? ventas
        : ventas.filter(v => v.estado === filtroEstado)

    useEffect(() => {
        const estadoFiltro = searchParams.get('estado')
        if (estadoFiltro) {
            setFiltroEstado(estadoFiltro)
        }
        cargarVentas()
    }, [])

    async function cargarVentas() {
        try {
            setCargando(true)
            const datos = await getVentas()
            setVentas(datos)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar las ventas.',
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
            await cargarVentas()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo actualizar el estado de la venta.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleString('es-PY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    function colorEstado(estado) {
        const colores = {
            pendiente_pago: '#f59e0b',
            pagado: '#10b981',
            entregado: '#3b82f6',
            cancelado: '#ef4444'
        }
        return colores[estado] || '#888'
    }

    const filtros = [
        { valor: 'todos', label: 'Todos' },
        { valor: 'pendiente_pago', label: 'Pendiente pago' },
        { valor: 'pagado', label: 'Pagado' },
        { valor: 'entregado', label: 'Entregado' },
        { valor: 'cancelado', label: 'Cancelado' },
    ]

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando ventas...</p></div>

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '22px' }}>Ventas</h2>
                <button onClick={cargarVentas} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                    Actualizar
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {filtros.map(f => (
                    <button
                        key={f.valor}
                        onClick={() => setFiltroEstado(f.valor)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: '1px solid',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: filtroEstado === f.valor ? '600' : '400',
                            background: filtroEstado === f.valor ? '#1a1a2e' : 'white',
                            color: filtroEstado === f.valor ? 'white' : '#555',
                            borderColor: filtroEstado === f.valor ? '#1a1a2e' : '#ddd',
                            transition: 'all 0.15s'
                        }}
                    >
                        {f.label}
                        {f.valor !== 'todos' && (
                            <span style={{ marginLeft: '6px', opacity: 0.7 }}>
                                ({ventas.filter(v => v.estado === f.valor).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {ventasFiltradas.length === 0 ? (
                <p style={{ color: '#888', fontSize: '13px' }}>No hay ventas con ese estado.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ background: '#1a1a2e', color: 'white' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>#</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Cliente</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Producto</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Presentación</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Precio</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Ganancia</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Canal</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Factura</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Estado</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Fecha</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventasFiltradas.map(venta => (
                            <tr key={venta.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.id}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.cliente_numero}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.producto_nombre}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.presentacion_nombre}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>Gs. {parseInt(venta.precio).toLocaleString()}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#10b981' }}>
                                    {venta.ganancia ? `Gs. ${parseInt(venta.ganancia).toLocaleString()}` : '—'}
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#888' }}>{venta.canal}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                    {venta.quiere_factura ? (
                                        <span style={{ fontSize: '11px', color: '#3730a3' }}>
                                            ✓ {venta.ruc_factura || '—'}
                                        </span>
                                    ) : (
                                        <span style={{ fontSize: '11px', color: '#888' }}>No</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: 'white', backgroundColor: colorEstado(venta.estado) }}>
                                        {venta.estado}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{formatearFecha(venta.created_at)}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                                    <select
                                        value={venta.estado}
                                        onChange={e => cambiarEstado(venta.id, e.target.value)}
                                        style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        <option value="pendiente_pago">Pendiente pago</option>
                                        <option value="pagado">Pagado</option>
                                        <option value="entregado">Entregado</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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