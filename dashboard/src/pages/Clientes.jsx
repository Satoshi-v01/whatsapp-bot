import { useState, useEffect } from 'react'
import { getClientes, getCliente, crearCliente, editarCliente } from '../services/clientes'
import ModalConfirmar from '../components/ModalConfirmar'

function Clientes() {
    const [clientes, setClientes] = useState([])
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [cargandoPerfil, setCargandoPerfil] = useState(false)
    const [buscar, setBuscar] = useState('')
    const [modalNuevo, setModalNuevo] = useState(false)
    const [modalEditar, setModalEditar] = useState(false)
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [form, setForm] = useState({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })

    useEffect(() => {
        cargarClientes()
    }, [])

    useEffect(() => {
        const timeout = setTimeout(() => {
            cargarClientes()
        }, 400)
        return () => clearTimeout(timeout)
    }, [buscar])

    async function cargarClientes() {
        try {
            setCargando(true)
            const params = {}
            if (buscar) params.buscar = buscar
            const datos = await getClientes(params)
            setClientes(datos)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudieron cargar los clientes.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargando(false)
        }
    }

    async function verPerfil(id) {
        try {
            setCargandoPerfil(true)
            const datos = await getCliente(id)
            setClienteSeleccionado(datos)
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo cargar el perfil del cliente.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        } finally {
            setCargandoPerfil(false)
        }
    }

    async function handleCrearCliente() {
        if (!form.nombre.trim()) return
        try {
            await crearCliente(form)
            setModalNuevo(false)
            setForm({ tipo: 'persona', nombre: '', ruc: '', telefono: '', email: '', direccion: '', ciudad: '', notas: '' })
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: err.response?.data?.error || 'No se pudo crear el cliente.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleEditarCliente() {
        try {
            await editarCliente(clienteSeleccionado.id, form)
            setModalEditar(false)
            await verPerfil(clienteSeleccionado.id)
            await cargarClientes()
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: err.response?.data?.error || 'No se pudo editar el cliente.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    function abrirModalEditar() {
        setForm({
            tipo: clienteSeleccionado.tipo,
            nombre: clienteSeleccionado.nombre,
            ruc: clienteSeleccionado.ruc || '',
            telefono: clienteSeleccionado.telefono || '',
            email: clienteSeleccionado.email || '',
            direccion: clienteSeleccionado.direccion || '',
            ciudad: clienteSeleccionado.ciudad || '',
            notas: clienteSeleccionado.notas || ''
        })
        setModalEditar(true)
    }

    function formatearRUC(valor) {
        const solo = valor.replace(/[^\d]/g, '')
        if (solo.length <= 7) {
            return solo.replace(/(\d{1,3})(\d{1,3})?(\d{1,3})?/, (_, a, b, c) => [a, b, c].filter(Boolean).join('.'))
        }
        const cuerpo = solo.slice(0, -1)
        const dv = solo.slice(-1)
        const formateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        return `${formateado}-${dv}`
    }

    function formatearFecha(fecha) {
        if (!fecha) return '—'
        return new Date(fecha).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    function formatearGuaranies(numero) {
        return `Gs. ${parseInt(numero || 0).toLocaleString('es-PY')}`
    }

    function colorOrigen(origen) {
        const colores = { bot: '#10b981', presencial: '#3b82f6', manual: '#888' }
        return colores[origen] || '#888'
    }

    function colorEstado(estado) {
        const colores = {
            pendiente_pago: '#f59e0b', pagado: '#10b981',
            entregado: '#3b82f6', cancelado: '#ef4444'
        }
        return colores[estado] || '#888'
    }

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px', boxSizing: 'border-box' }
    const labelStyle = { fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }
    const btnPrimario = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px' }
    const btnSecundario = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>

            {/* Lista */}
            <div style={{ width: '380px', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', background: 'white' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '600' }}>Clientes</h2>
                        <button onClick={() => setModalNuevo(true)} style={btnPrimario}>+ Nuevo</button>
                    </div>
                    <input
                        placeholder="Buscar por nombre, RUC o teléfono..."
                        value={buscar}
                        onChange={e => setBuscar(e.target.value)}
                        style={{ ...inputStyle, marginBottom: 0 }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {cargando ? (
                        <p style={{ padding: '20px', color: '#888', fontSize: '13px', textAlign: 'center' }}>Cargando...</p>
                    ) : clientes.length === 0 ? (
                        <p style={{ padding: '20px', color: '#888', fontSize: '13px', textAlign: 'center' }}>No hay clientes.</p>
                    ) : (
                        clientes.map(c => (
                            <div
                                key={c.id}
                                onClick={() => verPerfil(c.id)}
                                style={{
                                    padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
                                    cursor: 'pointer',
                                    background: clienteSeleccionado?.id === c.id ? '#f0f4ff' : 'white'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{c.nombre}</span>
                                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', color: 'white', background: colorOrigen(c.origen) }}>
                                        {c.origen}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888' }}>
                                    {c.ruc && <span>RUC: {c.ruc}</span>}
                                    {c.telefono && <span>📱 {c.telefono}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                    <span>{c.total_compras} compras</span>
                                    <span>{formatearGuaranies(c.monto_total)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Perfil */}
            <div style={{ flex: 1, background: '#f9fafb', overflowY: 'auto' }}>
                {!clienteSeleccionado ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        <p>Seleccioná un cliente para ver su perfil</p>
                    </div>
                ) : cargandoPerfil ? (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                        <p>Cargando perfil...</p>
                    </div>
                ) : (
                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{clienteSeleccionado.nombre}</h3>
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', color: 'white', background: colorOrigen(clienteSeleccionado.origen) }}>
                                        {clienteSeleccionado.origen}
                                    </span>
                                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#f0f0f0', color: '#555' }}>
                                        {clienteSeleccionado.tipo}
                                    </span>
                                </div>
                                <p style={{ fontSize: '12px', color: '#888' }}>Cliente desde {formatearFecha(clienteSeleccionado.created_at)}</p>
                            </div>
                            <button onClick={abrirModalEditar} style={btnSecundario}>✏️ Editar</button>
                        </div>

                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '14px' }}>DATOS FISCALES Y CONTACTO</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>RUC</p>
                                    <p style={{ fontSize: '13px', fontWeight: '500' }}>{clienteSeleccionado.ruc || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Teléfono / WhatsApp</p>
                                    <p style={{ fontSize: '13px', fontWeight: '500' }}>{clienteSeleccionado.telefono || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Email</p>
                                    <p style={{ fontSize: '13px' }}>{clienteSeleccionado.email || '—'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Ciudad</p>
                                    <p style={{ fontSize: '13px' }}>{clienteSeleccionado.ciudad || '—'}</p>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Dirección</p>
                                    <p style={{ fontSize: '13px' }}>{clienteSeleccionado.direccion || '—'}</p>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '3px solid #10b981' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Total compras</p>
                                <p style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>{clienteSeleccionado.estadisticas?.total_compras || 0}</p>
                            </div>
                            <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '3px solid #3b82f6' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Monto total</p>
                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#3b82f6' }}>{formatearGuaranies(clienteSeleccionado.estadisticas?.monto_total)}</p>
                            </div>
                            <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '3px solid #f59e0b' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Ticket promedio</p>
                                <p style={{ fontSize: '14px', fontWeight: '700', color: '#f59e0b' }}>{formatearGuaranies(clienteSeleccionado.estadisticas?.ticket_promedio)}</p>
                            </div>
                            <div style={{ background: 'white', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', borderLeft: '3px solid #8b5cf6' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Última compra</p>
                                <p style={{ fontSize: '13px', fontWeight: '700', color: '#8b5cf6' }}>{formatearFecha(clienteSeleccionado.estadisticas?.ultima_compra)}</p>
                            </div>
                        </div>

                        {clienteSeleccionado.producto_favorito && (
                            <div style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '24px' }}>⭐</span>
                                <div>
                                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>Producto favorito</p>
                                    <p style={{ fontSize: '13px', fontWeight: '600' }}>
                                        {clienteSeleccionado.producto_favorito.marca && `${clienteSeleccionado.producto_favorito.marca} — `}
                                        {clienteSeleccionado.producto_favorito.producto}
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#888' }}>{clienteSeleccionado.producto_favorito.cantidad} veces comprado</p>
                                </div>
                            </div>
                        )}

                        {clienteSeleccionado.notas && (
                            <div style={{ background: '#fffbeb', borderRadius: '12px', padding: '16px', border: '1px solid #fde68a' }}>
                                <p style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>Notas internas</p>
                                <p style={{ fontSize: '13px', color: '#78350f' }}>{clienteSeleccionado.notas}</p>
                            </div>
                        )}

                        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                            <h4 style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '14px' }}>HISTORIAL DE COMPRAS</h4>
                            {clienteSeleccionado.ventas?.length === 0 ? (
                                <p style={{ fontSize: '13px', color: '#888', textAlign: 'center', padding: '12px 0' }}>Sin compras registradas.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Fecha</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Producto</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Precio</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Canal</th>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {clienteSeleccionado.ventas?.map(v => (
                                            <tr key={v.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>{formatearFecha(v.created_at)}</td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                                    {v.marca_nombre && `${v.marca_nombre} — `}{v.producto_nombre} {v.presentacion_nombre}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>Gs. {parseInt(v.precio).toLocaleString()}</td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px', color: '#888' }}>{v.canal}</td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', color: 'white', background: colorEstado(v.estado) }}>
                                                        {v.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modal nuevo cliente */}
            {modalNuevo && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Nuevo cliente</h3>
                            <button onClick={() => setModalNuevo(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>
                        <label style={labelStyle}>Tipo</label>
                        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                            <option value="persona">Persona física</option>
                            <option value="empresa">Empresa</option>
                        </select>
                        <label style={labelStyle}>Nombre / Razón social *</label>
                        <input placeholder="Nombre completo o razón social" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>RUC</label>
                        <input placeholder="4.154.264-9" value={form.ruc} onChange={e => setForm({ ...form, ruc: formatearRUC(e.target.value) })} style={inputStyle} />
                        <label style={labelStyle}>Teléfono / WhatsApp</label>
                        <input placeholder="595981234567" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Email</label>
                        <input placeholder="opcional" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={labelStyle}>Ciudad</label>
                                <input placeholder="Asunción" value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Dirección</label>
                                <input placeholder="Opcional" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <label style={labelStyle}>Notas internas</label>
                        <textarea placeholder="Notas visibles solo para el equipo" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalNuevo(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearCliente} style={btnPrimario}>Crear cliente</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal editar cliente */}
            {modalEditar && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Editar cliente</h3>
                            <button onClick={() => setModalEditar(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>
                        <label style={labelStyle}>Tipo</label>
                        <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                            <option value="persona">Persona física</option>
                            <option value="empresa">Empresa</option>
                        </select>
                        <label style={labelStyle}>Nombre / Razón social *</label>
                        <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>RUC</label>
                        <input value={form.ruc} onChange={e => setForm({ ...form, ruc: formatearRUC(e.target.value) })} style={inputStyle} />
                        <label style={labelStyle}>Teléfono / WhatsApp</label>
                        <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Email</label>
                        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={labelStyle}>Ciudad</label>
                                <input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Dirección</label>
                                <input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} style={inputStyle} />
                            </div>
                        </div>
                        <label style={labelStyle}>Notas internas</label>
                        <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'none', fontFamily: 'sans-serif' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalEditar(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleEditarCliente} style={btnPrimario}>Guardar cambios</button>
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

export default Clientes