import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import { useAuth } from '@/hooks/useAuth'

function IconUser({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

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

// Google y Facebook — placeholders hasta integrar OAuth
function SocialButton({ children, disabled = true }) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '11px 16px',
        borderRadius: 'var(--radius-md)',
        border: '1.5px solid var(--color-border)',
        background: 'white',
        color: 'var(--color-text-muted)',
        fontSize: 14,
        fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = await signIn(email, password)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <>
      <SEOHead
        title="Ingresar — Sosa Bulls"
        description="Ingresa a tu cuenta para ver tus pedidos, mascotas y datos de facturacion."
      />

      <div
        className="flex items-center justify-center px-4"
        style={{ minHeight: 'calc(100vh - 160px)', paddingBottom: 40 }}
      >
        <div
          className="w-full card-base"
          style={{ maxWidth: 420, padding: '36px 32px' }}
        >
          {/* Logo / header */}
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
                Bienvenido de vuelta
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Ingresa a tu cuenta de Sosa Bulls
              </p>
            </div>
          </div>

          {/* Botones sociales */}
          <div className="flex flex-col gap-2 mb-5">
            <SocialButton>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </SocialButton>
            <SocialButton>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continuar con Facebook
            </SocialButton>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-3 mb-5">
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>
              o con tu email
            </span>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border)' }} />
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} noValidate>
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

            {/* Email */}
            <div className="mb-3">
              <label
                htmlFor="email"
                className="block text-xs font-bold mb-1.5"
                style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Email
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}
                >
                  <IconMail />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="input-base"
                  style={{ paddingLeft: 38 }}
                  aria-required="true"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-bold"
                  style={{ color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Contrasena
                </label>
                <button
                  type="button"
                  className="text-xs cursor-pointer"
                  style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', padding: 0 }}
                >
                  Olvide mi contrasena
                </button>
              </div>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-faint)', pointerEvents: 'none' }}
                >
                  <IconLock />
                </span>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input-base"
                  style={{ paddingLeft: 38, paddingRight: 40 }}
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--color-text-faint)', background: 'none', border: 'none', padding: 2 }}
                >
                  <IconEye closed={showPass} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
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
                  Ingresando...
                </>
              ) : (
                <>
                  <IconUser size={16} />
                  Ingresar
                </>
              )}
            </button>
          </form>

          {/* Link a registro */}
          <p className="text-center mt-5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No tenes cuenta?{' '}
            <Link
              to="/registro"
              className="font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Crear cuenta gratis
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}
