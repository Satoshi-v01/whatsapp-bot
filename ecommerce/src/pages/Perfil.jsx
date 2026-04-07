import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice } from '@/utils/formatPrice'

// ─── Iconos ──────────────────────────────────────────────────
function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
const icons = {
  user:      'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  paw:       'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12',
  home:      'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  receipt:   'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1z M9 9h6 M9 13h6 M9 17h4',
  package:   'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7v6 M9 10h6',
  plus:      'M12 5v14 M5 12h14',
  edit:      'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  trash:     'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  star:      'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  check:     'M20 6 9 17l-5-5',
  x:         'M18 6 6 18 M6 6l12 12',
  chevron:   'M9 18l6-6-6-6',
  logout:    'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  lock:      'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4',
  eye:       'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  map:       'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  dog:       'M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5 M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5 M8 14v.5 M16 14v.5 M11.25 16.25h1.5L12 17l-.75-.75z M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309',
}

// ─── Helpers ─────────────────────────────────────────────────
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

// ─── Badge de estado pedido ───────────────────────────────────
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

// ─── Modal generico ───────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(26,18,8,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="card-base"
        style={{ width: '100%', maxWidth: wide ? 560 : 440, maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px' }}
      >
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
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input-base"
      {...rest}
    />
  )
}

function Select({ value, onChange, children }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="input-base"
      style={{ cursor: 'pointer' }}
    >
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
        onClick={onSubmit}
        disabled={loading}
        style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
      >
        {submitLabel}
      </button>
    </div>
  )
}

// ─── Datos mock iniciales ─────────────────────────────────────
const MOCK_MASCOTAS = [
  { id: 1, nombre: 'Rocky', especie: 'perro', raza: 'Bulldog Frances', peso_kg: '12', fecha_nacimiento: '2021-06-10', notas: 'Le encanta el pollo.' },
]

const MOCK_DIRECCIONES = [
  { id: 1, alias: 'Casa', calle: 'Av. Eusebio Ayala 1234', ciudad: 'Asuncion', barrio: 'Mcal. Lopez', referencia: 'Frente a la farmacia', es_principal: true },
]

const MOCK_FICHAS = [
  { id: 1, alias: 'Mi cuenta', nombre: 'Juan Perez', ruc: '1234567-8', telefono: '', email: '', es_principal: true },
]

const MOCK_PEDIDOS = [
  {
    id: 101, numero: 'ECO-00101', fecha: '2026-04-01', estado: 'entregado', tipo_entrega: 'delivery', total: 285000,
    items: [
      { nombre: 'Royal Canin Medium Adult 15kg', cantidad: 1, precio: 225000 },
      { nombre: 'Hueso masticable x3', cantidad: 2, precio: 30000 },
    ],
  },
  {
    id: 98, numero: 'ECO-00098', fecha: '2026-03-18', estado: 'entregado', tipo_entrega: 'retiro', total: 120000,
    items: [
      { nombre: 'Snack de pollo liofilizado 100g', cantidad: 3, precio: 40000 },
    ],
  },
]

// ─── Tabs ─────────────────────────────────────────────────────
const TABS = [
  { id: 'datos',        label: 'Mis datos',      icon: icons.user },
  { id: 'mascotas',     label: 'Mis mascotas',   icon: icons.dog },
  { id: 'direcciones',  label: 'Direcciones',    icon: icons.map },
  { id: 'facturacion',  label: 'Facturacion',    icon: icons.receipt },
  { id: 'pedidos',      label: 'Mis pedidos',    icon: icons.package },
]

// ════════════════════════════════════════════════════════════════
// SECCION: Datos personales
// ════════════════════════════════════════════════════════════════
function SeccionDatos({ user }) {
  const [form, setForm] = useState({
    nombre: user?.user_metadata?.full_name || '',
    telefono: '',
    fecha_nacimiento: '',
    genero: '',
    marketing_email: true,
    marketing_whatsapp: false,
  })
  const [saved, setSaved] = useState(false)
  const [showPassForm, setShowPassForm] = useState(false)
  const [passForm, setPassForm]         = useState({ actual: '', nueva: '', confirmar: '' })

  function handleSave(e) {
    e.preventDefault()
    // Al integrar Supabase: actualizar tabla perfiles
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const f = key => val => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Datos personales</h2>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
          <Field label="Nombre completo">
            <Input value={form.nombre} onChange={f('nombre')} placeholder="Tu nombre" />
          </Field>
          <Field label="Telefono / WhatsApp">
            <Input value={form.telefono} onChange={f('telefono')} placeholder="0981 000 000" type="tel" />
          </Field>
          <Field label="Fecha de nacimiento">
            <Input value={form.fecha_nacimiento} onChange={f('fecha_nacimiento')} type="date" />
          </Field>
          <Field label="Genero">
            <Select value={form.genero} onChange={f('genero')}>
              <option value="">Prefiero no indicar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="otro">Otro</option>
            </Select>
          </Field>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Preferencias de comunicacion
          </p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}>
            <input type="checkbox" checked={form.marketing_email} onChange={e => setForm(prev => ({ ...prev, marketing_email: e.target.checked }))} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Recibir novedades y promociones por email</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.marketing_whatsapp} onChange={e => setForm(prev => ({ ...prev, marketing_whatsapp: e.target.checked }))} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Recibir novedades por WhatsApp</span>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="submit" className="btn-primary" style={{ padding: '10px 24px', fontSize: 14 }}>
            Guardar cambios
          </button>
          {saved && (
            <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>
              Cambios guardados
            </span>
          )}
        </div>
      </form>

      {/* Cambiar contrasena */}
      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPassForm ? 16 : 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Contrasena</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>Actualiza tu contrasena de acceso</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPassForm(v => !v)}
            style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            {showPassForm ? 'Cancelar' : 'Cambiar'}
          </button>
        </div>
        {showPassForm && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0 16px' }}>
            <Field label="Contrasena actual">
              <Input value={passForm.actual} onChange={v => setPassForm(p => ({ ...p, actual: v }))} type="password" placeholder="••••••••" />
            </Field>
            <Field label="Nueva contrasena">
              <Input value={passForm.nueva} onChange={v => setPassForm(p => ({ ...p, nueva: v }))} type="password" placeholder="••••••••" />
            </Field>
            <Field label="Confirmar nueva">
              <Input value={passForm.confirmar} onChange={v => setPassForm(p => ({ ...p, confirmar: v }))} type="password" placeholder="••••••••" />
            </Field>
            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 14 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: 13 }}
                onClick={() => setShowPassForm(false)}
              >
                Actualizar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email — readonly */}
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
  const [mascotas, setMascotas] = useState(MOCK_MASCOTAS)
  const [modal, setModal]       = useState(null) // null | 'nueva' | { ...mascota }
  const [form, setForm]         = useState(MASCOTA_EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function openNueva() {
    setForm(MASCOTA_EMPTY)
    setModal('nueva')
  }

  function openEditar(m) {
    setForm({ ...m })
    setModal(m)
  }

  function handleSave() {
    if (!form.nombre.trim()) return
    if (modal === 'nueva') {
      setMascotas(prev => [...prev, { ...form, id: Date.now() }])
    } else {
      setMascotas(prev => prev.map(m => m.id === modal.id ? { ...m, ...form } : m))
    }
    setModal(null)
  }

  function handleDelete(id) {
    setMascotas(prev => prev.filter(m => m.id !== id))
    setConfirmDelete(null)
  }

  const f = key => val => setForm(prev => ({ ...prev, [key]: val }))

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
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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

      {/* Modal nueva/editar mascota */}
      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva mascota' : 'Editar mascota'} onClose={() => setModal(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Nombre *">
              <Input value={form.nombre} onChange={f('nombre')} placeholder="Nombre de tu mascota" />
            </Field>
            <Field label="Especie">
              <Select value={form.especie} onChange={f('especie')}>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </Select>
            </Field>
            <Field label="Raza">
              <Input value={form.raza} onChange={f('raza')} placeholder="Ej: Labrador" />
            </Field>
            <Field label="Peso (kg)">
              <Input value={form.peso_kg} onChange={f('peso_kg')} placeholder="0.0" type="number" step="0.1" min="0" />
            </Field>
            <Field label="Fecha de nacimiento">
              <Input value={form.fecha_nacimiento} onChange={f('fecha_nacimiento')} type="date" />
            </Field>
          </div>
          <Field label="Notas">
            <textarea
              value={form.notas}
              onChange={e => f('notas')(e.target.value)}
              placeholder="Alergias, preferencias, notas del veterinario..."
              className="input-base"
              rows={3}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </Field>
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} />
        </Modal>
      )}

      {/* Confirmar eliminar */}
      {confirmDelete && (
        <Modal title="Eliminar mascota" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Estas por eliminar a <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.nombre}</strong>. Esta accion no se puede deshacer.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setConfirmDelete(null)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={() => handleDelete(confirmDelete.id)} style={{ padding: '10px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger)', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Eliminar
            </button>
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
  const [direcciones, setDirecciones] = useState(MOCK_DIRECCIONES)
  const [modal, setModal]             = useState(null)
  const [form, setForm]               = useState(DIR_EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function openNueva() {
    setForm(DIR_EMPTY)
    setModal('nueva')
  }

  function openEditar(d) {
    setForm({ ...d })
    setModal(d)
  }

  function handleSave() {
    if (!form.calle.trim()) return
    if (modal === 'nueva') {
      setDirecciones(prev => [...prev, { ...form, id: Date.now() }])
    } else {
      setDirecciones(prev => prev.map(d => d.id === modal.id ? { ...d, ...form } : d))
    }
    setModal(null)
  }

  function marcarPrincipal(id) {
    setDirecciones(prev => prev.map(d => ({ ...d, es_principal: d.id === id })))
  }

  function handleDelete(id) {
    setDirecciones(prev => prev.filter(d => d.id !== id))
    setConfirmDelete(null)
  }

  const f = key => val => setForm(prev => ({ ...prev, [key]: val }))

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
                  {d.es_principal && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-primary)', color: 'white' }}>Principal</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>
                  {d.calle}{d.barrio ? `, ${d.barrio}` : ''}, {d.ciudad}
                </p>
                {d.referencia && <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{d.referencia}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {!d.es_principal && (
                  <button onClick={() => marcarPrincipal(d.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Marcar principal
                  </button>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditar(d)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} aria-label="Editar">
                    <Icon d={icons.edit} size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(d)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid rgba(220,38,38,0.20)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }} aria-label="Eliminar">
                    <Icon d={icons.trash} size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva direccion' : 'Editar direccion'} onClose={() => setModal(null)} wide>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Alias (ej: Casa, Trabajo)">
              <Input value={form.alias} onChange={f('alias')} placeholder="Casa" />
            </Field>
            <Field label="Ciudad">
              <Input value={form.ciudad} onChange={f('ciudad')} placeholder="Asuncion" />
            </Field>
          </div>
          <Field label="Calle y numero *">
            <Input value={form.calle} onChange={f('calle')} placeholder="Av. Eusebio Ayala 1234" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Barrio">
              <Input value={form.barrio} onChange={f('barrio')} placeholder="Mcal. Lopez" />
            </Field>
            <Field label="Referencia">
              <Input value={form.referencia} onChange={f('referencia')} placeholder="Frente al supermercado" />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.es_principal} onChange={e => f('es_principal')(e.target.checked)} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Marcar como direccion principal</span>
          </label>
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Eliminar direccion" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Estas por eliminar <strong style={{ color: 'var(--color-text)' }}>{confirmDelete.alias}</strong>. Esta accion no se puede deshacer.
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
// SECCION: Datos de facturacion
// ════════════════════════════════════════════════════════════════
const FICHA_EMPTY = { alias: '', nombre: '', ruc: '', telefono: '', email: '', es_principal: false }

function SeccionFacturacion() {
  const [fichas, setFichas]   = useState(MOCK_FICHAS)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(FICHA_EMPTY)
  const [confirmDelete, setConfirmDelete] = useState(null)

  function openNueva() {
    setForm(FICHA_EMPTY)
    setModal('nueva')
  }

  function openEditar(f) {
    setForm({ ...f })
    setModal(f)
  }

  function handleSave() {
    if (!form.nombre.trim()) return
    if (modal === 'nueva') {
      setFichas(prev => [...prev, { ...form, id: Date.now() }])
    } else {
      setFichas(prev => prev.map(fi => fi.id === modal.id ? { ...fi, ...form } : fi))
    }
    setModal(null)
  }

  function marcarPrincipal(id) {
    setFichas(prev => prev.map(fi => ({ ...fi, es_principal: fi.id === id })))
  }

  function handleDelete(id) {
    setFichas(prev => prev.filter(fi => fi.id !== id))
    setConfirmDelete(null)
  }

  const ff = key => val => setForm(prev => ({ ...prev, [key]: val }))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Datos de facturacion</h2>
        <button onClick={openNueva} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, gap: 6 }}>
          <Icon d={icons.plus} size={14} /> Agregar
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        Podes tener varias fichas — el nombre y RUC pueden ser distintos al titular (ej: facturar a nombre de tu empresa o familiar).
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
                  {fi.es_principal && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'var(--color-primary)', color: 'white' }}>Principal</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 2 }}>{fi.nombre}</p>
                {fi.ruc && <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>RUC: {fi.ruc}</p>}
                {fi.email && <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{fi.email}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                {!fi.es_principal && (
                  <button onClick={() => marcarPrincipal(fi.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    Marcar principal
                  </button>
                )}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditar(fi)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid var(--color-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }} aria-label="Editar">
                    <Icon d={icons.edit} size={13} />
                  </button>
                  <button onClick={() => setConfirmDelete(fi)} style={{ flex: 1, height: 30, borderRadius: 6, border: '1.5px solid rgba(220,38,38,0.20)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-danger)' }} aria-label="Eliminar">
                    <Icon d={icons.trash} size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <Modal title={modal === 'nueva' ? 'Nueva ficha de facturacion' : 'Editar ficha'} onClose={() => setModal(null)} wide>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            El nombre y RUC pueden ser de otra persona o empresa (ej: tu padre, tu empresa).
          </p>
          <Field label="Alias (ej: Mi cuenta, Papa, Empresa X)">
            <Input value={form.alias} onChange={ff('alias')} placeholder="Mi cuenta" />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Nombre / Razon social *">
              <Input value={form.nombre} onChange={ff('nombre')} placeholder="Juan Perez o Empresa S.A." />
            </Field>
            <Field label="RUC">
              <Input value={form.ruc} onChange={ff('ruc')} placeholder="1234567-8" />
            </Field>
            <Field label="Telefono">
              <Input value={form.telefono} onChange={ff('telefono')} placeholder="0981 000 000" type="tel" />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={ff('email')} placeholder="factura@empresa.com" type="email" />
            </Field>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={form.es_principal} onChange={e => ff('es_principal')(e.target.checked)} />
            <span style={{ fontSize: 14, color: 'var(--color-text)' }}>Marcar como ficha principal</span>
          </label>
          <ModalActions onClose={() => setModal(null)} onSubmit={handleSave} />
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
  const [pedidos]          = useState(MOCK_PEDIDOS)
  const [detalle, setDetalle] = useState(null)

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', marginBottom: 20 }}>Mis pedidos</h2>

      {pedidos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <div style={{ marginBottom: 12, color: 'var(--color-primary)', opacity: 0.5 }}><Icon d={icons.package} size={40} /></div>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Todavia no tenes pedidos</p>
          <p style={{ fontSize: 13 }}>Explora nuestros productos y hace tu primer compra</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {pedidos.map(p => (
            <button
              key={p.id}
              onClick={() => setDetalle(p)}
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
                <p style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{p.items.length} producto{p.items.length !== 1 ? 's' : ''}</p>
              </div>
              <span style={{ color: 'var(--color-text-faint)', marginLeft: 4 }}>
                <Icon d={icons.chevron} size={16} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Modal detalle pedido */}
      {detalle && (
        <Modal title={`Pedido ${detalle.numero}`} onClose={() => setDetalle(null)} wide>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <EstadoBadge estado={detalle.estado} />
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {new Date(detalle.fecha).toLocaleDateString('es-PY', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              · {detalle.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}
            </span>
          </div>

          <div style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', padding: '12px 0', marginBottom: 16 }}>
            {detalle.items.map((item, i) => (
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
        </Modal>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGINA PRINCIPAL
// ════════════════════════════════════════════════════════════════
export default function Perfil() {
  const { user, signOut } = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('datos')

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  return (
    <>
      <SEOHead
        title="Mi perfil — Sosa Bulls"
        description="Gestioná tus datos, mascotas, direcciones y pedidos."
      />

      <div className="container-base section-padding" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* Header de usuario */}
        <div className="card-base" style={{ padding: '24px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Avatar name={nombre} size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>{nombre}</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', background: 'white', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            <Icon d={icons.logout} size={14} />
            Cerrar sesion
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]" style={{ gap: 20, alignItems: 'start' }}>

          {/* Sidebar tabs — desktop */}
          <div className="card-base hidden md:flex flex-col" style={{ padding: '12px 8px', gap: 2 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, fontWeight: 600,
                  background: tab === t.id ? 'var(--color-primary)' : 'transparent',
                  color: tab === t.id ? 'white' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon d={t.icon} size={16} />
                {t.label}
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />

            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 13, fontWeight: 600,
                background: 'transparent',
                color: 'var(--color-danger)',
                transition: 'all 0.15s',
              }}
            >
              <Icon d={icons.logout} size={14} />
              Cerrar sesion
            </button>
          </div>

          {/* Tabs mobile — pills scrollables */}
          <div className="md:hidden" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '9px 16px', borderRadius: 20,
                    border: tab === t.id ? 'none' : '1.5px solid var(--color-border)',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                    fontSize: 13, fontWeight: 600,
                    background: tab === t.id ? 'var(--color-primary)' : 'white',
                    color: tab === t.id ? 'white' : 'var(--color-text-muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon d={t.icon} size={14} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido del tab */}
          <div className="card-base" style={{ padding: '28px 24px' }}>
            {tab === 'datos'       && <SeccionDatos user={user} />}
            {tab === 'mascotas'    && <SeccionMascotas />}
            {tab === 'direcciones' && <SeccionDirecciones />}
            {tab === 'facturacion' && <SeccionFacturacion />}
            {tab === 'pedidos'     && <SeccionPedidos />}
          </div>
        </div>
      </div>
    </>
  )
}
