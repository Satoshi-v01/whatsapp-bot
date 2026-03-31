import { useState, useEffect } from 'react'
import { getUsuarios, getRoles, crearRol, actualizarRol, eliminarRol, crearUsuario, eliminarUsuario } from '../services/usuarios'
import { getConfiguracion, guardarConfiguracionBulk } from '../services/configuracion'
import { getZonas, crearZona, editarZona, eliminarZona } from '../services/zonas'
import ModalConfirmar from '../components/ModalConfirmar'
import { imprimirFactura } from '../utils/factura'
import api from '../services/api'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'

const MODULOS = [
    { key: 'ventas', label: 'Ventas', icono: '🛒' },
    { key: 'caja', label: 'Caja', icono: '🧾' },
    { key: 'inventario', label: 'Inventario', icono: '📦' },
    { key: 'clientes', label: 'Clientes', icono: '👥' },
    { key: 'delivery', label: 'Delivery', icono: '🚚' },
    { key: 'proveedores', label: 'Proveedores', icono: '🏭' },
    { key: 'reportes', label: 'Reportes', icono: '📊' },
    { key: 'auditoria', label: 'Auditoría', icono: '🔍' },
    { key: 'configuracion', label: 'Configuración', icono: '⚙️' },
    { key: 'usuarios', label: 'Usuarios', icono: '👤' },
]

const ACCIONES_POR_MODULO = {
    ventas: ['ver', 'crear', 'editar', 'cancelar', 'exportar'],
    caja: ['ver', 'operar', 'imprimir', 'cierre'],
    inventario: ['ver', 'crear', 'editar', 'eliminar', 'gestionar_lotes'],
    clientes: ['ver', 'crear', 'editar', 'ver_cuenta_corriente', 'registrar_pago'],
    delivery: ['ver', 'crear', 'editar', 'asignar_repartidor', 'cambiar_estado'],
    proveedores: ['ver', 'crear', 'editar', 'eliminar', 'registrar_pago', 'exportar'],
    reportes: ['ver', 'exportar'],
    auditoria: ['ver'],
    configuracion: ['ver', 'editar'],
    usuarios: ['ver', 'crear', 'editar', 'eliminar'],
}

const LABEL_ACCIONES = {
    ver: 'Ver',
    crear: 'Crear',
    editar: 'Editar',
    eliminar: 'Eliminar',
    cancelar: 'Cancelar',
    exportar: 'Exportar',
    operar: 'Operar',
    imprimir: 'Imprimir',
    cierre: 'Cierre',
    gestionar_lotes: 'Lotes',
    ver_cuenta_corriente: 'Cta. Cte.',
    registrar_pago: 'Pagos',
    asignar_repartidor: 'Asignar',
    cambiar_estado: 'Estado',
}
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function Toggle({ checked, onChange }) {
    return (
        <div onClick={() => onChange(!checked)}
            style={{ width: '44px', height: '24px', borderRadius: '12px', cursor: 'pointer', background: checked ? '#1a1a2e' : '#e2e8f0', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </div>
    )
}

function Configuracion() {
    const [pestana, setPestana] = useState('usuarios')
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [configFactura, setConfigFactura] = useState({})
    const [reiniciandoFactura, setReiniciandoFactura] = useState(false)

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

    // Zonas de delivery
    const [zonas, setZonas] = useState([])
    const [modalZona, setModalZona] = useState(false)
    const [editandoZona, setEditandoZona] = useState(null) // null = nueva, objeto = editar
    const [formZona, setFormZona] = useState({ nombre: '', costo: '', activa: true })

    useEffect(() => { cargarDatos() }, [])

    async function cargarDatos() {
        try {
            const [u, r, c, z] = await Promise.all([getUsuarios(), getRoles(), getConfiguracion(), getZonas()])
            const resFactura = await api.get('/configuracion/factura')
            setUsuarios(u)
            setRoles(r)
            setConfig(c)
            setZonas(z)
            setConfigFactura(resFactura.data)
            if (r.length > 0) setRolSeleccionado(r[0])
            if (c.tienda_horario) {
                try { setHorario(JSON.parse(c.tienda_horario)) } catch (e) {}
            }
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron cargar los datos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
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
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo crear el usuario.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function handleEliminarUsuario(usuario) {
        setModalConfirmar({
            titulo: 'Eliminar usuario',
            mensaje: `¿Desactivar el usuario ${usuario.nombre}? No podrá iniciar sesión.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try { await eliminarUsuario(usuario.id); setModalConfirmar(null); await cargarDatos() }
                catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar el usuario.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
            }
        })
    }

    async function handleCrearRol() {
        if (!formRol.nombre) return
        try { await crearRol(formRol); setModalRol(false); setFormRol({ nombre: '', permisos: {} }); await cargarDatos() }
        catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo crear el rol.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
    }

    async function handleGuardarPermisos() {
        if (!rolSeleccionado) return
        try {
            await actualizarRol(rolSeleccionado.id, { permisos: rolSeleccionado.permisos })
            setModalConfirmar({ titulo: 'Permisos guardados', mensaje: 'Los permisos del rol fueron actualizados correctamente.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudieron guardar los permisos.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function togglePermiso(modulo, accion) {
        if (!rolSeleccionado) return
        const permisos = { ...(rolSeleccionado.permisos || {}) }
        const lista = permisos[modulo] || []
        permisos[modulo] = lista.includes(accion) ? lista.filter(a => a !== accion) : [...lista, accion]
        setRolSeleccionado({ ...rolSeleccionado, permisos })
    }

    function tienePermiso(modulo, accion) {
        if (!rolSeleccionado?.permisos) return false
        return (rolSeleccionado.permisos[modulo] || []).includes(accion)
    }

    async function handleGuardarFactura() {
        setGuardando(true)
        try {
            const datos = {}
            Object.entries(configFactura).forEach(([k, v]) => {
                datos[`factura_${k}`] = v
            })
            await guardarConfiguracionBulk(datos)
            setModalConfirmar({ titulo: '✅ Guardado', mensaje: 'Configuración de facturación guardada.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo guardar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setGuardando(false) }
    }

    async function handleReiniciarNumero() {
        setReiniciandoFactura(true)
        try {
            await api.post('/configuracion/factura/reiniciar-numero', { numero: 1 })
            setConfigFactura(prev => ({ ...prev, numero_actual: '1' }))
            setModalConfirmar({ titulo: '✅ Reiniciado', mensaje: 'El número de factura fue reiniciado a 1.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo reiniciar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setReiniciandoFactura(false) }
    }

    async function handleImprimirFacturaPrueba() {
        // Genera una factura de prueba sin incrementar el número
        const numeroFormateado = String(parseInt(configFactura.numero_actual || 1)).padStart(7, '0')
        const numeroFactura = `${configFactura.numero_prefijo || '001-002'}-${numeroFormateado}`
        imprimirFactura({
            numero_factura: numeroFactura,
            es_prueba: true,
            cliente_nombre: configFactura.cliente_ocasional || 'CONSUMIDOR FINAL',
            cliente_ruc: '—',
            tipo_venta: 'contado',
            metodo_pago: 'efectivo',
            monto_efectivo: 50000,
            items: [{ descripcion: 'PRODUCTO DE PRUEBA', cantidad: 1, precio_unitario: 50000, total: 50000, iva: 10 }],
            total: 50000,
            cajero: 'CAJERO PRUEBA',
            config: configFactura
        })
    }

    async function handleGuardarConfig(extras = {}) {
        setGuardando(true)
        try {
            await guardarConfiguracionBulk({ ...config, tienda_horario: JSON.stringify(horario), ...extras })
            setModalConfirmar({ titulo: '✅ Guardado', mensaje: 'Configuración guardada correctamente.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo guardar la configuración.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setGuardando(false) }
    }

    // Zonas handlers
    function abrirModalZona(zona = null) {
        if (zona) {
            setEditandoZona(zona)
            setFormZona({ nombre: zona.nombre, costo: zona.costo, activa: zona.activa })
        } else {
            setEditandoZona(null)
            setFormZona({ nombre: '', costo: '', activa: true })
        }
        setModalZona(true)
    }

    async function handleGuardarZona() {
        if (!formZona.nombre || formZona.costo === '') return
        try {
            if (editandoZona) {
                await editarZona(editandoZona.id, { nombre: formZona.nombre, costo: parseInt(formZona.costo), activa: formZona.activa })
            } else {
                await crearZona({ nombre: formZona.nombre, costo: parseInt(formZona.costo) })
            }
            setModalZona(false)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo guardar la zona.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function handleEliminarZona(zona) {
        setModalConfirmar({
            titulo: 'Eliminar zona',
            mensaje: `¿Eliminar la zona "${zona.nombre}"? Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try { await eliminarZona(zona.id); setModalConfirmar(null); await cargarDatos() }
                catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar la zona.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
            }
        })
    }

    // Horario — días abiertos hoy para vista previa
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const diaHoy = diasSemana[new Date().getDay()]
    const horarioHoy = horario[diaHoy]
    const abiertaHoy = horarioHoy?.activo

    const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', boxSizing: 'border-box', background: '#f8fafc' }
    const labelStyle = { fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
    const btnPrimario = { padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }
    const btnSecundario = { padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }

    const pestanas = [
        { key: 'usuarios', label: 'Usuarios y Roles', icono: '👥' },
        { key: 'notificaciones', label: 'Notificaciones', icono: '🔔' },
        { key: 'tienda', label: 'Tienda', icono: '🏪' },
        { key: 'bot', label: 'Bot', icono: '🤖' },
        { key: 'facturacion', label: 'Facturación', icono: '🧾' },
    ]

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden' }}>

            {/* Sidebar */}
            <div style={{ width: '220px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px', paddingLeft: '12px' }}>Configuración</p>
                {pestanas.map(p => (
                    <button key={p.key} onClick={() => setPestana(p.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', border: 'none', background: pestana === p.key ? 'white' : 'transparent', color: pestana === p.key ? '#1a1a2e' : '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: pestana === p.key ? '700' : '500', marginBottom: '4px', textAlign: 'left', width: '100%', boxShadow: pestana === p.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
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
                            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '700' }}>Usuarios del sistema</h2>
                                    <span style={{ fontSize: '10px', fontWeight: '700', background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase' }}>{usuarios.filter(u => u.disponible).length} activos</span>
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
                                                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                <td style={{ padding: '14px 24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#e0e7ff', color: '#3730a3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}>{u.nombre.slice(0, 2).toUpperCase()}</div>
                                                        <div>
                                                            <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{u.nombre}</p>
                                                            <p style={{ fontSize: '11px', color: '#94a3b8' }}>{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '14px 16px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: '#f1f5f9', color: '#475569' }}>{u.rol_nombre || u.rol || '—'}</span>
                                                </td>
                                                <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                                    <button onClick={() => handleEliminarUsuario(u)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
                                                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {usuarios.filter(u => u.disponible).length === 0 && (
                                            <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>No hay usuarios.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: '700' }}>Gestionar roles</h2>
                                    <button onClick={() => setModalRol(true)} style={{ fontSize: '12px', color: '#1a1a2e', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer' }}>+ Crear nuevo</button>
                                </div>
                                <div style={{ padding: '20px 24px', flex: 1 }}>
                                    <label style={labelStyle}>Rol seleccionado</label>
                                    <select value={rolSeleccionado?.id || ''} onChange={e => { const rol = roles.find(r => r.id === parseInt(e.target.value)); setRolSeleccionado(rol || null) }} style={{ ...inputStyle, marginBottom: '20px' }}>
                                        <option value="">Seleccionar rol...</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>
                                    <p style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>Permisos por módulo</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '420px', overflowY: 'auto' }}>
                                        {MODULOS.map(mod => {
                                            const acciones = ACCIONES_POR_MODULO[mod.key] || ['ver', 'crear', 'editar', 'eliminar']
                                            return (
                                                <div key={mod.key} style={{ padding: '10px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '130px' }}>
                                                            {mod.label}
                                                        </span>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {acciones.map(accion => {
                                                                const activo = tienePermiso(mod.key, accion)
                                                                return (
                                                                    <button key={accion} onClick={() => togglePermiso(mod.key, accion)}
                                                                        style={{
                                                                            padding: '3px 8px', borderRadius: '20px', border: '1px solid',
                                                                            fontSize: '10px', fontWeight: '600', cursor: 'pointer',
                                                                            background: activo ? '#1a1a2e' : 'white',
                                                                            color: activo ? 'white' : '#64748b',
                                                                            borderColor: activo ? '#1a1a2e' : '#e2e8f0',
                                                                            transition: 'all 0.15s'
                                                                        }}>
                                                                        {LABEL_ACCIONES[accion] || accion}
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
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
                                    <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Stock bajo</h3>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Recibí una alerta cuando un producto alcance el umbral mínimo definido.</p>
                                <label style={labelStyle}>Unidades mínimas</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={config.notif_stock_minimo || 3} onChange={e => setConfig({ ...config, notif_stock_minimo: e.target.value })} style={{ ...inputStyle, paddingRight: '80px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>UNIDADES</span>
                                </div>
                            </div>
                            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                    <div style={{ padding: '8px', background: '#e0e7ff', borderRadius: '8px', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                                    <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Chats esperando agente</h3>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Alerta de tiempo de espera excesivo para clientes en cola.</p>
                                <label style={labelStyle}>Tiempo de espera máximo</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={config.notif_chat_espera_minutos || 5} onChange={e => setConfig({ ...config, notif_chat_espera_minutos: e.target.value })} style={{ ...inputStyle, paddingRight: '80px' }} />
                                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>MINUTOS</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {[
                                { key: 'notif_pedidos_bot', label: 'Nuevos pedidos del bot', desc: 'Notificar cuando el bot finalice una orden con éxito.', icono: 'bot' },
                                { key: 'notif_sonido', label: 'Activar sonido', desc: 'Reproducir un tono audible para todas las notificaciones.', icono: 'sound' },
                            ].map(item => (
                                <div key={item.key} style={{ background: 'white', borderRadius: '12px', padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '8px', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', display: 'flex' }}>
                                            {item.icono === 'bot' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>}
                                            {item.icono === 'sound' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/><path d="M19.07 4.93a10 10 0 010 14.14"/></svg>}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '600' }}>{item.label}</p>
                                            <p style={{ fontSize: '12px', color: '#64748b' }}>{item.desc}</p>
                                        </div>
                                    </div>
                                    <Toggle checked={config[item.key] === 'true' || config[item.key] === true} onChange={val => setConfig({ ...config, [item.key]: String(val) })} />
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
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Administrá la identidad, horarios y zonas de delivery.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Info general */}
                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e', marginBottom: '20px' }}>ℹ️ Información general</h3>
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

                                {/* Horario */}
                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Horario de atención</h3>
                                        <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: abiertaHoy ? '#dcfce7' : '#fee2e2', color: abiertaHoy ? '#166534' : '#991b1b' }}>
                                            {abiertaHoy ? `Abierto hoy ${horarioHoy.desde} - ${horarioHoy.hasta}` : 'Cerrado hoy'}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '14px', background: '#f0f4ff', padding: '8px 12px', borderRadius: '8px' }}>
                                        El bot responderá fuera de horario con el mensaje configurado en la pestaña Bot.
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {DIAS.map(dia => (
                                            <div key={dia} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: horario[dia]?.activo ? '#f0f4ff' : '#f8fafc', gap: '12px', border: dia === diaHoy ? '1px solid #c7d2fe' : '1px solid transparent' }}>
                                                <span style={{ width: '90px', fontSize: '13px', fontWeight: dia === diaHoy ? '800' : '600', color: horario[dia]?.activo ? '#1a1a2e' : '#94a3b8' }}>
                                                    {dia} {dia === diaHoy && <span style={{ fontSize: '9px', color: '#4f46e5' }}>HOY</span>}
                                                </span>
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

                                {/* Zonas de delivery */}
                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div>
                                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Zonas de delivery</h3>
                                            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>El bot mostrará estas zonas y costos al cliente al elegir delivery.</p>
                                        </div>
                                        <button onClick={() => abrirModalZona()}
                                            style={{ padding: '8px 14px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                                            + Agregar zona
                                        </button>
                                    </div>

                                    {zonas.length === 0 ? (
                                        <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px', marginTop: '12px' }}>
                                            <p style={{ fontSize: '13px' }}>No hay zonas configuradas.</p>
                                            <p style={{ fontSize: '11px', marginTop: '4px' }}>Agregá zonas para habilitar delivery en el bot.</p>
                                        </div>
                                    ) : (
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto auto', gap: '0', background: '#f8fafc', borderRadius: '8px 8px 0 0', padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>
                                                <span />
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zona</span>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right', minWidth: '100px' }}>Costo</span>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', minWidth: '70px' }}>Estado</span>
                                                <span style={{ minWidth: '70px' }} />
                                            </div>
                                            {zonas.map((zona, i) => (
                                                <div key={zona.id} style={{ display: 'grid', gridTemplateColumns: '10px 1fr auto auto auto', gap: '0', alignItems: 'center', padding: '12px 14px', borderBottom: i < zonas.length - 1 ? '1px solid #f1f5f9' : 'none', background: 'white' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: zona.activa ? '#10b981' : '#94a3b8' }} />
                                                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a' }}>{zona.nombre}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1a1a2e', textAlign: 'right', minWidth: '100px' }}>Gs. {parseInt(zona.costo).toLocaleString('es-PY')}</span>
                                                    <div style={{ textAlign: 'center', minWidth: '70px' }}>
                                                        <Toggle checked={zona.activa} onChange={async val => {
                                                            try { await editarZona(zona.id, { activa: val }); await cargarDatos() } catch (e) {}
                                                        }} />
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', minWidth: '70px' }}>
                                                        <button onClick={() => abrirModalZona(zona)}
                                                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '11px' }}>✏️</button>
                                                        <button onClick={() => handleEliminarZona(zona)}
                                                            style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vista previa */}
                            <div style={{ position: 'sticky', top: '0' }}>
                                <div style={{ background: '#1a1a2e', borderRadius: '12px', padding: '24px', color: 'white', marginBottom: '16px' }}>
                                    <p style={{ fontSize: '10px', fontWeight: '700', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>Vista previa</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.8)' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                                        <div>
                                            <p style={{ fontWeight: '700', fontSize: '14px' }}>{config.tienda_nombre || 'Nombre de la tienda'}</p>
                                            <p style={{ fontSize: '11px', opacity: 0.6 }}>{abiertaHoy ? `Abierto hoy ${horarioHoy.desde} - ${horarioHoy.hasta}` : 'Cerrado hoy'}</p>
                                        </div>
                                    </div>
                                    {config.tienda_telefono && <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>{config.tienda_telefono}</p>}
                                    {config.tienda_email && <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>{config.tienda_email}</p>}
                                    {zonas.filter(z => z.activa).length > 0 && (
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '8px' }}>
                                            <p style={{ fontSize: '10px', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Delivery disponible</p>
                                            {zonas.filter(z => z.activa).slice(0, 3).map(z => (
                                                <p key={z.id} style={{ fontSize: '11px', opacity: 0.7, marginBottom: '2px' }}>• {z.nombre} — Gs. {parseInt(z.costo).toLocaleString('es-PY')}</p>
                                            ))}
                                            {zonas.filter(z => z.activa).length > 3 && <p style={{ fontSize: '11px', opacity: 0.5 }}>+{zonas.filter(z => z.activa).length - 3} zonas más</p>}
                                        </div>
                                    )}
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
                                    <p style={{ fontSize: '13px', fontWeight: '700', color: config.bot_activo === 'true' ? '#10b981' : '#ef4444' }}>{config.bot_activo === 'true' ? 'Activo' : 'Inactivo'}</p>
                                </div>
                                <Toggle checked={config.bot_activo === 'true'} onChange={val => setConfig({ ...config, bot_activo: String(val) })} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>Mensajes predeterminados</h3>
                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={labelStyle}>Mensaje de bienvenida</label>
                                        <textarea value={config.bot_mensaje_bienvenida || ''} onChange={e => setConfig({ ...config, bot_mensaje_bienvenida: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} placeholder="Ej: Hola! Bienvenido a Sosa Bulls" />
                                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Este mensaje se enviará automáticamente al iniciar una conversación.</p>
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Mensaje fuera de horario</label>
                                        <textarea value={config.bot_mensaje_fuera_horario || ''} onChange={e => setConfig({ ...config, bot_mensaje_fuera_horario: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} placeholder="Ej: Estamos fuera de horario. Te atenderemos pronto." />
                                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Se activa automáticamente según el horario configurado en Tienda.</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                                    <button onClick={() => handleGuardarConfig()} disabled={guardando} style={btnPrimario}>{guardando ? 'Guardando...' : 'Guardar cambios'}</button>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                        {[
                                            { label: 'Interacciones hoy', valor: '—', bgDark: true },
                                            { label: 'Tasa resolución', valor: '—' },
                                            { label: 'Latencia media', valor: '—' },
                                        ].map((stat, i) => (
                                            <div key={i} style={{ padding: '14px', borderRadius: '8px', background: stat.bgDark ? '#1a1a2e' : '#f8fafc' }}>
                                                <p style={{ fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: stat.bgDark ? 'rgba(255,255,255,0.6)' : '#94a3b8', marginBottom: '6px' }}>{stat.label}</p>
                                                <p style={{ fontSize: '18px', fontWeight: '800', color: stat.bgDark ? 'white' : '#0f172a' }}>{stat.valor}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Tiempo de reserva */}
                        <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>⏱️ Tiempo de reserva de stock</h3>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                                Cuando el cliente confirma una orden por el bot, el stock queda reservado durante este tiempo mientras un agente procesa el pedido. Si no se confirma, la reserva se libera automáticamente.
                            </p>
                            <label style={labelStyle}>Duración de la reserva</label>
                            <div style={{ position: 'relative', maxWidth: '200px' }}>
                                <input
                                    type="number"
                                    min="1"
                                    max="72"
                                    value={config.op_tiempo_reserva_horas || 2}
                                    onChange={e => setConfig({ ...config, op_tiempo_reserva_horas: e.target.value })}
                                    style={{ ...inputStyle, paddingRight: '70px' }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>HORAS</span>
                            </div>
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic' }}>
                                Recomendado: entre 1 y 4 horas. Máximo 72 horas.
                            </p>
                        </div>
                    </div>
                )}

                {/* ===== FACTURACIÓN ===== */}
                {pestana === 'facturacion' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
                            <div>
                                <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px' }}>Facturación</h1>
                                <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Configurá los datos del timbrado y formato de factura.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={handleImprimirFacturaPrueba}
                                    style={{ ...btnSecundario, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Factura de prueba
                                </button>
                                <button onClick={handleReiniciarNumero} disabled={reiniciandoFactura}
                                    style={{ ...btnSecundario, color: '#ef4444', borderColor: '#fca5a5' }}>
                                    {reiniciandoFactura ? 'Reiniciando...' : '↺ Reiniciar número'}
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                            {/* Datos de la empresa */}
                            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>Datos de la empresa</h3>
                                <label style={labelStyle}>Nombre de fantasía (opcional)</label>
                                <input value={configFactura.nombre_fantasia || ''} onChange={e => setConfigFactura({ ...configFactura, nombre_fantasia: e.target.value })} style={inputStyle} placeholder="Ej: SOSA BULLS" />
                                <label style={labelStyle}>Razón social *</label>
                                <input value={configFactura.nombre_empresa || ''} onChange={e => setConfigFactura({ ...configFactura, nombre_empresa: e.target.value })} style={inputStyle} placeholder="Ej: JUAN PEREZ S.A." />
                                <label style={labelStyle}>RUC de la empresa *</label>
                                <input value={configFactura.ruc_empresa || ''} onChange={e => setConfigFactura({ ...configFactura, ruc_empresa: e.target.value })} style={inputStyle} placeholder="80012345-6" />
                                <label style={labelStyle}>Actividad económica</label>
                                <input value={configFactura.actividad_economica || ''} onChange={e => setConfigFactura({ ...configFactura, actividad_economica: e.target.value })} style={inputStyle} placeholder="Venta de alimentos para mascotas" />
                                <label style={labelStyle}>Dirección casa matriz</label>
                                <input value={configFactura.direccion_matriz || ''} onChange={e => setConfigFactura({ ...configFactura, direccion_matriz: e.target.value })} style={inputStyle} placeholder="Av. Principal 123, Asunción" />
                                <label style={labelStyle}>Dirección sucursal (opcional)</label>
                                <input value={configFactura.direccion_sucursal || ''} onChange={e => setConfigFactura({ ...configFactura, direccion_sucursal: e.target.value })} style={inputStyle} placeholder="Solo si aplica" />
                                <label style={labelStyle}>Teléfonos / Email</label>
                                <input value={configFactura.telefonos || ''} onChange={e => setConfigFactura({ ...configFactura, telefonos: e.target.value })} style={inputStyle} placeholder="0981 123 456 / info@empresa.com" />
                            </div>

                            {/* Timbrado y numeración */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>Timbrado SET</h3>
                                    <label style={labelStyle}>Número de timbrado *</label>
                                    <input value={configFactura.timbrado || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado: e.target.value })} style={inputStyle} placeholder="18138433" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Vigencia desde</label>
                                            <input type="date" value={configFactura.timbrado_inicio || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado_inicio: e.target.value })} style={inputStyle} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Vigencia hasta</label>
                                            <input type="date" value={configFactura.timbrado_fin || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado_fin: e.target.value })} style={inputStyle} />
                                        </div>
                                    </div>
                                    <label style={labelStyle}>Prefijo de factura (establecimiento-punto)</label>
                                    <input value={configFactura.numero_prefijo || '001-002'} onChange={e => setConfigFactura({ ...configFactura, numero_prefijo: e.target.value })} style={inputStyle} placeholder="001-002" />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', marginTop: '4px' }}>
                                        <div>
                                            <p style={{ fontSize: '11px', color: '#64748b' }}>Número actual</p>
                                            <p style={{ fontSize: '16px', fontWeight: '800', color: '#1a1a2e', fontFamily: 'monospace' }}>
                                                {configFactura.numero_prefijo || '001-002'}-{String(parseInt(configFactura.numero_actual || 1)).padStart(7, '0')}
                                            </p>
                                        </div>
                                        <span style={{ fontSize: '10px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px', background: '#dcfce7', color: '#166534' }}>ACTIVO</span>
                                    </div>
                                </div>

                                <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                                    <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '20px' }}>⚙️ Opciones de impresión</h3>
                                    <label style={labelStyle}>Ancho de papel</label>
                                    <select value={configFactura.ancho_papel || '80'} onChange={e => setConfigFactura({ ...configFactura, ancho_papel: e.target.value })} style={inputStyle}>
                                        <option value="58">58mm (pequeño)</option>
                                        <option value="80">80mm (estándar)</option>
                                    </select>
                                    <label style={labelStyle}>Cliente ocasional (sin datos)</label>
                                    <input value={configFactura.cliente_ocasional || 'CONSUMIDOR FINAL'} onChange={e => setConfigFactura({ ...configFactura, cliente_ocasional: e.target.value })} style={inputStyle} placeholder="CONSUMIDOR FINAL" />
                                    <label style={labelStyle}>Mensaje de pie de factura</label>
                                    <textarea value={configFactura.mensaje_pie || '¡Gracias por su compra!'} onChange={e => setConfigFactura({ ...configFactura, mensaje_pie: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button onClick={() => cargarDatos()} style={btnSecundario}>Descartar</button>
                            <button onClick={handleGuardarFactura} disabled={guardando} style={btnPrimario}>
                                {guardando ? 'Guardando...' : 'Guardar configuración'}
                            </button>
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

            {/* Modal zona */}
            {modalZona && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '14px', padding: '24px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{editandoZona ? 'Editar zona' : 'Nueva zona de delivery'}</h3>
                            <button onClick={() => setModalZona(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>
                        <label style={labelStyle}>Nombre de la zona</label>
                        <input value={formZona.nombre} onChange={e => setFormZona({ ...formZona, nombre: e.target.value })} style={inputStyle} placeholder="Ej: Asunción, Luque, San Lorenzo" />
                        <label style={labelStyle}>Costo de delivery (Gs.)</label>
                        <input type="number" value={formZona.costo} onChange={e => setFormZona({ ...formZona, costo: e.target.value })} style={inputStyle} placeholder="Ej: 20000" />
                        {editandoZona && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', marginTop: '4px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '500', color: '#0f172a' }}>Zona activa</span>
                                <Toggle checked={formZona.activa} onChange={val => setFormZona({ ...formZona, activa: val })} />
                            </div>
                        )}
                        {formZona.nombre && formZona.costo && (
                            <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#166534' }}>
                                Vista previa: "{formZona.nombre} — Gs. {parseInt(formZona.costo || 0).toLocaleString('es-PY')}"
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalZona(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarZona} style={btnPrimario}>{editandoZona ? 'Guardar cambios' : 'Agregar zona'}</button>
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