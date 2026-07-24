import { useState, useEffect } from 'react'
import { useApp } from '../App'
import { getUsuarios, getRoles, crearRol, actualizarRol, eliminarRol, crearUsuario, eliminarUsuario, cambiarPassword } from '../services/usuarios'
import { getConfiguracion, guardarConfiguracionBulk } from '../services/configuracion'
import { getZonas, crearZona, editarZona, eliminarZona } from '../services/zonas'
import { getCuentasTransferenciaTodas, crearCuentaTransferencia, editarCuentaTransferencia, eliminarCuentaTransferencia } from '../services/cuentasTransferencia'
import ModalConfirmar from '../components/ModalConfirmar'
import { imprimirFactura } from '../utils/factura'
import api from '../services/api'
import { formatearFecha, formatearSoloFecha } from '../utils/fecha'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'

const MODULOS = [
    { key: 'inicio', label: 'Inicio' },
    { key: 'ventas', label: 'Ventas' },
    { key: 'caja', label: 'Caja' },
    { key: 'inventario', label: 'Inventario' },
    { key: 'clientes', label: 'Clientes' },
    { key: 'delivery', label: 'Delivery' },
    { key: 'proveedores', label: 'Proveedores' },
    { key: 'reportes', label: 'Reportes' },
    { key: 'auditoria', label: 'Auditoría' },
    { key: 'configuracion', label: 'Configuración' },
    { key: 'usuarios', label: 'Usuarios' },
    { key: 'chat', label: 'Chat' },
    { key: 'ordenes', label: 'Órdenes' },
]

const ACCIONES_POR_MODULO = {
    inicio: ['ver'],
    ventas: ['ver', 'crear', 'editar', 'cancelar', 'exportar'],
    caja: ['ver', 'operar', 'imprimir', 'cierre', 'precio_especial'],
    inventario: ['ver', 'crear', 'editar', 'eliminar', 'gestionar_lotes'],
    clientes: ['ver', 'crear', 'editar', 'ver_cuenta_corriente', 'registrar_pago'],
    delivery: ['ver', 'crear', 'editar', 'asignar_repartidor', 'cambiar_estado'],
    proveedores: ['ver', 'crear', 'editar', 'eliminar', 'registrar_pago', 'exportar'],
    reportes: ['ver', 'exportar'],
    auditoria: ['ver'],
    configuracion: ['ver', 'editar'],
    usuarios: ['ver', 'crear', 'editar', 'eliminar'],
    chat: ['ver'],
    ordenes: ['ver', 'crear', 'editar', 'cancelar'],
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
    precio_especial: 'Precio especial',
    gestionar_lotes: 'Lotes',
    ver_cuenta_corriente: 'Cta. Cte.',
    registrar_pago: 'Pagos',
    asignar_repartidor: 'Asignar',
    cambiar_estado: 'Estado',
}
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-900 outline-none box-border transition-shadow focus:border-slate-300 focus:ring-4 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-slate-100/5'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const cardCls = 'rounded-xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none'

const IconLapiz = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
const IconTacho = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></svg>
const IconInfo = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
const IconReloj = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
const IconEngranaje = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
const IconReiniciar = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></svg>

function Toggle({ checked, onChange }) {
    return <Switch checked={checked} onCheckedChange={onChange} />
}

function Configuracion() {
    const { usuario } = useApp()
    const [pestana, setPestana] = useState('usuarios')
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [guardando, setGuardando] = useState(false)

    // Cambio de contraseña
    const [formPassword, setFormPassword] = useState({ actual: '', nueva: '', confirmar: '' })
    const [errorPassword, setErrorPassword] = useState('')
    const [okPassword, setOkPassword] = useState(false)
    const [guardandoPassword, setGuardandoPassword] = useState(false)

    async function handleCambiarPassword() {
        setErrorPassword('')
        setOkPassword(false)
        const { actual, nueva, confirmar } = formPassword
        if (!actual || !nueva || !confirmar) { setErrorPassword('Completá todos los campos.'); return }
        if (nueva.length < 8) { setErrorPassword('La contraseña nueva debe tener al menos 8 caracteres.'); return }
        if (nueva !== confirmar) { setErrorPassword('Las contraseñas nuevas no coinciden.'); return }
        try {
            setGuardandoPassword(true)
            await cambiarPassword(usuario.id, actual, nueva)
            setFormPassword({ actual: '', nueva: '', confirmar: '' })
            setOkPassword(true)
        } catch (err) {
            setErrorPassword(err.response?.data?.error || 'No se pudo cambiar la contraseña.')
        } finally { setGuardandoPassword(false) }
    }
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

    // Cuentas de transferencia
    const [cuentasTransferencia, setCuentasTransferencia] = useState([])
    const [modalCuenta, setModalCuenta] = useState(false)
    const [editandoCuenta, setEditandoCuenta] = useState(null) // null = nueva, objeto = editar
    const [formCuenta, setFormCuenta] = useState({ banco: '', titular: '', numero_cuenta: '', alias: '', activa: true })

    useEffect(() => { cargarDatos() }, [])

    async function cargarDatos() {
        try {
            const [u, r, c, z, ct] = await Promise.all([getUsuarios(), getRoles(), getConfiguracion(), getZonas(), getCuentasTransferenciaTodas()])
            const resFactura = await api.get('/configuracion/factura')
            setUsuarios(u)
            setRoles(r)
            setConfig(c)
            setZonas(z)
            setCuentasTransferencia(ct)
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
            setModalConfirmar({ titulo: 'Guardado', mensaje: 'Configuración de facturación guardada.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo guardar.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        } finally { setGuardando(false) }
    }

    async function handleReiniciarNumero() {
        setReiniciandoFactura(true)
        try {
            await api.post('/configuracion/factura/reiniciar-numero', { numero: 1 })
            setConfigFactura(prev => ({ ...prev, numero_actual: '1' }))
            setModalConfirmar({ titulo: 'Reiniciado', mensaje: 'El número de factura fue reiniciado a 1.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
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
            setModalConfirmar({ titulo: 'Guardado', mensaje: 'Configuración guardada correctamente.', textoBoton: 'Cerrar', colorBoton: '#10b981', onConfirmar: () => setModalConfirmar(null) })
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

    // Cuentas de transferencia handlers
    function abrirModalCuenta(cuenta = null) {
        if (cuenta) {
            setEditandoCuenta(cuenta)
            setFormCuenta({ banco: cuenta.banco, titular: cuenta.titular, numero_cuenta: cuenta.numero_cuenta || '', alias: cuenta.alias || '', activa: cuenta.activa })
        } else {
            setEditandoCuenta(null)
            setFormCuenta({ banco: '', titular: '', numero_cuenta: '', alias: '', activa: true })
        }
        setModalCuenta(true)
    }

    async function handleGuardarCuenta() {
        if (!formCuenta.banco || !formCuenta.titular) return
        try {
            if (editandoCuenta) {
                await editarCuentaTransferencia(editandoCuenta.id, formCuenta)
            } else {
                await crearCuentaTransferencia(formCuenta)
            }
            setModalCuenta(false)
            await cargarDatos()
        } catch (err) {
            setModalConfirmar({ titulo: 'Error', mensaje: err.response?.data?.error || 'No se pudo guardar la cuenta.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) })
        }
    }

    function handleEliminarCuenta(cuenta) {
        setModalConfirmar({
            titulo: 'Eliminar cuenta',
            mensaje: `¿Eliminar la cuenta "${cuenta.banco} — ${cuenta.titular}"? Esta acción no se puede deshacer.`,
            textoBoton: 'Eliminar', colorBoton: '#ef4444',
            onConfirmar: async () => {
                try { await eliminarCuentaTransferencia(cuenta.id); setModalConfirmar(null); await cargarDatos() }
                catch (err) { setModalConfirmar({ titulo: 'Error', mensaje: 'No se pudo eliminar la cuenta.', textoBoton: 'Cerrar', colorBoton: '#888', onConfirmar: () => setModalConfirmar(null) }) }
            }
        })
    }

    // Horario — días abiertos hoy para vista previa
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    const diaHoy = diasSemana[new Date().getDay()]
    const horarioHoy = horario[diaHoy]
    const abiertaHoy = horarioHoy?.activo

    const pestanas = [
        { key: 'usuarios', label: 'Usuarios y Roles' },
        { key: 'notificaciones', label: 'Notificaciones' },
        { key: 'tienda', label: 'Tienda' },
        { key: 'bot', label: 'Bot' },
        { key: 'facturacion', label: 'Facturación' },
        { key: 'mi_cuenta', label: 'Mi cuenta' },
    ]

    return (
        <div className="split-content config-wrap flex h-[calc(100vh-56px)] overflow-hidden">

            {/* Sidebar */}
            <div className="config-nav flex w-[220px] shrink-0 flex-col bg-slate-50 border-r border-slate-200 p-6 px-3 dark:bg-slate-900 dark:border-slate-700">
                <p className="mb-4 pl-3 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Configuración</p>
                {pestanas.map(p => (
                    <button key={p.key} onClick={() => setPestana(p.key)}
                        className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border-none px-3 py-2.5 text-left text-[13px] transition-all ${pestana === p.key ? 'bg-white font-bold text-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-slate-800 dark:text-slate-100' : 'bg-transparent font-medium text-slate-500 dark:text-slate-400'}`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {/* Contenido */}
            <div className="page-scroll flex-1 overflow-y-auto p-8">

                {/* ===== USUARIOS Y ROLES ===== */}
                {pestana === 'usuarios' && (
                    <div>
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Usuarios y Roles</h1>
                                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Administrá los permisos y perfiles de usuario del sistema.</p>
                            </div>
                            <Button onClick={() => setModalUsuario(true)}>+ Nuevo usuario</Button>
                        </div>
                        <div className="grid grid-cols-[1fr_380px] gap-6">
                            <div className="overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Usuarios del sistema</h2>
                                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400">{usuarios.filter(u => u.disponible).length} activos</span>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50 dark:bg-slate-900">
                                            <TableHead className="px-6 py-2.5">Usuario</TableHead>
                                            <TableHead className="px-4 py-2.5">Rol</TableHead>
                                            <TableHead className="px-6 py-2.5 text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {usuarios.filter(u => u.disponible).map(u => (
                                            <TableRow key={u.id}>
                                                <TableCell className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 dark:bg-slate-700 dark:text-indigo-300">{u.nombre.slice(0, 2).toUpperCase()}</div>
                                                        <div>
                                                            <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{u.nombre}</p>
                                                            <p className="text-[11px] text-slate-400 dark:text-slate-500">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3.5">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{u.rol_nombre || u.rol || '—'}</span>
                                                </TableCell>
                                                <TableCell className="px-6 py-3.5 text-right">
                                                    <button onClick={() => handleEliminarUsuario(u)}
                                                        className="rounded-md border-none bg-transparent p-1.5 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"><IconTacho /></button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {usuarios.filter(u => u.disponible).length === 0 && (
                                            <TableRow><TableCell colSpan={3} className="p-6 text-center text-[13px] text-slate-400 dark:text-slate-500">No hay usuarios.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900">
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Gestionar roles</h2>
                                    <button onClick={() => setModalRol(true)} className="border-none bg-transparent text-xs font-bold text-slate-900 dark:text-slate-100">+ Crear nuevo</button>
                                </div>
                                <div className="flex-1 p-6">
                                    <label className={labelCls}>Rol seleccionado</label>
                                    <Select value={String(rolSeleccionado?.id || '')} onValueChange={v => { const rol = roles.find(r => r.id === parseInt(v)); setRolSeleccionado(rol || null) }}>
                                        <SelectTrigger className="mb-5"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">Seleccionar rol...</SelectItem>
                                            {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <p className="mb-3 border-b border-slate-100 pb-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:text-slate-100">Permisos por módulo</p>
                                    <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto">
                                        {MODULOS.map(mod => {
                                            const acciones = ACCIONES_POR_MODULO[mod.key] || ['ver', 'crear', 'editar', 'eliminar']
                                            return (
                                                <div key={mod.key} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                                        <span className="flex min-w-[130px] items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                                                            {mod.label}
                                                        </span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {acciones.map(accion => {
                                                                const activo = tienePermiso(mod.key, accion)
                                                                return (
                                                                    <button key={accion} onClick={() => togglePermiso(mod.key, accion)}
                                                                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all ${activo ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
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
                                    <div className="mt-5 flex gap-2">
                                        <Button onClick={handleGuardarPermisos} className="flex-1">Guardar cambios</Button>
                                        <Button variant="outline" onClick={() => cargarDatos()}>Descartar</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== NOTIFICACIONES ===== */}
                {pestana === 'notificaciones' && (
                    <div>
                        <div className="mb-7">
                            <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Notificaciones</h1>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Gestioná cómo y cuándo recibir alertas críticas del sistema.</p>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div className={cardCls}>
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex items-center justify-center rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10V7a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 7v10a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 17v-7" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg></div>
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Stock bajo</h3>
                                </div>
                                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Recibí una alerta cuando un producto alcance el umbral mínimo definido.</p>
                                <label className={labelCls}>Unidades mínimas</label>
                                <div className="relative">
                                    <input type="number" value={config.notif_stock_minimo || 3} onChange={e => setConfig({ ...config, notif_stock_minimo: e.target.value })} className={`${inputCls} pr-20`} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500">UNIDADES</span>
                                </div>
                            </div>
                            <div className={cardCls}>
                                <div className="mb-3 flex items-center gap-3">
                                    <div className="flex items-center justify-center rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg></div>
                                    <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Chats esperando agente</h3>
                                </div>
                                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Alerta de tiempo de espera excesivo para clientes en cola.</p>
                                <label className={labelCls}>Tiempo de espera máximo</label>
                                <div className="relative">
                                    <input type="number" value={config.notif_chat_espera_minutos || 5} onChange={e => setConfig({ ...config, notif_chat_espera_minutos: e.target.value })} className={`${inputCls} pr-20`} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500">MINUTOS</span>
                                </div>
                            </div>
                        </div>
                        <div className="mb-6 flex flex-col gap-3">
                            {[
                                { key: 'notif_pedidos_bot', label: 'Nuevos pedidos del bot', desc: 'Notificar cuando el bot finalice una orden con éxito.', icono: 'bot' },
                                { key: 'notif_sonido', label: 'Activar sonido', desc: 'Reproducir un tono audible para todas las notificaciones.', icono: 'sound' },
                            ].map(item => (
                                <div key={item.key} className="flex items-center justify-between rounded-xl bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                                    <div className="flex items-center gap-3">
                                        <div className="flex rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                                            {item.icono === 'bot' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><line x1="8" y1="15" x2="8" y2="17" /><line x1="16" y1="15" x2="16" y2="17" /></svg>}
                                            {item.icono === 'sound' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 010 7.07" /><path d="M19.07 4.93a10 10 0 010 14.14" /></svg>}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.label}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                        </div>
                                    </div>
                                    <Toggle checked={config[item.key] === 'true' || config[item.key] === true} onChange={val => setConfig({ ...config, [item.key]: String(val) })} />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => cargarDatos()}>Descartar</Button>
                            <Button onClick={() => handleGuardarConfig()} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar configuración'}</Button>
                        </div>
                    </div>
                )}

                {/* ===== TIENDA ===== */}
                {pestana === 'tienda' && (
                    <div>
                        <div className="mb-7">
                            <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Configuración de la Tienda</h1>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Administrá la identidad, horarios y zonas de delivery.</p>
                        </div>

                        <div className="grid grid-cols-[1fr_280px] gap-6">
                            <div className="flex flex-col gap-5">

                                {/* Info general */}
                                <div className={cardCls}>
                                    <h3 className="mb-5 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100"><IconInfo /> Información general</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className={labelCls}>Nombre de la tienda</label>
                                            <input value={config.tienda_nombre || ''} onChange={e => setConfig({ ...config, tienda_nombre: e.target.value })} className={inputCls} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className={labelCls}>Dirección</label>
                                            <input value={config.tienda_direccion || ''} onChange={e => setConfig({ ...config, tienda_direccion: e.target.value })} placeholder="Dirección de la tienda" className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Teléfono</label>
                                            <input value={config.tienda_telefono || ''} onChange={e => setConfig({ ...config, tienda_telefono: e.target.value })} placeholder="Número de contacto" className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Email</label>
                                            <input value={config.tienda_email || ''} onChange={e => setConfig({ ...config, tienda_email: e.target.value })} placeholder="email@tienda.com" className={inputCls} />
                                        </div>
                                    </div>
                                </div>

                                {/* Horario */}
                                <div className={cardCls}>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Horario de atención</h3>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${abiertaHoy ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400'}`}>
                                            {abiertaHoy ? `Abierto hoy ${horarioHoy.desde} - ${horarioHoy.hasta}` : 'Cerrado hoy'}
                                        </span>
                                    </div>
                                    <p className="mb-3.5 rounded-lg bg-indigo-50 px-3 py-2 text-[11px] text-slate-500 dark:bg-indigo-500/10 dark:text-slate-400">
                                        El bot responderá fuera de horario con el mensaje configurado en la pestaña Bot.
                                    </p>
                                    <div className="flex flex-col gap-1">
                                        {DIAS.map(dia => (
                                            <div key={dia} className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 ${horario[dia]?.activo ? 'bg-indigo-50 dark:bg-indigo-500/10' : 'bg-slate-50 dark:bg-slate-900'} ${dia === diaHoy ? 'border border-indigo-200 dark:border-indigo-500/40' : 'border border-transparent'}`}>
                                                <span className={`w-[90px] text-[13px] ${dia === diaHoy ? 'font-extrabold' : 'font-semibold'} ${horario[dia]?.activo ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                                    {dia} {dia === diaHoy && <span className="text-[9px] text-indigo-600 dark:text-indigo-400">HOY</span>}
                                                </span>
                                                {horario[dia]?.activo ? (
                                                    <div className="flex flex-1 items-center gap-2">
                                                        <input type="time" value={horario[dia]?.desde || '08:00'} onChange={e => setHorario({ ...horario, [dia]: { ...horario[dia], desde: e.target.value } })} className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                                                        <span className="text-slate-400 dark:text-slate-500">—</span>
                                                        <input type="time" value={horario[dia]?.hasta || '18:00'} onChange={e => setHorario({ ...horario, [dia]: { ...horario[dia], hasta: e.target.value } })} className="rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                                                    </div>
                                                ) : (
                                                    <span className="flex-1 text-xs italic text-slate-400 dark:text-slate-500">Cerrado</span>
                                                )}
                                                <Toggle checked={horario[dia]?.activo || false} onChange={val => setHorario({ ...horario, [dia]: { ...horario[dia], activo: val } })} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Zonas de delivery */}
                                <div className={cardCls}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Zonas de delivery</h3>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">El bot mostrará estas zonas y costos al cliente al elegir delivery.</p>
                                        </div>
                                        <Button size="sm" onClick={() => abrirModalZona()}>+ Agregar zona</Button>
                                    </div>

                                    {zonas.length === 0 ? (
                                        <div className="mt-3 rounded-lg bg-slate-50 p-6 text-center text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                                            <p className="text-[13px]">No hay zonas configuradas.</p>
                                            <p className="mt-1 text-[11px]">Agregá zonas para habilitar delivery en el bot.</p>
                                        </div>
                                    ) : (
                                        <div className="mt-3">
                                            <div className="grid grid-cols-[10px_1fr_auto_auto_auto] items-center gap-0 rounded-t-lg border-b border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                                                <span />
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Zona</span>
                                                <span className="min-w-[100px] text-right text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Costo</span>
                                                <span className="min-w-[70px] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</span>
                                                <span className="min-w-[70px]" />
                                            </div>
                                            {zonas.map((zona, i) => (
                                                <div key={zona.id} className={`grid grid-cols-[10px_1fr_auto_auto_auto] items-center gap-0 bg-white px-3.5 py-3 dark:bg-slate-800 ${i < zonas.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                                                    <div className={`h-2 w-2 rounded-full ${zona.activa ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{zona.nombre}</span>
                                                    <span className="min-w-[100px] text-right text-[13px] font-bold text-slate-900 dark:text-slate-100">Gs. {parseInt(zona.costo).toLocaleString('es-PY')}</span>
                                                    <div className="min-w-[70px] text-center">
                                                        <Toggle checked={zona.activa} onChange={async val => {
                                                            try { await editarZona(zona.id, { activa: val }); await cargarDatos() } catch (e) {}
                                                        }} />
                                                    </div>
                                                    <div className="flex min-w-[70px] justify-end gap-1">
                                                        <button onClick={() => abrirModalZona(zona)}
                                                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"><IconLapiz /></button>
                                                        <button onClick={() => handleEliminarZona(zona)}
                                                            className="flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-1 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"><IconTacho /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Cuentas de transferencia */}
                                <div className={cardCls}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Cuentas de transferencia</h3>
                                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">En Caja se podrá elegir a qué cuenta se transfirió cada venta.</p>
                                        </div>
                                        <Button size="sm" onClick={() => abrirModalCuenta()}>+ Agregar cuenta</Button>
                                    </div>

                                    {cuentasTransferencia.length === 0 ? (
                                        <div className="mt-3 rounded-lg bg-slate-50 p-6 text-center text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                                            <p className="text-[13px]">No hay cuentas configuradas.</p>
                                            <p className="mt-1 text-[11px]">Agregá tus cuentas bancarias para registrar las transferencias.</p>
                                        </div>
                                    ) : (
                                        <div className="mt-3">
                                            <div className="grid grid-cols-[10px_1fr_1fr_1fr_auto_auto] items-center gap-0 rounded-t-lg border-b border-slate-200 bg-slate-50 px-3.5 py-2 dark:border-slate-700 dark:bg-slate-900">
                                                <span />
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Banco</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Titular</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Nro / Alias</span>
                                                <span className="min-w-[70px] text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Estado</span>
                                                <span className="min-w-[70px]" />
                                            </div>
                                            {cuentasTransferencia.map((cuenta, i) => (
                                                <div key={cuenta.id} className={`grid grid-cols-[10px_1fr_1fr_1fr_auto_auto] items-center gap-0 bg-white px-3.5 py-3 dark:bg-slate-800 ${i < cuentasTransferencia.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
                                                    <div className={`h-2 w-2 rounded-full ${cuenta.activa ? 'bg-green-500' : 'bg-slate-400'}`} />
                                                    <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{cuenta.banco}</span>
                                                    <span className="text-[13px] text-slate-700 dark:text-slate-300">{cuenta.titular}</span>
                                                    <span className="text-[12px] text-slate-500 dark:text-slate-400">
                                                        {cuenta.numero_cuenta && <>N° {cuenta.numero_cuenta}</>}
                                                        {cuenta.numero_cuenta && cuenta.alias && <> · </>}
                                                        {cuenta.alias && <>Alias {cuenta.alias}</>}
                                                    </span>
                                                    <div className="min-w-[70px] text-center">
                                                        <Toggle checked={cuenta.activa} onChange={async val => {
                                                            try { await editarCuentaTransferencia(cuenta.id, { activa: val }); await cargarDatos() } catch (e) {}
                                                        }} />
                                                    </div>
                                                    <div className="flex min-w-[70px] justify-end gap-1">
                                                        <button onClick={() => abrirModalCuenta(cuenta)}
                                                            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"><IconLapiz /></button>
                                                        <button onClick={() => handleEliminarCuenta(cuenta)}
                                                            className="flex items-center rounded-md border border-red-300 bg-red-100 px-2 py-1 text-red-800 dark:border-red-500/30 dark:bg-red-500/15 dark:text-red-400"><IconTacho /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Vista previa */}
                            <div className="sticky top-0">
                                <div className="mb-4 rounded-xl bg-slate-900 p-6 text-white">
                                    <p className="mb-4 text-[10px] font-bold uppercase tracking-widest opacity-60">Vista previa</p>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/15 text-white/80"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg></div>
                                        <div>
                                            <p className="text-sm font-bold">{config.tienda_nombre || 'Nombre de la tienda'}</p>
                                            <p className="text-[11px] opacity-60">{abiertaHoy ? `Abierto hoy ${horarioHoy.desde} - ${horarioHoy.hasta}` : 'Cerrado hoy'}</p>
                                        </div>
                                    </div>
                                    {config.tienda_telefono && <p className="mb-1 text-xs opacity-70">{config.tienda_telefono}</p>}
                                    {config.tienda_email && <p className="mb-2 text-xs opacity-70">{config.tienda_email}</p>}
                                    {zonas.filter(z => z.activa).length > 0 && (
                                        <div className="mt-2 border-t border-white/10 pt-3">
                                            <p className="mb-1.5 text-[10px] uppercase tracking-wide opacity-50">Delivery disponible</p>
                                            {zonas.filter(z => z.activa).slice(0, 3).map(z => (
                                                <p key={z.id} className="mb-0.5 text-[11px] opacity-70">• {z.nombre} — Gs. {parseInt(z.costo).toLocaleString('es-PY')}</p>
                                            ))}
                                            {zonas.filter(z => z.activa).length > 3 && <p className="text-[11px] opacity-50">+{zonas.filter(z => z.activa).length - 3} zonas más</p>}
                                        </div>
                                    )}
                                </div>
                                <Button onClick={() => handleGuardarConfig()} disabled={guardando} className="mb-2 w-full">
                                    {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </Button>
                                <Button variant="outline" onClick={() => cargarDatos()} className="w-full">Descartar</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== BOT ===== */}
                {pestana === 'bot' && (
                    <div>
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Configuración del Bot</h1>
                                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Gestioná la automatización y el comportamiento de tu asistente virtual.</p>
                            </div>
                            <div className="flex items-center gap-3 rounded-[10px] bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">Estado del bot</p>
                                    <p className={`text-[13px] font-bold ${config.bot_activo === 'true' ? 'text-green-500' : 'text-red-500'}`}>{config.bot_activo === 'true' ? 'Activo' : 'Inactivo'}</p>
                                </div>
                                <Toggle checked={config.bot_activo === 'true'} onChange={val => setConfig({ ...config, bot_activo: String(val) })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-[1fr_320px] gap-5">
                            <div className="flex flex-col gap-5">
                                <div className={cardCls}>
                                    <h3 className="mb-5 text-sm font-bold text-slate-900 dark:text-slate-100">Mensajes predeterminados</h3>
                                    <div className="mb-4">
                                        <label className={labelCls}>Mensaje de bienvenida</label>
                                        <textarea value={config.bot_mensaje_bienvenida || ''} onChange={e => setConfig({ ...config, bot_mensaje_bienvenida: e.target.value })} rows={4} className={`${inputCls} resize-none font-sans`} placeholder="Ej: Hola! Bienvenido a Sosa Bulls" />
                                        <p className="mt-1 text-[11px] italic text-slate-400 dark:text-slate-500">Este mensaje se enviará automáticamente al iniciar una conversación.</p>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Mensaje fuera de horario</label>
                                        <textarea value={config.bot_mensaje_fuera_horario || ''} onChange={e => setConfig({ ...config, bot_mensaje_fuera_horario: e.target.value })} rows={4} className={`${inputCls} resize-none font-sans`} placeholder="Ej: Estamos fuera de horario. Te atenderemos pronto." />
                                        <p className="mt-1 text-[11px] italic text-slate-400 dark:text-slate-500">Se activa automáticamente según el horario configurado en Tienda.</p>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => cargarDatos()}>Descartar</Button>
                                    <Button onClick={() => handleGuardarConfig()} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar cambios'}</Button>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="rounded-xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { label: 'Interacciones hoy', valor: '—', bgDark: true },
                                            { label: 'Tasa resolución', valor: '—' },
                                            { label: 'Latencia media', valor: '—' },
                                        ].map((stat, i) => (
                                            <div key={i} className={`rounded-lg p-3.5 ${stat.bgDark ? 'bg-slate-900' : 'bg-slate-50 dark:bg-slate-900'}`}>
                                                <p className={`mb-1.5 text-[9px] font-bold uppercase tracking-wide ${stat.bgDark ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>{stat.label}</p>
                                                <p className={`text-lg font-extrabold ${stat.bgDark ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>{stat.valor}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Tiempo de reserva */}
                                <div className={cardCls}>
                                    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100"><IconReloj /> Tiempo de reserva de stock</h3>
                                    <p className="mb-5 text-xs text-slate-500 dark:text-slate-400">
                                        Cuando el cliente confirma una orden por el bot, el stock queda reservado durante este tiempo mientras un agente procesa el pedido. Si no se confirma, la reserva se libera automáticamente.
                                    </p>
                                    <label className={labelCls}>Duración de la reserva</label>
                                    <div className="relative max-w-[200px]">
                                        <input
                                            type="number"
                                            min="1"
                                            max="72"
                                            value={config.op_tiempo_reserva_horas || 2}
                                            onChange={e => setConfig({ ...config, op_tiempo_reserva_horas: e.target.value })}
                                            className={`${inputCls} pr-[70px]`}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 dark:text-slate-500">HORAS</span>
                                    </div>
                                    <p className="mt-2 text-[11px] italic text-slate-400 dark:text-slate-500">
                                        Recomendado: entre 1 y 4 horas. Máximo 72 horas.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== FACTURACIÓN ===== */}
                {pestana === 'facturacion' && (
                    <div>
                        <div className="mb-7 flex items-end justify-between">
                            <div>
                                <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Facturación</h1>
                                <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Configurá los datos del timbrado y formato de factura.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleImprimirFacturaPrueba}>Factura de prueba</Button>
                                <Button variant="outline" onClick={handleReiniciarNumero} disabled={reiniciandoFactura} className="border-red-300 text-red-500">
                                    <IconReiniciar /> {reiniciandoFactura ? 'Reiniciando...' : 'Reiniciar número'}
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-5">

                            {/* Datos de la empresa */}
                            <div className={cardCls}>
                                <h3 className="mb-5 text-sm font-bold text-slate-900 dark:text-slate-100">Datos de la empresa</h3>
                                <label className={labelCls}>Nombre de fantasía (opcional)</label>
                                <input value={configFactura.nombre_fantasia || ''} onChange={e => setConfigFactura({ ...configFactura, nombre_fantasia: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: SOSA BULLS" />
                                <label className={labelCls}>Razón social *</label>
                                <input value={configFactura.nombre_empresa || ''} onChange={e => setConfigFactura({ ...configFactura, nombre_empresa: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: JUAN PEREZ S.A." />
                                <label className={labelCls}>RUC de la empresa *</label>
                                <input value={configFactura.ruc_empresa || ''} onChange={e => setConfigFactura({ ...configFactura, ruc_empresa: e.target.value })} className={`${inputCls} mb-3`} placeholder="80012345-6" />
                                <label className={labelCls}>Actividad económica</label>
                                <input value={configFactura.actividad_economica || ''} onChange={e => setConfigFactura({ ...configFactura, actividad_economica: e.target.value })} className={`${inputCls} mb-3`} placeholder="Venta de alimentos para mascotas" />
                                <label className={labelCls}>Dirección casa matriz</label>
                                <input value={configFactura.direccion_matriz || ''} onChange={e => setConfigFactura({ ...configFactura, direccion_matriz: e.target.value })} className={`${inputCls} mb-3`} placeholder="Av. Principal 123, Asunción" />
                                <label className={labelCls}>Dirección sucursal (opcional)</label>
                                <input value={configFactura.direccion_sucursal || ''} onChange={e => setConfigFactura({ ...configFactura, direccion_sucursal: e.target.value })} className={`${inputCls} mb-3`} placeholder="Solo si aplica" />
                                <label className={labelCls}>Teléfono</label>
                                <input value={configFactura.telefonos || ''} onChange={e => setConfigFactura({ ...configFactura, telefonos: e.target.value })} className={`${inputCls} mb-3`} placeholder="0981 123 456" />
                                <label className={labelCls}>Correo electrónico</label>
                                <input value={configFactura.correo || ''} onChange={e => setConfigFactura({ ...configFactura, correo: e.target.value })} className={inputCls} placeholder="info@empresa.com" />
                            </div>

                            {/* Timbrado y numeración */}
                            <div className="flex flex-col gap-5">
                                <div className={cardCls}>
                                    <h3 className="mb-5 text-sm font-bold text-slate-900 dark:text-slate-100">Timbrado DNIT</h3>
                                    <label className={labelCls}>Número de timbrado *</label>
                                    <input value={configFactura.timbrado || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado: e.target.value })} className={`${inputCls} mb-3`} placeholder="18138433" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelCls}>Vigencia desde</label>
                                            <input type="date" value={configFactura.timbrado_inicio || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado_inicio: e.target.value })} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Vigencia hasta</label>
                                            <input type="date" value={configFactura.timbrado_fin || ''} onChange={e => setConfigFactura({ ...configFactura, timbrado_fin: e.target.value })} className={inputCls} />
                                        </div>
                                    </div>
                                    <label className={labelCls}>Prefijo de factura (establecimiento-punto)</label>
                                    <input value={configFactura.numero_prefijo || '001-002'} onChange={e => setConfigFactura({ ...configFactura, numero_prefijo: e.target.value })} className={inputCls} placeholder="001-002" />
                                    <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3 dark:bg-slate-900">
                                        <div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Número actual</p>
                                            <p className="font-mono text-base font-extrabold text-slate-900 dark:text-slate-100">
                                                {configFactura.numero_prefijo || '001-002'}-{String(parseInt(configFactura.numero_actual || 1)).padStart(7, '0')}
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-800 dark:bg-green-500/15 dark:text-green-400">ACTIVO</span>
                                    </div>
                                </div>

                                <div className={cardCls}>
                                    <h3 className="mb-5 flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100"><IconEngranaje /> Opciones de impresión</h3>
                                    <label className={labelCls}>Ancho de papel</label>
                                    <Select value={configFactura.ancho_papel || '80'} onValueChange={v => setConfigFactura({ ...configFactura, ancho_papel: v })}>
                                        <SelectTrigger className="mb-3"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="58">58mm (pequeño)</SelectItem>
                                            <SelectItem value="76">76mm (Epson TM-U220D)</SelectItem>
                                            <SelectItem value="80">80mm (estándar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <label className={labelCls}>Cliente ocasional (sin datos)</label>
                                    <input value={configFactura.cliente_ocasional || 'CONSUMIDOR FINAL'} onChange={e => setConfigFactura({ ...configFactura, cliente_ocasional: e.target.value })} className={`${inputCls} mb-3`} placeholder="CONSUMIDOR FINAL" />
                                    <label className={labelCls}>Mensaje de pie de factura</label>
                                    <textarea value={configFactura.mensaje_pie || '¡Gracias por su compra!'} onChange={e => setConfigFactura({ ...configFactura, mensaje_pie: e.target.value })} rows={3} className={`${inputCls} resize-none font-sans`} />
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => cargarDatos()}>Descartar</Button>
                            <Button onClick={handleGuardarFactura} disabled={guardando}>
                                {guardando ? 'Guardando...' : 'Guardar configuración'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* ===== MI CUENTA ===== */}
                {pestana === 'mi_cuenta' && (
                    <div className="max-w-[480px]">
                        <div className="mb-7">
                            <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Mi cuenta</h1>
                            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Cambiá tu contraseña de acceso al sistema.</p>
                        </div>

                        <div className="rounded-xl bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:border dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
                            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                                <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Usuario</p>
                                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{usuario?.nombre}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{usuario?.email}</p>
                            </div>

                            <label className={labelCls}>Contraseña actual</label>
                            <input
                                type="password"
                                value={formPassword.actual}
                                onChange={e => { setFormPassword({ ...formPassword, actual: e.target.value }); setErrorPassword(''); setOkPassword(false) }}
                                className={`${inputCls} mb-3`}
                                placeholder="Tu contraseña actual"
                            />

                            <label className={labelCls}>Contraseña nueva</label>
                            <input
                                type="password"
                                value={formPassword.nueva}
                                onChange={e => { setFormPassword({ ...formPassword, nueva: e.target.value }); setErrorPassword(''); setOkPassword(false) }}
                                className={`${inputCls} mb-3`}
                                placeholder="Mínimo 8 caracteres"
                            />

                            <label className={labelCls}>Confirmar contraseña nueva</label>
                            <input
                                type="password"
                                value={formPassword.confirmar}
                                onChange={e => { setFormPassword({ ...formPassword, confirmar: e.target.value }); setErrorPassword(''); setOkPassword(false) }}
                                className={inputCls}
                                placeholder="Repetí la contraseña nueva"
                            />

                            {/* Indicador de coincidencia */}
                            {formPassword.confirmar.length > 0 && (
                                <p className={`mt-1.5 text-xs font-semibold ${formPassword.nueva === formPassword.confirmar ? 'text-green-500' : 'text-red-500'}`}>
                                    {formPassword.nueva === formPassword.confirmar ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
                                </p>
                            )}

                            {errorPassword && (
                                <div className="mt-3.5 rounded-lg border border-red-300 bg-red-100 px-3.5 py-2.5 dark:border-red-500/30 dark:bg-red-500/15">
                                    <p className="text-[13px] font-medium text-red-800 dark:text-red-400">{errorPassword}</p>
                                </div>
                            )}

                            {okPassword && (
                                <div className="mt-3.5 rounded-lg border border-green-300 bg-green-100 px-3.5 py-2.5 dark:border-green-500/30 dark:bg-green-500/15">
                                    <p className="text-[13px] font-semibold text-green-800 dark:text-green-400">Contraseña cambiada correctamente.</p>
                                </div>
                            )}

                            <Button
                                onClick={handleCambiarPassword}
                                disabled={guardandoPassword}
                                className="mt-5 w-full">
                                {guardandoPassword ? 'Guardando...' : 'Cambiar contraseña'}
                            </Button>
                        </div>
                    </div>
                )}

            </div>

            {/* Modal nuevo usuario */}
            {modalUsuario && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[420px] rounded-xl bg-white p-6 dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nuevo usuario</h3>
                            <button onClick={() => setModalUsuario(false)} className="border-none bg-transparent text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <label className={labelCls}>Nombre</label>
                        <input value={formUsuario.nombre} onChange={e => setFormUsuario({ ...formUsuario, nombre: e.target.value })} className={`${inputCls} mb-3`} placeholder="Nombre completo" />
                        <label className={labelCls}>Email</label>
                        <input value={formUsuario.email} onChange={e => setFormUsuario({ ...formUsuario, email: e.target.value })} className={`${inputCls} mb-3`} placeholder="email@ejemplo.com" type="email" />
                        <label className={labelCls}>Contraseña</label>
                        <input value={formUsuario.password} onChange={e => setFormUsuario({ ...formUsuario, password: e.target.value })} className={`${inputCls} mb-3`} placeholder="Mínimo 8 caracteres" type="password" />
                        <label className={labelCls}>Rol</label>
                        <Select value={formUsuario.rol_id} onValueChange={v => setFormUsuario({ ...formUsuario, rol_id: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">Sin rol asignado</SelectItem>
                                {roles.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <div className="mt-2 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalUsuario(false)}>Cancelar</Button>
                            <Button onClick={handleCrearUsuario}>Crear usuario</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nuevo rol */}
            {modalRol && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[380px] rounded-xl bg-white p-6 dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nuevo rol</h3>
                            <button onClick={() => setModalRol(false)} className="border-none bg-transparent text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <label className={labelCls}>Nombre del rol</label>
                        <input value={formRol.nombre} onChange={e => setFormRol({ ...formRol, nombre: e.target.value })} className={inputCls} placeholder="Ej: Cajero, Supervisor, Repartidor" />
                        <p className="mb-4 mt-1 text-xs text-slate-400 dark:text-slate-500">Podrás configurar los permisos después de crearlo.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalRol(false)}>Cancelar</Button>
                            <Button onClick={handleCrearRol}>Crear rol</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal zona */}
            {modalZona && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[380px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{editandoZona ? 'Editar zona' : 'Nueva zona de delivery'}</h3>
                            <button onClick={() => setModalZona(false)} className="border-none bg-transparent text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <label className={labelCls}>Nombre de la zona</label>
                        <input value={formZona.nombre} onChange={e => setFormZona({ ...formZona, nombre: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: Asunción, Luque, San Lorenzo" />
                        <label className={labelCls}>Costo de delivery (Gs.)</label>
                        <input type="number" value={formZona.costo} onChange={e => setFormZona({ ...formZona, costo: e.target.value })} className={inputCls} placeholder="Ej: 20000" />
                        {editandoZona && (
                            <div className="mb-2 mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3 dark:bg-slate-900">
                                <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">Zona activa</span>
                                <Toggle checked={formZona.activa} onChange={val => setFormZona({ ...formZona, activa: val })} />
                            </div>
                        )}
                        {formZona.nombre && formZona.costo && (
                            <div className="mb-4 rounded-lg bg-green-50 px-3.5 py-2.5 text-xs text-green-800 dark:bg-green-500/10 dark:text-green-400">
                                Vista previa: "{formZona.nombre} — Gs. {parseInt(formZona.costo || 0).toLocaleString('es-PY')}"
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalZona(false)}>Cancelar</Button>
                            <Button onClick={handleGuardarZona}>{editandoZona ? 'Guardar cambios' : 'Agregar zona'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal cuenta de transferencia */}
            {modalCuenta && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
                    <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
                        <div className="mb-5 flex items-center justify-between">
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{editandoCuenta ? 'Editar cuenta' : 'Nueva cuenta de transferencia'}</h3>
                            <button onClick={() => setModalCuenta(false)} className="border-none bg-transparent text-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <label className={labelCls}>Banco</label>
                        <input value={formCuenta.banco} onChange={e => setFormCuenta({ ...formCuenta, banco: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: Banco Itaú" />
                        <label className={labelCls}>Titular de la cuenta</label>
                        <input value={formCuenta.titular} onChange={e => setFormCuenta({ ...formCuenta, titular: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: Osvaldo Sosa" />
                        <label className={labelCls}>Número de cuenta</label>
                        <input value={formCuenta.numero_cuenta} onChange={e => setFormCuenta({ ...formCuenta, numero_cuenta: e.target.value })} className={`${inputCls} mb-3`} placeholder="Ej: 1237120" />
                        <label className={labelCls}>Alias</label>
                        <input value={formCuenta.alias} onChange={e => setFormCuenta({ ...formCuenta, alias: e.target.value })} className={inputCls} placeholder="Ej: 1283U190" />
                        {editandoCuenta && (
                            <div className="mb-2 mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3 dark:bg-slate-900">
                                <span className="text-[13px] font-medium text-slate-900 dark:text-slate-100">Cuenta activa</span>
                                <Toggle checked={formCuenta.activa} onChange={val => setFormCuenta({ ...formCuenta, activa: val })} />
                            </div>
                        )}
                        {formCuenta.banco && formCuenta.titular && (
                            <div className="mb-4 mt-3 rounded-lg bg-green-50 px-3.5 py-2.5 text-xs text-green-800 dark:bg-green-500/10 dark:text-green-400">
                                Vista previa: "{formCuenta.banco} — {formCuenta.titular}{formCuenta.alias ? ` (${formCuenta.alias})` : ''}"
                            </div>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setModalCuenta(false)}>Cancelar</Button>
                            <Button onClick={handleGuardarCuenta}>{editandoCuenta ? 'Guardar cambios' : 'Agregar cuenta'}</Button>
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
