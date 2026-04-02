import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { getLogs } from '../services/auditoria'
//import { getUsuarios } from '../services/usuarios'
import ModalConfirmar from '../components/ModalConfirmar'
import { useApp } from '../App'

function Auditoria() {
    const { darkMode } = useApp()
    const [logs, setLogs] = useState([])
    const [paginacion, setPaginacion] = useState(null)
    const [filtrosDisponibles, setFiltrosDisponibles] = useState({ modulos: [], acciones: [], usuarios: [] })
    const [cargando, setCargando] = useState(true)
    const [modalDetalle, setModalDetalle] = useState(null)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [exportando, setExportando] = useState(false)

    const [filtros, setFiltros] = useState({
        periodo: 'hoy',
        usuario_id: '',
        modulo: '',
        accion: '',
        fecha_desde: '',
        fecha_hasta: '',
        pagina: 1
    })

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

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, fontSize: '12px', boxSizing: 'border-box', background: s.inputBg, color: s.text, outline: 'none' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }

    useEffect(() => { cargarLogs() }, [filtros])

    async function cargarLogs() {
        try {
            setCargando(true)
            const params = { ...filtros }
            if (filtros.periodo !== 'personalizado') { delete params.fecha_desde; delete params.fecha_hasta }
            Object.keys(params).forEach(k => !params[k] && delete params[k])
            const datos = await getLogs(params)
            setLogs(datos.logs)
            setPaginacion(datos.paginacion)
            setFiltrosDisponibles(datos.filtros_disponibles)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los logs.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setCargando(false) }
    }

    function setFiltro(key, value) {
        setFiltros(prev => ({ ...prev, [key]: value, pagina: 1 }))
    }

    function colorAccion(accion) {
        return {
            crear: { bg: darkMode ? 'rgba(16,185,129,0.15)' : '#dcfce7', color: '#10b981' },
            editar: { bg: darkMode ? 'rgba(59,130,246,0.15)' : '#dbeafe', color: '#3b82f6' },
            eliminar: { bg: darkMode ? 'rgba(239,68,68,0.15)' : '#fee2e2', color: '#ef4444' },
            login: { bg: darkMode ? 'rgba(99,102,241,0.15)' : '#e0e7ff', color: '#4f46e5' },
            nota: { bg: darkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7', color: '#f59e0b' },
        }[accion] || { bg: s.surfaceLow, color: s.textMuted }
    }

    function colorModulo(modulo) {
        return {
            ventas: '#10b981',
            inventario: '#3b82f6',
            clientes: '#8b5cf6',
            delivery: '#f59e0b',
            proveedores: '#ef4444',
            sistema: '#64748b',
        }[modulo] || '#94a3b8'
    }

    async function handleExportar() {
        try {
            setExportando(true)
            const params = { ...filtros, por_pagina: 10000, pagina: 1 }
            if (filtros.periodo !== 'personalizado') { delete params.fecha_desde; delete params.fecha_hasta }
            Object.keys(params).forEach(k => !params[k] && delete params[k])
            const datos = await getLogs(params)

            const filas = datos.logs.map(l => ({
                'Fecha y hora': new Date(l.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' }),
                'Usuario': l.usuario_nombre || '—',
                'Acción': l.accion,
                'Módulo': l.modulo,
                'Entidad': l.entidad || '—',
                'ID Entidad': l.entidad_id || '—',
                'Descripción': l.descripcion || '—',
                'Dato anterior': l.dato_anterior ? JSON.stringify(l.dato_anterior) : '—',
                'Dato nuevo': l.dato_nuevo ? JSON.stringify(l.dato_nuevo) : '—',
                'IP': l.ip || '—'
            }))

            const wb = XLSX.utils.book_new()
            const ws = XLSX.utils.json_to_sheet(filas)
            ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 50 }, { wch: 40 }, { wch: 40 }, { wch: 15 }]
            XLSX.utils.book_append_sheet(wb, ws, 'Auditoría')
            XLSX.writeFile(wb, `auditoria_${new Date().toISOString().slice(0, 10)}.xlsx`)
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo exportar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setExportando(false) }
    }

    return (
        <div className="page-scroll" style={{ padding: '32px', background: s.bg, minHeight: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', color: s.text, letterSpacing: '-0.5px' }}>Log de Auditoría</h1>
                    <p style={{ fontSize: '12px', color: s.textMuted, marginTop: '4px' }}>Registro completo de acciones del sistema</p>
                </div>
                <button onClick={handleExportar} disabled={exportando}
                    style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: exportando ? '#94a3b8' : '#10b981', color: 'white', cursor: exportando ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: '600' }}>
                    {exportando ? 'Exportando...' : '⬇ Exportar Excel'}
                </button>
            </div>

            {/* Filtros */}
            <div style={{ background: s.surface, borderRadius: '12px', padding: '20px', marginBottom: '20px', border: `1px solid ${s.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '12px' }}>
                    <div>
                        <label style={labelStyle}>Período</label>
                        <select value={filtros.periodo} onChange={e => setFiltro('periodo', e.target.value)} style={inputStyle}>
                            <option value="hoy">Hoy</option>
                            <option value="semana">Esta semana</option>
                            <option value="mes">Este mes</option>
                            <option value="personalizado">Personalizado</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Usuario</label>
                        <select value={filtros.usuario_id} onChange={e => setFiltro('usuario_id', e.target.value)} style={inputStyle}>
                            <option value="">Todos</option>
                            {filtrosDisponibles.usuarios.map(u => (
                                <option key={u.usuario_id} value={u.usuario_id}>{u.usuario_nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Módulo</label>
                        <select value={filtros.modulo} onChange={e => setFiltro('modulo', e.target.value)} style={inputStyle}>
                            <option value="">Todos</option>
                            {filtrosDisponibles.modulos.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Acción</label>
                        <select value={filtros.accion} onChange={e => setFiltro('accion', e.target.value)} style={inputStyle}>
                            <option value="">Todas</option>
                            {filtrosDisponibles.acciones.map(a => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button onClick={() => setFiltros({ periodo: 'hoy', usuario_id: '', modulo: '', accion: '', fecha_desde: '', fecha_hasta: '', pagina: 1 })}
                            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '12px' }}>
                            Limpiar filtros
                        </button>
                    </div>
                </div>

                {filtros.periodo === 'personalizado' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 3fr', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Desde</label>
                            <input type="date" value={filtros.fecha_desde} onChange={e => setFiltro('fecha_desde', e.target.value)} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Hasta</label>
                            <input type="date" value={filtros.fecha_hasta} onChange={e => setFiltro('fecha_hasta', e.target.value)} style={inputStyle} />
                        </div>
                    </div>
                )}
            </div>

            {/* Tabla */}
            <div style={{ background: s.surface, borderRadius: '12px', border: `1px solid ${s.border}`, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ background: s.surfaceLow }}>
                            {['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Descripción', 'IP', ''].map(h => (
                                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {cargando ? (
                            <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: s.textMuted }}>Cargando...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: s.textMuted }}>
                                <span style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.4 }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>
                                <p>No hay registros para los filtros seleccionados.</p>
                            </td></tr>
                        ) : logs.map(log => {
                            const cfgAccion = colorAccion(log.accion)
                            return (
                                <tr key={log.id} style={{ borderTop: `1px solid ${s.borderLight}` }}
                                    onMouseEnter={e => e.currentTarget.style.background = s.rowHover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: s.textMuted, whiteSpace: 'nowrap' }}>
                                        {new Date(log.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '800', flexShrink: 0 }}>
                                                {log.usuario_nombre?.slice(0, 2).toUpperCase() || '??'}
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: s.text }}>{log.usuario_nombre || 'Sistema'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '20px', background: cfgAccion.bg, color: cfgAccion.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {log.accion}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: '600', color: colorModulo(log.modulo) }}>
                                            {log.modulo}
                                        </span>
                                        {log.entidad && <p style={{ fontSize: '10px', color: s.textFaint, marginTop: '1px' }}>{log.entidad} {log.entidad_id ? `#${log.entidad_id}` : ''}</p>}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '12px', color: s.text, maxWidth: '300px' }}>
                                        <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.descripcion || '—'}</p>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '11px', color: s.textFaint, fontFamily: 'monospace' }}>
                                        {log.ip || '—'}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {(log.dato_anterior || log.dato_nuevo) && (
                                            <button onClick={() => setModalDetalle(log)}
                                                style={{ padding: '5px 10px', borderRadius: '6px', border: `1px solid ${s.border}`, background: 'transparent', color: s.textMuted, cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                                                Ver cambios
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>

                {/* Paginación */}
                {paginacion && paginacion.total_paginas > 1 && (
                    <div style={{ padding: '14px 20px', borderTop: `1px solid ${s.borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ fontSize: '12px', color: s.textFaint }}>
                            {paginacion.total} registros · Página {paginacion.pagina} de {paginacion.total_paginas}
                        </p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button onClick={() => setFiltro('pagina', filtros.pagina - 1)} disabled={filtros.pagina <= 1}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: filtros.pagina <= 1 ? s.textFaint : s.text, cursor: filtros.pagina <= 1 ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                                ← Anterior
                            </button>
                            <button onClick={() => setFiltro('pagina', filtros.pagina + 1)} disabled={filtros.pagina >= paginacion.total_paginas}
                                style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${s.border}`, background: 'transparent', color: filtros.pagina >= paginacion.total_paginas ? s.textFaint : s.text, cursor: filtros.pagina >= paginacion.total_paginas ? 'not-allowed' : 'pointer', fontSize: '12px' }}>
                                Siguiente →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal detalle cambios */}
            {modalDetalle && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: s.surface, borderRadius: '14px', padding: '24px', width: '640px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: s.text }}>Detalle del cambio</h3>
                                <p style={{ fontSize: '11px', color: s.textMuted, marginTop: '2px' }}>{modalDetalle.descripcion}</p>
                            </div>
                            <button onClick={() => setModalDetalle(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: s.textMuted }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {modalDetalle.dato_anterior && (
                                <div>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Antes</p>
                                    <div style={{ background: darkMode ? 'rgba(239,68,68,0.08)' : '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '12px' }}>
                                        {Object.entries(modalDetalle.dato_anterior).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '12px' }}>
                                                <span style={{ color: s.textFaint, minWidth: '120px', fontWeight: '600' }}>{k}:</span>
                                                <span style={{ color: s.text, wordBreak: 'break-all' }}>{v === null ? 'null' : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {modalDetalle.dato_nuevo && (
                                <div>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Después</p>
                                    <div style={{ background: darkMode ? 'rgba(16,185,129,0.08)' : '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '12px' }}>
                                        {Object.entries(modalDetalle.dato_nuevo).map(([k, v]) => (
                                            <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '12px' }}>
                                                <span style={{ color: s.textFaint, minWidth: '120px', fontWeight: '600' }}>{k}:</span>
                                                <span style={{ color: s.text, wordBreak: 'break-all' }}>{v === null ? 'null' : String(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: '16px', padding: '10px 14px', background: s.surfaceLow, borderRadius: '8px', fontSize: '11px', color: s.textMuted, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{modalDetalle.usuario_nombre || 'Sistema'}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{new Date(modalDetalle.created_at).toLocaleString('es-PY', { timeZone: 'America/Asuncion' })}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>{modalDetalle.ip || '—'}</span>
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

export default Auditoria