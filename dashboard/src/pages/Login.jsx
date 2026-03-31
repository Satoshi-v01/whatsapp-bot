import { useState } from 'react'
import axios from 'axios'

function Login({ onLogin }) {
    const [email, setEmail]       = useState('')
    const [password, setPassword] = useState('')
    const [error, setError]       = useState(null)
    const [cargando, setCargando] = useState(false)
    const [showPass, setShowPass] = useState(false)

    async function handleLogin(e) {
        e.preventDefault()
        try {
            setCargando(true)
            setError(null)
            const res = await axios.post('/api/auth/login', { email, password })
            localStorage.setItem('token', res.data.token)
            localStorage.setItem('usuario', JSON.stringify(res.data.usuario))
            onLogin(res.data.usuario)
        } catch (err) {
            setError('Email o contraseña incorrectos')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="login-wrap">

            {/* Panel de marca — lado izquierdo */}
            <div className="login-brand-panel">
                <div className="login-brand-inner">
                    <div className="login-brand-logo">SB</div>

                    <h1 className="login-headline">
                        Centro de<br />
                        operaciones
                    </h1>
                    <p className="login-subline">
                        Gestioná ventas, inventario, delivery
                        y comunicaciones desde un solo lugar.
                    </p>

                    <div className="login-brand-dots">
                        <div className="login-dot on" />
                        <div className="login-dot" />
                        <div className="login-dot" />
                    </div>
                </div>
            </div>

            {/* Panel de formulario — lado derecho */}
            <div className="login-form-panel">
                <div className="login-form-inner">
                    <p className="login-form-title">Bienvenido de nuevo</p>
                    <p className="login-form-sub">Ingresá tus credenciales para continuar.</p>

                    <form onSubmit={handleLogin}>
                        <div className="login-field">
                            <label className="login-label" htmlFor="login-email">Email</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="usuario@sosabulls.com"
                                required
                                autoComplete="email"
                                className="login-input"
                            />
                        </div>

                        <div className="login-field" style={{ position: 'relative' }}>
                            <label className="login-label" htmlFor="login-pass">Contraseña</label>
                            <input
                                id="login-pass"
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="current-password"
                                className="login-input"
                                style={{ paddingRight: '42px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(p => !p)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    bottom: '11px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#94a3b8',
                                    fontSize: '12px',
                                    padding: '0',
                                    lineHeight: 1,
                                }}
                                tabIndex={-1}
                                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPass ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="login-error">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={cargando}
                            className="login-submit"
                        >
                            {cargando ? 'Ingresando…' : 'Ingresar'}
                        </button>
                    </form>

                    <p style={{ marginTop: '28px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
                        Sosa Bulls · Dashboard v2
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login
