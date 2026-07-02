import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { getHistorial, actualizarEstadoVenta, anularVenta, actualizarMetodoPago } from '../services/ventas'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import * as XLSX from 'xlsx'
import { getLibroVentas } from '../services/ventas'
import { formatearFecha, formatearSoloFecha, fechaHoyPY, fechaInicioMesPY } from '../utils/fecha'

function Ventas() {
    const [datos, setDatos] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [ventaDetalle, setVentaDetalle] = useState(null)
    const { darkMode } = useApp()
    const [modalLibro, setModalLibro] = useState(false)
    const [libroFechaDesde, setLibroFechaDesde] = useState(fechaInicioMesPY())
    const [libroFechaHasta, setLibroFechaHasta] = useState(fechaHoyPY())
    const [exportandoLibro, setExportandoLibro] = useState(false)

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#334155' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        inputBg: darkMode ? '#0f172a' : 'white',
        rowHover: darkMode ? '#1a2536' : '#f8fafc',
    }

    const [periodo, setPeriodo] = useState('recientes')
    const [buscar, setBuscar] = useState('')
    const [metodoPago, setMetodoPago] = useState('')
    const [canal, setCanal] = useState('')
    const [pagina, setPagina] = useState(1)
    const [estadoFiltro, setEstadoFiltro] = useState('')

   useEffect(() => {
        cargarHistorial()
    }, [periodo, metodoPago, canal, pagina, estadoFiltro])

    useEffect(() => {
        const timeout = setTimeout(() => cargarHistorial(), 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function handleExportarLibroVentas() {
        setExportandoLibro(true)
        try {
            const datos = await getLibroVentas(libroFechaDesde, libroFechaHasta)
            
            const filas = datos.map((v, idx) => {
                const anulada = v.estado === 'cancelado'
                const total = anulada ? 0 : parseInt(v.total || 0)
                const tipoIva = v.tipo_iva || '10'

                let grav10 = 0, iva10 = 0, grav5 = 0, iva5 = 0, exenta = 0

                if (!anulada) {
                    if (tipoIva === '10') {
                        iva10 = Math.floor(total / 11)
                        grav10 = total - iva10
                    } else if (tipoIva === '5') {
                        iva5 = Math.floor(total / 21)
                        grav5 = total - iva5
                    } else {
                        exenta = total
                    }
                }

                const cliente = anulada ? '—' : (v.razon_social || v.cliente_nombre || 'CONSUMIDOR FINAL')
                const ruc = anulada ? '—' : (v.ruc_factura || v.cliente_ruc || '—')
                const nroFactura = v.numero_factura || `#${String(v.id).padStart(7, '0')}`

                return {
                    'N°': idx + 1,
                    'Fecha': new Date(v.fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' }),
                    'Tipo Documento': 'Factura',
                    'N° Factura': nroFactura,
                    'Cliente': cliente,
                    'RUC / CI': ruc,
                    'Gravada 10%': grav10,
                    'IVA 10%': iva10,
                    'Gravada 5%': grav5,
                    'IVA 5%': iva5,
                    'Exentas': exenta,
                    'Total': total,
                    'Observación': anulada ? 'ANULADA' : ''
                }
            })

            // Totales solo sobre facturas vigentes
            const filasVigentes = filas.filter(f => f['Observación'] !== 'ANULADA')
            const totales = {
                'N°': '',
                'Fecha': '',
                'Tipo Documento': '',
                'N° Factura': '',
                'Cliente': 'TOTALES',
                'RUC / CI': '',
                'Gravada 10%': filasVigentes.reduce((s, f) => s + f['Gravada 10%'], 0),
                'IVA 10%': filasVigentes.reduce((s, f) => s + f['IVA 10%'], 0),
                'Gravada 5%': filasVigentes.reduce((s, f) => s + f['Gravada 5%'], 0),
                'IVA 5%': filasVigentes.reduce((s, f) => s + f['IVA 5%'], 0),
                'Exentas': filasVigentes.reduce((s, f) => s + f['Exentas'], 0),
                'Total': filasVigentes.reduce((s, f) => s + f['Total'], 0),
                'Observación': ''
            }

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet([...filas, totales])

            // Anchos de columna
            ws['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 18 },
                { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
                { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }
            ]

            // Colorear en rojo las filas anuladas (fila 0 = header, datos desde fila 1)
            const numCols = Object.keys(filas[0] || {}).length
            const estiloAnulada = {
                font: { color: { rgb: 'C0392B' } },
                fill: { patternType: 'solid', fgColor: { rgb: 'FDECEA' } }
            }
            filas.forEach((fila, rowIdx) => {
                if (fila['Observación'] === 'ANULADA') {
                    for (let c = 0; c < numCols; c++) {
                        const addr = XLSX.utils.encode_cell({ r: rowIdx + 1, c })
                        if (ws[addr]) ws[addr].s = estiloAnulada
                    }
                }
            })

            XLSX.utils.book_append_sheet(wb, ws, 'Libro de Ventas')
            XLSX.writeFile(wb, `libro_ventas_${libroFechaDesde}_${libroFechaHasta}.xlsx`, { cellStyles: true })
            setModalLibro(false)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar el libro de ventas.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportandoLibro(false) }
    }

    async function cargarHistorial() {
        try {
            setCargando(true)
            const params = { periodo, pagina }
            if (estadoFiltro) params.estado = estadoFiltro 
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

    async function cambiarMetodoPago(id, nuevoMetodo) {
        try {
            await actualizarMetodoPago(id, nuevoMetodo)
            await cargarHistorial()
            setVentaDetalle(prev => prev?.id === id ? { ...prev, metodo_pago: nuevoMetodo } : prev)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: err.response?.data?.error || 'No se pudo cambiar el método de pago.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function confirmarAnular(venta) {
        setModalConfirmar({
            titulo: 'Anular venta',
            mensaje: `¿Anular la venta #${venta.id} por Gs. ${parseInt(venta.precio).toLocaleString('es-PY')}? El stock de los productos volverá al inventario. Esta acción no se puede deshacer.`,
            textoBoton: 'Anular venta',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await anularVenta(venta.id)
                    setModalConfirmar(null)
                    if (ventaDetalle?.id === venta.id) setVentaDetalle(prev => ({ ...prev, estado: 'cancelado' }))
                    await cargarHistorial()
                } catch (err) {
                    setModalConfirmar({
                        titulo: 'Error',
                        mensaje: err.response?.data?.error || 'No se pudo anular la venta.',
                        textoBoton: 'Cerrar',
                        colorBoton: '#888',
                        onConfirmar: () => setModalConfirmar(null)
                    })
                }
            }
        })
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
            en_tienda: 'En tienda', whatsapp_bot: 'Bot',
            whatsapp: 'WhatsApp', whatsapp_delivery: 'Delivery',
            pagina_web: 'Web', presencial: 'Presencial', otro: 'Otro'
        }
        return labels[canal] || (canal ? canal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '—')
    }

    const tabs = [
        { valor: 'recientes', label: 'Recientes' },
        { valor: 'semanal', label: 'Semanal' },
        { valor: 'mensual', label: 'Mensual' },
        { valor: 'anual', label: 'Anual' },
    ]

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', background: s.bg, minHeight: '100%' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Historial de Ventas</h1>
                    <p style={{ fontSize: '13px', color: s.textMuted, marginTop: '4px' }}>Gestioná y supervisá todas las transacciones realizadas.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setModalLibro(true)}
                        style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        Libro de Ventas
                    </button>
                    <button onClick={() => navigate('/dashboard/caja')} style={{ background: '#1a1a2e', color: 'white', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        + Nueva venta
                    </button>
                </div>
            </div>

            {/* Tarjetas resumen */}
            {datos?.resumen && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' }}>
                    {[
                        { label: 'Total del Día', valor: formatearGs(datos.resumen.dia.total), sub: `${datos.resumen.dia.cantidad} transacciones hoy`, accent: '#1a1a2e' },
                        { label: 'Total de la Semana', valor: formatearGs(datos.resumen.semana.total), sub: `${datos.resumen.semana.cantidad} transacciones esta semana`, accent: '#4f46e5' },
                        { label: 'Ventas del Mes', valor: formatearGs(datos.resumen.mes.total), sub: `${datos.resumen.mes.cantidad} transacciones este mes`, accent: '#94a3b8' },
                    ].map((t, i) => (
                        <div key={i} style={{ background: s.surface, padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderBottom: `4px solid ${t.accent}` }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</span>
                            <p style={{ fontSize: '28px', fontWeight: '800', color: s.text, marginTop: '12px' }}>{t.valor}</p>
                            <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '4px' }}>{t.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabla */}
            <div style={{ background: s.surface, borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>

                {/* Tabs */}
                <div style={{ padding: '0 24px', display: 'flex', gap: '4px', borderBottom: `1px solid ${s.borderLight}` }}>
                    {tabs.map(tab => (
                        <button key={tab.valor} onClick={() => { setPeriodo(tab.valor); setPagina(1) }}
                            style={{
                                padding: '14px 20px', fontSize: '13px',
                                fontWeight: periodo === tab.valor ? '700' : '500',
                                color: periodo === tab.valor ? s.text : s.textMuted,
                                borderBottom: periodo === tab.valor ? `2px solid ${s.text}` : '2px solid transparent',
                                background: 'none', border: 'none',
                                cursor: 'pointer', transition: 'all 0.15s'
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filtros */}
                <div style={{ padding: '20px 24px', background: s.surfaceLow, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'end', borderBottom: `1px solid ${s.borderLight}` }}>
                    <div>
                        <label style={labelStyle}>Buscar transacción / cliente</label>
                        <input placeholder="ID, nombre o número..." value={buscar} onChange={e => { setBuscar(e.target.value); setPagina(1) }} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Método de pago</label>
                        <select value={metodoPago} onChange={e => { setMetodoPago(e.target.value); setPagina(1) }} style={inputStyle}>
                            <option value="">Todos</option>
                            <option value="efectivo">Efectivo</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Canal</label>
                        <select value={canal} onChange={e => { setCanal(e.target.value); setPagina(1) }} style={inputStyle}>
                            <option value="">Todos</option>
                            <option value="en_tienda">En tienda</option>
                            <option value="whatsapp_bot">WhatsApp Bot</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="presencial">Presencial</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Estado</label>
                        <select value={estadoFiltro} onChange={e => { setEstadoFiltro(e.target.value); setPagina(1) }} style={inputStyle}>
                            <option value="">Todos</option>
                            <option value="pendiente_pago">Pendiente de pago</option>
                            <option value="pagado">Pagado</option>
                            <option value="entregado">Entregado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>
                    <div>
                        <button onClick={() => { setBuscar(''); setMetodoPago(''); setCanal(''); setEstadoFiltro(''); setPagina(1) }}
                            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, fontSize: '13px', cursor: 'pointer', color: s.textMuted, fontWeight: '500' }}>
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {cargando ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: s.surfaceLow, borderBottom: `1px solid ${s.borderLight}` }}>
                                    {['ID', 'Cliente', 'Producto', 'Fecha y hora', 'Método', 'Canal', 'Estado', 'Total', 'Acción'].map((h, i) => (
                                        <th key={i} style={{ padding: '12px 16px', textAlign: i >= 4 && i <= 6 ? 'center' : i === 7 ? 'right' : 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {datos?.ventas?.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: s.textMuted, fontSize: '13px' }}>No hay ventas en este período.</td></tr>
                                ) : (
                                    datos?.ventas?.map(venta => {
                                        const colMetodo = colorMetodoPago(venta.metodo_pago)
                                        const colEstado = colorEstado(venta.estado)
                                        const nombreCliente = venta.cliente_nombre || venta.razon_social || venta.cliente_numero || 'Consumidor final'
                                        return (
                                            <tr key={venta.id}
                                                style={{ borderBottom: `1px solid ${s.borderLight}`, transition: 'background 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = s.surface}
                                            >
                                                <td style={{ padding: '16px 24px' }}>
                                                    <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '600', color: s.text }}>#{String(venta.id).padStart(4, '0')}</span>
                                                    {venta.numero_factura && (
                                                        <p style={{ fontSize: '10px', color: s.textMuted, marginTop: '3px', fontFamily: 'monospace' }}>{venta.numero_factura}</p>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', flexShrink: 0 }}>
                                                            {iniciales(nombreCliente)}
                                                        </div>
                                                        <span style={{ fontWeight: '500', color: s.text }}>{nombreCliente}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '12px', color: s.textMuted }}>
                                                    {Array.isArray(venta.items) && venta.items.length > 1
                                                        ? <span style={{ fontWeight: '600', color: s.text }}>{venta.items.length} productos</span>
                                                        : <>{venta.marca_nombre && `${venta.marca_nombre} — `}{venta.producto_nombre} {venta.presentacion_nombre}</>
                                                    }
                                                </td>
                                                <td style={{ padding: '16px', fontSize: '13px', color: s.textMuted }}>{formatearFecha(venta.created_at)}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: colMetodo.bg, color: colMetodo.color, textTransform: 'uppercase' }}>
                                                        {venta.metodo_pago || '—'}
                                                    </span>
                                                    {venta.tipo_venta === 'credito' && (
                                                        <span style={{ display: 'block', marginTop: '4px', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: '#fef3c7', color: '#92400e' }}>
                                                            Crédito
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: s.textMuted }}>{labelCanal(venta.canal)}</td>
                                                <td style={{ padding: '16px', textAlign: 'center' }}>
                                                    {venta.estado === 'cancelado' ? (
                                                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: colEstado.bg, color: colEstado.color, textTransform: 'uppercase' }}>ANULADA</span>
                                                    ) : (
                                                        <select value={venta.estado} onChange={e => cambiarEstado(venta.id, e.target.value)}
                                                            style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: colEstado.bg, color: colEstado.color, border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>
                                                            <option value="pendiente_pago">PENDIENTE</option>
                                                            <option value="pagado">PAGADO</option>
                                                            <option value="entregado">ENTREGADO</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: s.text, fontSize: '14px' }}>{formatearGs(venta.precio)}</td>
                                                <td style={{ padding: '16px 24px', textAlign: 'center', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}>
                                                    <button onClick={() => setVentaDetalle(venta)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.textMuted, padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = s.text}
                                                        onMouseLeave={e => e.currentTarget.style.color = s.textMuted}>
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                                    </button>
                                                    {venta.estado !== 'cancelado' && (
                                                        <button onClick={() => confirmarAnular(venta)}
                                                            title="Anular venta"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', opacity: 0.7 }}
                                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                            onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}>
                                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                                        </button>
                                                    )}
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
                    <div style={{ padding: '16px 24px', background: s.surfaceLow, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${s.borderLight}` }}>
                        <p style={{ fontSize: '12px', color: s.textMuted }}>
                            Mostrando <strong>{((pagina - 1) * 20) + 1}–{Math.min(pagina * 20, datos.paginacion.total)}</strong> de <strong>{datos.paginacion.total}</strong> ventas
                        </p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button onClick={() => setPagina(Math.max(1, pagina - 1))} disabled={pagina === 1}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, color: s.text, cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.4 : 1, fontSize: '13px' }}>
                                ‹
                            </button>
                            {Array.from({ length: Math.min(5, datos.paginacion.total_paginas) }, (_, i) => {
                                const num = i + 1
                                return (
                                    <button key={num} onClick={() => setPagina(num)}
                                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: pagina === num ? '#1a1a2e' : s.inputBg, color: pagina === num ? 'white' : s.textMuted, borderColor: pagina === num ? '#1a1a2e' : s.border }}>
                                        {num}
                                    </button>
                                )
                            })}
                            <button onClick={() => setPagina(Math.min(datos.paginacion.total_paginas, pagina + 1))} disabled={pagina === datos.paginacion.total_paginas}
                                style={{ padding: '6px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, color: s.text, cursor: pagina === datos.paginacion.total_paginas ? 'not-allowed' : 'pointer', opacity: pagina === datos.paginacion.total_paginas ? 0.4 : 1, fontSize: '13px' }}>
                                ›
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Panel detalle */}
            {ventaDetalle && (
                <div onClick={() => setVentaDetalle(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', background: '#fff', borderRadius: '16px', boxShadow: '0 24px 60px -12px rgba(15,23,42,.28), 0 0 0 1px rgba(15,23,42,.04)', overflowY: 'auto' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgb(241,245,249)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgb(224,231,255)', color: 'rgb(55,48,163)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                                {iniciales(ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'CF')}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'rgb(15,23,42)' }}>{ventaDetalle.cliente_nombre || ventaDetalle.razon_social || 'Cliente'}</p>
                                {ventaDetalle.cliente_ruc && <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgb(100,116,139)' }}>RUC {ventaDetalle.cliente_ruc}</p>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', flexDirection: 'column', gap: '5px' }}>
                            {ventaDetalle.numero_factura && <p style={{ margin: 0, fontSize: '11px', color: 'rgb(148,163,184)', fontFamily: 'ui-monospace,monospace' }}>{ventaDetalle.numero_factura}</p>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', color: ventaDetalle.tipo_venta === 'credito' ? 'rgb(161,98,7)' : 'rgb(5,150,105)', background: ventaDetalle.tipo_venta === 'credito' ? 'rgb(254,243,199)' : 'rgb(209,250,229)', padding: '2px 9px', borderRadius: '999px' }}>
                                    {ventaDetalle.tipo_venta === 'credito' ? `Crédito ${ventaDetalle.plazo_dias}d` : 'Contado'}
                                </span>
                                <button onClick={() => setVentaDetalle(null)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'rgb(148,163,184)', padding: '2px 4px', lineHeight: 1 }}>✕</button>
                            </div>
                        </div>
                    </div>

                    {/* Productos */}
                    <div style={{ padding: '16px 22px 6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <p style={{ margin: 0, fontSize: '10px', fontWeight: '700', color: 'rgb(100,116,139)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Productos</p>
                            {Array.isArray(ventaDetalle.items) && ventaDetalle.items.length > 0 && (
                                <span style={{ fontSize: '11px', fontWeight: '600', color: 'rgb(148,163,184)' }}>{ventaDetalle.items.length} {ventaDetalle.items.length === 1 ? 'ítem' : 'ítems'}</span>
                            )}
                        </div>
                        {/* Cabecera de tabla */}
                        <div style={{ display: 'grid', gridTemplateColumns: '34px 1fr 92px 92px', gap: '8px', padding: '0 4px 6px', borderBottom: '1px solid rgb(241,245,249)' }}>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'center' }}>Cant</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.04em' }}>Producto</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>P. unit.</span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.04em', textAlign: 'right' }}>Total</span>
                        </div>
                        {/* Filas */}
                        {(Array.isArray(ventaDetalle.items) && ventaDetalle.items.length > 0
                            ? ventaDetalle.items
                            : [{ producto_nombre: ventaDetalle.producto_nombre, presentacion_nombre: ventaDetalle.presentacion_nombre, cantidad: ventaDetalle.cantidad, precio_unitario: ventaDetalle.precio, precio_total: ventaDetalle.precio }]
                        ).map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '34px 1fr 92px 92px', gap: '8px', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid rgb(248,250,252)' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'rgb(55,48,163)', background: 'rgb(238,242,255)', borderRadius: '7px', textAlign: 'center', padding: '3px 0' }}>{item.cantidad}</span>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'rgb(15,23,42)', lineHeight: 1.25 }}>{item.producto_nombre}</p>
                                    <p style={{ margin: '1px 0 0', fontSize: '11px', color: 'rgb(148,163,184)' }}>{item.presentacion_nombre}</p>
                                    {item.es_precio_especial && (
                                        <span style={{ display: 'inline-block', marginTop: '3px', fontSize: '10px', fontWeight: '700', color: 'rgb(220,38,38)', background: 'rgb(254,242,242)', border: '1px solid rgb(252,165,165)', borderRadius: '5px', padding: '1px 6px' }}>
                                            Precio especial {item.diferencial_precio > 0 ? '(-' : '(+'}{formatearGs(Math.abs(item.diferencial_precio))})
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: '12px', color: 'rgb(100,116,139)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {item.precio_unitario ? formatearGs(item.precio_unitario) : '—'}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgb(15,23,42)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                    {formatearGs(item.precio_total || item.precio_unitario)}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Totales */}
                    <div style={{ margin: '8px 22px 0', padding: '14px 16px', background: 'rgb(248,250,252)', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: 'rgb(100,116,139)' }}>Total</span>
                            <span style={{ fontSize: '20px', fontWeight: '700', color: 'rgb(15,23,42)', fontVariantNumeric: 'tabular-nums' }}>{formatearGs(ventaDetalle.precio)}</span>
                        </div>
                        {ventaDetalle.ganancia > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ fontSize: '12px', color: 'rgb(100,116,139)' }}>Ganancia</span>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'rgb(16,185,129)', fontVariantNumeric: 'tabular-nums' }}>{formatearGs(ventaDetalle.ganancia)}</span>
                            </div>
                        )}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 22px', padding: '16px 22px 4px' }}>
                        <div>
                            <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Método de pago</p>
                            {ventaDetalle.estado === 'cancelado' ? (
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'rgb(15,23,42)', textTransform: 'capitalize' }}>{ventaDetalle.metodo_pago || '—'}</p>
                            ) : (
                                <select
                                    value={ventaDetalle.metodo_pago || ''}
                                    onChange={e => cambiarMetodoPago(ventaDetalle.id, e.target.value)}
                                    style={{ padding: '4px 8px', borderRadius: '7px', border: '1px solid rgb(226,232,240)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#fff', color: 'rgb(15,23,42)', fontFamily: 'inherit' }}
                                >
                                    <option value="">— Sin definir —</option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="transferencia">Transferencia</option>
                                </select>
                            )}
                        </div>
                        <div>
                            <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Canal</p>
                            <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'rgb(15,23,42)' }}>{labelCanal(ventaDetalle.canal)}</p>
                        </div>
                        {ventaDetalle.tipo_venta === 'credito' && ventaDetalle.fecha_vencimiento_credito && (
                            <div>
                                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vencimiento</p>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: new Date(ventaDetalle.fecha_vencimiento_credito) < new Date() ? 'rgb(220,38,38)' : 'rgb(161,98,7)' }}>
                                    {new Date(ventaDetalle.fecha_vencimiento_credito).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                                </p>
                            </div>
                        )}
                        {ventaDetalle.quiere_factura && ventaDetalle.ruc_factura && (
                            <div>
                                <p style={{ margin: '0 0 2px', fontSize: '10px', fontWeight: '700', color: 'rgb(148,163,184)', textTransform: 'uppercase', letterSpacing: '.05em' }}>RUC factura</p>
                                <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: 'rgb(15,23,42)' }}>{ventaDetalle.ruc_factura}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer actions */}
                    {ventaDetalle.estado === 'cancelado' ? (
                        <div style={{ margin: '12px 22px 20px', padding: '11px 16px', borderRadius: '9px', background: 'rgb(254,242,242)', color: 'rgb(153,27,27)', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
                            VENTA ANULADA
                        </div>
                    ) : (
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '16px 22px 20px' }}>
                            <select value={ventaDetalle.estado} onChange={e => cambiarEstado(ventaDetalle.id, e.target.value)}
                                style={{ flex: 1, padding: '11px 12px', borderRadius: '9px', border: '1px solid rgb(226,232,240)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', background: '#fff', color: 'rgb(15,23,42)', fontFamily: 'inherit' }}>
                                <option value="pendiente_pago">Pendiente de pago</option>
                                <option value="pagado">Pagado</option>
                                <option value="entregado">Entregado</option>
                            </select>
                            <button onClick={() => confirmarAnular(ventaDetalle)}
                                style={{ padding: '11px 16px', borderRadius: '9px', border: '1px solid rgb(254,202,202)', background: 'rgb(254,242,242)', color: 'rgb(220,38,38)', fontSize: '13px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                                Anular
                            </button>
                        </div>
                    )}

                </div>
                </div>
            )}

            {modalLibro && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '14px', padding: '28px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Libro de Ventas</h3>
                            <button onClick={() => setModalLibro(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginBottom: '20px' }}>
                            Exportá el libro de ventas en formato DNIT con IVA discriminado.
                        </p>
                        <label style={labelStyle}>Fecha desde</label>
                        <input type="date" value={libroFechaDesde} onChange={e => setLibroFechaDesde(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '12px' }} />
                        <label style={labelStyle}>Fecha hasta</label>
                        <input type="date" value={libroFechaHasta} onChange={e => setLibroFechaHasta(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalLibro(false)}
                                style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px' }}>
                                Cancelar
                            </button>
                            <button onClick={handleExportarLibroVentas} disabled={exportandoLibro}
                                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: exportandoLibro ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700' }}>
                                {exportandoLibro ? 'Exportando...' : '⬇ Descargar Excel'}
                            </button>
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