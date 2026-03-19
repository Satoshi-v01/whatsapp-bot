import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getHistorial, actualizarEstadoVenta } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'

function Ventas() {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [ventaDetalle, setVentaDetalle] = useState(null)

    // Filtros
    const [periodo, setPeriodo] = useState('recientes')
    const [buscar, setBuscar] = useState('')
    const [metodoPago, setMetodoPago] = useState('')
    const [canal, setCanal] = useState('')
    const [pagina, setPagina] = useState(1)

    useEffect(() => {
        const estadoFiltro = searchParams.get('estado')
        cargarHistorial()
    }, [periodo, metodoPago, canal, pagina])

    useEffect(() => {
        const timeout = setTimeout(() => cargarHistorial(), 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function cargarHistorial() {
        try {
            setCargando(true)
            const params = { periodo, pagina }
            if (buscar) params.buscar = buscar
            if (metodoPago) params.metodo_pago = metodoPago
            if (canal) params.canal = canal
            const resultado = await getHistorial(params)
            setDatos(resultado)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo cargar el historial.',
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
            await cargarHistorial()
            if (ventaDetalle?.id === id) {
                setVentaDetalle(prev => ({ ...prev, estado: nuevoEstado }))
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

    function formatearFecha(fecha) {
        const d = new Date(fecha)
        const hoy = new Date()
        const ayer = new Date(hoy)
        ayer.setDate(ayer.getDate() - 1)

        const hora = d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })

        if (d.toDateString() === hoy.toDateString()) return `Hoy ${hora}`
        if (d.toDateString() === ayer.toDateString()) return `Ayer ${hora}`
        return d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ` ${hora}`
    }

    function formatearGs(numero) {
        return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}`
    }

    function iniciales(nombre) {
        if (!nombre) return 'CF'
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    function colorMetodoPago(metodo) {
        const colores = {
            efectivo: { bg: '#d1fae5', color: '#065f46' },
            tarjeta: { bg: '#e0e7ff', color: '#3730a3' },
            transferencia: { bg: '#fef3c7', color: '#92400e' }
        }
        return colores[metodo] || { bg: '#f0f0f0', color: '#555' }
    }

    function colorEstado(estado) {
        const colores = {
            pendiente_pago: { bg: '#fef3c7', color: '#92400e' },
            pagado: { bg: '#d1fae5', color: '#065f46' },
            entregado: { bg: '#e0e7ff', color: '#3730a3' },
            cancelado: { bg: '#fee2e2', color: '#991b1b' }
        }
        return colores[estado] || { bg: '#f0f0f0', color: '#555' }
    }

    function labelCanal(canal) {
        const labels = {
            en_tienda: '🏪 En tienda',
            whatsapp_bot: '🤖 Bot',
            whatsapp: '💬 WhatsApp',
            whatsapp_delivery: '🚚 Delivery',
            pagina_web: '🌐 Web',
            presencial: '🏪 Presencial',
            otro: '📋 Otro'
        }
        return labels[canal] || canal
    }

    const tabs = [
        { valor: 'recientes', label: 'Recientes' },
        { valor: 'semanal', label: 'Semanal' },
        { valor: 'mensual', label: 'Mensual' },
        { valor: 'anual', label: 'Anual' },
    ]

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Historial de Ventas</h1>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Gestioná y supervisá todas las transacciones realizadas.</p>
                </div>
                <button
                    onClick={() => navigate('/caja')}
                    style={{ background: '#1a1a2e', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    + Nueva venta
                </button>
            </div>

            {/* Tarjetas resumen */}
            {datos?.resumen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderBottom: '4px solid #1a1a2e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total del Día</span>
                        </div>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginTop: '12px' }}>{formatearGs(datos.resumen.dia.total)}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{datos.resumen.dia.cantidad} transacciones hoy</p>
                    </div>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderBottom: '4px solid #e0e7ff' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de la Semana</span>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginTop: '12px' }}>{formatearGs(datos.resumen.semana.total)}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{datos.resumen.semana.cantidad} transacciones esta semana</p>
                    </div>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderBottom: '4px solid #f0f0f0' }}>
                        <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ventas del Mes</span>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: '#1a1a2e', marginTop: '12px' }}>{formatearGs(datos.resumen.mes.total)}</p>
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{datos.resumen.mes.cantidad} transacciones este mes</p>
                    </div>
                </div>
            )}

            {/* Tabla con filtros */}
            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

                {/* Tabs */}
                <div style={{ padding: '0 24px', display: 'flex', gap: '4px', borderBottom: '1px solid #f1f5f9' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.valor}
                            onClick={() => { setPeriodo(tab.valor); setPagina(1) }}
                            style={{
                                padding: '14px 20px', fontSize: '13px', fontWeight: periodo === tab.valor ? '700' : '500',
                                color: periodo === tab.valor ? '#1a1a2e' : '#64748b',
                                borderBottom: periodo === tab.valor ? '2px solid #1a1a2e' : '2px solid transparent',
                                background: 'none', border: 'none', borderBottom: periodo === tab.valor ? '2px solid #1a1a2e' : '2px solid transparent',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div style={{ padding: '20px 24px', background: '#f8fafc', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', alignItems: 'end', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                            Buscar transacción / cliente
                        </label>
                        <input
                            placeholder="ID, nombre o número..."
                            value={buscar}
                            onChange={e => { setBuscar(e.target.value); setPagina(1) }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                            Método de pago
                        </label>
                        <select
                            value={metodoPago}
                            onChange={e => { setMetodoPago(e.target.value); setPagina(1) }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        >
                            <option value="">Todos</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>
                            Canal
                        </label>
                        <select
                            value={canal}
                            onChange={e => { setCanal(e.target.value); setPagina(1) }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                        >
                            <option value="">Todos</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div>
                        <button
                            onClick={() => { setBuscar(''); setMetodoPago(''); setCanal(''); setPagina(1) }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontSize: '13px', cursor: 'pointer', color: '#64748b', fontWeight: '500' }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                {cargando ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Cargando...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Producto</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fecha y hora</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Método</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Canal</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estado</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {datos?.ventas?.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                            No hay ventas en este período.
                                        </td>
                                    </tr>
                                ) : (
                                    datos?.ventas?.map(venta => {
                                        const colMetodo = colorMetodoPago(venta.metodo_pago)
                                        const colEstado = colorEstado(venta.estado)
                                        const nombreCliente = venta.cliente_nombre || venta.razon_social || venta.cliente_numero || 'Consumidor final'
                                        return (
                                            <tr
                                                key={venta.id}
                                                style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: '#1a1a2e' }}>
                                                    #{String(venta.id).padStart(4, '0')}
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: '#e0e7ff', color: '#3730a3',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '11px', fontWeight: '700', flexShrink: 0
                                                        }}>
                                                            {iniciales(nombreCliente)}
                                                        </div>
                                                        <span style={{ fontWeight: '500', color: '#0f172a' }}>{nombreCliente}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '12px', color: '#64748b' }}>
                                                    {venta.marca_nombre && `${venta.marca_nombre} — `}{venta.producto_nombre} {venta.presentacion_nombre}
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px', color: '#64748b' }}>
                                                    {formatearFecha(venta.created_at)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: colMetodo.bg, color: colMetodo.color, textTransform: 'uppercase' }}>
                                                        {venta.metodo_pago || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
                                                    {labelCanal(venta.canal)}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <select
                                                        value={venta.estado}
                                                        onChange={e => cambiarEstado(venta.id, e.target.value)}
                                                        style={{
                                                            padding: '3px 8px', borderRadius: '20px', fontSize: '10px',
                                                            fontWeight: '700', background: colEstado.bg, color: colEstado.color,
                                                            border: 'none', cursor: 'pointer', textTransform: 'uppercase'
                                                        }}
                                                    >
                                                        <option value="pendiente_pago">PENDIENTE</option>
                                                        <option value="pagado">PAGADO</option>
                                                        <option value="entregado">ENTREGADO</option>
                                                        <option value="cancelado">CANCELADO</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: '#1a1a2e', fontSize: '14px' }}>
                                                    {formatearGs(venta.precio)}
                                                </td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => setVentaDetalle(venta)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px', padding: '4px', borderRadius: '6px' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#1a1a2e'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                                    >
                                                        👁
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {datos?.paginacion && datos.paginacion.total > 0 && (
                    <div style={{ padding: '16px 24px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
                        <p style={{ fontSize: '12px', color: '#64748b' }}>
                            Mostrando <strong>{((pagina - 1) * 20) + 1}–{Math.min(pagina * 20, datos.paginacion.total)}</strong> de <strong>{datos.paginacion.total}</strong> ventas
                        </p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                                onClick={() => setPagina(Math.max(1, pagina - 1))}
                                disabled={pagina === 1}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.4 : 1, fontSize: '13px' }}
                            >
                                ‹
                            </button>
                            {Array.from({ length: Math.min(5, datos.paginacion.total_paginas) }, (_, i) => {
                                const num = i + 1
                                return (
                                    <button
                                        key={num}
                                        onClick={() => setPagina(num)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                            background: pagina === num ? '#1a1a2e' : 'white',
                                            color: pagina === num ? 'white' : '#64748b',
                                            borderColor: pagina === num ? '#1a1a2e' : '#e2e8f0'
                                        }}
                                    >
                                        {num}
                                    </button>
                                )
                            })}
                            <button
                                onClick={() => setPagina(Math.min(datos.paginacion.total_paginas, pagina + 1))}
                                disabled={pagina === datos.paginacion.total_paginas}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: pagina === datos.paginacion.total_paginas ? 'not-allowed' : 'pointer', opacity: pagina === datos.paginacion.total_paginas ? 0.4 : 1, fontSize: '13px' }}
                            >
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Panel detalle de venta */}
            {ventaDetalle && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px', background: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)', zIndex: 1000, overflowY: 'auto' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>
                                Venta #{String(ventaDetalle.id).padStart(4, '0')}
                            </h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{formatearFecha(ventaDetalle.created_at)}</p>
                        </div>
                        <button onClick={() => setVentaDetalle(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                        {/* Cliente */}
                        <div>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Cliente</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700' }}>
                                    {iniciales(ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'CF')}
                                </div>
                                <div>
                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                        {ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'Consumidor final'}
                                    </p>
                                    {ventaDetalle.cliente_ruc && <p style={{ fontSize: '12px', color: '#64748b' }}>RUC: {ventaDetalle.cliente_ruc}</p>}
                                    {ventaDetalle.cliente_numero && <p style={{ fontSize: '12px', color: '#64748b' }}>📱 {ventaDetalle.cliente_numero}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Producto */}
                        <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '16px' }}>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Producto</p>
                            <p style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                                {ventaDetalle.marca_nombre && `${ventaDetalle.marca_nombre} — `}{ventaDetalle.producto_nombre}
                            </p>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{ventaDetalle.presentacion_nombre}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Cantidad</span>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>{ventaDetalle.cantidad}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Total</span>
                                <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a1a2e' }}>{formatearGs(ventaDetalle.precio)}</span>
                            </div>
                            {ventaDetalle.ganancia > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>Ganancia</span>
                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#10b981' }}>{formatearGs(ventaDetalle.ganancia)}</span>
                                </div>
                            )}
                        </div>

                        {/* Detalles */}
                        <div>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Detalles</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>Canal</span>
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>{labelCanal(ventaDetalle.canal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>Método de pago</span>
                                    <span style={{ fontSize: '13px', fontWeight: '500', textTransform: 'capitalize' }}>{ventaDetalle.metodo_pago || '—'}</span>
                                </div>
                                {ventaDetalle.quiere_factura && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b' }}>RUC factura</span>
                                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{ventaDetalle.ruc_factura || '—'}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Estado */}
                        <div>
                            <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Estado</p>
                            <select
                                value={ventaDetalle.estado}
                                onChange={e => cambiarEstado(ventaDetalle.id, e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', cursor: 'pointer' }}
                            >
                                <option value="pendiente_pago">Pendiente de pago</option>
                                <option value="pagado">Pagado</option>
                                <option value="entregado">Entregado</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
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

export default Ventas