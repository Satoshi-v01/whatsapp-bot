import { useState, useEffect } from 'react'
import { getAlertasReposicion } from '../services/reposicion'
import { getCliente } from '../services/clientes'
import { useApp } from '../App'

function Reposicion() {
    const { darkMode } = useApp()
    const [alertas, setAlertas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(false)
    const [diasUmbral, setDiasUmbral] = useState(5)
    const [clienteModal, setClienteModal] = useState(null)
    const [cargandoCliente, setCargandoCliente] = useState(false)

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

    useEffect(() => { cargarAlertas() }, [diasUmbral])

    async function cargarAlertas() {
        try {
            setCargando(true)
            setError(false)
            const datos = await getAlertasReposicion(diasUmbral)
            setAlertas(datos)
        } catch (err) {
            setError(true)
        } finally {
            setCargando(false)
        }
    }

    async function abrirHistorial(clienteId) {
        try {
            setCargandoCliente(true)
            setClienteModal({ cargando: true })
            const cliente = await getCliente(clienteId)
            setClienteModal(cliente)
        } catch (err) {
            setClienteModal(null)
        } finally {
            setCargandoCliente(false)
        }
    }

    function formatFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleDateString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    function estadoAlerta(diasRestantes) {
        if (diasRestantes < 0) return { texto: `Vencido hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) === 1 ? '' : 's'}`, bg: darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#ef4444' }
        if (diasRestantes === 0) return { texto: 'Hoy', bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', color: '#f59e0b' }
        return { texto: `En ${diasRestantes} día${diasRestantes === 1 ? '' : 's'}`, bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', color: '#f59e0b' }
    }

    return (
        <div className="page-scroll" style={{ padding: '32px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Reposiciones</h1>
                    <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '4px' }}>Clientes que probablemente necesiten reponer balanceados pronto, según su historial de compra</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: s.textMuted, fontWeight: '600' }}>Avisar con</label>
                    <select value={diasUmbral} onChange={e => setDiasUmbral(parseInt(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, fontSize: '12px', background: s.inputBg, color: s.text, outline: 'none' }}>
                        <option value={5}>5 días de anticipación</option>
                        <option value={7}>7 días de anticipación</option>
                        <option value={10}>10 días de anticipación</option>
                        <option value={15}>15 días de anticipación</option>
                    </select>
                </div>
            </div>

            {/* Tabla */}
            <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: s.surfaceLow }}>
                            {['Cliente', 'Producto', 'Última compra', 'Frecuencia estimada', 'Próxima reposición', 'Estado'].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>No se pudieron cargar las alertas.</td></tr>
                        ) : alertas.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: s.textMuted }}>
                                <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.4 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span>
                                <p>No hay clientes que necesiten reponer balanceados en los próximos {diasUmbral} días.</p>
                            </td></tr>
                        ) : alertas.map(a => {
                            const estado = estadoAlerta(a.dias_restantes)
                            return (
                                <tr key={`${a.cliente_id}-${a.presentacion_id}`} style={{ borderTop: `1px solid ${s.borderLight}`, cursor: 'pointer' }}
                                    onClick={() => abrirHistorial(a.cliente_id)}
                                    onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{a.cliente_nombre}</span>
                                        {a.cliente_telefono && <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '1px' }}>{a.cliente_telefono}</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '12px', color: s.text }}>{a.producto_nombre}{a.marca_nombre ? ` — ${a.marca_nombre}` : ''}</span>
                                        <p style={{ fontSize: '11px', color: s.textFaint, marginTop: '1px' }}>{a.presentacion_nombre}</p>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: s.textMuted, whiteSpace: 'nowrap' }}>
                                        {formatFecha(a.ultima_compra)}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: s.text }}>
                                        cada {a.dias_estimados} días
                                        {!a.con_historial_propio && <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '1px' }}>estimado (1ra compra)</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: s.textMuted, whiteSpace: 'nowrap' }}>
                                        {formatFecha(a.proxima_reposicion_estimada)}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: estado.bg, color: estado.color }}>
                                            {estado.texto}
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Modal historial cliente */}
            {clienteModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setClienteModal(null)}>
                    <div style={{ background: s.surface, borderRadius: '14px', padding: '24px', width: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
                        onClick={e => e.stopPropagation()}>
                        {cargandoCliente ? (
                            <p style={{ textAlign: 'center', color: s.textMuted, padding: '40px' }}>Cargando historial...</p>
                        ) : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: s.text }}>{clienteModal.nombre}</h3>
                                        <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '2px' }}>{clienteModal.telefono || '—'}</p>
                                    </div>
                                    <button onClick={() => setClienteModal(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
                                    <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '10px 12px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, textTransform: 'uppercase', fontWeight: '700' }}>Compras totales</p>
                                        <p style={{ fontSize: '15px', fontWeight: '800', color: s.text }}>{clienteModal.estadisticas?.total_compras ?? '—'}</p>
                                    </div>
                                    <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '10px 12px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, textTransform: 'uppercase', fontWeight: '700' }}>Ticket promedio</p>
                                        <p style={{ fontSize: '15px', fontWeight: '800', color: s.text }}>Gs. {Math.round(clienteModal.estadisticas?.ticket_promedio || 0).toLocaleString('es-PY')}</p>
                                    </div>
                                    <div style={{ background: s.surfaceLow, borderRadius: '10px', padding: '10px 12px' }}>
                                        <p style={{ fontSize: '10px', color: s.textFaint, textTransform: 'uppercase', fontWeight: '700' }}>Última compra</p>
                                        <p style={{ fontSize: '13px', fontWeight: '700', color: s.text }}>{formatFecha(clienteModal.estadisticas?.ultima_compra)}</p>
                                    </div>
                                </div>

                                <p style={{ fontSize: '11px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Historial de compras</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(clienteModal.ventas || []).map(v => (
                                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: s.surfaceLow, borderRadius: '8px', fontSize: '12px' }}>
                                            <div>
                                                <span style={{ color: s.text, fontWeight: '600' }}>{v.producto_nombre || '—'}</span>
                                                <span style={{ color: s.textFaint }}> · {v.presentacion_nombre || '—'}</span>
                                            </div>
                                            <span style={{ color: s.textMuted, whiteSpace: 'nowrap', marginLeft: '12px' }}>{formatFecha(v.created_at)}</span>
                                        </div>
                                    ))}
                                    {(!clienteModal.ventas || clienteModal.ventas.length === 0) && (
                                        <p style={{ fontSize: '12px', color: s.textFaint, textAlign: 'center', padding: '16px' }}>Sin compras registradas.</p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Reposicion
