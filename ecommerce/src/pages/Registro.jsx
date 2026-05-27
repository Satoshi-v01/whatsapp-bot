import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import { useAuth } from '@/hooks/useAuth'

function IconMail({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  )
}
function IconLock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
function IconUser({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function IconPhone({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.5a19.79 19.79 0 0 1-3-8.57A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )
}
function IconEye({ size = 16, closed = false }) {
  if (closed) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

const LABEL_STYLE = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 6,
}

export default function Registro() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()

  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', password: '', confirmar: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const f = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!form.nombre.trim()) return setError('El nombre es requerido')
    if (!form.email.trim()) return setError('El email es requerido')
    if (form.password.length < 6) return setError('La contrasena debe tener al menos 6 caracteres')
    if (form.password !== form.confirmar) return setError('Las contrasenas no coinciden')

    setLoading(true)
    const result = await signUp({
      nombre:   form.nombre.trim(),
      email:    form.email.trim(),
      password: form.password,
      telefono: form.telefono.trim() || undefined,
    })
    setLoading(false)

    if (result?.error) {
      setError(result.error)
    } else {
      navigate('/', { replace: true })
    }
  }

  return (
    <>
      <SEOHead
        title="Crear cuenta"
        description="Creá tu cuenta para guardar tus pedidos, mascotas y datos de facturación."
        noindex
      />

      <div
        className="flex items-center justify-center px-4"
        style={{ minHeight: 'calc(100vh - 160px)', paddingBottom: 40 }}
      >
        <div className="w-full card-base" style={{ maxWidth: 440, padding: '36px 32px' }}>

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div
              className="flex items-center justify-center text-white font-display font-black"
              style={{
                width: 48, height: 48,
                background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                borderRadius: 14,
                boxShadow: '0 4px 16px var(--brand-glow)',
                fontSize: 16,
              }}
              aria-hidden="true"
            >
              SB
            </div>
            <div className="text-center">
              <h1 className="font-display font-bold text-xl" style={{ color: 'var(--color-text)', marginBottom: 2 }}>
                Crear cuenta gratis
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Guarda tus pedidos, mascotas y datos de entrega
              </p>
            </div>
          </div>

          {error && (
            <div
              className="mb-4 text-sm"
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.20)',
                color: 'var(--color-danger)',
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* Nombre */}
            <div className="mb-3">
              <label htmlFor="nombre" style={LABEL_STYLE}>Nombre completo</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}>
                  <IconUser />
                </span>
                <input
                  id="nombre" type="text" autoComplete="name" required
                  value={form.nombre} onChange={f('nombre')}
                  placeholder="Juan Perez"
                  className="input-base" style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label htmlFor="email" style={LABEL_STYLE}>Email</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}>
                  <IconMail />
                </span>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={form.email} onChange={f('email')}
                  placeholder="tu@email.com"
                  className="input-base" style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Telefono */}
            <div className="mb-3">
              <label htmlFor="telefono" style={LABEL_STYLE}>
                Telefono <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional — para vincular tus pedidos)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}>
                  <IconPhone />
                </span>
                <input
                  id="telefono" type="tel" autoComplete="tel"
                  value={form.telefono} onChange={f('telefono')}
                  placeholder="0981 000 000"
                  className="input-base" style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-3">
              <label htmlFor="password" style={LABEL_STYLE}>Contrasena</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}>
                  <IconLock />
                </span>
                <input
                  id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password" required
                  value={form.password} onChange={f('password')}
                  placeholder="Minimo 6 caracteres"
                  className="input-base" style={{ paddingLeft: 38, paddingRight: 40 }}
                />
                <button
                  type="button" onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar' : 'Mostrar'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--color-text-faint)', background: 'none', border: 'none', padding: 2 }}
                >
                  <IconEye closed={showPass} />
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div className="mb-5">
              <label htmlFor="confirmar" style={LABEL_STYLE}>Confirmar contrasena</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}>
                  <IconLock />
                </span>
                <input
                  id="confirmar" type={showPass ? 'text' : 'password'} autoComplete="new-password" required
                  value={form.confirmar} onChange={f('confirmar')}
                  placeholder="Repetir contrasena"
                  className="input-base" style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full justify-center"
              style={{ opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: 'white', borderTopColor: 'transparent' }}
                    aria-hidden="true"
                  />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <IconUser size={16} />
                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Ya tenes cuenta?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              Ingresar
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
