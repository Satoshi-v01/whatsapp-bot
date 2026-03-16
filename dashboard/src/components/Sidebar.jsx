import { Link } from 'react-router-dom'

function Sidebar() {
  return (
    <nav className="sidebar">
      <h2>Sosa Bulls</h2>
      <Link to="/chat">Chat</Link>
      <Link to="/ventas">Ventas</Link>
      <Link to="/inventario">Inventario</Link>
    </nav>
  )
}
export default Sidebar