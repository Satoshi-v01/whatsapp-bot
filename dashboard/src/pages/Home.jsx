import { useState, useEffect } from 'react'
import { getResumen, getVentasSemana, getTopProductos } from '../services/estadisticas'
import { useNavigate } from 'react-router-dom'
import ModalConfirmar from '../components/ModalConfirmar'

function Home() {
    const [resumen, setResumen] = useState(null)
    const [ventasSemana, setVentasSemana] = useState([])
    const [topProductos, setTopProductos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const navigate = useNavigate()

    useEffect(() => {
        cargarDatos()
        const intervalo = setInterval(cargarDatos, 30000)
        return () => clearInterval(intervalo)
    }, [])

    async function cargarDatos() {
        try {
            const [res, semana, top] = await Promise.all([
                getResumen(),
                getVentasSemana(),
                getTopProductos()
            ])
            setResumen(res)
            setVentasSemana(semana)
            setTopProductos(top)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los datos del resumen.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargando(false)
        }
    }

    function formatearGuaranies(numero) {
        return `Gs. ${parseInt(numero).toLocaleString('es-PY')}`
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: '2-digit' })
    }

    function alturaBarraGrafico(valor, maximo) {
        if (maximo === 0) return 0
        return Math.max((valor / maximo) * 100, 2)
    }

    const maxVenta = Math.max(...ventasSemana.map(v => parseInt(v.total)), 1)

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando...</p></div>

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
                <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Resumen del día</h2>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                    {new Date().toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
            </div>

            {/* Tarjetas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>

                <div
                    onClick={() => navigate('/ventas')}
                    style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #10b981', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Total vendido hoy</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#10b981' }}>{formatearGuaranies(resumen?.ventas_hoy?.total || 0)}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{resumen?.ventas_hoy?.cantidad || 0} ventas</p>
                    {resumen?.ventas_hoy?.ganancia > 0 && (
                        <p style={{ fontSize: '11px', color: '#10b981', marginTop: '2px' }}>
                            Ganancia: {formatearGuaranies(resumen.ventas_hoy.ganancia)}
                        </p>
                    )}
                </div>

                <div
                    onClick={() => navigate('/ventas?estado=pendiente_pago')}
                    style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #f59e0b', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Pendientes de pago</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#f59e0b' }}>{resumen?.pendientes || 0}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>requieren confirmación</p>
                </div>

                <div
                    onClick={() => navigate('/delivery')}
                    style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #3b82f6', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Deliveries activos</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6' }}>{resumen?.deliveries || 0}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>en proceso</p>
                </div>

                <div
                    onClick={() => navigate('/chat')}
                    style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #ef4444', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                    <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>Chats esperando agente</p>
                    <p style={{ fontSize: '22px', fontWeight: '700', color: '#ef4444' }}>{resumen?.esperando_agente || 0}</p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>requieren atención</p>
                </div>

            </div>

            {/* Gráfico y top productos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>Ventas últimos 7 días</h3>
                    {ventasSemana.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin datos</p>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
                            {ventasSemana.map((dia, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                    <p style={{ fontSize: '10px', color: '#888' }}>{formatearGuaranies(dia.total).replace('Gs. ', '')}</p>
                                    <div style={{
                                        width: '100%',
                                        height: `${alturaBarraGrafico(parseInt(dia.total), maxVenta)}%`,
                                        background: '#1a1a2e',
                                        borderRadius: '4px 4px 0 0',
                                        minHeight: '4px',
                                        transition: 'height 0.3s ease'
                                    }} />
                                    <p style={{ fontSize: '10px', color: '#888', textAlign: 'center' }}>{formatearFecha(dia.fecha)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Productos más vendidos del mes</h3>
                    {topProductos.length === 0 ? (
                        <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>Sin datos</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {topProductos.map((prod, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{
                                        width: '24px', height: '24px', borderRadius: '50%',
                                        background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#e5e7eb',
                                        color: i < 3 ? 'white' : '#888',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '11px', fontWeight: '700', flexShrink: 0
                                    }}>
                                        {i + 1}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {prod.producto} — {prod.presentacion}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#888' }}>
                                            {prod.cantidad_vendida} vendidos · {formatearGuaranies(prod.total_generado)}
                                            {prod.ganancia_generada > 0 && ` · Gan: ${formatearGuaranies(prod.ganancia_generada)}`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

            {/* Alertas de stock bajo */}
            {resumen?.stock_bajo?.length > 0 && (
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px', color: '#ef4444' }}>⚠️ Stock bajo</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                        {resumen.stock_bajo.map((item, i) => (
                            <div
                                key={i}
                                onClick={() => navigate('/inventario')}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: item.stock === 0 ? '#fee2e2' : '#fffbeb',
                                    border: `1px solid ${item.stock === 0 ? '#fca5a5' : '#fde68a'}`,
                                    cursor: 'pointer'
                                }}
                            >
                                <p style={{ fontSize: '13px', fontWeight: '500' }}>{item.nombre}</p>
                                <p style={{ fontSize: '12px', color: '#888' }}>{item.presentacion}</p>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: item.stock === 0 ? '#ef4444' : '#f59e0b', marginTop: '4px' }}>
                                    {item.stock === 0 ? 'Sin stock' : `${item.stock} unidades`}
                                </p>
                            </div>
                        ))}
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

export default Home