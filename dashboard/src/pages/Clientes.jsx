import { useState, useEffect } from 'react'
import { getClientes, getCliente, crearCliente, editarCliente } from '../services/clientes'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

// ANTES del function Clientes() — componente separado
function FormModal({ titulo, onClose, onSubmit, submitLabel, form, setForm, s, darkMode }) {
    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
    const btnSecundario = { padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    function formatearRUC(valor) {
        const solo = valor.replace(/[^\d]/g, '')
        if (solo.length <= 7) return solo.replace(/(\d{1,3})(\d{1,3})?(\d{1,3})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join('.'))
        const cuerpo = solo.slice(0, -1)
        const dv = solo.slice(-1)
        return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: s.surface, borderRadius: '14px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: s.text }}>{titulo}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                </div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                    <option value="persona">Persona física</option>
                    <option value="empresa">Empresa</option>
                </select>
                <label style={labelStyle}>Nombre / Razón social *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>RUC</label>
                <input value={form.ruc} onChange={e => setForm({ ...form, ruc: formatearRUC(e.target.value) })} style={inputStyle} />
                <label style={labelStyle}>Teléfono / WhatsApp</label>
                <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
                <label style={labelStyle}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={labelStyle}>Ciudad</label><input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                    <div><label style={labelStyle}>Dirección</label><input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                </div>
                <label style={{ ...labelStyle, marginTop: '10px' }}>Notas internas</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button onClick={onClose} style={btnSecundario}>Cancelar</button>
                    <button onClick={onSubmit} style={btnPrimario}>{submitLabel}</button>
                </div>
            </div>
        </div>
    )
}


function Clientes() {
    const [clientes, setClientes] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [cargandoPerfil, setCargandoPerfil] = useState(false)
    const [buscar, setBuscar] = useState('')
    const [filtroActividad, setFiltroActividad] = useState('todos')
    const [modalNuevo, setModalNuevo] = useState(false)
    const [modalEditar, setModalEditar] = useState(false)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [form, setForm] = useState({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })
    const { darkMode } = useApp()

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
        rowHover: darkMode ? '#1a2536' : 'rgba(26,26,127,0.01)',
        rowActive: darkMode ? '#1e3a5f' : 'rgba(99,102,241,0.06)',
        tableTh: darkMode ? '#1a2536' : '#f8fafc',
    }

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
    const btnSecundario = { padding: '10px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    useEffect(() => { cargarClientes() }, [filtroActividad])
    useEffect(() => {
        const timeout = setTimeout(() => cargarClientes(), 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function cargarClientes() {
        try {
            setCargando(true)
            const params = {}
            if (buscar) params.buscar = buscar
            if (filtroActividad !== 'todos') params.estado_actividad = filtroActividad
            const datos = await getClientes(params)
            setClientes(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los clientes.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function verPerfil(id) {
        try {
            setCargandoPerfil(true)
            const datos = await getCliente(id)
            setClienteSeleccionado(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo cargar el perfil.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargandoPerfil(false) }
    }

    async function handleCrearCliente() {
        if (!form.nombre.trim()) return
        try {
            await crearCliente(form)
            setModalNuevo(false)
            setForm({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleEditarCliente() {
        try {
            await editarCliente(clienteSeleccionado.id, form)
            setModalEditar(false)
            await verPerfil(clienteSeleccionado.id)
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo editar el cliente.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function abrirModalEditar() {
        setForm({ tipo: clienteSeleccionado.tipo, nombre: clienteSeleccionado.nombre, ruc: clienteSeleccionado.ruc || '', telefono: clienteSeleccionado.telefono || '', email: clienteSeleccionado.email || '', direccion: clienteSeleccionado.direccion || '', ciudad: clienteSeleccionado.ciudad || '', notas: clienteSeleccionado.notas || '' })
        setModalEditar(true)
    }

    function formatearRUC(valor) {
        const solo = valor.replace(/[^\d]/g, '')
        if (solo.length <= 7) return solo.replace(/(\d{1,3})(\d{1,3})?(\d{1,3})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join('.'))
        const cuerpo = solo.slice(0, -1)
        const dv = solo.slice(-1)
        return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    function formatearGs(numero) { return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}` }

    function iniciales(nombre) {
        if (!nombre) return '?'
        return nombre.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    function colorOrigen(origen) {
        return { bot: '#10b981', presencial: '#3b82f6', manual: '#64748b' }[origen] || '#64748b'
    }

    function bgOrigen(origen) {
        return { bot: darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7', presencial: darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe', manual: darkMode ? '#334155' : '#f1f5f9' }[origen] || (darkMode ? '#334155' : '#f1f5f9')
    }

    function colorEstado(estado) {
        return { pendiente_pago: '#f59e0b', pagado: '#10b981', entregado: '#3b82f6', cancelado: '#ef4444' }[estado] || '#888'
    }

    function diasDesde(fecha) {
        if (!fecha) return null
        return Math.floor((new Date() - new Date(fecha)) / (1000 * 60 * 60 * 24))
    }

    function diasHasta(fecha) {
        if (!fecha) return null
        return Math.ceil((new Date(fecha) - new Date()) / (1000 * 60 * 60 * 24))
    }

    // Métricas
    const totalClientes = clientes.length
    const clientesActivos = clientes.filter(c => c.cliente_activo).length
    const totalMonto = clientes.reduce((sum, c) => sum + parseInt(c.monto_total || 0), 0)
    const ticketPromedio = totalClientes > 0 ? Math.round(totalMonto / totalClientes) : 0

    // Panel de actividad del cliente seleccionado
    function PanelActividad({ cliente }) {
        const activo = cliente.cliente_activo
        const frecuencia = cliente.frecuencia_dias
        const proximaCompra = cliente.proxima_compra_estimada
        const diasUltimaCompra = diasDesde(cliente.estadisticas?.ultima_compra)
        const diasProxima = diasHasta(proximaCompra)

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Estado activo/inactivo */}
                <div style={{ background: s.surface, borderRadius: '14px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Estado de actividad</p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: activo ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? '#334155' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                            {activo ? '🟢' : '⚫'}
                        </div>
                        <div>
                            <p style={{ fontSize: '16px', fontWeight: '800', color: activo ? '#10b981' : s.textMuted }}>
                                {activo ? 'Cliente activo' : 'Cliente inactivo'}
                            </p>
                            <p style={{ fontSize: '12px', color: s.textFaint, marginTop: '2px' }}>
                                {diasUltimaCompra !== null
                                    ? `Última compra hace ${diasUltimaCompra} días`
                                    : 'Sin compras registradas'}
                            </p>
                        </div>
                    </div>

                    {/* Barra de actividad */}
                    {diasUltimaCompra !== null && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '10px', color: s.textFaint }}>Hoy</span>
                                <span style={{ fontSize: '10px', color: s.textFaint }}>60 días</span>
                            </div>
                            <div style={{ height: '6px', background: s.surfaceLow, borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min((diasUltimaCompra / 60) * 100, 100)}%`, background: activo ? '#10b981' : '#ef4444', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                            </div>
                            <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '4px', textAlign: 'right' }}>
                                {diasUltimaCompra} / 60 días
                            </p>
                        </div>
                    )}
                </div>

                {/* Predicción próxima compra */}
                <div style={{ background: s.surface, borderRadius: '14px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Predicción de compra</p>

                    {frecuencia ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ padding: '12px 16px', background: s.surfaceLow, borderRadius: '10px' }}>
                                <p style={{ fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Frecuencia promedio</p>
                                <p style={{ fontSize: '20px', fontWeight: '800', color: '#4f46e5' }}>cada {frecuencia} días</p>
                            </div>

                            {proximaCompra && (
                                <div style={{ padding: '12px 16px', background: diasProxima !== null && diasProxima <= 7 ? (darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb') : s.surfaceLow, borderRadius: '10px', border: diasProxima !== null && diasProxima <= 7 ? '1px solid #fde68a' : `1px solid transparent` }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Próxima compra estimada</p>
                                    <p style={{ fontSize: '16px', fontWeight: '800', color: diasProxima !== null && diasProxima <= 0 ? '#ef4444' : diasProxima !== null && diasProxima <= 7 ? '#f59e0b' : '#10b981' }}>
                                        {formatearFecha(proximaCompra)}
                                    </p>
                                    {diasProxima !== null && (
                                        <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '3px' }}>
                                            {diasProxima <= 0
                                                ? `⚠️ Debería haber comprado hace ${Math.abs(diasProxima)} días`
                                                : diasProxima <= 7
                                                ? `⏰ En ${diasProxima} días`
                                                : `En ${diasProxima} días`}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: s.textFaint }}>
                            <p style={{ fontSize: '24px', marginBottom: '8px' }}>📊</p>
                            <p style={{ fontSize: '12px' }}>Se necesitan al menos 2 compras para calcular la frecuencia.</p>
                        </div>
                    )}
                </div>

                {/* Línea de tiempo */}
                {clienteSeleccionado.ventas?.length > 0 && (
                    <div style={{ background: s.surface, borderRadius: '14px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                        <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Últimas actividades</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {clienteSeleccionado.ventas.slice(0, 5).map((v, i) => (
                                <div key={v.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: i < Math.min(clienteSeleccionado.ventas.length, 5) - 1 ? '12px' : '0' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colorEstado(v.estado), flexShrink: 0, marginTop: '3px' }} />
                                        {i < Math.min(clienteSeleccionado.ventas.length, 5) - 1 && (
                                            <div style={{ width: '2px', flex: 1, background: s.borderLight, minHeight: '20px', marginTop: '4px' }} />
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '12px', fontWeight: '600', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {v.producto_nombre} {v.presentacion_nombre}
                                        </p>
                                        <p style={{ fontSize: '11px', color: s.textFaint }}>{formatearFecha(v.created_at)} · {formatearGs(v.precio)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    
    return (
        <div style={{ background: s.bg, minHeight: '100%' }}>

            {clienteSeleccionado ? (
                <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

                    {/* Lista lateral */}
                    <div style={{ width: '320px', flexShrink: 0, borderRight: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.surface }}>
                        <div style={{ padding: '12px', borderBottom: `1px solid ${s.border}` }}>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: s.textFaint }}>🔍</span>
                                <input placeholder="Buscar..." value={buscar} onChange={e => setBuscar(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '34px', marginBottom: 0 }} />
                            </div>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {clientes.map(c => (
                                <div key={c.id} onClick={() => verPerfil(c.id)}
                                    style={{ padding: '12px 14px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: clienteSeleccionado?.id === c.id ? s.rowActive : s.surface, borderLeft: `3px solid ${clienteSeleccionado?.id === c.id ? '#4f46e5' : 'transparent'}`, transition: 'all 0.1s' }}
                                    onMouseEnter={e => { if (clienteSeleccionado?.id !== c.id) e.currentTarget.style.background = s.surfaceLow }}
                                    onMouseLeave={e => { if (clienteSeleccionado?.id !== c.id) e.currentTarget.style.background = s.surface }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: darkMode ? '#334155' : '#e0e7ff', color: darkMode ? '#a5b4fc' : '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800' }}>
                                                {iniciales(c.nombre)}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: c.cliente_activo ? '#10b981' : '#94a3b8', border: `1px solid ${s.surface}` }} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: s.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{c.nombre}</span>
                                            <span style={{ fontSize: '11px', color: s.textFaint }}>{c.total_compras} compras</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Perfil — layout de 2 columnas */}
                    <div style={{ flex: 1, background: s.bg, overflowY: 'auto' }}>
                        {cargandoPerfil ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.textMuted }}>Cargando perfil...</div>
                        ) : (
                            <div style={{ padding: '24px' }}>

                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: darkMode ? '#334155' : '#e0e7ff', color: darkMode ? '#a5b4fc' : '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '800' }}>
                                                {iniciales(clienteSeleccionado.nombre)}
                                            </div>
                                            <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', borderRadius: '50%', background: clienteSeleccionado.cliente_activo ? '#10b981' : '#94a3b8', border: `2px solid ${s.bg}` }} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                <h2 style={{ fontSize: '18px', fontWeight: '800', color: s.text, letterSpacing: '-0.3px' }}>{clienteSeleccionado.nombre}</h2>
                                                <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', color: colorOrigen(clienteSeleccionado.origen), background: bgOrigen(clienteSeleccionado.origen) }}>{clienteSeleccionado.origen}</span>
                                                <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 9px', borderRadius: '20px', color: clienteSeleccionado.cliente_activo ? '#10b981' : s.textMuted, background: clienteSeleccionado.cliente_activo ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? '#334155' : '#f1f5f9') }}>
                                                    {clienteSeleccionado.cliente_activo ? '● Activo' : '○ Inactivo'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '11px', color: s.textFaint }}>Cliente desde {formatearFecha(clienteSeleccionado.created_at)}</p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setClienteSeleccionado(null)} style={{ ...btnSecundario, fontSize: '12px', padding: '8px 14px' }}>← Volver</button>
                                        <button onClick={abrirModalEditar} style={{ ...btnSecundario, fontSize: '12px', padding: '8px 14px' }}>✏️ Editar</button>
                                    </div>
                                </div>

                                {/* Grid 2 columnas */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>

                                    {/* Columna izquierda */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                                        {/* Datos contacto */}
                                        <div style={{ background: s.surface, borderRadius: '14px', padding: '18px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                            <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Datos y contacto</p>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                {[
                                                    { label: 'RUC', val: clienteSeleccionado.ruc },
                                                    { label: 'Teléfono / WhatsApp', val: clienteSeleccionado.telefono },
                                                    { label: 'Email', val: clienteSeleccionado.email },
                                                    { label: 'Ciudad', val: clienteSeleccionado.ciudad },
                                                ].map((item, i) => (
                                                    <div key={i} style={{ padding: '9px 12px', background: s.surfaceLow, borderRadius: '8px' }}>
                                                        <p style={{ fontSize: '9px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{item.label}</p>
                                                        <p style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{item.val || '—'}</p>
                                                    </div>
                                                ))}
                                                {clienteSeleccionado.direccion && (
                                                    <div style={{ gridColumn: '1 / -1', padding: '9px 12px', background: s.surfaceLow, borderRadius: '8px' }}>
                                                        <p style={{ fontSize: '9px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Dirección</p>
                                                        <p style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{clienteSeleccionado.direccion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Estadísticas */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                            {[
                                                { label: 'Compras', val: clienteSeleccionado.estadisticas?.total_compras || 0, color: '#10b981', big: true },
                                                { label: 'Monto total', val: formatearGs(clienteSeleccionado.estadisticas?.monto_total), color: '#3b82f6' },
                                                { label: 'Ticket prom.', val: formatearGs(clienteSeleccionado.estadisticas?.ticket_promedio), color: '#f59e0b' },
                                                { label: 'Última compra', val: formatearFecha(clienteSeleccionado.estadisticas?.ultima_compra), color: '#8b5cf6' },
                                            ].map((stat, i) => (
                                                <div key={i} style={{ background: s.surface, borderRadius: '10px', padding: '12px', border: `1px solid ${s.border}`, borderLeft: `3px solid ${stat.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                                    <p style={{ fontSize: '9px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{stat.label}</p>
                                                    <p style={{ fontSize: stat.big ? '20px' : '13px', fontWeight: '800', color: stat.color }}>{stat.val}</p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Producto favorito */}
                                        {clienteSeleccionado.producto_favorito && (
                                            <div style={{ background: s.surface, borderRadius: '12px', padding: '14px', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: darkMode ? '#451a03' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>⭐</div>
                                                <div>
                                                    <p style={{ fontSize: '9px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Producto favorito</p>
                                                    <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>
                                                        {clienteSeleccionado.producto_favorito.marca && <span style={{ color: s.textMuted }}>{clienteSeleccionado.producto_favorito.marca} — </span>}
                                                        {clienteSeleccionado.producto_favorito.producto}
                                                    </p>
                                                    <p style={{ fontSize: '11px', color: s.textFaint }}>{clienteSeleccionado.producto_favorito.cantidad} veces comprado</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Notas */}
                                        {clienteSeleccionado.notas && (
                                            <div style={{ background: darkMode ? '#451a03' : '#fffbeb', borderRadius: '12px', padding: '14px', border: '1px solid #fde68a' }}>
                                                <p style={{ fontSize: '9px', fontWeight: '700', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>⚠️ Notas internas</p>
                                                <p style={{ fontSize: '12px', color: darkMode ? '#fde68a' : '#78350f' }}>{clienteSeleccionado.notas}</p>
                                            </div>
                                        )}

                                        {/* Historial */}
                                        <div style={{ background: s.surface, borderRadius: '14px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${s.borderLight}`, background: s.surfaceLow }}>
                                                <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Historial de compras</p>
                                            </div>
                                            {!clienteSeleccionado.ventas?.length ? (
                                                <p style={{ padding: '20px', textAlign: 'center', color: s.textMuted, fontSize: '13px' }}>Sin compras registradas.</p>
                                            ) : (
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ background: s.tableTh }}>
                                                            {['Fecha', 'Producto', 'Precio', 'Canal', 'Estado'].map((h, i) => (
                                                                <th key={i} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '9px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {clienteSeleccionado.ventas.map(v => (
                                                            <tr key={v.id} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                                                onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                <td style={{ padding: '10px 14px', fontSize: '11px', color: s.text }}>{formatearFecha(v.created_at)}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '11px', color: s.text }}>{v.marca_nombre && `${v.marca_nombre} — `}{v.producto_nombre} {v.presentacion_nombre}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '11px', fontWeight: '600', color: s.text }}>Gs. {parseInt(v.precio).toLocaleString()}</td>
                                                                <td style={{ padding: '10px 14px', fontSize: '11px', color: s.textMuted }}>{v.canal}</td>
                                                                <td style={{ padding: '10px 14px' }}>
                                                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '9px', fontWeight: '700', color: 'white', background: colorEstado(v.estado) }}>{v.estado}</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>

                                    {/* Columna derecha — Panel de actividad */}
                                    <div style={{ position: 'sticky', top: '24px' }}>
                                        <PanelActividad cliente={clienteSeleccionado} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Vista tabla
                <div style={{ padding: '32px' }}>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                        <div>
                            <h1 style={{ fontSize: '32px', fontWeight: '900', color: s.text, letterSpacing: '-0.8px' }}>Gestión de Clientes</h1>
                            <p style={{ fontSize: '14px', color: s.textMuted, marginTop: '6px' }}>Visualizá, editá y fidelizá tu base de clientes registrados.</p>
                        </div>
                        <button onClick={() => setModalNuevo(true)} style={{ ...btnPrimario, padding: '12px 22px', fontSize: '14px', boxShadow: '0 4px 12px rgba(26,26,46,0.3)' }}>
                            + Añadir nuevo cliente
                        </button>
                    </div>

                    {/* Métricas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                        {[
                            { label: 'Total clientes', val: totalClientes, color: s.text },
                            { label: 'Clientes activos', val: clientesActivos, color: '#10b981' },
                            { label: 'Monto total acumulado', val: formatearGs(totalMonto), color: '#1a1a2e' },
                            { label: 'Ticket promedio', val: formatearGs(ticketPromedio), color: s.text },
                        ].map((m, i) => (
                            <div key={i} style={{ background: s.surface, borderRadius: '12px', padding: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <p style={{ fontSize: '12px', fontWeight: '500', color: s.textMuted, marginBottom: '8px' }}>{m.label}</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: m.color, letterSpacing: '-0.5px' }}>{m.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabla */}
                    <div style={{ background: s.surface, borderRadius: '14px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>

                        {/* Buscador + filtros */}
                        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${s.borderLight}`, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: s.textFaint }}>🔍</span>
                                <input placeholder="Buscar por nombre, RUC o teléfono..." value={buscar} onChange={e => setBuscar(e.target.value)}
                                    style={{ ...inputStyle, paddingLeft: '34px', marginBottom: 0, background: s.surfaceLow }} />
                            </div>

                            {/* Filtro activo/inactivo */}
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {[
                                    { val: 'todos', label: 'Todos' },
                                    { val: 'activo', label: '● Activos' },
                                    { val: 'inactivo', label: '○ Inactivos' },
                                ].map(f => (
                                    <button key={f.val} onClick={() => setFiltroActividad(f.val)}
                                        style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${filtroActividad === f.val ? '#1a1a2e' : s.border}`, background: filtroActividad === f.val ? '#1a1a2e' : 'transparent', color: filtroActividad === f.val ? 'white' : s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.15s' }}>
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: darkMode ? 'rgba(26,37,54,0.5)' : 'rgba(248,250,252,0.8)' }}>
                                        {['Nombre del cliente', 'Teléfono', 'RUC', 'Compras', 'Monto total', 'Estado', 'Origen', ''].map((h, i) => (
                                            <th key={i} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody style={{ borderTop: `1px solid ${s.borderLight}` }}>
                                    {cargando ? (
                                        <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</td></tr>
                                    ) : clientes.length === 0 ? (
                                        <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: s.textMuted }}>
                                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>👥</p>
                                            <p>No hay clientes registrados.</p>
                                        </td></tr>
                                    ) : (
                                        clientes.map(c => (
                                            <tr key={c.id} style={{ borderTop: `1px solid ${s.borderLight}`, cursor: 'pointer', transition: 'background 0.1s' }}
                                                onClick={() => verPerfil(c.id)}
                                                onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: darkMode ? '#334155' : '#e0e7ff', color: darkMode ? '#a5b4fc' : '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800' }}>
                                                                {iniciales(c.nombre)}
                                                            </div>
                                                            <div style={{ position: 'absolute', bottom: '0', right: '0', width: '8px', height: '8px', borderRadius: '50%', background: c.cliente_activo ? '#10b981' : '#94a3b8', border: `1px solid ${s.surface}` }} />
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{c.nombre}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: s.textMuted }}>{c.telefono || '—'}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '12px', color: s.textMuted }}>{c.ruc || '—'}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '600', color: s.text }}>{c.total_compras}</td>
                                                <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '600', color: s.text }}>{formatearGs(c.monto_total)}</td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', color: c.cliente_activo ? '#10b981' : s.textMuted, background: c.cliente_activo ? (darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7') : (darkMode ? '#334155' : '#f1f5f9') }}>
                                                        {c.cliente_activo ? '● Activo' : '○ Inactivo'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', color: colorOrigen(c.origen), background: bgOrigen(c.origen) }}>
                                                        {c.origen}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                    <span style={{ color: s.textFaint, fontSize: '16px' }}>→</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ padding: '12px 20px', background: darkMode ? 'rgba(26,37,54,0.5)' : 'rgba(248,250,252,0.8)', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: '12px', color: s.textFaint }}>
                                <strong style={{ color: s.text }}>{clientes.length}</strong> clientes
                                {filtroActividad !== 'todos' && ` · filtro: ${filtroActividad}`}
                                {buscar && ` · búsqueda: "${buscar}"`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {modalNuevo && (
                <FormModal
                    titulo="Nuevo cliente"
                    onClose={() => setModalNuevo(false)}
                    onSubmit={handleCrearCliente}
                    submitLabel="Crear cliente"
                    form={form}
                    setForm={setForm}
                    s={s}
                    darkMode={darkMode}
                />
            )}
            {modalEditar && (
                <FormModal
                    titulo="Editar cliente"
                    onClose={() => setModalEditar(false)}
                    onSubmit={handleEditarCliente}
                    submitLabel="Guardar cambios"
                    form={form}
                    setForm={setForm}
                    s={s}
                    darkMode={darkMode}
                />
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

export default Clientes