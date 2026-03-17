import { useState } from 'react'
import axios from 'axios'

function Login({ onLogin }) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [cargando, setCargando] = useState(false)

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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '40px', width: '360px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <h1 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px' }}>Sosa Bulls DASHBOARD</h1>
                <p style={{ fontSize: '13px', color: '#888', marginBottom: '28px' }}>Iniciá sesión para continuar</p>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="admin@sosabulls.com"
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={cargando}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: cargando ? '#ccc' : '#1a1a2e', color: 'white', fontSize: '14px', fontWeight: '500', cursor: cargando ? 'not-allowed' : 'pointer' }}
                    >
                        {cargando ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login