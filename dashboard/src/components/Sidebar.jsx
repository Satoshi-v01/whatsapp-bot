import { Link } from 'react-router-dom'

function Sidebar({ usuario, onLogout }) {
    return (
        <nav className="sidebar">
            <h2>Sosa Bulls</h2>
            <Link to="/chat">Chat</Link>
            <Link to="/ventas">Ventas</Link>
            <Link to="/inventario">Inventario</Link>
            <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #2a2a4e' }}>
                <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{usuario?.nombre}</p>
                <button
                    onClick={onLogout}
                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #2a2a4e', background: 'transparent', color: '#a0a0c0', fontSize: '12px', cursor: 'pointer' }}
                >
                    Cerrar sesión
                </button>
            </div>
        </nav>
    )
}

export default Sidebar