import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Chat from './pages/Chat'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import './App.css'

function App() {
    const [usuario, setUsuario] = useState(null)
    const [verificando, setVerificando] = useState(true)

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('usuario')
        const token = localStorage.getItem('token')
        if (usuarioGuardado && token) {
            setUsuario(JSON.parse(usuarioGuardado))
        }
        setVerificando(false)
    }, [])

    function handleLogin(usuarioData) {
        setUsuario(usuarioData)
    }

    function handleLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
        setUsuario(null)
    }

    if (verificando) return null

    if (!usuario) {
        return <Login onLogin={handleLogin} />
    }

    return (
        <div className="app">
            <Sidebar usuario={usuario} onLogout={handleLogout} />
            <main className="contenido">
                <Routes>
                    <Route path="/" element={<Navigate to="/chat" />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/inventario" element={<Inventario />} />
                </Routes>
            </main>
        </div>
    )
}

export default App