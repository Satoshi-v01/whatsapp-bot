import { useState, useEffect } from 'react'
import { getDeliveries, actualizarEstadoDelivery, agregarNota, crearDeliveryManual } from '../services/deliveries'
import { getProductos, getCategorias } from '../services/productos'
import { buscarClientes } from '../services/clientes'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

function Delivery() {
    const [deliveries, setDeliveries] = useState([])
    const [cargando, setCargando] = useState(true)
    const [filtroEstado, setFiltroEstado] = useState('todos')
    const [detalle, setDetalle] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [modalNuevo, setModalNuevo] = useState(false)
    const [notaTexto, setNotaTexto] = useState('')
    const [enviandoNota, setEnviandoNota] = useState(false)
    const { darkMode, puedo } = useApp()
    
    const s = {
        bg: darkMode ? '#0f172a' : '#f6f6f8',
        surface: darkMode ? '#1e293b' : 'white',
        surfaceLow: darkMode ? '#1a2536' : '#f8fafc',
        border: darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text: darkMode ? '#f1f5f9' : '#0f172a',
        textMuted: darkMode ? '#94a3b8' : '#64748b',
        textFaint: darkMode ? '#64748b' : '#94a3b8',
        rowActive: darkMode ? '#1e3a5f' : '#eff6ff',
        inputBg: darkMode ? '#0f172a' : 'white',
    }

    const estadoConfig = {
        pendiente:  { label: 'Pendiente',  color: '#f59e0b', bg: '#fef3c7', textColor: '#92400e', icono: '⏳' },
        confirmado: { label: 'Confirmado', color: '#3b82f6', bg: '#dbeafe', textColor: '#1d4ed8', icono: '✅' },
        en_camino:  { label: 'En camino',  color: '#8b5cf6', bg: '#ede9fe', textColor: '#6d28d9', icono: '🚚' },
        entregado:  { label: 'Entregado',  color: '#10b981', bg: '#d1fae5', textColor: '#065f46', icono: '📦' },
        cancelado:  { label: 'Cancelado',  color: '#ef4444', bg: '#fee2e2', textColor: '#991b1b', icono: '✕' },
    }

    const demoras = [
        { tipo: 'demora_trafico', label: '🚦 Demora por tráfico' },
        { tipo: 'demora_tecnica', label: '🔧 Falla técnica' },
        { tipo: 'no_encontrado', label: '📍 No encontré la dirección' },
    ]

    useEffect(() => { cargarDeliveries() }, [])

    async function cargarDeliveries() {
        try {
            setCargando(true)
            const datos = await getDeliveries()
            setDeliveries(datos)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los deliveries.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    async function cambiarEstado(id, nuevoEstado) {
        try {
            await actualizarEstadoDelivery(id, nuevoEstado)
            await cargarDeliveries()
            if (detalle?.id === id) {
                setDetalle(prev => ({ ...prev, estado: nuevoEstado }))
            }
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo actualizar el estado.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    async function handleAgregarNota(tipo = 'nota') {
        const texto = tipo === 'nota' ? notaTexto : demoras.find(d => d.tipo === tipo)?.label
        if (!texto?.trim()) return
        try {
            setEnviandoNota(true)
            const res = await agregarNota(detalle.id, texto, tipo)
            setNotaTexto('')
            await cargarDeliveries()
            // Actualizar detalle con historial nuevo
            setDetalle(prev => ({ ...prev, historial_notas: res.delivery.historial_notas, notas: res.delivery.notas }))
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo agregar la nota.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviandoNota(false) }
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    function formatearHora(fecha) {
        if (!fecha) return null
        return new Date(fecha).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })
    }

    const conteos = {}
    deliveries.forEach(d => { conteos[d.estado] = (conteos[d.estado] || 0) + 1 })
    const filtros = [
        { valor: 'todos', label: 'Todos' },
        { valor: 'pendiente', label: 'Pendiente' },
        { valor: 'confirmado', label: 'Confirmado' },
        { valor: 'en_camino', label: 'En camino' },
        { valor: 'entregado', label: 'Entregado' },
        { valor: 'cancelado', label: 'Cancelado' },
    ]
    const deliveriesFiltrados = filtroEstado === 'todos' ? deliveries : deliveries.filter(d => d.estado === filtroEstado)
    const activos = deliveries.filter(d => ['pendiente', 'confirmado', 'en_camino'].includes(d.estado)).length
    const enCamino = deliveries.filter(d => d.estado === 'en_camino').length
    const entregados = deliveries.filter(d => d.estado === 'entregado').length

    // Panel lateral derecho del detalle
    function PanelLateral({ d }) {
        const cfg = estadoConfig[d.estado] || {}
        const pagado = d.estado_venta === 'pagado'
        const historial = Array.isArray(d.historial_notas) ? d.historial_notas : []

        // Timeline de estados
        const timeline = [
            { label: 'Pedido creado', ts: d.created_at, siempre: true },
            { label: 'Confirmado', ts: d.confirmado_at },
            { label: 'En camino', ts: d.en_camino_at },
            { label: 'Entregado', ts: d.entregado_at },
            { label: 'Cancelado', ts: d.cancelado_at },
        ].filter(t => t.siempre || t.ts)

        return (
            <div style={{ width: '300px', flexShrink: 0, borderLeft: `1px solid ${s.border}`, background: s.surface, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

                {/* Estado de pago */}
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${s.borderLight}` }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Estado de pago</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: pagado ? (darkMode ? 'rgba(16,185,129,0.1)' : '#f0fdf4') : (darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb'), border: `1px solid ${pagado ? '#86efac' : '#fde68a'}` }}>
                        <span style={{ fontSize: '22px' }}>{pagado ? '✅' : '⏳'}</span>
                        <div>
                            <p style={{ fontSize: '14px', fontWeight: '800', color: pagado ? '#10b981' : '#f59e0b' }}>
                                {pagado ? 'Pagado' : 'Pendiente de pago'}
                            </p>
                            <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '2px' }}>
                                {d.metodo_pago || '—'}
                            </p>
                        </div>
                    </div>
                    {d.quiere_factura && (
                        <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px', background: s.surfaceLow, fontSize: '11px', color: s.textMuted }}>
                            🧾 Factura a: <strong style={{ color: s.text }}>{d.razon_social || 'Sin razón social'}</strong>
                            {d.ruc_factura && <span> · RUC: {d.ruc_factura}</span>}
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div style={{ padding: '16px 18px', borderBottom: `1px solid ${s.borderLight}` }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Timeline</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                        {timeline.map((t, i) => (
                            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.ts ? cfg.color : s.border, marginTop: '3px', flexShrink: 0 }} />
                                    {i < timeline.length - 1 && <div style={{ width: '2px', height: '20px', background: s.borderLight }} />}
                                </div>
                                <div style={{ paddingBottom: i < timeline.length - 1 ? '8px' : '0' }}>
                                    <p style={{ fontSize: '12px', fontWeight: '600', color: t.ts ? s.text : s.textFaint }}>{t.label}</p>
                                    {t.ts && <p style={{ fontSize: '10px', color: s.textFaint }}>{formatearFecha(t.ts)}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Historial de notas */}
                {historial.length > 0 && (
                    <div style={{ padding: '16px 18px', borderBottom: `1px solid ${s.borderLight}` }}>
                        <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Notas y demoras</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {historial.map((n, i) => {
                                const iconos = { demora_trafico: '🚦', demora_tecnica: '🔧', no_encontrado: '📍', nota: '📝', estado: '🔄' }
                                return (
                                    <div key={i} style={{ padding: '8px 10px', background: s.surfaceLow, borderRadius: '8px', fontSize: '11px' }}>
                                        <p style={{ color: s.text, fontWeight: '500' }}>{iconos[n.tipo] || '📝'} {n.texto}</p>
                                        <p style={{ color: s.textFaint, marginTop: '2px' }}>{formatearFecha(n.timestamp)}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Agregar nota / demora */}
                <div style={{ padding: '16px 18px' }}>
                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Agregar nota</p>

                    {/* Botones demora rápida */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                        {demoras.map(dem => (
                            <button key={dem.tipo} onClick={() => handleAgregarNota(dem.tipo)}
                                style={{ padding: '7px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: '600', textAlign: 'left', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = s.surfaceLow; e.currentTarget.style.color = s.text }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = s.textMuted }}>
                                {dem.label}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        <input
                            value={notaTexto}
                            onChange={e => setNotaTexto(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAgregarNota('nota') }}
                            placeholder="Nota personalizada..."
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.inputBg, color: s.text, fontSize: '12px', outline: 'none' }}
                        />
                        <button onClick={() => handleAgregarNota('nota')} disabled={enviandoNota || !notaTexto.trim()}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', background: notaTexto.trim() ? '#1a1a2e' : s.surfaceLow, color: notaTexto.trim() ? 'white' : s.textFaint, cursor: notaTexto.trim() ? 'pointer' : 'not-allowed', fontSize: '12px', fontWeight: '600' }}>
                            +
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (cargando) return (
        <div style={{ padding: '32px', background: s.bg, color: s.text, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: s.textMuted }}>Cargando deliveries...</p>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', background: s.bg, overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${s.border}`, background: s.surface }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Gestión de Entregas</h1>
                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>Panel de control de deliveries en tiempo real</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={cargarDeliveries}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${s.border}`, background: s.surfaceLow, color: s.text, fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                            ↻ Actualizar
                        </button>
                        <button onClick={() => setModalNuevo(true)}
                            style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                            + Nuevo delivery
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {[
                        { label: 'Entregas activas', valor: activos, sub: 'pendientes y en proceso', color: '#3b82f6', bg: darkMode ? '#0c1a3a' : '#eff6ff', icono: '🚚' },
                        { label: 'En camino ahora', valor: enCamino, sub: 'repartidores en ruta', color: '#8b5cf6', bg: darkMode ? '#2d1b69' : '#f5f3ff', icono: '📍' },
                        { label: 'Entregados hoy', valor: entregados, sub: 'completados exitosamente', color: '#10b981', bg: darkMode ? '#052e16' : '#f0fdf4', icono: '✅' },
                    ].map((m, i) => (
                        <div key={i} style={{ background: m.bg, borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: darkMode ? 'rgba(255,255,255,0.08)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                                {m.icono}
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: '700', color: m.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>{m.label}</p>
                                <p style={{ fontSize: '22px', fontWeight: '800', color: m.color, lineHeight: 1 }}>{m.valor}</p>
                                <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '2px' }}>{m.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contenido */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Lista */}
                <div style={{ width: '340px', borderRight: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', background: s.surface, flexShrink: 0 }}>
                    <div style={{ padding: '12px 14px', borderBottom: `1px solid ${s.border}` }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {filtros.map(f => {
                                const count = f.valor === 'todos' ? deliveries.length : (conteos[f.valor] || 0)
                                const cfg = estadoConfig[f.valor]
                                const activo = filtroEstado === f.valor
                                return (
                                    <button key={f.valor} onClick={() => setFiltroEstado(f.valor)}
                                        style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: '600', cursor: 'pointer', background: activo ? (cfg?.color || '#1a1a2e') : s.surfaceLow, color: activo ? 'white' : s.textMuted, borderColor: activo ? (cfg?.color || '#1a1a2e') : s.border, transition: 'all 0.15s' }}>
                                        {f.label} <span style={{ opacity: 0.8 }}>({count})</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {deliveriesFiltrados.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: s.textMuted }}>
                                <p style={{ fontSize: '24px', marginBottom: '8px' }}>📦</p>
                                <p style={{ fontSize: '13px' }}>No hay deliveries en este estado.</p>
                            </div>
                        ) : (
                            deliveriesFiltrados.map(d => {
                                const cfg = estadoConfig[d.estado] || {}
                                const activo = detalle?.id === d.id
                                const pagado = d.estado_venta === 'pagado'
                                return (
                                    <div key={d.id} onClick={() => setDetalle(d)}
                                        style={{ padding: '14px 16px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: activo ? s.rowActive : s.surface, borderLeft: `3px solid ${activo ? '#3b82f6' : 'transparent'}`, transition: 'all 0.1s' }}
                                        onMouseEnter={e => { if (!activo) e.currentTarget.style.background = s.surfaceLow }}
                                        onMouseLeave={e => { if (!activo) e.currentTarget.style.background = s.surface }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{d.cliente_nombre || d.cliente_numero || 'Sin nombre'}</span>
                                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', color: cfg.textColor, background: darkMode ? `${cfg.color}30` : cfg.bg, flexShrink: 0, marginLeft: '6px' }}>
                                                {cfg.icono} {cfg.label}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '11px', color: s.textMuted, marginBottom: '4px' }}>{d.marca_nombre && `${d.marca_nombre} — `}{d.producto_nombre} — {d.presentacion_nombre}</p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '700', color: s.text }}>Gs. {parseInt(d.precio).toLocaleString()}</p>
                                            <span style={{ fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '6px', color: pagado ? '#10b981' : '#f59e0b', background: pagado ? (darkMode ? 'rgba(16,185,129,0.1)' : '#f0fdf4') : (darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb') }}>
                                                {pagado ? '✓ Pagado' : '⏳ Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Detalle central */}
                <div style={{ flex: 1, background: s.bg, overflowY: 'auto' }}>
                    {!detalle ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: s.textMuted }}>
                            <span style={{ fontSize: '48px' }}>🚚</span>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>Seleccioná un delivery para ver los detalles</p>
                        </div>
                    ) : (
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

                            {/* Header */}
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '18px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: '800', color: s.text }}>{detalle.cliente_nombre || detalle.cliente_numero || 'Sin nombre'}</h3>
                                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '3px' }}>{detalle.marca_nombre && `${detalle.marca_nombre} — `}{detalle.producto_nombre} — {detalle.presentacion_nombre}</p>
                                        <p style={{ fontSize: '16px', fontWeight: '800', color: s.text, marginTop: '6px' }}>Gs. {parseInt(detalle.precio).toLocaleString()}</p>
                                    </div>
                                    {(() => {
                                        const cfg = estadoConfig[detalle.estado] || {}
                                        return (
                                            <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', color: cfg.textColor, background: darkMode ? `${cfg.color}30` : cfg.bg }}>
                                                {cfg.icono} {cfg.label}
                                            </span>
                                        )
                                    })()}
                                </div>
                            </div>

                            {/* Datos de entrega */}
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '18px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '14px' }}>Datos de entrega</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    {[
                                        { label: 'Cliente', val: detalle.cliente_nombre },
                                        { label: 'Teléfono', val: detalle.cliente_telefono || detalle.cliente_numero },
                                        { label: 'Ubicación', val: detalle.ubicacion },
                                        { label: 'Referencia', val: detalle.referencia },
                                        { label: 'Horario preferido', val: detalle.horario },
                                        { label: 'Contacto', val: detalle.contacto_entrega },
                                        { label: 'Fecha del pedido', val: formatearFecha(detalle.created_at) },
                                    ].filter(item => item.val).map((item, i) => (
                                        <div key={i} style={{ padding: '9px 12px', background: s.surfaceLow, borderRadius: '8px' }}>
                                            <p style={{ fontSize: '9px', fontWeight: '700', color: s.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{item.label}</p>
                                            <p style={{ fontSize: '12px', color: s.text, fontWeight: '500' }}>{item.val}</p>
                                        </div>
                                    ))}
                                </div>
                                {detalle.ubicacion?.includes('maps.google.com') && (
                                    <a href={detalle.ubicacion.replace(/^.*?(https:\/\/)/, 'https://')} target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '14px', padding: '9px 14px', borderRadius: '8px', background: '#1a1a2e', color: 'white', fontSize: '12px', fontWeight: '600', textDecoration: 'none' }}>
                                        📍 Ver en Google Maps
                                    </a>
                                )}
                            </div>

                            {/* Cambiar estado */}
                            <div style={{ background: s.surface, borderRadius: '12px', padding: '18px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>Cambiar estado</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {Object.entries(estadoConfig).map(([estado, cfg]) => {
                                        const activo = detalle.estado === estado
                                        return (
                                            <button key={estado} onClick={() => cambiarEstado(detalle.id, estado)} disabled={activo || !puedo('delivery', 'editar')}
                                                style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${activo ? cfg.color : s.border}`, fontSize: '12px', fontWeight: activo ? '700' : '500', cursor: activo ? 'not-allowed' : 'pointer', background: activo ? cfg.color : s.surfaceLow, color: activo ? 'white' : s.text, transition: 'all 0.15s' }}
                                                onMouseEnter={e => { if (!activo) e.currentTarget.style.borderColor = cfg.color }}
                                                onMouseLeave={e => { if (!activo) e.currentTarget.style.borderColor = s.border }}>
                                                {cfg.icono} {cfg.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Panel lateral derecho */}
                {detalle && <PanelLateral d={detalle} />}
            </div>

            {/* Modal nuevo delivery */}
            {modalNuevo && (
                <ModalNuevoDelivery
                    s={s}
                    darkMode={darkMode}
                    onClose={() => setModalNuevo(false)}
                    onCreado={async () => { setModalNuevo(false); await cargarDeliveries() }}
                    setModalConfirmar={setModalConfirmar}
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

// Modal crear delivery manual — componente separado para mantener limpio el código
function ModalNuevoDelivery({ s, darkMode, onClose, onCreado, setModalConfirmar }) {
    const [paso, setPaso] = useState(1)
    const [productos, setProductos] = useState([])
    const [buscarCliente, setBuscarCliente] = useState('')
    const [resultadosCliente, setResultadosCliente] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [clienteNuevo, setClienteNuevo] = useState(false)
    const [formCliente, setFormCliente] = useState({ nombre: '', telefono: '', tipo: 'persona', ruc: '', ciudad: '', direccion: '' })
    const [lineas, setLineas] = useState([]) // [{ producto, presentacion, cantidad }]
    const [buscarProducto, setBuscarProducto] = useState('')
    const [productoActual, setProductoActual] = useState(null)
    const [formEntrega, setFormEntrega] = useState({ ubicacion: '', referencia: '', horario: '', contacto_entrega: '', metodo_pago: 'efectivo', estado_pago: 'pendiente_pago', notas: '' })
    const [enviando, setEnviando] = useState(false)

    const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, marginBottom: '10px', fontSize: '13px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '5px' }

    useEffect(() => { cargarProductos() }, [])

    async function cargarProductos() {
        try { setProductos(await getProductos()) } catch (err) {}
    }

    async function handleBuscarCliente(valor) {
        setBuscarCliente(valor)
        if (valor.length < 2) { setResultadosCliente([]); return }
        try { setResultadosCliente(await buscarClientes(valor)) } catch (err) {}
    }

    const productosFiltrados = buscarProducto.trim()
        ? productos.filter(p => p.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) || (p.marca_nombre && p.marca_nombre.toLowerCase().includes(buscarProducto.toLowerCase())))
        : productos.slice(0, 20)

    function seleccionarPresentacion(producto, presentacion) {
        // Verificar si ya existe esa presentación en las líneas
        const existe = lineas.find(l => l.presentacion.id === presentacion.id)
        if (existe) {
            // Incrementar cantidad
            setLineas(prev => prev.map(l => l.presentacion.id === presentacion.id
                ? { ...l, cantidad: Math.min(l.cantidad + 1, presentacion.stock) }
                : l
            ))
        } else {
            setLineas(prev => [...prev, { producto, presentacion, cantidad: 1 }])
        }
        setProductoActual(null)
        setBuscarProducto('')
    }

    function cambiarCantidad(presentacionId, delta) {
        setLineas(prev => prev.map(l => {
            if (l.presentacion.id !== presentacionId) return l
            const nueva = Math.max(1, Math.min(l.cantidad + delta, l.presentacion.stock))
            return { ...l, cantidad: nueva }
        }))
    }

    function quitarLinea(presentacionId) {
        setLineas(prev => prev.filter(l => l.presentacion.id !== presentacionId))
    }

    const totalLineas = lineas.reduce((sum, l) => sum + (l.presentacion.precio_venta * l.cantidad), 0)

    async function handleCrear() {
        if (lineas.length === 0) return
        try {
            setEnviando(true)
            const payload = {
                cliente_id: clienteSeleccionado?.id || null,
                cliente_nuevo: !clienteSeleccionado && formCliente.nombre ? formCliente : null,
                lineas: lineas.map(l => ({
                    presentacion_id: l.presentacion.id,
                    precio: l.presentacion.precio_venta * l.cantidad,
                    cantidad: l.cantidad
                })),
                ...formEntrega,
            }
            await crearDeliveryManual(payload)
            await onCreado()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el delivery.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setEnviando(false) }
    }

    const pasos = ['Cliente', 'Productos', 'Entrega']

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: s.surface, borderRadius: '16px', width: '560px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: s.text }}>Nuevo delivery manual</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                </div>

                {/* Stepper */}
                <div style={{ padding: '14px 24px', borderBottom: `1px solid ${s.border}`, display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {pasos.map((p, i) => {
                        const num = i + 1
                        const activo = paso === num
                        const completo = paso > num
                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', background: activo ? '#1a1a2e' : completo ? '#10b981' : s.surfaceLow, border: `1px solid ${activo ? '#1a1a2e' : completo ? '#10b981' : s.border}` }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: activo || completo ? 'white' : s.textFaint }}>{completo ? '✓' : num}</span>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: activo || completo ? 'white' : s.textFaint }}>{p}</span>
                                </div>
                                {i < pasos.length - 1 && <div style={{ width: '16px', height: '1px', background: s.border }} />}
                            </div>
                        )
                    })}
                </div>

                {/* Contenido */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {/* Paso 1: Cliente */}
                    {paso === 1 && (
                        <div>
                            <p style={{ fontSize: '13px', color: s.textMuted, marginBottom: '16px' }}>Buscá un cliente existente o creá uno nuevo.</p>
                            <input placeholder="Buscar por nombre, teléfono o RUC..." value={buscarCliente} onChange={e => handleBuscarCliente(e.target.value)} style={inputStyle} />
                            {resultadosCliente.length > 0 && !clienteSeleccionado && (
                                <div style={{ border: `1px solid ${s.border}`, borderRadius: '10px', marginBottom: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {resultadosCliente.map(c => (
                                        <div key={c.id} onClick={() => { setClienteSeleccionado(c); setBuscarCliente(c.nombre); setResultadosCliente([]); setClienteNuevo(false) }}
                                            style={{ padding: '10px 14px', borderBottom: `1px solid ${s.borderLight}`, cursor: 'pointer', background: s.surface }}
                                            onMouseEnter={e => e.currentTarget.style.background = s.surfaceLow}
                                            onMouseLeave={e => e.currentTarget.style.background = s.surface}>
                                            <p style={{ fontSize: '13px', fontWeight: '600', color: s.text }}>{c.nombre}</p>
                                            <p style={{ fontSize: '11px', color: s.textMuted }}>{c.telefono && `📱 ${c.telefono}`}{c.ruc && ` · RUC: ${c.ruc}`}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {clienteSeleccionado && (
                                <div style={{ padding: '12px 14px', background: darkMode ? '#052e16' : '#f0fdf4', borderRadius: '10px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #86efac' }}>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: '#166534' }}>✓ {clienteSeleccionado.nombre}</p>
                                        {clienteSeleccionado.telefono && <p style={{ fontSize: '11px', color: s.textMuted }}>📱 {clienteSeleccionado.telefono}</p>}
                                    </div>
                                    <button onClick={() => { setClienteSeleccionado(null); setBuscarCliente('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.textMuted, fontSize: '16px' }}>✕</button>
                                </div>
                            )}
                            <button onClick={() => setClienteNuevo(!clienteNuevo)}
                                style={{ padding: '8px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginBottom: '14px' }}>
                                {clienteNuevo ? '✕ Cancelar' : '+ Cliente nuevo'}
                            </button>
                            {clienteNuevo && (
                                <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '14px', border: `1px solid ${s.border}` }}>
                                    <label style={labelStyle}>Nombre *</label>
                                    <input value={formCliente.nombre} onChange={e => setFormCliente({ ...formCliente, nombre: e.target.value })} style={inputStyle} />
                                    <label style={labelStyle}>Teléfono / WhatsApp</label>
                                    <input value={formCliente.telefono} onChange={e => setFormCliente({ ...formCliente, telefono: e.target.value })} style={inputStyle} />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div><label style={labelStyle}>RUC</label><input value={formCliente.ruc} onChange={e => setFormCliente({ ...formCliente, ruc: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                        <div><label style={labelStyle}>Ciudad</label><input value={formCliente.ciudad} onChange={e => setFormCliente({ ...formCliente, ciudad: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} /></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paso 2: Productos */}
                    {paso === 2 && (
                        <div>
                            {/* Líneas agregadas */}
                            {lineas.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                        Productos seleccionados ({lineas.length})
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {lineas.map(l => (
                                            <div key={l.presentacion.id} style={{ padding: '10px 14px', borderRadius: '10px', border: `1px solid ${s.border}`, background: s.surfaceLow, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>{l.producto.marca_nombre && `${l.producto.marca_nombre} — `}{l.producto.nombre}</p>
                                                    <p style={{ fontSize: '11px', color: s.textMuted }}>{l.presentacion.nombre} · Gs. {l.presentacion.precio_venta?.toLocaleString()}</p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button onClick={() => cambiarCantidad(l.presentacion.id, -1)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                                    <span style={{ fontSize: '14px', fontWeight: '700', minWidth: '20px', textAlign: 'center', color: s.text }}>{l.cantidad}</span>
                                                    <button onClick={() => cambiarCantidad(l.presentacion.id, 1)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: `1px solid ${s.border}`, background: s.surface, color: s.text, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                                </div>
                                                <p style={{ fontSize: '12px', fontWeight: '800', color: s.text, minWidth: '80px', textAlign: 'right' }}>
                                                    Gs. {(l.presentacion.precio_venta * l.cantidad).toLocaleString()}
                                                </p>
                                                <button onClick={() => quitarLinea(l.presentacion.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', padding: '2px' }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '10px 14px', background: '#1a1a2e', borderRadius: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>Total</span>
                                        <span style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>Gs. {totalLineas.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            {/* Buscar y agregar producto */}
                            <p style={{ fontSize: '10px', fontWeight: '800', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                                {lineas.length === 0 ? 'Seleccioná productos' : '+ Agregar otro producto'}
                            </p>
                            <input
                                placeholder="Buscar producto..."
                                value={buscarProducto}
                                onChange={e => { setBuscarProducto(e.target.value); setProductoActual(null) }}
                                style={inputStyle}
                            />

                            {!productoActual ? (
                                buscarProducto.trim() && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {productosFiltrados.map(p => (
                                            <div key={p.id} onClick={() => { setProductoActual(p); setBuscarProducto(`${p.marca_nombre ? p.marca_nombre + ' — ' : ''}${p.nombre}`) }}
                                                style={{ padding: '10px 14px', borderRadius: '8px', border: `1px solid ${s.border}`, cursor: 'pointer', background: s.surfaceLow }}
                                                onMouseEnter={e => e.currentTarget.style.background = darkMode ? '#334155' : '#f1f5f9'}
                                                onMouseLeave={e => e.currentTarget.style.background = s.surfaceLow}>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{p.marca_nombre && `${p.marca_nombre} — `}{p.nombre}</p>
                                                <p style={{ fontSize: '11px', color: s.textMuted }}>{p.categoria_nombre} · {p.calidad}</p>
                                            </div>
                                        ))}
                                    </div>
                                )
                            ) : (
                                <div>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Elegí la presentación</p>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {productoActual.presentaciones?.filter(pr => pr.disponible && pr.stock > 0).map(pr => (
                                            <div key={pr.id} onClick={() => seleccionarPresentacion(productoActual, pr)}
                                                style={{ padding: '10px 14px', borderRadius: '10px', border: `2px solid ${s.border}`, background: s.surfaceLow, cursor: 'pointer', transition: 'all 0.15s' }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a1a2e'; e.currentTarget.style.background = darkMode ? '#1e3a5f' : '#eff6ff' }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = s.border; e.currentTarget.style.background = s.surfaceLow }}>
                                                <p style={{ fontSize: '12px', fontWeight: '700', color: s.text }}>{pr.nombre}</p>
                                                <p style={{ fontSize: '13px', fontWeight: '800', color: s.text }}>Gs. {pr.precio_venta?.toLocaleString()}</p>
                                                <p style={{ fontSize: '10px', color: pr.stock <= 3 ? '#ef4444' : s.textFaint }}>Stock: {pr.stock}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => { setProductoActual(null); setBuscarProducto('') }}
                                        style={{ marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: s.textFaint }}>
                                        ← Cambiar producto
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paso 3: Entrega */}
                    {paso === 3 && (
                        <div>
                            <label style={labelStyle}>Ubicación / Dirección</label>
                            <input value={formEntrega.ubicacion} onChange={e => setFormEntrega({ ...formEntrega, ubicacion: e.target.value })} style={inputStyle} placeholder="Barrio, calle, link de maps..." />
                            <label style={labelStyle}>Referencia</label>
                            <input value={formEntrega.referencia} onChange={e => setFormEntrega({ ...formEntrega, referencia: e.target.value })} style={inputStyle} placeholder="Número de casa, parada, etc." />
                            <label style={labelStyle}>Horario preferido</label>
                            <input value={formEntrega.horario} onChange={e => setFormEntrega({ ...formEntrega, horario: e.target.value })} style={inputStyle} placeholder="Ej: Desde las 14hs" />
                            <label style={labelStyle}>Contacto que recibe</label>
                            <input value={formEntrega.contacto_entrega} onChange={e => setFormEntrega({ ...formEntrega, contacto_entrega: e.target.value })} style={inputStyle} placeholder="Nombre y teléfono" />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                                <div>
                                    <label style={labelStyle}>Método de pago</label>
                                    <select value={formEntrega.metodo_pago} onChange={e => setFormEntrega({ ...formEntrega, metodo_pago: e.target.value })} style={inputStyle}>
                                        <option value="efectivo">Efectivo</option>
                                        <option value="transferencia">Transferencia</option>
                                        <option value="tarjeta">Tarjeta</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Estado de pago</label>
                                    <select value={formEntrega.estado_pago} onChange={e => setFormEntrega({ ...formEntrega, estado_pago: e.target.value })} style={inputStyle}>
                                        <option value="pendiente_pago">Pendiente</option>
                                        <option value="pagado">Pagado</option>
                                    </select>
                                </div>
                            </div>
                            <label style={labelStyle}>Notas internas (opcional)</label>
                            <textarea value={formEntrega.notas} onChange={e => setFormEntrega({ ...formEntrega, notas: e.target.value })} rows={2}
                                style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} placeholder="Instrucciones especiales..." />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: `1px solid ${s.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={paso === 1 ? onClose : () => setPaso(paso - 1)}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        {paso === 1 ? 'Cancelar' : '← Atrás'}
                    </button>

                    {paso < 3 ? (
                        <button onClick={() => setPaso(paso + 1)}
                            disabled={paso === 2 && lineas.length === 0}
                            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: (paso === 2 && lineas.length === 0) ? s.surfaceLow : '#1a1a2e', color: (paso === 2 && lineas.length === 0) ? s.textFaint : 'white', cursor: (paso === 2 && lineas.length === 0) ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '700' }}>
                            Siguiente →
                        </button>
                    ) : (
                        <button onClick={handleCrear} disabled={enviando}
                            style={{ padding: '9px 20px', borderRadius: '8px', border: 'none', background: enviando ? s.surfaceLow : '#10b981', color: enviando ? s.textFaint : '#0f172a', cursor: enviando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '800' }}>
                            {enviando ? 'Creando...' : `✓ Crear delivery (${lineas.length} producto${lineas.length > 1 ? 's' : ''})`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Delivery