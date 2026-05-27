import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/utils/formatPrice'
import { getDeliveryPrefs, saveDeliveryPrefs } from '@/utils/deliveryPrefs'
import api from '@/services/api'

// ─── Iconos ──────────────────────────────────────────────────────
function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const icons = {
  user:     'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  paw:      'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  home:     'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  receipt:  'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1z M9 9h6 M9 13h6 M9 17h4',
  package:  'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7v6 M9 10h6',
  plus:     'M12 5v14 M5 12h14',
  edit:     'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  trash:    'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  x:        'M18 6 6 18 M6 6l12 12',
  chevron:  'M9 18l6-6-6-6',
  logout:   'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  map:      'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  truck:    'M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 18.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  dog:      'M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5 M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5 M8 14v.5 M16 14v.5 M11.25 16.25h1.5L12 17l-.75-.75z M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309',
}

// ─── Helpers ──────────────────────────────────────────────────────
function initials(str = '') {
  const parts = str.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function Avatar({ name, size = 48 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 700, fontSize: size * 0.35,
        fontFamily: 'Poppins, sans-serif', flexShrink: 0,
        boxShadow: '0 4px 16px var(--brand-glow)',
      }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  )
}

const ESTADO_STYLES = {
  pendiente:  { color: '#b45309', bg: '#fef3c7', label: 'Pendiente' },
  confirmado: { color: '#1d4ed8', bg: '#dbeafe', label: 'Confirmado' },
  en_camino:  { color: '#7c3aed', bg: '#ede9fe', label: 'En camino' },
  entregado:  { color: '#15803d', bg: '#dcfce7', label: 'Entregado' },
  cancelado:  { color: '#dc2626', bg: '#fee2e2', label: 'Cancelado' },
}
function EstadoBadge({ estado }) {
  const s = ESTADO_STYLES[estado] || ESTADO_STYLES.pendiente
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="card-base" style={{ width: '100%', maxWidth: wide ? 560 : 440, maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, lineHeight: 0 }} aria-label="Cerrar">
            <Icon d={icons.x} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-base" {...rest} />
  )
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="input-base" style={{ cursor: 'pointer' }}>
      {children}
    </select>
  )
}

function ModalActions({ onClose, onSubmit, submitLabel = 'Guardar', loading = false }) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
      <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        Cancelar
      </button>
      <button
        onClick={onSubmit} disabled={loading}
        style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? 'Guardando...' : submitLabel}
      </button>
    </div>
  )
}

function ErrorInline({ msg }) {
  if (!msg) return null
  return (
    <p style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 8, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }} role="alert">
      {msg}
    </p>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Datos personales
// ════════════════════════════════════════════════════════════════
function SeccionDatos({ user, actualizarUsuario }) {
  const [form, setForm]         = useState({ nombre: user?.nombre || '', telefono: '' })
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState(null)
  const [showPassForm, setShowPassForm] = useState(false)

  useEffect(() => {
    api.get('/api/ecommerce/me')
      .then(({ data }) => setForm({ nombre: data.nombre || '', telefono: data.telefono || '' }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.patch('/api/ecommerce/mis-datos', { nombre: form.nombre, telefono: form.telefono })
      actualizarUsuario({ nombre: form.nombre })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Datos personales</h2>
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
          <Field label="Nombre completo">
            <Input value={form.nombre} onChange={v => setForm(p => ({ ...p, nombre: v }))} placeholder="Tu nombre" />
          </Field>
          <Field label="Telefono / WhatsApp">
            <Input value={form.telefono} onChange={v => setForm(p => ({ ...p, telefono: v }))} placeholder="0981 000 000" type="tel" />
          </Field>
        </div>
        <ErrorInline msg={error} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
          {saved && <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>Guardado</span>}
        </div>
      </form>

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Email de la cuenta
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-text)', background: 'var(--color-bg)', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '11px 14px' }}>
          {user?.email}
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 6 }}>
          Para cambiar el email contacta a soporte.
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Mascotas
// ════════════════════════════════════════════════════════════════
const MASCOTA_EMPTY = { nombre: '', especie: 'perro', raza: '', peso_kg: '', fecha_nacimiento: '', notas: '' }

function SeccionMascotas() {
  const [mascotas, setMascotas] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(MASCOTA_EMPTY)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/api/ecommerce/mascotas')
      .then(({ data }) => setMascotas(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function openNueva() { setForm(MASCOTA_EMPTY); setError(null); setModal('nueva') }
  function openEditar(m) { setForm({ ...m, peso_kg: m.peso_kg ?? '', fecha_nacimiento: m.fecha_nacimiento?.slice(0, 10) || '' }); setError(null); setModal(m) }

  async function handleSave() {
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    setSaving(true); setError(null)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        especie: form.especie,
        raza: form.raza || null,
        peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        notas: form.notas || null,
      }
      if (modal === 'nueva') {
        const { data } = await api.post('/api/ecommerce/mascotas', payload)
        setMascotas(prev => [...prev, data])
      } else {
        const { data } = await api.patch(`/api/ecommerce/mascotas/${modal.id}`, payload)
        setMascotas(prev => prev.map(m => m.id === modal.id ? data : m))
      }
      setModal(null)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/ecommerce/mascotas/${id}`)
      setMascotas(prev => prev.filter(m => m.id !== id))
      setConfirmDelete(null)
    } catch {}
  }

  const f = key => val => setForm(prev => ({ ...prev, [key]: val }))

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Mis mascotas</h2>
        <button onClick={openNueva} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, gap: 6 }}>
          <Icon d={icons.plus} size={14} /> Agregar
        </button>
      </div>

      {mascotas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--color-primary)', opacity: 0.5 }}><Icon d={icons.paw} size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Todavia no registraste mascotas</p>
          <p style={{ fontSize: 13 }}>Agregalas para recibir recomendaciones personalizadas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {mascotas.map(m => (
            <div key={m.id} className="card-base" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}>
                <Icon d={m.especie === 'perro' ? icons.dog : icons.paw} size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{m.nombre}</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {[m.raza, m.peso_kg && `${m.peso_kg} kg`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openEditar(m)} style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} aria-label="Editar">
                  <Icon d={icons.edit} size={14} />
                </button>
                <button onClick={() => setConfirmDelete(m)} style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid rgba(220,38,38,0.20)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }} aria-label="Eliminar">
                  <Icon d={icons.trash} size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva mascota' : 'Editar mascota'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Nombre *"><Input value={form.nombre} onChange={f('nombre')} placeholder="Nombre de tu mascota" /></Field>
            <Field label="Especie">
              <Select value={form.especie} onChange={f('especie')}>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
            <Field label="Raza"><Input value={form.raza} onChange={f('raza')} placeholder="Ej: Labrador" /></Field>
            <Field label="Peso (kg)"><Input value={form.peso_kg} onChange={f('peso_kg')} placeholder="0.0" type="number" step="0.1" min="0" /></Field>
            <Field label="Fecha de nacimiento"><Input value={form.fecha_nacimiento} onChange={f('fecha_nacimiento')} type="date" /></Field>
          </div>
          <Field label="Notas">
            <textarea value={form.notas} onChange={e => f('notas')(e.target.value)} placeholder="Alergias, preferencias..." className="input-base" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </Field>
          <ErrorInline msg={error} />
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} loading={saving} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar mascota" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Estas por eliminar a <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.nombre}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Direcciones
// ════════════════════════════════════════════════════════════════
const DIR_EMPTY = { alias: 'Casa', calle: '', ciudad: 'Asuncion', barrio: '', referencia: '', es_principal: false }

function SeccionDirecciones() {
  const [direcciones, setDirecciones] = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState(DIR_EMPTY)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/api/ecommerce/direcciones')
      .then(({ data }) => setDirecciones(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function openNueva() { setForm(DIR_EMPTY); setError(null); setModal('nueva') }
  function openEditar(d) { setForm({ ...d }); setError(null); setModal(d) }

  async function handleSave() {
    if (!form.calle.trim()) return setError('La calle es requerida')
    setSaving(true); setError(null)
    try {
      const payload = { alias: form.alias, calle: form.calle.trim(), ciudad: form.ciudad, barrio: form.barrio || null, referencia: form.referencia || null, es_principal: form.es_principal }
      if (modal === 'nueva') {
        const { data } = await api.post('/api/ecommerce/direcciones', payload)
        if (payload.es_principal) {
          setDirecciones(prev => prev.map(d => ({ ...d, es_principal: false })).concat([data]))
        } else {
          setDirecciones(prev => [...prev, data])
        }
      } else {
        const { data } = await api.patch(`/api/ecommerce/direcciones/${modal.id}`, payload)
        if (payload.es_principal) {
          setDirecciones(prev => prev.map(d => d.id === modal.id ? data : { ...d, es_principal: false }))
        } else {
          setDirecciones(prev => prev.map(d => d.id === modal.id ? data : d))
        }
      }
      setModal(null)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function marcarPrincipal(id) {
    try {
      await api.patch(`/api/ecommerce/direcciones/${id}`, { es_principal: true })
      setDirecciones(prev => prev.map(d => ({ ...d, es_principal: d.id === id })))
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/ecommerce/direcciones/${id}`)
      setDirecciones(prev => prev.filter(d => d.id !== id))
      setConfirmDelete(null)
    } catch {}
  }

  const f = key => val => setForm(prev => ({ ...prev, [key]: val }))

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Mis direcciones</h2>
        <button onClick={openNueva} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, gap: 6 }}>
          <Icon d={icons.plus} size={14} /> Agregar
        </button>
      </div>

      {direcciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--color-primary)', opacity: 0.5 }}><Icon d={icons.map} size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Sin direcciones guardadas</p>
          <p style={{ fontSize: 13 }}>Agrega una para agilizar el checkout</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {direcciones.map(d => (
            <div key={d.id} className="card-base" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: d.es_principal ? 'var(--color-primary)' : 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: d.es_principal ? 'white' : 'var(--color-primary)' }}>
                <Icon d={icons.home} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{d.alias}</span>
                  {d.es_principal && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-primary)', color: 'white' }}>Principal</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  {d.calle}{d.barrio ? `, ${d.barrio}` : ''}, {d.ciudad}
                </p>
                {d.referencia && <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{d.referencia}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {!d.es_principal && (
                  <button onClick={() => marcarPrincipal(d.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Principal
                  </button>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditar(d)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} aria-label="Editar"><Icon d={icons.edit} size={13} /></button>
                  <button onClick={() => setConfirmDelete(d)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid rgba(220,38,38,0.20)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }} aria-label="Eliminar"><Icon d={icons.trash} size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva direccion' : 'Editar direccion'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Alias"><Input value={form.alias} onChange={f('alias')} placeholder="Casa" /></Field>
            <Field label="Ciudad"><Input value={form.ciudad} onChange={f('ciudad')} placeholder="Asuncion" /></Field>
          </div>
          <Field label="Calle y numero *"><Input value={form.calle} onChange={f('calle')} placeholder="Av. Eusebio Ayala 1234" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Barrio"><Input value={form.barrio} onChange={f('barrio')} placeholder="Mcal. Lopez" /></Field>
            <Field label="Referencia"><Input value={form.referencia} onChange={f('referencia')} placeholder="Frente al supermercado" /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.es_principal} onChange={e => f('es_principal')(e.target.checked)} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Marcar como principal</span>
          </label>
          <ErrorInline msg={error} />
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} loading={saving} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar direccion" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Estas por eliminar <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.alias}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Fichas de facturacion
// ════════════════════════════════════════════════════════════════
const FICHA_EMPTY = { alias: '', nombre: '', ruc: '', telefono: '', email: '', es_principal: false }

function SeccionFacturacion() {
  const [fichas, setFichas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(FICHA_EMPTY)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const cargar = useCallback(() => {
    setLoading(true)
    api.get('/api/ecommerce/fichas-facturacion')
      .then(({ data }) => setFichas(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function openNueva() { setForm(FICHA_EMPTY); setError(null); setModal('nueva') }
  function openEditar(fi) { setForm({ ...fi }); setError(null); setModal(fi) }

  async function handleSave() {
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    setSaving(true); setError(null)
    try {
      const payload = { alias: form.alias || null, nombre: form.nombre.trim(), ruc: form.ruc || null, telefono: form.telefono || null, email: form.email || null, es_principal: form.es_principal }
      if (modal === 'nueva') {
        const { data } = await api.post('/api/ecommerce/fichas-facturacion', payload)
        if (payload.es_principal) {
          setFichas(prev => prev.map(fi => ({ ...fi, es_principal: false })).concat([data]))
        } else {
          setFichas(prev => [...prev, data])
        }
      } else {
        const { data } = await api.patch(`/api/ecommerce/fichas-facturacion/${modal.id}`, payload)
        if (payload.es_principal) {
          setFichas(prev => prev.map(fi => fi.id === modal.id ? data : { ...fi, es_principal: false }))
        } else {
          setFichas(prev => prev.map(fi => fi.id === modal.id ? data : fi))
        }
      }
      setModal(null)
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function marcarPrincipal(id) {
    try {
      await api.patch(`/api/ecommerce/fichas-facturacion/${id}`, { es_principal: true })
      setFichas(prev => prev.map(fi => ({ ...fi, es_principal: fi.id === id })))
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/ecommerce/fichas-facturacion/${id}`)
      setFichas(prev => prev.filter(fi => fi.id !== id))
      setConfirmDelete(null)
    } catch {}
  }

  const ff = key => val => setForm(prev => ({ ...prev, [key]: val }))

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Datos de facturacion</h2>
        <button onClick={openNueva} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, gap: 6 }}>
          <Icon d={icons.plus} size={14} /> Agregar
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Podes guardar varias fichas — nombre y RUC pueden ser de otra persona o empresa.
      </p>

      {fichas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--color-primary)', opacity: 0.5 }}><Icon d={icons.receipt} size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Sin fichas de facturacion</p>
          <p style={{ fontSize: 13 }}>Agrega una para agilizar el checkout</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {fichas.map(fi => (
            <div key={fi.id} className="card-base" style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: fi.es_principal ? 'var(--color-primary)' : 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: fi.es_principal ? 'white' : 'var(--color-primary)' }}>
                <Icon d={icons.receipt} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{fi.alias || fi.nombre}</span>
                  {fi.es_principal && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-primary)', color: 'white' }}>Principal</span>}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>{fi.nombre}</p>
                {fi.ruc && <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>RUC: {fi.ruc}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {!fi.es_principal && (
                  <button onClick={() => marcarPrincipal(fi.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Principal
                  </button>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditar(fi)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} aria-label="Editar"><Icon d={icons.edit} size={13} /></button>
                  <button onClick={() => setConfirmDelete(fi)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid rgba(220,38,38,0.20)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }} aria-label="Eliminar"><Icon d={icons.trash} size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva ficha' : 'Editar ficha'} onClose={() => setModal(null)} wide>
          <Field label="Alias (ej: Mi cuenta, Papa, Empresa X)"><Input value={form.alias} onChange={ff('alias')} placeholder="Mi cuenta" /></Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Nombre / Razon social *"><Input value={form.nombre} onChange={ff('nombre')} placeholder="Juan Perez" /></Field>
            <Field label="RUC"><Input value={form.ruc} onChange={ff('ruc')} placeholder="1234567-8" /></Field>
            <Field label="Telefono"><Input value={form.telefono} onChange={ff('telefono')} placeholder="0981 000 000" type="tel" /></Field>
            <Field label="Email"><Input value={form.email} onChange={ff('email')} placeholder="factura@empresa.com" type="email" /></Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.es_principal} onChange={e => ff('es_principal')(e.target.checked)} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Marcar como principal</span>
          </label>
          <ErrorInline msg={error} />
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} loading={saving} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar ficha" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Estas por eliminar <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.alias || confirmDelete.nombre}</strong>.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Eliminar</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Historial de pedidos
// ════════════════════════════════════════════════════════════════
function SeccionPedidos() {
  const [pedidos, setPedidos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [detalle, setDetalle]   = useState(null)

  useEffect(() => {
    api.get('/api/ecommerce/mis-pedidos')
      .then(({ data }) => setPedidos(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando pedidos...</div>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Mis pedidos</h2>

      {pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--color-primary)', opacity: 0.5 }}><Icon d={icons.package} size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Todavia no tenes pedidos</p>
          <p style={{ fontSize: 13 }}>Explora nuestros productos y hace tu primera compra</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {pedidos.map(p => (
            <button key={p.id} onClick={() => setDetalle(p)}
              className="card-hover"
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.92)' }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}>
                <Icon d={icons.package} size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 14 }}>{p.numero}</span>
                  <EstadoBadge estado={p.estado} />
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  {new Date(p.fecha).toLocaleDateString('es-PY', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {' · '}{p.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 15 }}>{formatPrice(p.total)}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>
                  {p.items?.length || 0} producto{(p.items?.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <span style={{ color: 'var(--color-text-faint)', marginLeft: 4 }}><Icon d={icons.chevron} size={16} /></span>
            </button>
          ))}
        </div>
      )}

      {detalle && (
        <Modal title={`Pedido ${detalle.numero}`} onClose={() => setDetalle(null)} wide>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <EstadoBadge estado={detalle.estado} />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {new Date(detalle.fecha).toLocaleDateString('es-PY', { year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}{detalle.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}
            </span>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '12px 0', marginBottom: 16 }}>
            {(detalle.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < detalle.items.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 }}>{item.nombre}</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>x{item.cantidad} · {formatPrice(item.precio)} c/u</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{formatPrice(item.precio * item.cantidad)}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-primary)' }}>{formatPrice(detalle.total)}</span>
          </div>
          {detalle.notas && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8 }}>
              Notas: {detalle.notas}
            </p>
          )}
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SECCION: Entrega
// ════════════════════════════════════════════════════════════════
const WaSvgSmall = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
)

const ENTREGA_EMPTY = {
  tipo_entrega: 'delivery',
  nombre: '', telefono: '',
  zona_id: '', zona_nombre: '',
  direccion: '', maps_url: '',
  referencia: '', horario: '', contacto_entrega: '',
  metodo_pago: '',
  quiere_factura: false, razon_social: '', ruc_factura: '',
}

function SeccionEntrega({ user }) {
  const [form, setForm]       = useState({ ...ENTREGA_EMPTY, nombre: user?.nombre || '' })
  const [zonas, setZonas]     = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)

  useEffect(() => {
    api.get('/api/ecommerce/zonas').then(r => setZonas(r.data)).catch(() => {})

    const prefs = getDeliveryPrefs(user?.id)
    if (prefs) {
      setForm(f => ({ ...f, ...prefs }))
      setLoading(false)
    } else {
      api.get('/api/ecommerce/ultimo-pedido-datos')
        .then(({ data }) => {
          if (data) setForm(f => ({ ...f, ...data }))
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [user?.id])

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
    setError(null)
  }

  function isMapsUrl(val) {
    return /maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/.test(val || '')
  }

  function handleChange(e) {
    const { name, value } = e.target
    const update = { [name]: value }
    if (name === 'direccion' && isMapsUrl(value)) update.maps_url = value.trim()
    if (name === 'zona_id') {
      const zona = zonas.find(z => String(z.id) === String(value))
      update.zona_nombre = zona?.nombre || ''
    }
    setForm(f => ({ ...f, ...update }))
    setError(null)
  }

  async function usarGPS() {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      )
      const { latitude: lat, longitude: lng } = pos.coords
      const mapsLink = `https://maps.google.com/?q=${lat},${lng}`
      let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
          { headers: { 'Accept-Language': 'es' } }
        )
        const data = await r.json()
        if (data.display_name) address = data.display_name
      } catch (_) {}
      setForm(f => ({ ...f, direccion: address, maps_url: mapsLink }))
    } catch (_) {
    } finally {
      setGpsLoading(false)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    setSaving(true)
    setError(null)
    try {
      saveDeliveryPrefs(user?.id, form)
      if (form.nombre.trim() || form.telefono.trim()) {
        await api.patch('/api/ecommerce/mis-datos', {
          nombre: form.nombre.trim() || undefined,
          telefono: form.telefono.trim() || undefined,
        }).catch(() => {})
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function buildWhatsAppUrl() {
    const lineas = [
      'Hola Sosa BULLS! Quiero hacer un pedido.',
      '',
      '*Mis datos de entrega:*',
      `• Nombre: ${form.nombre}`,
      `• Telefono: ${form.telefono}`,
    ]
    if (form.tipo_entrega === 'delivery') {
      if (form.zona_nombre) lineas.push(`• Zona: ${form.zona_nombre}`)
      if (form.direccion)   lineas.push(`• Direccion: ${form.direccion}`)
      if (form.referencia)  lineas.push(`• Referencia: ${form.referencia}`)
      if (form.horario)     lineas.push(`• Horario: ${form.horario}`)
      if (form.contacto_entrega) lineas.push(`• Recibe: ${form.contacto_entrega}`)
      if (form.metodo_pago) lineas.push(`• Pago: ${form.metodo_pago === 'efectivo' ? 'Efectivo' : 'Transferencia'}`)
    } else {
      lineas.push('• Retiro en local')
    }
    if (form.quiere_factura && form.razon_social) {
      lineas.push(`• Factura: ${form.razon_social}${form.ruc_factura ? ' / RUC ' + form.ruc_factura : ''}`)
    }
    lineas.push('')
    lineas.push('*Quiero pedir:*')
    lineas.push('• (completar aqui)')
    const msg = encodeURIComponent(lineas.join('\n'))
    return `https://wa.me/595982211934?text=${msg}`
  }

  const esDelivery = form.tipo_entrega === 'delivery'
  const canWhatsapp = form.nombre.trim() && form.telefono.trim()

  if (loading) return <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Cargando...</div>

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Datos de entrega</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Guarda tus datos para que el formulario de compra se complete automaticamente.
      </p>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
          <Field label="Nombre completo">
            <Input name="nombre" value={form.nombre} onChange={v => set('nombre', v)} placeholder="Juan Perez" />
          </Field>
          <Field label="Telefono / WhatsApp">
            <Input name="telefono" value={form.telefono} onChange={v => set('telefono', v)} placeholder="0981 000 000" type="tel" />
          </Field>
        </div>

        <Field label="Tipo de entrega">
          <div style={{ display: 'flex', gap: 10 }}>
            {[{ v: 'delivery', l: 'Delivery' }, { v: 'retiro', l: 'Retiro en local' }].map(opt => (
              <button key={opt.v} type="button"
                onClick={() => set('tipo_entrega', opt.v)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)', border: '1.5px solid',
                  borderColor: form.tipo_entrega === opt.v ? 'var(--color-primary)' : 'var(--color-border)',
                  background: form.tipo_entrega === opt.v ? 'var(--color-primary-light)' : 'white',
                  color: form.tipo_entrega === opt.v ? 'var(--color-primary-darker)' : 'var(--color-text-muted)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >{opt.l}</button>
            ))}
          </div>
        </Field>

        {esDelivery && (
          <>
            <Field label="Zona de entrega">
              <select name="zona_id" value={form.zona_id} onChange={handleChange} className="input-base" style={{ cursor: 'pointer' }}>
                <option value="">Seleccionar zona...</option>
                {zonas.map(z => (
                  <option key={z.id} value={z.id}>{z.nombre} — Gs. {Number(z.costo).toLocaleString('es-PY')}</option>
                ))}
              </select>
            </Field>

            <Field label="Direccion">
              <div style={{ position: 'relative' }}>
                <input
                  name="direccion" type="text" value={form.direccion}
                  onChange={handleChange}
                  placeholder="Calle o link de Google Maps"
                  className="input-base" style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={usarGPS} disabled={gpsLoading}
                  title="Usar mi ubicacion GPS"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: gpsLoading ? 'wait' : 'pointer', color: form.maps_url ? 'var(--color-primary)' : 'var(--color-text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
                >
                  {gpsLoading
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="9" strokeDasharray="4 2"/></svg>
                  }
                </button>
              </div>
              {form.maps_url && !isMapsUrl(form.direccion) && (
                <p style={{ fontSize: 12, color: 'var(--color-primary)', marginTop: 4 }}>Ubicacion GPS capturada</p>
              )}
            </Field>

            <Field label="Referencia / Numero de casa">
              <Input name="referencia" value={form.referencia} onChange={v => set('referencia', v)} placeholder="Casa verde, reja negra..." />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              <Field label="Horario preferido">
                <Input name="horario" value={form.horario} onChange={v => set('horario', v)} placeholder="Tarde, 14:00 a 18:00" />
              </Field>
              <Field label="Nombre y telefono de quien recibe">
                <Input name="contacto_entrega" value={form.contacto_entrega} onChange={v => set('contacto_entrega', v)} placeholder="Juan Perez 0981 000 000" />
              </Field>
            </div>

            <Field label="Metodo de pago preferido">
              <div style={{ display: 'flex', gap: 10 }}>
                {[{ v: 'efectivo', l: 'Efectivo' }, { v: 'transferencia', l: 'Transferencia' }].map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => set('metodo_pago', opt.v)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)', border: '1.5px solid',
                      borderColor: form.metodo_pago === opt.v ? 'var(--color-primary)' : 'var(--color-border)',
                      background: form.metodo_pago === opt.v ? 'var(--color-primary-light)' : 'white',
                      color: form.metodo_pago === opt.v ? 'var(--color-primary-darker)' : 'var(--color-text-muted)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    }}
                  >{opt.l}</button>
                ))}
              </div>
            </Field>
          </>
        )}

        <div style={{ marginBottom: 14 }}>
          <button type="button"
            onClick={() => set('quiere_factura', !form.quiere_factura)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1.5px solid', cursor: 'pointer', width: '100%', textAlign: 'left', background: form.quiere_factura ? 'var(--color-primary-light)' : 'white', borderColor: form.quiere_factura ? 'var(--color-primary)' : 'var(--color-border)' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderColor: form.quiere_factura ? 'var(--color-primary)' : 'var(--color-border)', background: form.quiere_factura ? 'var(--color-primary)' : 'white' }}>
              {form.quiere_factura && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: form.quiere_factura ? 'var(--color-primary-darker)' : 'var(--color-text)' }}>Necesito factura</span>
          </button>
          {form.quiere_factura && (
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px' }}>
              <Field label="Razon social">
                <Input name="razon_social" value={form.razon_social} onChange={v => set('razon_social', v)} placeholder="Juan Perez o Empresa S.A." />
              </Field>
              <Field label="RUC / Cedula">
                <Input name="ruc_factura" value={form.ruc_factura} onChange={v => set('ruc_factura', v)} placeholder="4.178.154-4" />
              </Field>
            </div>
          )}
        </div>

        <ErrorInline msg={error} />

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 8 }}>
          <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar datos'}
          </button>
          {saved && <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>Guardado</span>}
        </div>
      </form>

      {canWhatsapp && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border)' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Abre WhatsApp con tus datos ya cargados — solo agrega los productos que queres pedir.
          </p>
          <a
            href={buildWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-sm)', background: '#25D366', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}
          >
            <WaSvgSmall />
            Enviar pedido por WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'datos',       label: 'Mis datos',     icon: icons.user },
  { id: 'entrega',     label: 'Entrega',        icon: icons.truck },
  { id: 'mascotas',    label: 'Mis mascotas',  icon: icons.dog },
  { id: 'direcciones', label: 'Direcciones',   icon: icons.map },
  { id: 'facturacion', label: 'Facturacion',   icon: icons.receipt },
  { id: 'pedidos',     label: 'Mis pedidos',   icon: icons.package },
]

// ════════════════════════════════════════════════════════════════
// PAGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function Perfil() {
  const { user, signOut, actualizarUsuario } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('datos')

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const nombre = user?.nombre || user?.email?.split('@')[0] || 'Usuario'

  return (
    <>
      <SEOHead title="Mi perfil" description="Gestioná tus datos, mascotas, direcciones y pedidos." noindex />

      <div className="container-base section-padding" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header */}
        <div className="card-base" style={{ padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar name={nombre} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>{nombre}</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</p>
          </div>
          <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            <Icon d={icons.logout} size={14} />
            Cerrar sesion
          </button>
        </div>

        {/* Tab bar — siempre visible */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 16, paddingBottom: 4 }}>
          <div style={{ display: 'flex', gap: 8, width: 'max-content', minWidth: '100%' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 20, border: tab === t.id ? 'none' : '1.5px solid var(--color-border)', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600, background: tab === t.id ? 'var(--color-primary)' : 'white', color: tab === t.id ? 'white' : 'var(--color-text-muted)', transition: 'all 0.15s', flexShrink: 0 }}
              >
                <Icon d={t.icon} size={15} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="card-base" style={{ padding: '28px 24px' }}>
          {tab === 'datos'       && <SeccionDatos user={user} actualizarUsuario={actualizarUsuario} />}
          {tab === 'entrega'     && <SeccionEntrega user={user} />}
          {tab === 'mascotas'    && <SeccionMascotas />}
          {tab === 'direcciones' && <SeccionDirecciones />}
          {tab === 'facturacion' && <SeccionFacturacion />}
          {tab === 'pedidos'     && <SeccionPedidos />}
        </div>
      </div>
    </>
  )
}
