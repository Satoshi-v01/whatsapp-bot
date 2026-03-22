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
import Caja from './pages/Caja'
import Configuracion from './pages/Configuracion'
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
                    <span style={{ fontSize: '48px' }}>🔒</span>
                    <p style={{ fontSize: '16px', fontWeight: '600' }}>Sin acceso</p>
                    <p style={{ fontSize: '13px' }}>No tenés permiso para ver esta sección.</p>
                </div>
            )
        }
        return children
    }

    return (
        <AppContext.Provider value={{ darkMode, toggleDarkMode, usuario, puedo }}>
            <div className="app" data-theme={darkMode ? 'dark' : ''}>
                <Sidebar />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TopBar usuario={usuario} onLogout={handleLogout} />
                    <main className="contenido">
                        <Routes>
                            <Route path="/" element={
                                puedo('home', 'ver') ? <Home /> : <Navigate to="/delivery" replace />
                            } />
                            <Route path="/chat" element={
                                <RutaProtegida modulo="chat"><Chat /></RutaProtegida>
                            } />
                            <Route path="/ventas" element={
                                <RutaProtegida modulo="ventas"><Ventas /></RutaProtegida>
                            } />
                            <Route path="/inventario" element={
                                <RutaProtegida modulo="inventario"><Inventario /></RutaProtegida>
                            } />
                            <Route path="/clientes" element={
                                <RutaProtegida modulo="clientes"><Clientes /></RutaProtegida>
                            } />
                            <Route path="/caja" element={
                                <RutaProtegida modulo="ventas"><Caja /></RutaProtegida>
                            } />
                            <Route path="/delivery" element={
                                <RutaProtegida modulo="delivery"><Delivery /></RutaProtegida>
                            } />
                            <Route path="/reportes" element={
                                <RutaProtegida modulo="reportes"><Reportes /></RutaProtegida>
                            } />
                            <Route path="/configuracion" element={
                                <RutaProtegida modulo="configuracion"><Configuracion /></RutaProtegida>
                            } />
                            <Route path="/ordenes" element={
                                <RutaProtegida modulo="ordenes" accion="ver"><Ordenes /></RutaProtegida>
                            } />
                        </Routes>
                    </main>
                </div>
            </div>
        </AppContext.Provider>
    )
}

export default App