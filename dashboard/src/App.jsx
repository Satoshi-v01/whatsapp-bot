import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Chat from './pages/Chat'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import './App.css'

function App() {
  return (
    <div className="app">
      <Sidebar />
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