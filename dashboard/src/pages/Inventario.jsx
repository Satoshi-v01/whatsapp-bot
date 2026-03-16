import { useState, useEffect } from 'react'
import { getProductos, getCategorias, crearProducto, agregarPresentacion, actualizarStock } from '../services/productos'

function Inventario() {
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [cargando, setCargando] = useState(true)
    const [productoExpandido, setProductoExpandido] = useState(null)
    const [modalProducto, setModalProducto] = useState(false)
    const [modalPresentacion, setModalPresentacion] = useState(null)
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '' })
    const [nuevaPresentacion, setNuevaPresentacion] = useState({ nombre: '', precio: '', stock: 0 })

    useEffect(() => {
        cargarDatos()
    }, [])

    async function cargarDatos() {
        try {
            setCargando(true)
            const [prods, cats] = await Promise.all([getProductos(), getCategorias()])
            setProductos(prods)
            setCategorias(cats)
        } catch (err) {
            console.error('Error cargando datos:', err)
        } finally {
            setCargando(false)
        }
    }

    async function handleCrearProducto() {
        try {
            await crearProducto(nuevoProducto)
            setModalProducto(false)
            setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '' })
            await cargarDatos()
        } catch (err) {
            console.error('Error creando producto:', err)
        }
    }

    async function handleAgregarPresentacion(productoId) {
        try {
            await agregarPresentacion(productoId, nuevaPresentacion)
            setModalPresentacion(null)
            setNuevaPresentacion({ nombre: '', precio: '', stock: 0 })
            await cargarDatos()
        } catch (err) {
            console.error('Error agregando presentación:', err)
        }
    }

    async function handleActualizarStock(presentacionId, stockActual) {
        const nuevoStock = prompt('Nuevo stock:', stockActual)
        if (nuevoStock === null) return
        try {
            await actualizarStock(presentacionId, parseInt(nuevoStock))
            await cargarDatos()
        } catch (err) {
            console.error('Error actualizando stock:', err)
        }
    }

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando inventario...</p></div>

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px' }}>Inventario</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={cargarDatos} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>
                        Actualizar
                    </button>
                    <button onClick={() => setModalProducto(true)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer' }}>
                        + Producto
                    </button>
                </div>
            </div>

            {productos.map(producto => (
                <div key={producto.id} style={{ background: 'white', borderRadius: '10px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div
                        onClick={() => setProductoExpandido(productoExpandido === producto.id ? null : producto.id)}
                        style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                        <div>
                            <span style={{ fontWeight: '600', fontSize: '15px' }}>{producto.nombre}</span>
                            <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#e0e7ff', color: '#3730a3' }}>{producto.calidad}</span>
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>{producto.categoria_nombre}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: '#888' }}>{productoExpandido === producto.id ? '▲' : '▼'}</span>
                    </div>

                    {productoExpandido === producto.id && (
                        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '13px', color: '#888' }}>Presentaciones</span>
                                <button
                                    onClick={() => setModalPresentacion(producto.id)}
                                    style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    + Presentación
                                </button>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb' }}>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Nombre</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Precio</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Stock</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Estado</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {producto.presentaciones.map(pr => (
                                        <tr key={pr.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                                            <td style={{ padding: '8px 12px', fontSize: '13px' }}>{pr.nombre}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px' }}>Gs. {pr.precio.toLocaleString()}</td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                <span style={{ fontWeight: '600', color: pr.stock <= 2 ? '#ef4444' : pr.stock <= 5 ? '#f59e0b' : '#10b981' }}>
                                                    {pr.stock}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: pr.disponible ? '#d1fae5' : '#fee2e2', color: pr.disponible ? '#065f46' : '#991b1b' }}>
                                                    {pr.disponible ? 'Disponible' : 'No disponible'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                <button
                                                    onClick={() => handleActualizarStock(pr.id, pr.stock)}
                                                    style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', fontSize: '12px', cursor: 'pointer' }}
                                                >
                                                    Editar stock
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}

            {modalProducto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Nuevo producto</h3>
                        <input placeholder="Nombre" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px' }} />
                        <input placeholder="Descripción" value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px' }} />
                        <select value={nuevoProducto.calidad} onChange={e => setNuevoProducto({ ...nuevoProducto, calidad: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px' }}>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="premium_special">Premium Special</option>
                            <option value="super_premium">Super Premium</option>
                        </select>
                        <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '16px', fontSize: '13px' }}>
                            <option value="">Seleccionar categoría</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalProducto(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={handleCrearProducto} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer' }}>Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {modalPresentacion && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Nueva presentación</h3>
                        <input placeholder="Nombre (ej: 3kg)" value={nuevaPresentacion.nombre} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, nombre: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px' }} />
                        <input placeholder="Precio en Gs." type="number" value={nuevaPresentacion.precio} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px' }} />
                        <input placeholder="Stock inicial" type="number" value={nuevaPresentacion.stock} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, stock: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '16px', fontSize: '13px' }} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPresentacion(null)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>Cancelar</button>
                            <button onClick={() => handleAgregarPresentacion(modalPresentacion)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer' }}>Agregar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Inventario