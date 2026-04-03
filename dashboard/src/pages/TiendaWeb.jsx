import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useApp } from '../App'
import { formatMiles } from '../utils/formato'
import ModalConfirmar from '../components/ModalConfirmar'

// ─── Helpers ─────────────────────────────────────────────────
function Modal({ children, s, onClose, title, width = 520 }) {
    return (
        <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) onClose() }}
        >
            <div style={{ background: s.surface, borderRadius: '14px', padding: '24px', width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', color: s.text, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
                {title && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: s.text }}>{title}</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.textMuted, fontSize: '20px', lineHeight: 1 }}>×</button>
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}

function Toggle({ checked, onChange, disabled }) {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!checked)}
            disabled={disabled}
            style={{
                width: 40, height: 22, borderRadius: 11, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
                background: checked ? '#22c55e' : '#cbd5e1',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
            }}
            aria-checked={checked}
            role="switch"
        >
            <span style={{
                position: 'absolute', top: 3, left: checked ? 21 : 3,
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
        </button>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — PRODUCTOS
// ════════════════════════════════════════════════════════════════
function TabProductos({ s, inputStyle, labelStyle, btnPrimario, btnSecundario }) {
    const [productos, setProductos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [buscar, setBuscar] = useState('')
    const [editando, setEditando] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState('')

    const cargar = useCallback(async () => {
        setCargando(true)
        try {
            const { data } = await api.get('/ecommerce/admin/productos', { params: { buscar } })
            setProductos(data)
        } catch {
            setError('No se pudieron cargar los productos.')
        } finally {
            setCargando(false)
        }
    }, [buscar])

    useEffect(() => { cargar() }, [cargar])

    async function toggleCampo(prod, campo, valor) {
        const prev = [...productos]
        setProductos(p => p.map(x => x.presentacion_id === prod.presentacion_id ? { ...x, [campo]: valor } : x))
        try {
            await api.patch(`/ecommerce/admin/productos/${prod.presentacion_id}`, { [campo]: valor })
        } catch {
            setProductos(prev)
            setError('Error al actualizar.')
        }
    }

    function abrirEditar(prod) {
        setEditando(prod)
        setEditForm({ imagen_url: prod.imagen_url || '', es_novedad: prod.es_novedad, es_destacado: prod.es_destacado, disponible: prod.disponible })
    }

    async function guardarEditar() {
        setGuardando(true)
        try {
            await api.patch(`/ecommerce/admin/productos/${editando.presentacion_id}`, editForm)
            setProductos(p => p.map(x => x.presentacion_id === editando.presentacion_id
                ? { ...x, ...editForm }
                : x
            ))
            setEditando(null)
        } catch {
            setError('Error al guardar los cambios.')
        } finally {
            setGuardando(false)
        }
    }

    const thStyle = { padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: s.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', background: s.tableTh, borderBottom: `1px solid ${s.border}` }
    const tdStyle = { padding: '10px 14px', fontSize: '13px', borderBottom: `1px solid ${s.borderLight}`, verticalAlign: 'middle' }

    return (
        <div>
            {/* Buscador */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                <input
                    placeholder="Buscar producto o presentación..."
                    value={buscar}
                    onChange={e => setBuscar(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                />
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {cargando ? (
                <p style={{ color: s.textMuted, fontSize: 13 }}>Cargando productos...</p>
            ) : productos.length === 0 ? (
                <p style={{ color: s.textMuted, fontSize: 13 }}>No hay productos.</p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Imagen</th>
                                <th style={thStyle}>Producto</th>
                                <th style={thStyle}>Presentación</th>
                                <th style={thStyle}>Precio</th>
                                <th style={thStyle}>Stock</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Disponible</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Novedad</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Destacado</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(prod => (
                                <tr key={prod.presentacion_id} style={{ background: s.surface }}>
                                    <td style={tdStyle}>
                                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: s.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${s.border}` }}>
                                            {prod.imagen_url ? (
                                                <img src={prod.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 100 100" fill={s.textFaint}>
                                                    <ellipse cx="50" cy="65" rx="24" ry="20" />
                                                    <circle cx="22" cy="38" r="11" />
                                                    <circle cx="42" cy="26" r="11" />
                                                    <circle cx="62" cy="26" r="11" />
                                                    <circle cx="78" cy="38" r="11" />
                                                </svg>
                                            )}
                                        </div>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontWeight: 600, color: s.text }}>{prod.producto_nombre}</span>
                                        {prod.categoria_nombre && <span style={{ display: 'block', fontSize: 11, color: s.textMuted }}>{prod.categoria_nombre}</span>}
                                    </td>
                                    <td style={{ ...tdStyle, color: s.textMuted }}>{prod.presentacion_nombre}</td>
                                    <td style={{ ...tdStyle, fontWeight: 600, color: s.text }}>Gs. {formatMiles(prod.precio_venta)}</td>
                                    <td style={{ ...tdStyle, color: prod.stock <= 0 ? '#ef4444' : prod.stock <= 5 ? '#f59e0b' : '#22c55e', fontWeight: 600 }}>{prod.stock}</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <Toggle checked={prod.disponible} onChange={v => toggleCampo(prod, 'disponible', v)} />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <Toggle checked={prod.es_novedad} onChange={v => toggleCampo(prod, 'es_novedad', v)} />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                        <Toggle checked={prod.es_destacado} onChange={v => toggleCampo(prod, 'es_destacado', v)} />
                                    </td>
                                    <td style={tdStyle}>
                                        <button onClick={() => abrirEditar(prod)} style={{ ...btnSecundario, padding: '6px 12px', fontSize: 12 }}>
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal editar producto */}
            {editando && (
                <Modal s={s} onClose={() => setEditando(null)} title={`${editando.producto_nombre} — ${editando.presentacion_nombre}`}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={labelStyle}>URL de imagen</label>
                            <input
                                type="url"
                                placeholder="https://..."
                                value={editForm.imagen_url}
                                onChange={e => setEditForm(f => ({ ...f, imagen_url: e.target.value }))}
                                style={inputStyle}
                            />
                            {editForm.imagen_url && (
                                <img src={editForm.imagen_url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 4 }} onError={e => { e.target.style.display = 'none' }} />
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                            {[
                                { key: 'disponible', label: 'Disponible en tienda' },
                                { key: 'es_novedad', label: 'Marcar como novedad' },
                                { key: 'es_destacado', label: 'Producto destacado' },
                            ].map(({ key, label }) => (
                                <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: s.surfaceLow, border: `1px solid ${s.border}` }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: s.textMuted, textAlign: 'center' }}>{label}</span>
                                    <Toggle checked={editForm[key]} onChange={v => setEditForm(f => ({ ...f, [key]: v }))} />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button onClick={() => setEditando(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={guardarEditar} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.7 : 1 }}>
                                {guardando ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — BANNERS
// ════════════════════════════════════════════════════════════════
const BANNER_VACIO = { titulo: '', subtitulo: '', badge: '', cta_texto: '', cta_url: '', imagen_url: '', orden: 0, activo: true }

function TabBanners({ s, inputStyle, labelStyle, btnPrimario, btnSecundario }) {
    const [banners, setBanners] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState('')
    const [modal, setModal] = useState(null) // null | 'crear' | objeto (editar)
    const [form, setForm] = useState(BANNER_VACIO)
    const [guardando, setGuardando] = useState(false)
    const [confirmarEliminar, setConfirmarEliminar] = useState(null)

    async function cargar() {
        setCargando(true)
        try {
            const { data } = await api.get('/ecommerce/admin/banners')
            setBanners(data)
        } catch {
            setError('No se pudieron cargar los banners.')
        } finally {
            setCargando(false)
        }
    }
    useEffect(() => { cargar() }, [])

    function abrirCrear() {
        setForm(BANNER_VACIO)
        setModal('crear')
    }

    function abrirEditar(banner) {
        setForm({
            titulo: banner.titulo || '',
            subtitulo: banner.subtitulo || '',
            badge: banner.badge || '',
            cta_texto: banner.cta_texto || '',
            cta_url: banner.cta_url || '',
            imagen_url: banner.imagen_url || '',
            orden: banner.orden ?? 0,
            activo: banner.activo ?? true,
        })
        setModal(banner)
    }

    async function guardar() {
        if (!form.titulo.trim()) { setError('El título del banner es requerido.'); return }
        setGuardando(true)
        setError('')
        try {
            if (modal === 'crear') {
                const { data } = await api.post('/ecommerce/admin/banners', form)
                setBanners(b => [...b, data])
            } else {
                await api.patch(`/ecommerce/admin/banners/${modal.id}`, form)
                setBanners(b => b.map(x => x.id === modal.id ? { ...x, ...form } : x))
            }
            setModal(null)
        } catch {
            setError('Error al guardar el banner.')
        } finally {
            setGuardando(false)
        }
    }

    async function eliminar(id) {
        try {
            await api.delete(`/ecommerce/admin/banners/${id}`)
            setBanners(b => b.filter(x => x.id !== id))
            setConfirmarEliminar(null)
        } catch {
            setError('Error al eliminar el banner.')
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <button onClick={abrirCrear} style={btnPrimario}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Nuevo banner
                </button>
            </div>

            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {cargando ? (
                <p style={{ color: s.textMuted, fontSize: 13 }}>Cargando banners...</p>
            ) : banners.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: s.textMuted }}>
                    <p style={{ fontSize: 14 }}>No hay banners configurados.</p>
                    <p style={{ fontSize: 13 }}>Creá uno para que aparezca en la tienda.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {banners.map(banner => (
                        <div key={banner.id} style={{ background: s.surface, border: `1px solid ${s.border}`, borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 0 }}>
                            {/* Preview imagen */}
                            <div style={{ width: 120, minHeight: 80, background: s.surfaceLow, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                                {banner.imagen_url ? (
                                    <img src={banner.imagen_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={s.textFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700, fontSize: 14, color: s.text }}>{banner.titulo}</span>
                                    {banner.badge && <span style={{ fontSize: 10, fontWeight: 700, background: '#ffa601', color: 'white', borderRadius: 4, padding: '2px 6px' }}>{banner.badge}</span>}
                                    <span style={{ fontSize: 11, fontWeight: 600, color: banner.activo ? '#22c55e' : '#94a3b8', marginLeft: 'auto' }}>
                                        {banner.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                {banner.subtitulo && <p style={{ fontSize: 12, color: s.textMuted, margin: 0 }}>{banner.subtitulo}</p>}
                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                    {banner.cta_texto && <span style={{ fontSize: 11, color: s.textMuted }}>CTA: {banner.cta_texto}</span>}
                                    <span style={{ fontSize: 11, color: s.textFaint }}>Orden: {banner.orden}</span>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '12px', justifyContent: 'center' }}>
                                <button onClick={() => abrirEditar(banner)} style={{ ...btnSecundario, padding: '6px 12px', fontSize: 12 }}>Editar</button>
                                <button onClick={() => setConfirmarEliminar(banner)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', fontWeight: 500 }}>Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal crear/editar */}
            {modal !== null && (
                <Modal s={s} onClose={() => { setModal(null); setError('') }} title={modal === 'crear' ? 'Nuevo banner' : 'Editar banner'} width={560}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}

                        {[
                            { key: 'titulo', label: 'Título *', placeholder: 'Gran promoción de temporada' },
                            { key: 'subtitulo', label: 'Subtítulo', placeholder: 'Descripción breve' },
                            { key: 'badge', label: 'Badge (ej: NUEVO, -20%)', placeholder: 'NUEVO' },
                            { key: 'cta_texto', label: 'Texto del botón CTA', placeholder: 'Ver productos' },
                            { key: 'cta_url', label: 'URL del botón CTA', placeholder: '/categoria/perros' },
                            { key: 'imagen_url', label: 'URL de imagen', placeholder: 'https://...' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label style={labelStyle}>{label}</label>
                                <input
                                    value={form[key]}
                                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    style={{ ...inputStyle, marginBottom: 0 }}
                                />
                            </div>
                        ))}

                        {/* Preview imagen */}
                        {form.imagen_url && (
                            <img src={form.imagen_url} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} onError={e => { e.target.style.display = 'none' }} />
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={labelStyle}>Orden</label>
                                <input
                                    type="number"
                                    value={form.orden}
                                    onChange={e => setForm(f => ({ ...f, orden: parseInt(e.target.value) || 0 }))}
                                    style={{ ...inputStyle, marginBottom: 0 }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <label style={labelStyle}>Activo</label>
                                <Toggle checked={form.activo} onChange={v => setForm(f => ({ ...f, activo: v }))} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => { setModal(null); setError('') }} style={btnSecundario}>Cancelar</button>
                            <button onClick={guardar} disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.7 : 1 }}>
                                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear banner' : 'Guardar cambios'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {confirmarEliminar && (
                <ModalConfirmar
                    titulo="¿Eliminar banner?"
                    mensaje={`Se eliminará el banner "${confirmarEliminar.titulo}". Esta acción no se puede deshacer.`}
                    onConfirmar={() => eliminar(confirmarEliminar.id)}
                    onCancelar={() => setConfirmarEliminar(null)}
                />
            )}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// TAB — CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════
const CAMPOS_CONFIG = [
    { key: 'nombre_tienda',    label: 'Nombre de la tienda',     placeholder: 'Sosa Bulls',                     type: 'text' },
    { key: 'whatsapp',         label: 'Número de WhatsApp',      placeholder: '595981000000',                   type: 'text', hint: 'Sin espacios ni guiones. Ej: 595981000000' },
    { key: 'zona_cobertura',   label: 'Zona de cobertura',       placeholder: 'Asunción y Gran Asunción',       type: 'text' },
    { key: 'horario',          label: 'Horario de atención',     placeholder: 'Lun-Sab 8:00 - 18:00',          type: 'text' },
    { key: 'mensaje_retiro',   label: 'Mensaje WhatsApp (retiro)', placeholder: 'Hola, quiero retirar mi pedido en el local.', type: 'textarea' },
]

const TOGGLES_CONFIG = [
    { key: 'delivery_activo', label: 'Habilitar delivery' },
    { key: 'retiro_activo',   label: 'Habilitar retiro en local' },
]

function TabConfiguracion({ s, inputStyle, labelStyle, btnPrimario }) {
    const [config, setConfig] = useState({})
    const [cargando, setCargando] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [exito, setExito] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/ecommerce/admin/config')
            .then(({ data }) => {
                setConfig({
                    nombre_tienda: data.nombre_tienda || '',
                    whatsapp: data.whatsapp || '',
                    zona_cobertura: data.zona_cobertura || '',
                    horario: data.horario || '',
                    mensaje_retiro: data.mensaje_retiro || '',
                    delivery_activo: data.delivery_activo !== 'false',
                    retiro_activo: data.retiro_activo !== 'false',
                })
            })
            .catch(() => setError('No se pudo cargar la configuración.'))
            .finally(() => setCargando(false))
    }, [])

    async function guardar(e) {
        e.preventDefault()
        setGuardando(true)
        setError('')
        setExito(false)
        try {
            await api.put('/ecommerce/admin/config', {
                ...config,
                delivery_activo: String(config.delivery_activo),
                retiro_activo: String(config.retiro_activo),
            })
            setExito(true)
            setTimeout(() => setExito(false), 3000)
        } catch {
            setError('Error al guardar la configuración.')
        } finally {
            setGuardando(false)
        }
    }

    if (cargando) return <p style={{ color: s.textMuted, fontSize: 13 }}>Cargando configuración...</p>

    return (
        <form onSubmit={guardar} style={{ maxWidth: 560 }}>
            {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            {exito && <p style={{ color: '#22c55e', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Configuración guardada correctamente.</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {CAMPOS_CONFIG.map(({ key, label, placeholder, type, hint }) => (
                    <div key={key}>
                        <label style={labelStyle}>{label}</label>
                        {type === 'textarea' ? (
                            <textarea
                                value={config[key] || ''}
                                onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                                placeholder={placeholder}
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }}
                            />
                        ) : (
                            <input
                                value={config[key] || ''}
                                onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                                placeholder={placeholder}
                                style={{ ...inputStyle, marginBottom: 0 }}
                            />
                        )}
                        {hint && <p style={{ fontSize: 11, color: s.textMuted, marginTop: 4 }}>{hint}</p>}
                    </div>
                ))}

                <div style={{ display: 'flex', gap: 16 }}>
                    {TOGGLES_CONFIG.map(({ key, label }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 8, background: s.surfaceLow, border: `1px solid ${s.border}`, flex: 1 }}>
                            <Toggle checked={config[key] !== false && config[key] !== 'false'} onChange={v => setConfig(c => ({ ...c, [key]: v }))} />
                            <span style={{ fontSize: 13, fontWeight: 600, color: s.text }}>{label}</span>
                        </div>
                    ))}
                </div>

                <div>
                    <button type="submit" disabled={guardando} style={{ ...btnPrimario, opacity: guardando ? 0.7 : 1 }}>
                        {guardando ? 'Guardando...' : 'Guardar configuración'}
                    </button>
                </div>
            </div>
        </form>
    )
}

// ════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — TIENDA WEB
// ════════════════════════════════════════════════════════════════
const TABS = [
    { key: 'productos',     label: 'Productos' },
    { key: 'banners',       label: 'Banners' },
    { key: 'configuracion', label: 'Configuración' },
]

function TiendaWeb() {
    const { darkMode } = useApp()
    const [tab, setTab] = useState('productos')

    const s = {
        bg:          darkMode ? '#0f172a' : '#f6f6f8',
        surface:     darkMode ? '#1e293b' : 'white',
        surfaceLow:  darkMode ? '#1a2536' : '#f8fafc',
        border:      darkMode ? '#334155' : 'rgba(26,26,127,0.08)',
        borderLight: darkMode ? '#2d3f55' : 'rgba(26,26,127,0.04)',
        text:        darkMode ? '#f1f5f9' : '#0f172a',
        textMuted:   darkMode ? '#94a3b8' : '#64748b',
        textFaint:   darkMode ? '#64748b' : '#94a3b8',
        inputBg:     darkMode ? '#0f172a' : '#f8fafc',
        tableTh:     darkMode ? '#1a2536' : 'rgba(26,26,127,0.02)',
    }

    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: 8,
        border: `1px solid ${s.border}`, fontSize: 13, boxSizing: 'border-box',
        background: s.inputBg, color: s.text, marginBottom: 10,
    }
    const labelStyle = {
        fontSize: 11, fontWeight: 700, color: s.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'block', marginBottom: 6,
    }
    const btnPrimario = {
        padding: '10px 18px', borderRadius: 8, border: 'none',
        background: '#1a1a2e', color: 'white', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
    }
    const btnSecundario = {
        padding: '10px 18px', borderRadius: 8,
        border: `1px solid ${s.border}`, background: s.surface,
        color: s.text, cursor: 'pointer', fontSize: 13, fontWeight: 500,
    }

    const sharedProps = { s, inputStyle, labelStyle, btnPrimario, btnSecundario }

    return (
        <div style={{ padding: '24px', background: s.bg, minHeight: '100%', color: s.text }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: s.text }}>Tienda Web</h1>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: s.textMuted }}>Gestioná productos, banners y configuración de tu tienda online.</p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: s.surface, borderRadius: 10, padding: 4, border: `1px solid ${s.border}`, width: 'fit-content' }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                            background: tab === t.key ? '#1a1a2e' : 'transparent',
                            color: tab === t.key ? 'white' : s.textMuted,
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div style={{ background: s.surface, borderRadius: 12, padding: 24, border: `1px solid ${s.border}` }}>
                {tab === 'productos'     && <TabProductos     {...sharedProps} />}
                {tab === 'banners'       && <TabBanners       {...sharedProps} />}
                {tab === 'configuracion' && <TabConfiguracion {...sharedProps} />}
            </div>
        </div>
    )
}

export default TiendaWeb
