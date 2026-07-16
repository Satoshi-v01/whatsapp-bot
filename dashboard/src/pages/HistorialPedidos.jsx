import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../App'
import api from '../services/api'
import { formatearFecha, fechaHoyPY } from '../utils/fecha'

// ─── Helpers ────────────────────────────────────────────────────
function gs(n) {
    return `Gs. ${Number(n || 0).toLocaleString('es-PY')}`
}

function calcTotal(orden) {
    const itemsTotal = (orden.items || []).reduce((s, it) => s + Number(it.precio_total || 0), 0)
    return itemsTotal + Number(orden.costo_delivery || 0)
}

function toFechaDesde(periodo) {
    const hoy = fechaHoyPY()
    if (periodo === 'hoy') { return hoy }
    const d = new Date(hoy + 'T00:00:00')
    if (periodo === '7d')  { d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10) }
    if (periodo === '30d') { d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }
    if (periodo === 'mes') { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
    return null
}

// ─── Configuración de canales ────────────────────────────────────
const CANAL_CONFIG = {
    pagina_web:        { label: 'Web',            color: '#2563eb', bg: '#dbeafe' },
    whatsapp_bot:      { label: 'Bot',            color: '#16a34a', bg: '#dcfce7' },
    whatsapp:          { label: 'WhatsApp',       color: '#059669', bg: '#d1fae5' },
    whatsapp_delivery: { label: 'WA Delivery',    color: '#0891b2', bg: '#cffafe' },
    en_tienda:         { label: 'Tienda',         color: '#7c3aed', bg: '#ede9fe' },
    presencial:        { label: 'Presencial',     color: '#7c3aed', bg: '#ede9fe' },
    agente_presencial: { label: 'Agente',         color: '#b45309', bg: '#fef3c7' },
    agente_delivery:   { label: 'Ag. Delivery',   color: '#0e7490', bg: '#e0f2fe' },
}

const ESTADO_CONFIG = {
    pendiente:   { label: 'Pendiente',   color: '#b45309', bg: '#fef3c7' },
    pendiente_pago: { label: 'Pend. pago', color: '#b45309', bg: '#fef3c7' },
    confirmado:  { label: 'Confirmado',  color: '#1d4ed8', bg: '#dbeafe' },
    confirmada:  { label: 'Confirmada',  color: '#1d4ed8', bg: '#dbeafe' },
    en_camino:   { label: 'En camino',   color: '#7c3aed', bg: '#ede9fe' },
    entregado:   { label: 'Entregado',   color: '#15803d', bg: '#dcfce7' },
    cancelado:   { label: 'Cancelado',   color: '#dc2626', bg: '#fee2e2' },
    cancelada:   { label: 'Cancelada',   color: '#dc2626', bg: '#fee2e2' },
    expirada:    { label: 'Expirada',    color: '#64748b', bg: '#f1f5f9' },
}

function CanalBadge({ canal }) {
    const cfg = CANAL_CONFIG[canal] || { label: canal, color: '#64748b', bg: '#f1f5f9' }
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
            {cfg.label}
        </span>
    )
}

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CONFIG[estado] || { label: estado, color: '#64748b', bg: '#f1f5f9' }
    return (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
            {cfg.label}
        </span>
    )
}

// ─── Fila expandible ────────────────────────────────────────────
function FilaOrden({ orden, s, darkMode }) {
    const [abierta, setAbierta] = useState(false)
    const total = calcTotal(orden)
    const items = (orden.items || []).filter(it => it.id)
    const esDelivery = orden.tipo_entrega === 'delivery' || orden.modalidad === 'delivery'

    return (
        <>
            {/* Fila principal */}
            <tr
                onClick={() => setAbierta(v => !v)}
                style={{
                    cursor: 'pointer',
                    background: abierta ? (darkMode ? '#1a2e4a' : '#eff6ff') : 'transparent',
                    transition: 'background 0.15s',
                }}
            >
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: s.primary, whiteSpace: 'nowrap' }}>
                    {orden.numero_pedido || `#${orden.id}`}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: s.textMuted, whiteSpace: 'nowrap' }}>
                    {formatearFecha(orden.created_at)}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, color: s.text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {orden.cliente_nombre || '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                    <CanalBadge canal={orden.canal} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                    <EstadoBadge estado={orden.estado} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: s.textMuted, whiteSpace: 'nowrap' }}>
                    {esDelivery ? 'Delivery' : 'Retiro'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: s.text, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {gs(total)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: abierta ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </td>
            </tr>

            {/* Fila expandida */}
            {abierta && (
                <tr>
                    <td colSpan={8} style={{ padding: 0 }}>
                        <div style={{
                            background: darkMode ? '#0f1e30' : '#f8fafc',
                            borderTop: `1px solid ${s.border}`,
                            borderBottom: `2px solid ${s.primary + '40'}`,
                            padding: '16px 20px',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
                            gap: 20,
                        }}>
                            {/* Columna izquierda — items */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                    Productos
                                </p>
                                {items.length === 0
                                    ? <p style={{ fontSize: 13, color: s.textFaint }}>Sin items</p>
                                    : items.map((it, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '5px 0', borderBottom: idx < items.length - 1 ? `1px solid ${s.borderLight}` : 'none' }}>
                                            <span style={{ fontSize: 13, color: s.text, flex: 1 }}>
                                                {it.producto_nombre || it.presentacion_nombre || 'Producto'}{it.presentacion_nombre && it.producto_nombre ? ` — ${it.presentacion_nombre}` : ''} <span style={{ color: s.textMuted }}>x{it.cantidad}</span>
                                            </span>
                                            <span style={{ fontSize: 13, fontWeight: 600, color: s.text, whiteSpace: 'nowrap' }}>{gs(it.precio_total)}</span>
                                        </div>
                                    ))
                                }
                                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {Number(orden.costo_delivery) > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: s.textMuted }}>
                                            <span>Delivery{orden.zona_delivery ? ` — ${orden.zona_delivery}` : ''}</span>
                                            <span>{gs(orden.costo_delivery)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: s.text }}>
                                        <span>Total</span>
                                        <span style={{ color: s.primary }}>{gs(total)}</span>
                                    </div>
                                </div>
                                {orden.notas && (
                                    <p style={{ marginTop: 10, fontSize: 12, color: s.textMuted, background: darkMode ? '#1e293b' : '#f1f5f9', borderRadius: 6, padding: '6px 10px' }}>
                                        Notas: {orden.notas}
                                    </p>
                                )}
                            </div>

                            {/* Columna derecha — entrega + pago */}
                            <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                    Entrega y pago
                                </p>
                                <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 12px', fontSize: 12 }}>
                                    {[
                                        ['Tipo',      esDelivery ? 'Delivery' : 'Retiro en local'],
                                        ['Cliente',   orden.cliente_nombre],
                                        ['Telefono',  orden.cliente_telefono],
                                        ['Zona',      orden.zona_delivery],
                                        ['Direccion', orden.ubicacion || orden.direccion],
                                        ['Maps',      orden.maps_url ? { link: orden.maps_url } : null],
                                        ['Referencia',orden.referencia],
                                        ['Horario',   orden.horario],
                                        ['Recibe',    orden.contacto_entrega],
                                        ['Pago',      orden.metodo_pago
                                            ? (orden.metodo_pago === 'efectivo' ? 'Efectivo' : orden.metodo_pago === 'transferencia' ? 'Transferencia' : orden.metodo_pago)
                                            : null],
                                        ['Factura',   orden.quiere_factura
                                            ? `${orden.razon_social || ''}${orden.ruc_factura ? ' / RUC ' + orden.ruc_factura : ''}`
                                            : null],
                                    ].filter(([, v]) => v).map(([k, v]) => (
                                        <div key={k} style={{ display: 'contents' }}>
                                            <dt style={{ color: s.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>{k}:</dt>
                                            <dd style={{ color: s.text, margin: 0, wordBreak: 'break-word' }}>
                                                {typeof v === 'object' && v?.link
                                                    ? <a href={v.link} target="_blank" rel="noopener noreferrer" style={{ color: '#16a34a', fontWeight: 700, textDecoration: 'none' }}>Abrir Maps</a>
                                                    : v
                                                }
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

// ─── KPI Card ────────────────────────────────────────────────────
function KpiCard({ label, valor, sub, color, s }) {
    return (
        <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '16px 20px', minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: color || s.text, lineHeight: 1 }}>{valor}</p>
            {sub && <p style={{ fontSize: 12, color: s.textMuted, marginTop: 4 }}>{sub}</p>}
        </div>
    )
}

// ─── Página principal ────────────────────────────────────────────
export default function HistorialPedidos() {
    const { darkMode } = useApp()

    const s = {
        bg:          darkMode ? '#0f172a' : '#f6f6f8',
        surface:     darkMode ? '#1e293b' : 'white',
        surfaceLow:  darkMode ? '#1a2536' : '#f8fafc',
        border:      darkMode ? '#334155' : '#e2e8f0',
        borderLight: darkMode ? '#2d3f55' : '#f1f5f9',
        text:        darkMode ? '#f1f5f9' : '#0f172a',
        textMuted:   darkMode ? '#94a3b8' : '#64748b',
        textFaint:   darkMode ? '#64748b' : '#94a3b8',
        inputBg:     darkMode ? '#0f172a' : 'white',
        primary:     '#3b82f6',
    }

    const [ordenes, setOrdenes]       = useState([])
    const [cargando, setCargando]     = useState(true)
    const [tabCanal, setTabCanal]     = useState('todos')
    const [estado, setEstado]         = useState('')
    const [periodo, setPeriodo]       = useState('30d')
    const [buscar, setBuscar]         = useState('')
    const [buscarDebounce, setBuscarDebounce] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setBuscarDebounce(buscar), 350)
        return () => clearTimeout(t)
    }, [buscar])

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const params = new URLSearchParams({ limite: '300' })
            if (tabCanal === 'web')  params.set('canal', 'pagina_web')
            if (tabCanal === 'bot')  params.set('canal', 'whatsapp_bot,whatsapp,whatsapp_delivery')
            if (tabCanal === 'todos') params.set('canal', 'pagina_web,whatsapp_bot,whatsapp,whatsapp_delivery,agente_presencial,agente_delivery')
            if (estado) params.set('estado', estado)
            const desde = toFechaDesde(periodo)
            if (desde) params.set('fecha_desde', desde)
            if (buscarDebounce) params.set('buscar', buscarDebounce)
            const { data } = await api.get(`/ordenes?${params}`)
            setOrdenes(Array.isArray(data) ? data : [])
        } catch {
            setOrdenes([])
        } finally {
            setCargando(false)
        }
    }, [tabCanal, estado, periodo, buscarDebounce])

    useEffect(() => { cargar() }, [cargar])

    // KPIs
    const totalIngresos  = ordenes.reduce((s, o) => s + calcTotal(o), 0)
    const countWeb       = ordenes.filter(o => o.canal === 'pagina_web').length
    const countBot       = ordenes.filter(o => ['whatsapp_bot', 'whatsapp', 'whatsapp_delivery'].includes(o.canal)).length
    const ticketPromedio = ordenes.length ? Math.round(totalIngresos / ordenes.length) : 0

    const TABS_CANAL = [
        { id: 'todos', label: 'Todos los canales' },
        { id: 'web',   label: 'Pagina Web' },
        { id: 'bot',   label: 'WhatsApp Bot' },
    ]
    const PERIODOS = [
        { id: 'hoy',  label: 'Hoy' },
        { id: '7d',   label: '7 dias' },
        { id: '30d',  label: '30 dias' },
        { id: 'mes',  label: 'Este mes' },
        { id: 'todo', label: 'Todo' },
    ]
    const ESTADOS = [
        { v: '', l: 'Todos los estados' },
        { v: 'pendiente',  l: 'Pendiente' },
        { v: 'confirmado', l: 'Confirmado' },
        { v: 'confirmada', l: 'Confirmada' },
        { v: 'en_camino',  l: 'En camino' },
        { v: 'entregado',  l: 'Entregado' },
        { v: 'cancelado',  l: 'Cancelado' },
        { v: 'cancelada',  l: 'Cancelada' },
        { v: 'expirada',   l: 'Expirada' },
    ]

    const inputStyle = {
        background: s.inputBg, border: `1px solid ${s.border}`, borderRadius: 8,
        color: s.text, padding: '8px 12px', fontSize: 13, outline: 'none',
    }

    return (
        <div style={{ background: s.bg, minHeight: '100vh', padding: '24px 20px 48px' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* Encabezado */}
                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: s.text, marginBottom: 4 }}>Historial de Pedidos</h1>
                    <p style={{ fontSize: 13, color: s.textMuted }}>Pedidos recibidos por pagina web y WhatsApp bot</p>
                </div>

                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                    <KpiCard label="Total pedidos"   valor={ordenes.length}   sub={`en el periodo`}     s={s} />
                    <KpiCard label="Ingresos"        valor={gs(totalIngresos)} sub={`ticket prom. ${gs(ticketPromedio)}`} color={s.primary} s={s} />
                    <KpiCard label="Pedidos web"     valor={countWeb}          sub="canal pagina_web"    color="#2563eb" s={s} />
                    <KpiCard label="Pedidos bot"     valor={countBot}          sub="canal whatsapp"      color="#16a34a" s={s} />
                </div>

                {/* Tabs canal */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                    {TABS_CANAL.map(t => (
                        <button key={t.id} onClick={() => setTabCanal(t.id)}
                            style={{
                                padding: '8px 18px', borderRadius: 20, border: tabCanal === t.id ? 'none' : `1.5px solid ${s.border}`,
                                background: tabCanal === t.id ? s.primary : s.surface,
                                color: tabCanal === t.id ? 'white' : s.textMuted,
                                fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                            }}
                        >{t.label}</button>
                    ))}
                </div>

                {/* Filtros */}
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Buscar */}
                    <input
                        type="text"
                        placeholder="Buscar cliente o #pedido..."
                        value={buscar}
                        onChange={e => setBuscar(e.target.value)}
                        style={{ ...inputStyle, flex: '1 1 180px', minWidth: 140 }}
                    />

                    {/* Periodo */}
                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>

                    {/* Estado */}
                    <select value={estado} onChange={e => setEstado(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                        {ESTADOS.map(e => <option key={e.v} value={e.v}>{e.l}</option>)}
                    </select>

                    {/* Refrescar */}
                    <button onClick={cargar} style={{ ...inputStyle, cursor: 'pointer', color: s.primary, fontWeight: 600, padding: '8px 14px', flexShrink: 0 }}>
                        Actualizar
                    </button>
                </div>

                {/* Tabla */}
                <div style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 14, overflow: 'hidden' }}>
                    {cargando ? (
                        <div style={{ padding: '48px 0', textAlign: 'center', color: s.textMuted, fontSize: 14 }}>
                            Cargando pedidos...
                        </div>
                    ) : ordenes.length === 0 ? (
                        <div style={{ padding: '48px 0', textAlign: 'center', color: s.textMuted, fontSize: 14 }}>
                            No hay pedidos en este periodo
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${s.border}`, background: darkMode ? '#131f35' : '#f8fafc' }}>
                                        {['#Pedido', 'Fecha', 'Cliente', 'Canal', 'Estado', 'Tipo', 'Total', ''].map(h => (
                                            <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Total' ? 'right' : 'left', whiteSpace: 'nowrap' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordenes.map((o, i) => (
                                        <FilaOrden
                                            key={o.id}
                                            orden={o}
                                            s={s}
                                            darkMode={darkMode}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!cargando && ordenes.length > 0 && (
                        <div style={{ padding: '10px 16px', borderTop: `1px solid ${s.border}`, fontSize: 12, color: s.textFaint, textAlign: 'right' }}>
                            {ordenes.length} pedido{ordenes.length !== 1 ? 's' : ''}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
