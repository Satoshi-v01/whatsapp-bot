import { useState, useEffect } from 'react'
import { getVentas, actualizarEstadoVenta } from '../services/ventas'

function Ventas() {
    const [ventas, setVentas] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        cargarVentas()
    }, [])

    async function cargarVentas() {
        try {
            setCargando(true)
            const datos = await getVentas()
            setVentas(datos)
        } catch (err) {
            console.error('Error cargando ventas:', err)
        } finally {
            setCargando(false)
        }
    }

    async function cambiarEstado(id, nuevoEstado) {
        try {
            await actualizarEstadoVenta(id, nuevoEstado)
            await cargarVentas()
        } catch (err) {
            console.error('Error actualizando estado:', err)
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

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando ventas...</p></div>

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px' }}>Ventas</h2>
                <button onClick={cargarVentas} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                    Actualizar
                </button>
            </div>

            {ventas.length === 0 ? (
                <p>No hay ventas registradas.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ background: '#1a1a2e', color: 'white' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>#</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Cliente</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Producto</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Presentación</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Precio</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Estado</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Fecha</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px' }}>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventas.map(venta => (
                            <tr key={venta.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.id}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.cliente_numero}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.producto_nombre}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>{venta.presentacion_nombre}</td>
                                <td style={{ padding: '12px 16px', fontSize: '13px' }}>Gs. {venta.precio.toLocaleString()}</td>
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
        </div>
    )
}

export default Ventas