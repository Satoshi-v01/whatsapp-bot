import { useState, useEffect } from 'react'
import { getProveedores, crearProveedor, editarProveedor, getFacturas, crearFactura, editarFactura, registrarPago, getReportes } from '../services/proveedores'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'
import * as XLSX from 'xlsx'
import api from '../services/api'

function formatearMiles(valor) {
    if (!valor && valor !== 0) return ''
    return parseInt(valor.toString().replace(/\D/g, '') || '0').toLocaleString('es-PY')
}

function parsearMiles(valor) {
    return valor.replace(/\D/g, '')
}

function Proveedores() {
    const { darkMode } = useApp()
    const [pestana, setPestana] = useState('proveedores')
    const [proveedores, setProveedores] = useState([])
    const [facturas, setFacturas] = useState([])
    const [reportes, setReportes] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [buscar, setBuscar] = useState('')
    const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
    const [buscarFactura, setBuscarFactura] = useState('')
    const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalProveedor, setModalProveedor] = useState(null) // null | 'nuevo' | proveedor
    const [modalFactura, setModalFactura] = useState(null) // null | proveedorId
    const [modalPago, setModalPago] = useState(null) // null | factura
    const [filtroEstado, setFiltroEstado] = useState('')
    const [filtroTipo, setFiltroTipo] = useState('')
    const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [modalLibroCompras, setModalLibroCompras] = useState(false)
    const [libroComprasFechaDesde, setLibroComprasFechaDesde] = useState(new Date().toISOString().slice(0, 7) + '-01')
    const [libroComprasFechaHasta, setLibroComprasFechaHasta] = useState(new Date().toISOString().slice(0, 10))
    const [exportandoLibroCompras, setExportandoLibroCompras] = useState(false)

    const [formProveedor, setFormProveedor] = useState({ nombre: '', ruc: '', telefono: '', email: '', banco: '', numero_cuenta: '', direccion: '', notas: '' })
    const [formFactura, setFormFactura] = useState({ numero_factura: '', timbrado_proveedor: '', fecha_emision: new Date().toISOString().slice(0,10), tipo: 'contado', plazo_dias: '', monto_total: '', iva_10: '', iva_5: '', exentas: '', metodo_pago: 'efectivo', gravada_10: '', gravada_5: '', notas: '' })
    const [formPago, setFormPago] = useState({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().slice(0,10), tipo_pago: 'parcial', notas: '' })

    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        inputBg: darkMode ? '#0f172a' : 'white',
        rowHover: darkMode ? '#1a2536' : '#f8fafc',
    }

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
    const btnSecundario = { padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    useEffect(() => { cargarDatos() }, [])
    useEffect(() => { if (pestana === 'facturas') cargarFacturas() }, [pestana, filtroEstado, filtroTipo])
    useEffect(() => { if (pestana === 'reportes') cargarReportes() }, [pestana, filtroPeriodo, fechaDesde, fechaHasta])

    async function cargarDatos() {
        try {
            setCargando(true)
            const datos = await getProveedores()
            setProveedores(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los proveedores.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function cargarFacturas() {
        try {
            const params = {}
            if (filtroEstado) params.estado = filtroEstado
            if (filtroTipo) params.tipo = filtroTipo
            const datos = await getFacturas(params)
            setFacturas(datos)
        } catch (err) {}
    }

    async function cargarReportes() {
        try {
            const params = { periodo: filtroPeriodo }
            if (filtroPeriodo === 'personalizado') { params.fecha_desde = fechaDesde; params.fecha_hasta = fechaHasta }
            const datos = await getReportes(params)
            setReportes(datos)
        } catch (err) {}
    }

    async function handleExportarLibroCompras() {
        setExportandoLibroCompras(true)
        try {
            const res = await api.get(`/proveedores/libro-compras?fecha_desde=${libroComprasFechaDesde}&fecha_hasta=${libroComprasFechaHasta}`)
            const datos = res.data

            const filas = datos.map((f, idx) => {
                const total = parseInt(f.total || 0)
                const iva10 = parseInt(f.iva_10 || 0)
                const iva5 = parseInt(f.iva_5 || 0)
                const exenta = parseInt(f.exentas || 0)
                const grav10 = iva10 > 0 ? total - iva10 - iva5 - exenta : 0
                const grav5 = iva5 > 0 ? (total - iva10 - exenta) - iva5 : 0

                return {
                    'N°': idx + 1,
                    'Fecha': new Date(f.fecha).toLocaleDateString('es-PY'),
                    'Tipo Documento': 'Factura',
                    'N° Factura': f.numero_factura || '—',
                    'Timbrado': f.timbrado_proveedor || '—',
                    'Proveedor': f.proveedor_nombre || '—',
                    'RUC': f.proveedor_ruc || '—',
                    'Gravada 10%': grav10,
                    'IVA 10%': iva10,
                    'Gravada 5%': grav5,
                    'IVA 5%': iva5,
                    'Exentas': exenta,
                    'Total': total
                }
            })

            const totales = {
                'N°': '', 'Fecha': '', 'Tipo Documento': '', 'N° Factura': '', 'Timbrado': '',
                'Proveedor': 'TOTALES', 'RUC': '',
                'Gravada 10%': filas.reduce((s, f) => s + f['Gravada 10%'], 0),
                'IVA 10%': filas.reduce((s, f) => s + f['IVA 10%'], 0),
                'Gravada 5%': filas.reduce((s, f) => s + f['Gravada 5%'], 0),
                'IVA 5%': filas.reduce((s, f) => s + f['IVA 5%'], 0),
                'Exentas': filas.reduce((s, f) => s + f['Exentas'], 0),
                'Total': filas.reduce((s, f) => s + f['Total'], 0),
            }

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet([...filas, totales])
            ws['!cols'] = [
                { wch: 5 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
                { wch: 30 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
                { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }
            ]
            XLSX.utils.book_append_sheet(wb, ws, 'Libro de Compras')
            XLSX.writeFile(wb, `libro_compras_${libroComprasFechaDesde}_${libroComprasFechaHasta}.xlsx`)
            setModalLibroCompras(false)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar el libro de compras.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportandoLibroCompras(false) }
    }

    async function handleGuardarProveedor() {
        try {
            if (modalProveedor === 'nuevo') {
                await crearProveedor(formProveedor)
            } else {
                await editarProveedor(modalProveedor.id, formProveedor)
            }
            setModalProveedor(null)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo guardar el proveedor.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleGuardarFactura() {
        try {
            await crearFactura(modalFactura, formFactura)
            setModalFactura(null)
            setFormFactura({ numero_factura: '', timbrado_proveedor: '', fecha_emision: new Date().toISOString().slice(0,10), tipo: 'contado', plazo_dias: '', monto_total: '', iva_10: '', iva_5: '', exentas: '', metodo_pago: 'efectivo', notas: '' })
            await cargarDatos()
            if (pestana === 'facturas') await cargarFacturas()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo guardar la factura.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleRegistrarPago() {
        try {
            await registrarPago(modalPago.id, formPago)
            setModalPago(null)
            setFormPago({ numero_recibo: '', monto: '', metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().slice(0,10), tipo_pago: 'parcial', notas: '' })
            await cargarFacturas()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo registrar el pago.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function abrirModalEditar(proveedor) {
        setFormProveedor({ nombre: proveedor.nombre, ruc: proveedor.ruc||'', telefono: proveedor.telefono||'', email: proveedor.email||'', banco: proveedor.banco||'', numero_cuenta: proveedor.numero_cuenta||'', direccion: proveedor.direccion||'', notas: proveedor.notas||'' })
        setModalProveedor(proveedor)
    }

    function estadoConfig(estado) {
        return {
            pendiente: { label: 'Pendiente', color: '#f59e0b', bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', textColor: '#92400e' },
            pagado_parcial: { label: 'Pago parcial', color: '#3b82f6', bg: darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe', textColor: '#1d4ed8' },
            pagado: { label: 'Pagado', color: '#10b981', bg: darkMode ? 'rgba(16,185,129,0.15)' : '#d1fae5', textColor: '#065f46' },
            vencido: { label: 'Vencido', color: '#ef4444', bg: darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2', textColor: '#991b1b' },
        }[estado] || { label: estado, color: '#94a3b8', bg: '#f1f5f9', textColor: '#475569' }
    }

    function diasParaVencer(fecha) {
        if (!fecha) return null
        const diff = new Date(fecha) - new Date()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    function calcularTotal(form) {
        const grav10 = parseInt(form.gravada_10 || 0)
        const iva10 = parseInt(form.iva_10 || 0)
        const grav5 = parseInt(form.gravada_5 || 0)
        const iva5 = parseInt(form.iva_5 || 0)
        const exentas = parseInt(form.exentas || 0)
        return String(grav10 + iva10 + grav5 + iva5 + exentas)
    }

    const facturasFiltradas = facturas.filter(f =>
        !buscarFactura || f.numero_factura.toLowerCase().includes(buscarFactura.toLowerCase()) ||
        f.proveedor_nombre.toLowerCase().includes(buscarFactura.toLowerCase())
    )


    const proveedoresFiltrados = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
        (p.ruc && p.ruc.toLowerCase().includes(buscar.toLowerCase()))
    )

    if (cargando) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: s.bg, color: s.textMuted }}>
            Cargando proveedores...
        </div>
    )

    return (
        <div className="proveedores-wrap" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: s.bg, overflow: 'hidden' }}>

            {/* Pestañas */}
            <div style={{ background: s.surface, borderBottom: `1px solid ${s.border}`, padding: '0 32px', display: 'flex', gap: '0', flexShrink: 0 }}>
                {[
                    { id: 'proveedores', label: 'Proveedores' },
                    { id: 'facturas', label: 'Facturas' },
                    { id: 'reportes', label: 'Reportes' },
                ].map(p => (
                    <button key={p.id} onClick={() => setPestana(p.id)}
                        style={{ padding: '16px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: pestana === p.id ? '700' : '500', color: pestana === p.id ? s.text : s.textMuted, borderBottom: `2px solid ${pestana === p.id ? '#1a1a2e' : 'transparent'}`, transition: 'all 0.15s' }}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* ── PROVEEDORES ── */}
            {pestana === 'proveedores' && (
                <div className="page-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <div>
                            <h1 style={{ fontSize: '22px', fontWeight: '800', color: s.text }}>Proveedores</h1>
                            <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>{proveedores.length} proveedores registrados</p>
                        </div>
                        <button onClick={() => { setFormProveedor({ nombre: '', ruc: '', telefono: '', email: '', banco: '', numero_cuenta: '', direccion: '', notas: '' }); setModalProveedor('nuevo') }} style={btnPrimario}>
                            + Nuevo proveedor
                        </button>
                    </div>

                    {/* Buscador */}
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: s.textFaint, display: 'flex' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                        <input placeholder="Buscar por nombre o RUC..." value={buscar} onChange={e => setBuscar(e.target.value)}
                            style={{ ...inputStyle, paddingLeft: '36px', marginBottom: 0, background: s.surface }} />
                    </div>

                    {/* Lista proveedores */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {proveedoresFiltrados.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: s.textMuted }}>
                                <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.35 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></span>
                                <p>No hay proveedores registrados.</p>
                            </div>
                        ) : proveedoresFiltrados.map(p => (
                            <div key={p.id} style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>{p.nombre}</h3>
                                            {p.ruc && <span style={{ fontSize: '11px', color: s.textMuted }}>RUC: {p.ruc}</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                            {p.telefono && <span style={{ fontSize: '12px', color: s.textMuted }}>{p.telefono}</span>}
                                            {p.email && <span style={{ fontSize: '12px', color: s.textMuted }}>{p.email}</span>}
                                            {p.banco && <span style={{ fontSize: '12px', color: s.textMuted }}>{p.banco}</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '2px' }}>Total comprado</p>
                                            <p style={{ fontSize: '14px', fontWeight: '800', color: s.text }}>Gs. {parseInt(p.total_comprado||0).toLocaleString('es-PY')}</p>
                                        </div>
                                        {parseInt(p.deuda_total) > 0 && (
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '11px', color: s.textFaint, marginBottom: '2px' }}>Deuda</p>
                                                <p style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>Gs. {parseInt(p.deuda_total).toLocaleString('es-PY')}</p>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={() => { setPestana('facturas'); setFiltroTipo(''); setFiltroEstado('') }}
                                                style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px' }}>
                                                Facturas
                                            </button>
                                            <button onClick={() => abrirModalEditar(p)}
                                                style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px' }}>
                                                ✏️ Editar
                                            </button>
                                            <button onClick={() => { setModalFactura(p.id) }}
                                                style={{ padding: '7px 14px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                + Factura
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── FACTURAS ── */}
            {pestana === 'facturas' && (
                <div className="page-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', color: s.text }}>Facturas de Compra</h1>
                        <button onClick={() => setModalLibroCompras(true)}
                            style={{ padding: '10px 18px', borderRadius: '10px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                            Libro de Compras
                        </button>
                    </div>

                    {/* Filtros */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                        {[
                            { val: '', label: 'Todos los estados' },
                            { val: 'pendiente', label: 'Pendiente' },
                            { val: 'pagado_parcial', label: 'Pago parcial' },
                            { val: 'pagado', label: 'Pagado' },
                            { val: 'vencido', label: 'Vencido' },
                        ].map(f => (
                            <button key={f.val} onClick={() => setFiltroEstado(f.val)}
                                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: filtroEstado === f.val ? '#1a1a2e' : s.surfaceLow, color: filtroEstado === f.val ? 'white' : s.textMuted, borderColor: filtroEstado === f.val ? '#1a1a2e' : s.border }}>
                                {f.label}
                            </button>
                        ))}
                        <div style={{ borderLeft: `1px solid ${s.border}`, margin: '0 4px' }} />
                        {[
                            { val: '', label: 'Todos' },
                            { val: 'contado', label: 'Contado' },
                            { val: 'credito', label: 'Crédito' },
                        ].map(f => (
                            <button key={f.val} onClick={() => setFiltroTipo(f.val)}
                                style={{ padding: '6px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: filtroTipo === f.val ? '#3b82f6' : s.surfaceLow, color: filtroTipo === f.val ? 'white' : s.textMuted, borderColor: filtroTipo === f.val ? '#3b82f6' : s.border }}>
                                {f.label}
                            </button>
                        ))}
                        <input
                            placeholder="Buscar por número de factura..."
                            value={buscarFactura}
                            onChange={e => setBuscarFactura(e.target.value)}
                            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                        />
                    </div>

                    {/* Tabla facturas */}
                    <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: s.surfaceLow }}>
                                    {['Proveedor', 'N° Factura', 'Emisión', 'Vencimiento', 'Monto', 'Saldo', 'Tipo', 'Estado', ''].map(h => (
                                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {facturasFiltradas.length === 0 ? (
                                    <tr><td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: s.textMuted }}>
                                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.4 }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></span>
                                        <p>No hay facturas que coincidan.</p>
                                    </td></tr>
                                ) : facturasFiltradas.map(f => {
                                    const cfg = estadoConfig(f.estado)
                                    const dias = diasParaVencer(f.fecha_vencimiento)
                                    const proxima = dias !== null && dias >= 0 && dias <= 10
                                    const vencida = dias !== null && dias < 0

                                    return (
                                        <>
                                        <tr key={f.id} style={{ borderTop: `1px solid ${s.borderLight}`, cursor: 'pointer', background: facturaSeleccionada?.id === f.id ? (darkMode ? '#1e3a5f' : '#eff6ff') : 'transparent' }}
                                            onClick={() => setFacturaSeleccionada(facturaSeleccionada?.id === f.id ? null : f)}
                                            onMouseEnter={e => { if (facturaSeleccionada?.id !== f.id) e.currentTarget.style.background = s.rowHover }}
                                            onMouseLeave={e => { if (facturaSeleccionada?.id !== f.id) e.currentTarget.style.background = 'transparent' }}>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: s.text }}>{f.proveedor_nombre}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', color: s.text, fontFamily: 'monospace' }}>{f.numero_factura}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px', color: s.textMuted }}>{formatearSoloFecha(f.fecha_emision)}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '12px' }}>
                                                {f.fecha_vencimiento ? (
                                                    <span style={{ fontWeight: '600', color: vencida ? '#ef4444' : proxima ? '#f59e0b' : s.textMuted }}>
                                                        {formatearSoloFecha(f.fecha_vencimiento)}
                                                        {vencida && <span style={{ marginLeft: '4px', fontSize: '10px' }}>({Math.abs(dias)}d vencida)</span>}
                                                        {proxima && !vencida && <span style={{ marginLeft: '4px', fontSize: '10px' }}>({dias}d)</span>}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: s.text }}>Gs. {parseInt(f.monto_total).toLocaleString('es-PY')}</td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '700', color: parseInt(f.saldo) > 0 ? '#ef4444' : '#10b981' }}>
                                                {parseInt(f.saldo) > 0 ? `Gs. ${parseInt(f.saldo).toLocaleString('es-PY')}` : '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '20px', background: f.tipo === 'contado' ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe'), color: f.tipo === 'contado' ? '#10b981' : '#3b82f6' }}>
                                                    {f.tipo === 'contado' ? 'Contado' : 'Crédito'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: darkMode ? `${cfg.color}25` : cfg.bg, color: cfg.textColor }}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                {f.tipo === 'credito' && f.estado !== 'pagado' && (
                                                    <button onClick={e => { e.stopPropagation(); setFormPago({ numero_recibo: '', monto: f.saldo, metodo_pago: 'efectivo', fecha_pago: new Date().toISOString().slice(0,10), tipo_pago: 'total', notas: '' }); setModalPago(f) }}
                                                        style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                                                        💳 Pagar
                                                    </button>
                                                )}
                                            </td>
                                        </tr>

                                        {/* Fila expandida — pagos */}
                                        {facturaSeleccionada?.id === f.id && f.pagos?.length > 0 && (
                                            <tr key={`${f.id}-pagos`}>
                                                <td colSpan={9} style={{ padding: '0', background: s.surfaceLow, borderTop: `1px solid ${s.borderLight}` }}>
                                                    <div style={{ padding: '14px 20px' }}>
                                                        <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                                                            Historial de pagos
                                                        </p>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {f.pagos.map((pago, i) => (
                                                                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '8px 12px', background: s.surface, borderRadius: '8px', fontSize: '12px' }}>
                                                                    <span style={{ color: s.textFaint, minWidth: '80px' }}>{formatearSoloFecha(pago.fecha_pago)}</span>
                                                                    {pago.numero_recibo && <span style={{ color: s.textMuted, fontFamily: 'monospace' }}>Recibo: {pago.numero_recibo}</span>}
                                                                    <span style={{ fontWeight: '700', color: '#10b981' }}>Gs. {parseInt(pago.monto).toLocaleString('es-PY')}</span>
                                                                    <span style={{ color: s.textMuted }}>{pago.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}</span>
                                                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: pago.tipo_pago === 'total' ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe'), color: pago.tipo_pago === 'total' ? '#10b981' : '#3b82f6' }}>
                                                                        {pago.tipo_pago === 'total' ? 'Pago total' : 'Pago parcial'}
                                                                    </span>
                                                                    {pago.notas && <span style={{ color: s.textFaint }}>{pago.notas}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── REPORTES ── */}
            {pestana === 'reportes' && (
                <div className="page-scroll" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: '800', color: s.text }}>Reportes de Compras</h1>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {['semana', 'mes', 'anual', 'personalizado'].map(p => (
                                    <button key={p} onClick={() => setFiltroPeriodo(p)}
                                        style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', background: filtroPeriodo === p ? '#1a1a2e' : s.surfaceLow, color: filtroPeriodo === p ? 'white' : s.textMuted, borderColor: filtroPeriodo === p ? '#1a1a2e' : s.border, textTransform: 'capitalize' }}>
                                        {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : p === 'anual' ? 'Año' : 'Personalizado'}
                                    </button>
                                ))}
                                {filtroPeriodo === 'personalizado' && (
                                    <>
                                        <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                                            style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, color: s.text, fontSize: '12px', outline: 'none' }} />
                                        <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                                            style={{ padding: '7px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, color: s.text, fontSize: '12px', outline: 'none' }} />
                                    </>
                                )}
                            </div>
                        </div>

                        {!reportes ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: s.textMuted }}>Cargando reportes...</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                                {/* Métricas */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Total comprado', val: `Gs. ${parseInt(reportes.resumen.total_comprado||0).toLocaleString('es-PY')}`, color: '#1a1a2e' },
                                        { label: 'Facturas', val: reportes.resumen.total_facturas, color: '#3b82f6' },
                                        { label: 'Promedio factura', val: `Gs. ${parseInt(reportes.resumen.promedio_factura||0).toLocaleString('es-PY')}`, color: '#f59e0b' },
                                        { label: 'Total crédito', val: `Gs. ${parseInt(reportes.resumen.total_credito||0).toLocaleString('es-PY')}`, color: '#ef4444' },
                                    ].map((m, i) => (
                                        <div key={i} style={{ background: s.surface, borderRadius: '12px', padding: '18px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                            <div style={{ marginBottom: '8px' }}>
                                                <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</p>
                                            </div>
                                            <p style={{ fontSize: '18px', fontWeight: '800', color: m.color }}>{m.val}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Por proveedor */}
                                <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${s.borderLight}`, background: s.surfaceLow }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>Compras por proveedor</p>
                                    </div>
                                    {reportes.por_proveedor.length === 0 ? (
                                        <p style={{ padding: '20px', textAlign: 'center', color: s.textMuted, fontSize: '13px' }}>Sin datos para este período.</p>
                                    ) : reportes.por_proveedor.map(p => {
                                        const maxTotal = Math.max(...reportes.por_proveedor.map(x => parseInt(x.total)))
                                        const pct = maxTotal > 0 ? Math.round((parseInt(p.total) / maxTotal) * 100) : 0
                                        return (
                                            <div key={p.id} style={{ padding: '14px 18px', borderBottom: `1px solid ${s.borderLight}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{p.nombre}</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: '13px', fontWeight: '800', color: s.text }}>Gs. {parseInt(p.total).toLocaleString('es-PY')}</p>
                                                        <p style={{ fontSize: '11px', color: s.textMuted }}>{p.cantidad} facturas · Prom. Gs. {parseInt(p.promedio).toLocaleString('es-PY')}</p>
                                                        {parseInt(p.deuda) > 0 && <p style={{ fontSize: '11px', color: '#ef4444', fontWeight: '600' }}>Deuda: Gs. {parseInt(p.deuda).toLocaleString('es-PY')}</p>}
                                                    </div>
                                                </div>
                                                <div style={{ height: '4px', background: s.surfaceLow, borderRadius: '2px', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: '#1a1a2e', borderRadius: '2px' }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Por mes */}
                                <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <div style={{ padding: '14px 18px', borderBottom: `1px solid ${s.borderLight}`, background: s.surfaceLow }}>
                                        <p style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>Compras por mes (últimos 12 meses)</p>
                                    </div>
                                    <div style={{ padding: '14px 18px', display: 'flex', gap: '6px', alignItems: 'flex-end', minHeight: '100px' }}>
                                        {reportes.por_mes.map((m, i) => {
                                            const maxVal = Math.max(...reportes.por_mes.map(x => parseInt(x.total)))
                                            const pct = maxVal > 0 ? Math.round((parseInt(m.total) / maxVal) * 80) + 10 : 10
                                            const mes = new Date(m.mes).toLocaleDateString('es-PY', { month: 'short', year: '2-digit', timeZone: 'America/Asuncion' })
                                            return (
                                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                    <p style={{ fontSize: '9px', color: s.textFaint, fontWeight: '600' }}>Gs. {(parseInt(m.total)/1000000).toFixed(1)}M</p>
                                                    <div style={{ width: '100%', height: `${pct}px`, background: '#1a1a2e', borderRadius: '4px 4px 0 0', minHeight: '4px' }} />
                                                    <p style={{ fontSize: '9px', color: s.textFaint }}>{mes}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Próximas a vencer */}
                                {reportes.proximas_vencer.length > 0 && (
                                    <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid #fde68a`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                        <div style={{ padding: '14px 18px', borderBottom: `1px solid #fde68a`, background: darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb' }}>
                                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#92400e' }}>⏰ Próximas a vencer (10 días)</p>
                                        </div>
                                        {reportes.proximas_vencer.map(f => (
                                            <div key={f.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                onClick={() => { setPestana('facturas'); setFiltroEstado('pendiente') }}>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p style={{ fontSize: '11px', color: '#f59e0b' }}>Vence: {formatearSoloFecha(f.fecha_vencimiento)} ({diasParaVencer(f.fecha_vencimiento)} días)</p>
                                                </div>
                                                <p style={{ fontSize: '14px', fontWeight: '800', color: '#f59e0b' }}>Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Vencidas */}
                                {reportes.vencidas.length > 0 && (
                                    <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid #fca5a5`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                        <div style={{ padding: '14px 18px', borderBottom: `1px solid #fca5a5`, background: darkMode ? 'rgba(239,68,68,0.1)' : '#fee2e2' }}>
                                            <p style={{ fontSize: '12px', fontWeight: '700', color: '#991b1b' }}>Facturas vencidas ({reportes.vencidas.length})</p>
                                        </div>
                                        {reportes.vencidas.map(f => (
                                            <div key={f.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                onClick={() => { setPestana('facturas'); setFiltroEstado('vencido') }}>
                                                <div>
                                                    <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{f.proveedor_nombre} — {f.numero_factura}</p>
                                                    <p style={{ fontSize: '11px', color: '#ef4444' }}>Venció el {formatearSoloFecha(f.fecha_vencimiento)} — {f.dias_vencida} días vencida</p>
                                                </div>
                                                <p style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>Gs. {parseInt(f.saldo).toLocaleString('es-PY')}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── MODAL PROVEEDOR ── */}
            {modalProveedor && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '16px', padding: '28px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>{modalProveedor === 'nuevo' ? 'Nuevo proveedor' : 'Editar proveedor'}</h3>
                            <button onClick={() => setModalProveedor(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <label style={labelStyle}>Nombre / Razón social *</label>
                        <input value={formProveedor.nombre} onChange={e => setFormProveedor({...formProveedor, nombre: e.target.value})} style={inputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div><label style={labelStyle}>RUC</label><input value={formProveedor.ruc} onChange={e => setFormProveedor({...formProveedor, ruc: e.target.value})} style={inputStyle} /></div>
                            <div><label style={labelStyle}>Teléfono</label><input value={formProveedor.telefono} onChange={e => setFormProveedor({...formProveedor, telefono: e.target.value})} style={inputStyle} /></div>
                            <div><label style={labelStyle}>Email</label><input value={formProveedor.email} onChange={e => setFormProveedor({...formProveedor, email: e.target.value})} style={inputStyle} /></div>
                            <div><label style={labelStyle}>Banco</label><input value={formProveedor.banco} onChange={e => setFormProveedor({...formProveedor, banco: e.target.value})} style={inputStyle} /></div>
                            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Número de cuenta</label><input value={formProveedor.numero_cuenta} onChange={e => setFormProveedor({...formProveedor, numero_cuenta: e.target.value})} style={inputStyle} /></div>
                            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Dirección</label><input value={formProveedor.direccion} onChange={e => setFormProveedor({...formProveedor, direccion: e.target.value})} style={inputStyle} /></div>
                            <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notas</label><textarea value={formProveedor.notas} onChange={e => setFormProveedor({...formProveedor, notas: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} /></div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => setModalProveedor(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarProveedor} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL FACTURA ── */}
            {modalFactura && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '16px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Nueva factura de compra</h3>
                            <button onClick={() => setModalFactura(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Timbrado del proveedor</label>
                                <input value={formFactura.timbrado_proveedor || ''} onChange={e => setFormFactura({...formFactura, timbrado_proveedor: e.target.value})} placeholder="Ej: 18138433" style={inputStyle} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Número de factura *</label>
                                <input value={formFactura.numero_factura} onChange={e => setFormFactura({...formFactura, numero_factura: e.target.value})} placeholder="Ej: 001-001-0000123" style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha de emisión *</label>
                                <input type="date" value={formFactura.fecha_emision} onChange={e => setFormFactura({...formFactura, fecha_emision: e.target.value})} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Tipo *</label>
                                <select value={formFactura.tipo} onChange={e => setFormFactura({...formFactura, tipo: e.target.value, metodo_pago: e.target.value === 'credito' ? '' : 'efectivo'})} style={inputStyle}>
                                    <option value="contado">Contado</option>
                                    <option value="credito">Crédito</option>
                                </select>
                            </div>
                            {formFactura.tipo === 'credito' ? (
                                <div>
                                    <label style={labelStyle}>Plazo (días)</label>
                                    <input type="number" value={formFactura.plazo_dias} onChange={e => setFormFactura({...formFactura, plazo_dias: e.target.value})} placeholder="Ej: 30, 60, 90" style={inputStyle} />
                                </div>
                            ) : (
                                <div>
                                    <label style={labelStyle}>Método de pago *</label>
                                    <select value={formFactura.metodo_pago} onChange={e => setFormFactura({...formFactura, metodo_pago: e.target.value})} style={inputStyle}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                    </select>
                                </div>
                            )}

                            {/* Montos */}
                            <div style={{ gridColumn: '1 / -1', borderTop: `1px solid ${s.border}`, paddingTop: '12px', marginTop: '4px' }}>
                                <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Montos</p>
                            </div>

                            {/* Gravada 10% */}
                            <div>
                                <label style={labelStyle}>Gravada 10%</label>
                                <input
                                    value={formFactura.gravada_10 ? parseInt(formFactura.gravada_10).toLocaleString('es-PY') : ''}
                                    onChange={e => {
                                        const grav10 = parsearMiles(e.target.value)
                                        const iva10 = grav10 ? String(Math.floor(parseInt(grav10) / 11)) : ''
                                        setFormFactura(prev => {
                                            const next = { ...prev, gravada_10: grav10, iva_10: iva10 }
                                            return { ...next, monto_total: calcularTotal(next) }
                                        })
                                    }}
                                    placeholder="Gs. 0"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>IVA 10% (auto)</label>
                                <input
                                    value={formFactura.iva_10 ? parseInt(formFactura.iva_10).toLocaleString('es-PY') : ''}
                                    readOnly
                                    style={{ ...inputStyle, background: s.surfaceLow, color: s.textMuted, cursor: 'not-allowed' }}
                                />
                            </div>

                            {/* Gravada 5% */}
                            <div>
                                <label style={labelStyle}>Gravada 5%</label>
                                <input
                                    value={formFactura.gravada_5 ? parseInt(formFactura.gravada_5).toLocaleString('es-PY') : ''}
                                    onChange={e => {
                                        const grav5 = parsearMiles(e.target.value)
                                        const iva5 = grav5 ? String(Math.floor(parseInt(grav5) / 21)) : ''
                                        setFormFactura(prev => {
                                            const next = { ...prev, gravada_5: grav5, iva_5: iva5 }
                                            return { ...next, monto_total: calcularTotal(next) }
                                        })
                                    }}
                                    placeholder="Gs. 0"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>IVA 5% (auto)</label>
                                <input
                                    value={formFactura.iva_5 ? parseInt(formFactura.iva_5).toLocaleString('es-PY') : ''}
                                    readOnly
                                    style={{ ...inputStyle, background: s.surfaceLow, color: s.textMuted, cursor: 'not-allowed' }}
                                />
                            </div>

                            {/* Exentas */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Exentas</label>
                                <input
                                    value={formFactura.exentas ? parseInt(formFactura.exentas).toLocaleString('es-PY') : ''}
                                    onChange={e => {
                                        const exentas = parsearMiles(e.target.value)
                                        setFormFactura(prev => {
                                            const next = { ...prev, exentas }
                                            return { ...next, monto_total: calcularTotal(next) }
                                        })
                                    }}
                                    placeholder="Gs. 0"
                                    style={inputStyle}
                                />
                            </div>

                            {/* Total calculado */}
                            <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: s.surfaceLow, borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
                                <span style={{ fontSize: '20px', fontWeight: '800', color: s.text }}>
                                    Gs. {formFactura.monto_total ? parseInt(formFactura.monto_total).toLocaleString('es-PY') : '0'}
                                </span>
                            </div>

                            {/* Notas */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={labelStyle}>Notas</label>
                                <textarea value={formFactura.notas} onChange={e => setFormFactura({...formFactura, notas: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                            </div>
                        </div>

                        {formFactura.tipo === 'credito' && formFactura.plazo_dias && formFactura.fecha_emision && (
                            <div style={{ padding: '10px 14px', background: darkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff', borderRadius: '8px', marginTop: '4px', fontSize: '12px', color: '#3b82f6' }}>
                                Vence el {new Date(new Date(formFactura.fecha_emision).setDate(new Date(formFactura.fecha_emision).getDate() + parseInt(formFactura.plazo_dias))).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion' })}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button onClick={() => setModalFactura(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarFactura} style={btnPrimario}>Guardar factura</button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── MODAL PAGO ── */}
            {modalPago && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '16px', padding: '28px', width: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Registrar pago</h3>
                            <button onClick={() => setModalPago(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <div style={{ padding: '10px 14px', background: s.surfaceLow, borderRadius: '8px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '12px', color: s.textMuted }}>Factura: <strong style={{ color: s.text }}>{modalPago.numero_factura}</strong></p>
                            <p style={{ fontSize: '12px', color: s.textMuted }}>Saldo pendiente: <strong style={{ color: '#ef4444' }}>Gs. {parseInt(modalPago.saldo).toLocaleString('es-PY')}</strong></p>
                        </div>

                        <label style={labelStyle}>Número de recibo</label>
                        <input value={formPago.numero_recibo} onChange={e => setFormPago({...formPago, numero_recibo: e.target.value})} placeholder="Opcional" style={inputStyle} />
                        <label style={labelStyle}>Monto *</label>
                        <input
                            value={formPago.monto ? parseInt(formPago.monto).toLocaleString('es-PY') : ''}
                            onChange={e => setFormPago({...formPago, monto: parsearMiles(e.target.value)})}
                            placeholder="Gs. 0"
                            style={inputStyle}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={labelStyle}>Método de pago *</label>
                                <select value={formPago.metodo_pago} onChange={e => setFormPago({...formPago, metodo_pago: e.target.value})} style={inputStyle}>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Fecha de pago *</label>
                                <input type="date" value={formPago.fecha_pago} onChange={e => setFormPago({...formPago, fecha_pago: e.target.value})} style={inputStyle} />
                            </div>
                        </div>
                        <label style={labelStyle}>Tipo de pago *</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                            {[{ val: 'parcial', label: 'Pago parcial' }, { val: 'total', label: 'Pago total' }].map(t => (
                                <button key={t.val} onClick={() => setFormPago({...formPago, tipo_pago: t.val, monto: t.val === 'total' ? modalPago.saldo.toString() : formPago.monto})}
                                style={{ padding: '10px', borderRadius: '8px', border: `2px solid ${formPago.tipo_pago === t.val ? '#3b82f6' : s.border}`, background: formPago.tipo_pago === t.val ? (darkMode ? 'rgba(59,130,246,0.15)' : '#eff6ff') : 'transparent', color: formPago.tipo_pago === t.val ? '#3b82f6' : s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: formPago.tipo_pago === t.val ? '700' : '500' }}>
                                {t.label}
                            </button>
                            ))}
                        </div>
                        <label style={labelStyle}>Notas</label>
                        <textarea value={formPago.notas} onChange={e => setFormPago({...formPago, notas: e.target.value})} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPago(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleRegistrarPago} style={{ ...btnPrimario, background: '#10b981' }}>Registrar pago</button>
                        </div>
                    </div>
                </div>
            )}

            {modalLibroCompras && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '14px', padding: '28px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>Libro de Compras</h3>
                            <button onClick={() => setModalLibroCompras(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginBottom: '20px' }}>
                            Exportá el libro de compras en formato SET con IVA discriminado.
                        </p>
                        <label style={labelStyle}>Fecha desde</label>
                        <input type="date" value={libroComprasFechaDesde} onChange={e => setLibroComprasFechaDesde(e.target.value)} style={{ ...inputStyle, marginBottom: '12px' }} />
                        <label style={labelStyle}>Fecha hasta</label>
                        <input type="date" value={libroComprasFechaHasta} onChange={e => setLibroComprasFechaHasta(e.target.value)} style={{ ...inputStyle, marginBottom: '20px' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalLibroCompras(false)}
                                style={{ padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px' }}>
                                Cancelar
                            </button>
                            <button onClick={handleExportarLibroCompras} disabled={exportandoLibroCompras}
                                style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: exportandoLibroCompras ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700' }}>
                                {exportandoLibroCompras ? 'Exportando...' : '⬇ Descargar Excel'}
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

export default Proveedores