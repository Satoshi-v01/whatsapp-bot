import { useState, useEffect } from 'react'
import { getUsuarios, getRoles, crearRol, actualizarRol, eliminarRol, crearUsuario, eliminarUsuario } from '../services/usuarios'
import { getConfiguracion, guardarConfiguracionBulk } from '../services/configuracion'
import ModalConfirmar from '../components/ModalConfirmar'

const MODULOS = [
    { key: 'ventas', label: 'Ventas', icono: '🛒' },
    { key: 'inventario', label: 'Inventario', icono: '📦' },
    { key: 'clientes', label: 'Clientes', icono: '👥' },
    { key: 'delivery', label: 'Delivery', icono: '🚚' },
    { key: 'reportes', label: 'Reportes', icono: '📊' },
    { key: 'configuracion', label: 'Configuración', icono: '⚙️' },
    { key: 'usuarios', label: 'Usuarios', icono: '👤' },
]

const ACCIONES = ['ver', 'crear', 'editar', 'eliminar']

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function Toggle({ checked, onChange }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            style={{
                width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer',
                background: checked ? '#1a1a2e' : '#e2e8f0', position: 'relative',
                transition: 'background 0.2s', flexShrink: 0
            }}
        >
            <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '3px',
                left: checked ? '23px' : '3px',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }} />
        </div>
    )
}

function Configuracion() {
    const [pestana, setPestana] = useState('usuarios')
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [guardando, setGuardando] = useState(false)

    // Usuarios y roles
    const [usuarios, setUsuarios] = useState([])
    const [roles, setRoles] = useState([])
    const [rolSeleccionado, setRolSeleccionado] = useState(null)
    const [modalUsuario, setModalUsuario] = useState(false)
    const [modalRol, setModalRol] = useState(false)
    const [formUsuario, setFormUsuario] = useState({ nombre: '', email: '', password: '', rol_id: '' })
    const [formRol, setFormRol] = useState({ nombre: '', permisos: {} })

    // Configuración
    const [config, setConfig] = useState({})
    const [horario, setHorario] = useState({
        Lunes: { activo: true, desde: '08:00', hasta: '18:00' },
        Martes: { activo: true, desde: '08:00', hasta: '18:00' },
        Miércoles: { activo: true, desde: '08:00', hasta: '18:00' },
        Jueves: { activo: true, desde: '08:00', hasta: '18:00' },
        Viernes: { activo: true, desde: '08:00', hasta: '18:00' },
        Sábado: { activo: true, desde: '08:00', hasta: '15:00' },
        Domingo: { activo: false, desde: '08:00', hasta: '12:00' },
    })

    useEffect(() => {
        cargarDatos()
    }, [])

    async function cargarDatos() {
        try {
            const [u, r, c] = await Promise.all([getUsuarios(), getRoles(), getConfiguracion()])
            setUsuarios(u)
            setRoles(r)
            setConfig(c)
            if (r.length > 0) setRolSeleccionado(r[0])
            if (c.tienda_horario) {
                try { setHorario(JSON.parse(c.tienda_horario)) } catch (e) {}
            }
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los datos.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleCrearUsuario() {
        if (!formUsuario.nombre || !formUsuario.email || !formUsuario.password) return
        try {
            await crearUsuario(formUsuario)
            setModalUsuario(false)
            setFormUsuario({ nombre: '', email: '', password: '', rol_id: '' })
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: err.response?.data?.error || 'No se pudo crear el usuario.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function handleEliminarUsuario(usuario) {
        setModalConfirmar({
            titulo: 'Eliminar usuario',
            mensaje: `¿Desactivar el usuario ${usuario.nombre}? No podrá iniciar sesión.`,
            textoBoton: 'Eliminar',
            colorBoton: '#ef4444',
            onConfirmar: async () => {
                try {
                    await eliminarUsuario(usuario.id)
                    setModalConfirmar(null)
                    await cargarDatos()
                } catch (err) {
                    setModalConfirmar({
                        titulo: 'Error',
                        mensaje: 'No se pudo eliminar el usuario.',
                        textoBoton: 'Cerrar',
                        colorBoton: '#888',
                        onConfirmar: () => setModalConfirmar(null)
                    })
                }
            }
        })
    }

    async function handleCrearRol() {
        if (!formRol.nombre) return
        try {
            await crearRol(formRol)
            setModalRol(false)
            setFormRol({ nombre: '', permisos: {} })
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo crear el rol.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleGuardarPermisos() {
        if (!rolSeleccionado) return
        try {
            await actualizarRol(rolSeleccionado.id, { permisos: rolSeleccionado.permisos })
            setModalConfirmar({
                titulo: '✅ Guardado',
                mensaje: 'Permisos actualizados correctamente.',
                textoBoton: 'Cerrar',
                colorBoton: '#10b981',
                onConfirmar: () => setModalConfirmar(null)
            })
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron guardar los permisos.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function togglePermiso(modulo, accion) {
        if (!rolSeleccionado) return  
        const permisos = { ...(rolSeleccionado.permisos || {}) }
        const lista = permisos[modulo] || []
        if (lista.includes(accion)) {
            permisos[modulo] = lista.filter(a => a !== accion)
        } else {
            permisos[modulo] = [...lista, accion]
        }
        setRolSeleccionado({ ...rolSeleccionado, permisos })
    }

    function tienePermiso(modulo, accion) {
        if (!rolSeleccionado?.permisos) return false
        return (rolSeleccionado.permisos[modulo] || []).includes(accion)
    }

    async function handleGuardarConfig(extras = {}) {
        setGuardando(true)
        try {
            await guardarConfiguracionBulk({
                ...config,
                tienda_horario: JSON.stringify(horario),
                ...extras
            })
            setModalConfirmar({
                titulo: '✅ Guardado',
                mensaje: 'Configuración guardada correctamente.',
                textoBoton: 'Cerrar',
                colorBoton: '#10b981',
                onConfirmar: () => setModalConfirmar(null)
            })
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo guardar la configuración.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setGuardando(false)
        }
    }

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', background: '#f8fafc' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
    const btnSecundario = { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    const pestanas = [
        { key: 'usuarios', label: 'Usuarios y Roles', icono: '👥' },
        { key: 'notificaciones', label: 'Notificaciones', icono: '🔔' },
        { key: 'tienda', label: 'Tienda', icono: '🏪' },
        { key: 'bot', label: 'Bot', icono: '🤖' },
        { key: 'apariencia', label: 'Apariencia', icono: '🎨' },
    ]

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

            {/* Sidebar de configuración */}
            <div style={{ width: '220px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingLeft: '12px' }}>
                    Configuración
                </p>
                {pestanas.map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPestana(p.key)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: '8px', border: 'none',
                            background: pestana === p.key ? 'white' : 'transparent',
                            color: pestana === p.key ? '#1a1a2e' : '#64748b',
                            cursor: 'pointer', fontSize: '13px', fontWeight: pestana === p.key ? '700' : '500',
                            marginBottom: '4px', textAlign: 'left', width: '100%',
                            boxShadow: pestana === p.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.15s'
                        }}
                    >
                        <span>{p.icono}</span>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

                {/* ===== USUARIOS Y ROLES ===== */}
                {pestana === 'usuarios' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                            <div>
                                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Usuarios y Roles</h1>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Administrá los permisos y perfiles de usuario del sistema.</p>
                            </div>
                            <button onClick={() => setModalUsuario(true)} style={btnPrimario}>+ Nuevo usuario</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>

                            {/* Tabla usuarios */}
                            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '700' }}>Usuarios del sistema</h2>
                                    <span style={{ fontSize: '10px', fontWeight: '700', background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>
                                        {usuarios.filter(u => u.disponible).length} activos
                                    </span>
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ padding: '10px 24px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuario</th>
                                            <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rol</th>
                                            <th style={{ padding: '10px 24px', textAlign: 'right', fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usuarios.filter(u => u.disponible).map(u => (
                                            <tr key={u.id} style={{ borderTop: '1px solid #f8fafc' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                            >
                                                <td style={{ padding: '14px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>
                                                            {u.nombre.slice(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{u.nombre}</p>
                                                            <p style={{ fontSize: '11px', color: '#94a3b8' }}>{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569' }}>
                                                        {u.rol_nombre || u.rol || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => handleEliminarUsuario(u)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {usuarios.filter(u => u.disponible).length === 0 && (
                                            <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No hay usuarios.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Gestión de roles */}
                            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '700' }}>Gestionar roles</h2>
                                    <button onClick={() => setModalRol(true)} style={{ fontSize: '12px', color: '#1a1a2e', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>+ Crear nuevo</button>
                                </div>
                                <div style={{ padding: '20px 24px', flex: 1 }}>
                                    <label style={labelStyle}>Rol seleccionado</label>
                                    <select
                                        value={rolSeleccionado?.id || ''}
                                        onChange={e => {
                                            const rol = roles.find(r => r.id === parseInt(e.target.value))
                                            setRolSeleccionado(rol || null)
                                        }}
                                        style={{ ...inputStyle, marginBottom: '20px' }}
                                    >
                                        <option value="">Seleccionar rol...</option>  {}
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>

                                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>Permisos por módulo</p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {MODULOS.map(mod => (
                                            <div key={mod.key} style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {mod.icono} {mod.label}
                                                </span>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {ACCIONES.map(accion => (
                                                        <label key={accion} style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={tienePermiso(mod.key, accion)}
                                                                onChange={() => togglePermiso(mod.key, accion)}
                                                            />
                                                            <span style={{ fontSize: '10px', color: '#64748b' }}>{accion}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                                        <button onClick={handleGuardarPermisos} style={{ ...btnPrimario, flex: 1 }}>Guardar cambios</button>
                                        <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== NOTIFICACIONES ===== */}
                {pestana === 'notificaciones' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Notificaciones</h1>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Gestioná cómo y cuándo recibir alertas críticas del sistema.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', fontSize: '18px' }}>📦</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Stock bajo</h3>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Recibí una alerta cuando un producto alcance el umbral mínimo definido.</p>
                                <label style={labelStyle}>Unidades mínimas</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        value={config.notif_stock_minimo || 3}
                                        onChange={e => setConfig({ ...config, notif_stock_minimo: e.target.value })}
                                        style={{ ...inputStyle, paddingRight: '80px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>UNIDADES</span>
                                </div>
                            </div>

                            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', fontSize: '18px' }}>💬</div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Chats esperando agente</h3>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Alerta de tiempo de espera excesivo para clientes en cola.</p>
                                <label style={labelStyle}>Tiempo de espera máximo</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="number"
                                        value={config.notif_chat_espera_minutos || 5}
                                        onChange={e => setConfig({ ...config, notif_chat_espera_minutos: e.target.value })}
                                        style={{ ...inputStyle, paddingRight: '80px' }}
                                    />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>MINUTOS</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {[
                                { key: 'notif_pedidos_bot', label: 'Nuevos pedidos del bot', desc: 'Notificar cuando el bot finalice una orden con éxito.', icono: '🤖' },
                                { key: 'notif_sonido', label: 'Activar sonido', desc: 'Reproducir un tono audible para todas las notificaciones.', icono: '🔊' },
                            ].map(item => (
                                <div key={item.key} style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px', fontSize: '18px' }}>{item.icono}</div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '600' }}>{item.label}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={config[item.key] === 'true' || config[item.key] === true}
                                        onChange={val => setConfig({ ...config, [item.key]: String(val) })}
                                    />
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                            <button onClick={() => handleGuardarConfig()} disabled={guardando} style={btnPrimario}>{guardando ? 'Guardando...' : 'Guardar configuración'}</button>
                        </div>
                    </div>
                )}

                {/* ===== TIENDA ===== */}
                {pestana === 'tienda' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Configuración de la Tienda</h1>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Administrá la identidad y los horarios de operación.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        ℹ️ Información general
                                    </h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={labelStyle}>Nombre de la tienda</label>
                                            <input value={config.tienda_nombre || ''} onChange={e => setConfig({ ...config, tienda_nombre: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={labelStyle}>Dirección</label>
                                            <input value={config.tienda_direccion || ''} onChange={e => setConfig({ ...config, tienda_direccion: e.target.value })} placeholder="Dirección de la tienda" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Teléfono</label>
                                            <input value={config.tienda_telefono || ''} onChange={e => setConfig({ ...config, tienda_telefono: e.target.value })} placeholder="Número de contacto" style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Email</label>
                                            <input value={config.tienda_email || ''} onChange={e => setConfig({ ...config, tienda_email: e.target.value })} placeholder="email@tienda.com" style={inputStyle} />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        🕐 Horario de atención
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {DIAS.map(dia => (
                                            <div key={dia} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: horario[dia]?.activo ? '#f0f4ff' : '#f8fafc', gap: '12px' }}>
                                                <span style={{ width: '90px', fontSize: '13px', fontWeight: '600', color: horario[dia]?.activo ? '#1a1a2e' : '#94a3b8' }}>{dia}</span>
                                                {horario[dia]?.activo ? (
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <input type="time" value={horario[dia]?.desde || '08:00'} onChange={e => setHorario({ ...horario, [dia]: { ...horario[dia], desde: e.target.value } })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                        <span style={{ color: '#94a3b8' }}>—</span>
                                                        <input type="time" value={horario[dia]?.hasta || '18:00'} onChange={e => setHorario({ ...horario, [dia]: { ...horario[dia], hasta: e.target.value } })} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                                                    </div>
                                                ) : (
                                                    <span style={{ flex: 1, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Cerrado</span>
                                                )}
                                                <Toggle checked={horario[dia]?.activo || false} onChange={val => setHorario({ ...horario, [dia]: { ...horario[dia], activo: val } })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Vista previa */}
                            <div>
                                <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '24px', color: 'white', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Vista previa</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
                                        <div>
                                            <p style={{ fontWeight: '700', fontSize: '14px' }}>{config.tienda_nombre || 'Nombre de la tienda'}</p>
                                            <p style={{ fontSize: '11px', opacity: 0.6 }}>
                                                {Object.entries(horario).find(([d, h]) => h.activo)
                                                    ? `Abierto hoy`
                                                    : 'Cerrado hoy'}
                                            </p>
                                        </div>
                                    </div>
                                    {config.tienda_telefono && <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>📞 {config.tienda_telefono}</p>}
                                    {config.tienda_email && <p style={{ fontSize: '12px', opacity: 0.7 }}>✉️ {config.tienda_email}</p>}
                                </div>
                                <button onClick={() => handleGuardarConfig()} disabled={guardando} style={{ ...btnPrimario, width: '100%', marginBottom: '8px' }}>
                                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button onClick={() => cargarDatos()} style={{ ...btnSecundario, width: '100%' }}>Descartar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== BOT ===== */}
                {pestana === 'bot' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                            <div>
                                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Configuración del Bot</h1>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Gestioná la automatización y el comportamiento de tu asistente virtual.</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '12px 16px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Estado del bot</p>
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: config.bot_activo === 'true' ? '#10b981' : '#ef4444' }}>
                                        {config.bot_activo === 'true' ? 'Activo' : 'Inactivo'}
                                    </p>
                                </div>
                                <Toggle
                                    checked={config.bot_activo === 'true'}
                                    onChange={val => setConfig({ ...config, bot_activo: String(val) })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💬 Mensajes predeterminados
                                    </h3>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Mensaje de bienvenida</label>
                                        <textarea
                                            value={config.bot_mensaje_bienvenida || ''}
                                            onChange={e => setConfig({ ...config, bot_mensaje_bienvenida: e.target.value })}
                                            rows={4}
                                            style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }}
                                            placeholder="Ej: ¡Hola! Bienvenido a Sosa Bulls 🐾"
                                        />
                                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Este mensaje se enviará automáticamente al iniciar una conversación.</p>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Mensaje fuera de horario</label>
                                        <textarea
                                            value={config.bot_mensaje_fuera_horario || ''}
                                            onChange={e => setConfig({ ...config, bot_mensaje_fuera_horario: e.target.value })}
                                            rows={4}
                                            style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }}
                                            placeholder="Ej: Estamos fuera de horario. Te atenderemos pronto."
                                        />
                                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Se activa automáticamente según el horario configurado en Tienda.</p>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                                    <button onClick={() => handleGuardarConfig()} disabled={guardando} style={btnPrimario}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
                                </div>
                            </div>

                            {/* Panel derecho bot */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        {[
                                            { label: 'Interacciones hoy', valor: '—', color: '#1a1a2e', bgDark: true },
                                            { label: 'Tasa resolución', valor: '—', color: '#0f172a' },
                                            { label: 'Latencia media', valor: '—', color: '#0f172a' },
                                        ].map((stat, i) => (
                                            <div key={i} style={{ padding: '14px', borderRadius: '8px', background: stat.bgDark ? '#1a1a2e' : '#f8fafc' }}>
                                                <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: stat.bgDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginBottom: '6px' }}>{stat.label}</p>
                                                <p style={{ fontSize: '18px', fontWeight: '800', color: stat.bgDark ? 'white' : stat.color }}>{stat.valor}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== APARIENCIA ===== */}
                {pestana === 'apariencia' && (
                    <div>
                        <div style={{ marginBottom: '28px' }}>
                            <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Apariencia</h1>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Personalizá la experiencia visual del dashboard.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <label style={{ ...labelStyle, marginBottom: '16px' }}>Selección de tema</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {[
                                            { val: 'light', label: 'Modo claro', preview: { bg: '#f8fafc', card: 'white', bar: '#1a1a2e' } },
                                            { val: 'dark', label: 'Modo oscuro', preview: { bg: '#0f172a', card: '#1e293b', bar: '#4f46e5' } },
                                        ].map(tema => (
                                            <div
                                                key={tema.val}
                                                onClick={() => setConfig({ ...config, tema: tema.val })}
                                                style={{
                                                    border: `2px solid ${config.tema === tema.val ? '#1a1a2e' : '#e2e8f0'}`,
                                                    borderRadius: '10px', padding: '4px', cursor: 'pointer',
                                                    background: config.tema === tema.val ? '#f0f4ff' : 'white'
                                                }}
                                            >
                                                <div style={{ background: tema.preview.bg, borderRadius: '6px', padding: '10px', marginBottom: '8px', height: '80px' }}>
                                                    <div style={{ height: '8px', background: tema.preview.bar, borderRadius: '4px', marginBottom: '6px', width: '100%' }} />
                                                    <div style={{ background: tema.preview.card, borderRadius: '4px', height: '50px' }} />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '600' }}>{tema.label}</span>
                                                    {config.tema === tema.val && <span style={{ color: '#1a1a2e', fontWeight: '700' }}>✓</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Vista previa */}
                            <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vista previa</span>
                                </div>
                                <div style={{ padding: '20px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', color: '#1a1a2e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Sosa Bulls</p>
                                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>Panel de control</h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                                        <div style={{ background: '#e0e7ff', padding: '12px', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '9px', color: '#3730a3', fontWeight: '700', marginBottom: '4px' }}>VENTAS HOY</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e' }}>Gs. 0</p>
                                        </div>
                                        <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '8px' }}>
                                            <p style={{ fontSize: '9px', color: '#64748b', fontWeight: '700', marginBottom: '4px' }}>PEDIDOS</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>0</p>
                                        </div>
                                    </div>
                                    <button style={{ width: '100%', padding: '10px', background: '#1a1a2e', color: 'white', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                                        Acción primaria
                                    </button>
                                </div>
            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                            <button onClick={() => handleGuardarConfig()} disabled={guardando} style={btnPrimario}>{guardando ? 'Guardando...' : 'Guardar configuración'}</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal nuevo usuario */}
            {modalUsuario && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Nuevo usuario</h3>
                            <button onClick={() => setModalUsuario(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>
                        <label style={labelStyle}>Nombre</label>
                        <input value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} style={inputStyle} placeholder="Nombre completo" />
                        <label style={labelStyle}>Email</label>
                        <input value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} style={inputStyle} placeholder="email@ejemplo.com" type="email" />
                        <label style={labelStyle}>Contraseña</label>
                        <input value={formUsuario.password} onChange={e => setFormUsuario({ ...formUsuario, password: e.target.value })} style={inputStyle} placeholder="Mínimo 8 caracteres" type="password" />
                        <label style={labelStyle}>Rol</label>
                        <select value={formUsuario.rol_id} onChange={e => setFormUsuario({ ...formUsuario, rol_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin rol asignado</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalUsuario(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearUsuario} style={btnPrimario}>Crear usuario</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nuevo rol */}
            {modalRol && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '380px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Nuevo rol</h3>
                            <button onClick={() => setModalRol(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>
                        <label style={labelStyle}>Nombre del rol</label>
                        <input value={formRol.nombre} onChange={e => setFormRol({ ...formRol, nombre: e.target.value })} style={inputStyle} placeholder="Ej: Cajero, Supervisor, Repartidor" />
                        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', marginBottom: '16px' }}>Podrás configurar los permisos después de crearlo.</p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalRol(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearRol} style={btnPrimario}>Crear rol</button>
                        </div>
                    </div>
                </div>
            )}

            {modalConfirmar && (
                <ModalConfirmar
                    titulo={modalConfirmar.titulo}
                    mensaje={modalConfirmar.mensaje}
                    textoBoton={modalConfirmar.textoBoton}
                    colorBoton={modalConfirmar.colorBoton}
                    onConfirmar={modalConfirmar.onConfirmar}
                    onCancelar={() => setModalConfirmar(null)}
                />
            )}
        </div>
    )
}

export default Configuracion