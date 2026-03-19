import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getMarcas, getCategorias } from '../services/productos'
import { getMetricas, getVentasPorDia, getVentasPorCanal, getRankingProductos, getTopClientes } from '../services/estadisticas'
import { getReporte } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'

function Reportes() {
    const [cargando, setCargando] = useState(true)
    const [modalConfirmar, setModalConfirmar] = useState(null)

    // Filtros
    const [periodo, setPeriodo] = useState('mes')
    const [canal, setCanal] = useState('')
    const [marcaId, setMarcaId] = useState('')
    const [categoriaId, setCategoriaId] = useState('')
    const [marcas, setMarcas] = useState([])
    const [categorias, setCategorias] = useState([])

    // Exportar
    const [exportDesde, setExportDesde] = useState('')
    const [exportHasta, setExportHasta] = useState('')
    const [exportCanal, setExportCanal] = useState('')
    const [exportando, setExportando] = useState(false)

    // Datos
    const [metricas, setMetricas] = useState(null)
    const [ventasPorDia, setVentasPorDia] = useState([])
    const [ventasPorCanal, setVentasPorCanal] = useState([])
    const [rankingProductos, setRankingProductos] = useState({ top: [], bottom: [] })
    const [topClientes, setTopClientes] = useState([])

    useEffect(() => {
        cargarFiltros()
    }, [])

    useEffect(() => {
        cargarDatos()
    }, [periodo, canal, marcaId, categoriaId])

    async function cargarFiltros() {
        try {
            const [mrcs, cats] = await Promise.all([getMarcas(), getCategorias()])
            setMarcas(mrcs)
            setCategorias(cats)
        } catch (err) {}
    }

    async function cargarDatos() {
        try {
            setCargando(true)
            const params = { periodo }
            if (canal) params.canal = canal
            if (marcaId) params.marca_id = marcaId
            if (categoriaId) params.categoria_id = categoriaId

            const [met, dias, canales, ranking, clientes] = await Promise.all([
                getMetricas(params),
                getVentasPorDia({ periodo, canal }),
                getVentasPorCanal({ periodo }),
                getRankingProductos({ periodo }),
                getTopClientes({ periodo })
            ])

            setMetricas(met)
            setVentasPorDia(dias)
            setVentasPorCanal(canales)
            setRankingProductos(ranking)
            setTopClientes(clientes)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los datos del reporte.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargando(false)
        }
    }

    async function handleExportarExcel() {
        if (!exportDesde || !exportHasta) {
            setModalConfirmar({
                titulo: 'Falta el período',
                mensaje: 'Seleccioná la fecha desde y hasta para exportar.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
            return
        }

        try {
            setExportando(true)
            const params = {
                fecha_desde: exportDesde,
                fecha_hasta: exportHasta + 'T23:59:59'
            }
            if (exportCanal) params.canal = exportCanal

            const datos = await getReporte(params)

            if (datos.length === 0) {
                setModalConfirmar({
                    titulo: 'Sin datos',
                    mensaje: 'No hay ventas en el período seleccionado.',
                    textoBoton: 'Cerrar',
                    colorBoton: '#888',
                    onConfirmar: () => setModalConfirmar(null)
                })
                return
            }

            const filas = datos.map(v => ({
                'Fecha': new Date(v.fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                'Cliente': v.cliente || 'Consumidor final',
                'RUC': v.ruc || '',
                'Teléfono': v.telefono || '',
                'Marca': v.marca || '',
                'Producto': v.producto || '',
                'Presentación': v.presentacion || '',
                'Cantidad': v.cantidad,
                'Monto (Gs.)': parseInt(v.monto),
                'IVA 10% (Gs.)': parseInt(v.iva),
                'Canal': v.canal || '',
                'Método de pago': v.metodo_pago || '',
                'Estado': v.estado || ''
            }))

            // Fila de totales
            const totalMonto = datos.reduce((sum, v) => sum + parseInt(v.monto), 0)
            const totalIVA = datos.reduce((sum, v) => sum + parseInt(v.iva), 0)
            filas.push({
                'Fecha': '',
                'Cliente': '',
                'RUC': '',
                'Teléfono': '',
                'Marca': '',
                'Producto': '',
                'Presentación': 'TOTAL',
                'Cantidad': datos.reduce((sum, v) => sum + parseInt(v.cantidad), 0),
                'Monto (Gs.)': totalMonto,
                'IVA 10% (Gs.)': totalIVA,
                'Canal': '',
                'Método de pago': '',
                'Estado': ''
            })

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(filas)

            // Ancho de columnas
            ws['!cols'] = [
                { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 16 },
                { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
                { wch: 16 }, { wch: 16 }, { wch: 15 }, { wch: 16 }, { wch: 12 }
            ]

            XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
            XLSX.writeFile(wb, `reporte_ventas_${exportDesde}_${exportHasta}.xlsx`)

        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo generar el reporte.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setExportando(false)
        }
    }

    function formatearGs(numero) {
        return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}`
    }

    function formatearFecha(fecha) {
        return new Date(fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' })
    }

    function iniciales(nombre) {
        if (!nombre) return 'CF'
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    function labelCanal(canal) {
        const labels = {
            en_tienda: '🏪 Tienda',
            whatsapp_bot: '🤖 WA Bot',
            whatsapp: '💬 WhatsApp',
            whatsapp_delivery: '🚚 Delivery',
            pagina_web: '🌐 Web',
            presencial: '🏪 Presencial',
            otro: '📋 Otro'
        }
        return labels[canal] || canal
    }

    const coloresCanal = ['#1a1a2e', '#4f46e5', '#818cf8', '#c7d2fe', '#e0e7ff', '#f1f5f9']

    const maxVenta = Math.max(...ventasPorDia.map(v => parseInt(v.total)), 1)
    const totalCanal = ventasPorCanal.reduce((sum, c) => sum + parseInt(c.total), 0)

    const periodos = [
        { valor: 'hoy', label: 'Hoy' },
        { valor: 'semana', label: 'Semana' },
        { valor: 'mes', label: 'Mes' },
        { valor: 'anual', label: 'Año' },
    ]

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Reportes de Operación</h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Análisis detallado de rendimiento comercial y financiero.</p>
                </div>
            </div>

            {/* Filtros */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Período</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {periodos.map(p => (
                                <button
                                    key={p.valor}
                                    onClick={() => setPeriodo(p.valor)}
                                    style={{
                                        flex: 1, padding: '6px 4px', borderRadius: '8px', border: '1px solid',
                                        fontSize: '11px', fontWeight: '600', cursor: 'pointer',
                                        background: periodo === p.valor ? '#1a1a2e' : 'white',
                                        color: periodo === p.valor ? 'white' : '#64748b',
                                        borderColor: periodo === p.valor ? '#1a1a2e' : '#e2e8f0'
                                    }}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Canal</label>
                        <select value={canal} onChange={e => setCanal(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <option value="">Todos los canales</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Marca</label>
                        <select value={marcaId} onChange={e => setMarcaId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <option value="">Todas las marcas</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Categoría</label>
                        <select value={categoriaId} onChange={e => setCategoriaId(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                            <option value="">Todas las categorías</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Métricas */}
            {metricas && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '4px solid #1a1a2e' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Total vendido</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{formatearGs(metricas.total)}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{metricas.cantidad} transacciones</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ganancia neta</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>{formatearGs(metricas.ganancia)}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>margen estimado</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>IVA generado</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{formatearGs(metricas.iva_total)}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Total ÷ 11</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ticket promedio</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{formatearGs(metricas.ticket_promedio)}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>por transacción</p>
                    </div>
                    <div style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Ventas</p>
                        <p style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>{metricas.cantidad}</p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>transacciones totales</p>
                    </div>
                </div>
            )}

            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>

                {/* Gráfico de barras */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Ventas por día</h3>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1a1a2e' }} />
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Ventas</span>
                            </div>
                        </div>
                    </div>
                    {ventasPorDia.length === 0 ? (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            Sin datos en este período
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '200px' }}>
                            {ventasPorDia.map((dia, i) => {
                                const altura = Math.max((parseInt(dia.total) / maxVenta) * 100, 2)
                                return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end' }}>
                                        <div style={{ fontSize: '9px', color: '#94a3b8', textAlign: 'center' }}>
                                            {formatearGs(dia.total).replace('Gs. ', '')}
                                        </div>
                                        <div
                                            style={{ width: '100%', height: `${altura}%`, background: '#1a1a2e', borderRadius: '4px 4px 0 0', minHeight: '4px', transition: 'height 0.3s ease' }}
                                            title={`${formatearGs(dia.total)} — ${dia.cantidad} ventas`}
                                        />
                                        <p style={{ fontSize: '9px', color: '#64748b', textAlign: 'center' }}>{formatearFecha(dia.fecha)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Gráfico de canales */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', alignSelf: 'flex-start', marginBottom: '20px' }}>Ventas por canal</h3>

                    {ventasPorCanal.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            Sin datos
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', marginBottom: '16px' }}>
                                {ventasPorCanal.map((c, i) => {
                                    const pct = totalCanal > 0 ? Math.round((parseInt(c.total) / totalCanal) * 100) : 0
                                    return (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '12px', color: '#0f172a', fontWeight: '500' }}>{labelCanal(c.canal)}</span>
                                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a' }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: coloresCanal[i % coloresCanal.length], borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                            </div>
                                            <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>{formatearGs(c.total)}</p>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Rankings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>

                {/* Top productos */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ⭐ Top 10 Productos
                        </h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Producto</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingProductos.top.map((p, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                                    background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fde8d8' : '#f8fafc',
                                                    color: i === 0 ? '#92400e' : i === 1 ? '#475569' : i === 2 ? '#9a3412' : '#94a3b8',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '10px', fontWeight: '800'
                                                }}>
                                                    {i + 1}
                                                </span>
                                                <div>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                                                        {p.marca && `${p.marca} — `}{p.producto}
                                                    </p>
                                                    <p style={{ fontSize: '10px', color: '#94a3b8' }}>{p.presentacion}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                                            {p.cantidad_vendida}
                                        </td>
                                    </tr>
                                ))}
                                {rankingProductos.top.length === 0 && (
                                    <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bottom productos */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            📉 Menos vendidos
                        </h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Producto</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Ventas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rankingProductos.bottom.map((p, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fca5a5', flexShrink: 0 }} />
                                                <div>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>
                                                        {p.marca && `${p.marca} — `}{p.producto}
                                                    </p>
                                                    <p style={{ fontSize: '10px', color: '#94a3b8' }}>{p.presentacion}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#ef4444' }}>
                                            {p.cantidad_vendida}
                                        </td>
                                    </tr>
                                ))}
                                {rankingProductos.bottom.length === 0 && (
                                    <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Top clientes */}
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            👤 Top Clientes
                        </h3>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Cliente</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topClientes.map((c, i) => (
                                    <tr key={i} style={{ borderTop: '1px solid #f8fafc' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={{ padding: '12px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '32px', height: '32px', borderRadius: '50%',
                                                    background: '#e0e7ff', color: '#3730a3',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '11px', fontWeight: '700', flexShrink: 0
                                                }}>
                                                    {iniciales(c.cliente)}
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#0f172a' }}>{c.cliente}</p>
                                                    <p style={{ fontSize: '10px', color: '#94a3b8' }}>{c.cantidad_compras} compras</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: '700', color: '#1a1a2e' }}>
                                            {formatearGs(c.total_comprado)}
                                        </td>
                                    </tr>
                                ))}
                                {topClientes.length === 0 && (
                                    <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Exportar Excel */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '16px' }}>📊 Exportar reporte contable</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Desde</label>
                        <input
                            type="date"
                            value={exportDesde}
                            onChange={e => setExportDesde(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Hasta</label>
                        <input
                            type="date"
                            value={exportHasta}
                            onChange={e => setExportHasta(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Canal (opcional)</label>
                        <select
                            value={exportCanal}
                            onChange={e => setExportCanal(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        >
                            <option value="">Todos</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <button
                        onClick={handleExportarExcel}
                        disabled={exportando}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: exportando ? '#94a3b8' : '#10b981',
                            color: 'white', cursor: exportando ? 'not-allowed' : 'pointer',
                            fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        {exportando ? 'Generando...' : '⬇ Exportar Excel'}
                    </button>
                </div>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '12px' }}>
                    El reporte incluye: fecha, cliente, RUC, producto, presentación, cantidad, monto, IVA 10%, canal y método de pago.
                </p>
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

export default Reportes