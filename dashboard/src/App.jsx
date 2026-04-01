import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Delivery from './pages/Delivery'
import Chat from './pages/Chat'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Ordenes from './pages/Ordenes'
import Login from './pages/Login'
import Home from './pages/Home'
import Reportes from './pages/Reportes'
import Clientes from './pages/Clientes'
import Proveedores from './pages/Proveedores'
import Caja from './pages/Caja'
import Configuracion from './pages/Configuracion'
import Repartidor from './pages/Repartidor'
import Auditoria from './pages/Auditoria'
import './App.css'

export const AppContext = createContext({})

export function useApp() {
    return useContext(AppContext)
}

function App() {
    const [usuario, setUsuario] = useState(null)
    const [verificando, setVerificando] = useState(true)
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('darkMode') === 'true'
    })

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('usuario')
        const token = localStorage.getItem('token')
        if (usuarioGuardado && token) {
            setUsuario(JSON.parse(usuarioGuardado))
        }
        setVerificando(false)
    }, [])

    useEffect(() => {
        localStorage.setItem('darkMode', String(darkMode))
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
        }
    }, [darkMode])

    function handleLogin(usuarioData) {
        setUsuario(usuarioData)
    }

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        setUsuario(null)
    }

    function toggleDarkMode() {
        setDarkMode(prev => !prev)
    }

    // Helper de permisos — admin siempre puede todo
    function puedo(modulo, accion = 'ver') {
        if (!usuario) return false
        if (usuario.rol === 'admin') return true
        const permisos = usuario.permisos || {}
        return (permisos[modulo] || []).includes(accion)
    }

    if (verificando) return null

    if (!usuario) {
        return <Login onLogin={handleLogin} />
    }

    // Componente que bloquea rutas sin permiso
    function RutaProtegida({ modulo, children }) {
        if (!puedo(modulo, 'ver')) {
            return (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', color: '#64748b' }}>
                    <span style={{ color: '#94a3b8', display: 'flex' }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>Sin acceso</p>
                    <p style={{ fontSize: '13px' }}>No tenés permiso para ver esta sección.</p>
                </div>
            )
        }
        return children
    }

    // Detectar si es repartidor — redirigir automáticamente
    const esRepartidor = usuario.rol_nombre?.toLowerCase() === 'repartidor' || 
                        (usuario.permisos && Object.keys(usuario.permisos).length === 1 && usuario.permisos.delivery)

    return (
        <AppContext.Provider value={{ darkMode, toggleDarkMode, usuario, puedo }}>
            <div className="app" data-theme={darkMode ? 'dark' : ''}>
                {!esRepartidor && <Sidebar />}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {!esRepartidor && <TopBar usuario={usuario} onLogout={handleLogout} />}
                    <main className={esRepartidor ? '' : 'contenido'}>
                        <Routes>
                            {esRepartidor ? (
                                <>
                                    <Route path="*" element={<Repartidor usuario={usuario} onLogout={handleLogout} />} />
                                </>
                            ) : (
                                <>
                                    <Route path="/dashboard" element={<Navigate to="/dashboard/inicio" replace />} />
                                    <Route path="/dashboard/" element={<Navigate to="/dashboard/inicio" replace />} />
                                    <Route path="/dashboard/inicio" element={
                                        puedo('home', 'ver') ? <Home /> : <Navigate to="/dashboard/delivery" replace />
                                    } />
                                    <Route path="/dashboard/chat" element={
                                        <RutaProtegida modulo="chat"><Chat /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/ventas" element={
                                        <RutaProtegida modulo="ventas"><Ventas /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/inventario" element={
                                        <RutaProtegida modulo="inventario"><Inventario /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/proveedores" element={
                                        <RutaProtegida modulo="proveedores"><Proveedores /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/clientes" element={
                                        <RutaProtegida modulo="clientes"><Clientes /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/caja" element={
                                        <RutaProtegida modulo="ventas"><Caja /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/delivery" element={
                                        <RutaProtegida modulo="delivery"><Delivery /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/reportes" element={
                                        <RutaProtegida modulo="reportes"><Reportes /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/configuracion" element={
                                        <RutaProtegida modulo="configuracion"><Configuracion /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/ordenes" element={
                                        <RutaProtegida modulo="ordenes"><Ordenes /></RutaProtegida>
                                    } />
                                    <Route path="/dashboard/auditoria" element={
                                        usuario.rol === 'admin' ? <Auditoria /> : <Navigate to="/dashboard" replace />
                                    } />
                                    <Route path="*" element={<Navigate to="/dashboard/inicio" replace />} />
                                </>
                            )}
                        </Routes>
                    </main>
                    {!esRepartidor && (
                        <div style={{ padding: '6px 24px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em' }}>
                                Hecho por <span style={{ fontWeight: '700' }}>Satoshi</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </AppContext.Provider>
    )
}

export default App