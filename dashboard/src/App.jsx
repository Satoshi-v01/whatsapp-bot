import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Delivery from './pages/Delivery'
import Chat from './pages/Chat'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Login from './pages/Login'
import Home from './pages/Home'
import Reportes from './pages/Reportes'
import Clientes from './pages/Clientes'
import Caja from './pages/Caja'
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
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <TopBar usuario={usuario} onLogout={handleLogout} />
                <main className="contenido">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route path="/ventas" element={<Ventas />} />
                        <Route path="/inventario" element={<Inventario />} />
                        <Route path="/clientes" element={<Clientes />} />         
                        <Route path="/caja" element={<Caja />} />            
                        <Route path="/delivery" element={<Delivery />} />
                        <Route path="/reportes" element={<Reportes />} />
                    </Routes>
                </main>
            </div>
        </div>
    )
}

export default App