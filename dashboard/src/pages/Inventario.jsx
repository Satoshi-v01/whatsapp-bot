import { useState, useEffect } from 'react'
import ModalConfirmar from '../components/ModalConfirmar'
import {
    getProductos, getCategorias, getMarcas, crearMarca,
    verificarEliminarMarca, confirmarEliminarMarca,
    crearCategoria, editarCategoria,
    verificarEliminarCategoria, confirmarEliminarCategoria,
    crearProducto, editarProducto, agregarPresentacion,
    actualizarStock, actualizarPrecio, actualizarDisponible
} from '../services/productos'

function Inventario() {
    const [modalCategorias, setModalCategorias] = useState(false)
    const [nuevaCategoria, setNuevaCategoria] = useState({ nombre: '', descripcion: '' })
    const [confirmEliminarCategoria, setConfirmEliminarCategoria] = useState(null)
    const [editandoCategoria, setEditandoCategoria] = useState(null)
    const [productos, setProductos] = useState([])
    const [categorias, setCategorias] = useState([])
    const [marcas, setMarcas] = useState([])
    const [cargando, setCargando] = useState(true)
    const [productoExpandido, setProductoExpandido] = useState(null)
    const [modalProducto, setModalProducto] = useState(false)
    const [modalMarca, setModalMarca] = useState(false)
    const [modalPresentacion, setModalPresentacion] = useState(null)
    const [modalPrecio, setModalPrecio] = useState(null)
    const [modalEditarProducto, setModalEditarProducto] = useState(null)
    const [modalStock, setModalStock] = useState(null)
    const [nuevoStockValor, setNuevoStockValor] = useState('')
    const [modalConfirmar, setModalConfirmar] = useState(null)
    const [nuevaMarca, setNuevaMarca] = useState('')
    const [errorMarca, setErrorMarca] = useState('')
    const [confirmEliminarMarca, setConfirmEliminarMarca] = useState(null)
    const [nuevoProducto, setNuevoProducto] = useState({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '' })
    const [nuevaPresentacion, setNuevaPresentacion] = useState({ nombre: '', precio_venta: '', precio_compra: '', stock: 0 })
    const [precioForm, setPrecioForm] = useState({
        precio_venta: '', precio_compra: '', precio_descuento: '',
        descuento_activo: false, descuento_desde: '', descuento_hasta: '', descuento_stock: ''
    })
    const [editarForm, setEditarForm] = useState({ nombre: '', descripcion: '', calidad: '', categoria_id: '', marca_id: '' })

    useEffect(() => {
        cargarDatos()
    }, [])

    async function cargarDatos() {
        try {
            setCargando(true)
            const [prods, cats, mrcs] = await Promise.all([getProductos(), getCategorias(), getMarcas()])
            setProductos(prods)
            setCategorias(cats)
            setMarcas(mrcs)
        } catch (err) {
            console.error('Error cargando datos:', err)
        } finally {
            setCargando(false)
        }
    }

    async function handleCrearMarca() {
        if (!nuevaMarca.trim()) return
        try {
            setErrorMarca('')
            await crearMarca({ nombre: nuevaMarca })
            setNuevaMarca('')
            await cargarDatos()
        } catch (err) {
            if (err.response?.data?.error?.includes('duplicate key')) {
                setErrorMarca('Esta marca ya existe.')
            } else {
                setErrorMarca('Error al crear la marca.')
            }
        }
    }

    async function handleEliminarMarca(marca) {
        try {
            const resultado = await verificarEliminarMarca(marca.id)
            setConfirmEliminarMarca({ ...marca, cantidad: resultado.productos_asociados })
        } catch (err) {
            console.error('Error verificando marca:', err)
        }
    }

    async function handleConfirmarEliminarMarca() {
        try {
            await confirmarEliminarMarca(confirmEliminarMarca.id)
            setConfirmEliminarMarca(null)
            await cargarDatos()
        } catch (err) {
            console.error('Error eliminando marca:', err)
        }
    }

    async function handleCrearProducto() {
        try {
            await crearProducto(nuevoProducto)
            setModalProducto(false)
            setNuevoProducto({ nombre: '', descripcion: '', calidad: 'standard', categoria_id: '', marca_id: '' })
            await cargarDatos()
        } catch (err) {
            console.error('Error creando producto:', err)
        }
    }

    async function handleCrearCategoria() {
        if (!nuevaCategoria.nombre.trim()) return
        try {
            await crearCategoria(nuevaCategoria)
            setNuevaCategoria({ nombre: '', descripcion: '' })
            await cargarDatos()
        } catch (err) {
            console.error('Error creando categoría:', err)
        }
    }

    async function handleEditarCategoria(id, datos) {
        try {
            await editarCategoria(id, datos)
            setEditandoCategoria(null)
            await cargarDatos()
        } catch (err) {
            console.error('Error editando categoría:', err)
        }
    }

    async function handleEliminarCategoria(cat) {
        try {
            const resultado = await verificarEliminarCategoria(cat.id)
            setConfirmEliminarCategoria({ ...cat, cantidad: resultado.productos_asociados })
        } catch (err) {
            setModalConfirmar({
                titulo: 'Error',
                mensaje: 'No se pudo verificar la categoría.',
                textoBoton: 'Cerrar',
                colorBoton: '#888',
                onConfirmar: () => setModalConfirmar(null)
            })
        }
    }

    async function handleConfirmarEliminarCategoria() {
        try {
            await confirmarEliminarCategoria(confirmEliminarCategoria.id)
            setConfirmEliminarCategoria(null)
            await cargarDatos()
        } catch (err) {
            console.error('Error eliminando categoría:', err)
        }
    }

    async function handleEditarProducto() {
        try {
            await editarProducto(modalEditarProducto.id, editarForm)
            setModalEditarProducto(null)
            await cargarDatos()
        } catch (err) {
            console.error('Error editando producto:', err)
        }
    }

    async function handleAgregarPresentacion(productoId) {
        try {
            await agregarPresentacion(productoId, nuevaPresentacion)
            setModalPresentacion(null)
            setNuevaPresentacion({ nombre: '', precio_venta: '', precio_compra: '', stock: 0 })
            await cargarDatos()
        } catch (err) {
            console.error('Error agregando presentación:', err)
        }
    }

   async function handleActualizarStock(presentacionId, stockActual, nombrePresentacion) {
        setNuevoStockValor(String(stockActual))
        setModalStock({ id: presentacionId, nombre: nombrePresentacion, stockActual })
    }

    async function handleConfirmarStock() {
        try {
            await actualizarStock(modalStock.id, parseInt(nuevoStockValor))
            setModalStock(null)
            setNuevoStockValor('')
            await cargarDatos()
        } catch (err) {
            console.error('Error actualizando stock:', err)
        }
    }

    async function handleGuardarPrecio() {
        try {
            await actualizarPrecio(modalPrecio.id, {
                precio_venta: parseInt(precioForm.precio_venta) || null,
                precio_compra: parseInt(precioForm.precio_compra) || null,
                precio_descuento: precioForm.precio_descuento ? parseInt(precioForm.precio_descuento) : null,
                precio_compra_descuento: precioForm.precio_compra_descuento ? parseInt(precioForm.precio_compra_descuento) : null,
                descuento_activo: precioForm.descuento_activo,
                descuento_desde: precioForm.descuento_desde || null,
                descuento_hasta: precioForm.descuento_hasta || null,
                descuento_stock: precioForm.descuento_stock ? parseInt(precioForm.descuento_stock) : null
            })
            setModalPrecio(null)
            await cargarDatos()
        } catch (err) {
            console.error('Error actualizando precio:', err)
        }
    }

    function abrirModalPrecio(pr) {
        setPrecioForm({
            precio_venta: pr.precio_venta || '',
            precio_compra: pr.precio_compra || '',
            precio_descuento: pr.precio_descuento || '',
            descuento_activo: pr.descuento_activo || false,
            descuento_desde: pr.descuento_desde ? pr.descuento_desde.slice(0, 16) : '',
            descuento_hasta: pr.descuento_hasta ? pr.descuento_hasta.slice(0, 16) : '',
            descuento_stock: pr.descuento_stock || ''
        })
        setModalPrecio(pr)
    }

    function abrirModalEditar(producto) {
        setEditarForm({
            nombre: producto.nombre,
            descripcion: producto.descripcion || '',
            calidad: producto.calidad,
            categoria_id: producto.categoria_id || '',
            marca_id: producto.marca_id || ''
        })
        setModalEditarProducto(producto)
    }

    function calcularPrecioEfectivo(pr) {
        const ahora = new Date()
        if (
            pr.descuento_activo &&
            pr.precio_descuento &&
            new Date(pr.descuento_desde) <= ahora &&
            new Date(pr.descuento_hasta) >= ahora
        ) {
            return { precio: pr.precio_descuento, conDescuento: true }
        }
        return { precio: pr.precio_venta, conDescuento: false }
    }

    function margen(pr) {
        const { precio } = calcularPrecioEfectivo(pr)
        if (!precio || !pr.precio_compra) return null
        return Math.round(((precio - pr.precio_compra) / precio) * 100)
    }

    if (cargando) return <div style={{ padding: '24px' }}><p>Cargando inventario...</p></div>

    const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '8px', fontSize: '13px', boxSizing: 'border-box' }
    const labelStyle = { fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }
    const btnPrimario = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#1a1a2e', color: 'white', cursor: 'pointer', fontSize: '13px' }
    const btnSecundario = { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: '13px' }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Inventario</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={cargarDatos} style={btnSecundario}>Actualizar</button>
                    <button onClick={() => setModalMarca(true)} style={btnSecundario}>Marcas</button>
                    <button onClick={() => setModalCategorias(true)} style={btnSecundario}>Categorías</button>
                    <button onClick={() => setModalProducto(true)} style={btnPrimario}>+ Producto</button>
                </div>
            </div>

            {productos.map(producto => (
                <div key={producto.id} style={{ background: 'white', borderRadius: '10px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div
                            onClick={() => setProductoExpandido(productoExpandido === producto.id ? null : producto.id)}
                            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}
                        >
                            <div>
                                <span style={{ fontWeight: '600', fontSize: '15px' }}>{producto.marca_nombre && `${producto.marca_nombre} — `}{producto.nombre}</span>
                                <span style={{ marginLeft: '10px', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', background: '#e0e7ff', color: '#3730a3' }}>{producto.calidad}</span>
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>{producto.categoria_nombre}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={() => abrirModalEditar(producto)}
                                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', fontSize: '12px', cursor: 'pointer' }}
                            >
                                ✏️ Editar
                            </button>
                            <span onClick={() => setProductoExpandido(productoExpandido === producto.id ? null : producto.id)} style={{ fontSize: '12px', color: '#888' }}>
                                {productoExpandido === producto.id ? '▲' : '▼'}
                            </span>
                        </div>
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
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>P. Compra</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>P. Venta</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Descuento</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Margen</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Stock</th>
                                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: '#888' }}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {producto.presentaciones.map(pr => {
                                        const { precio, conDescuento } = calcularPrecioEfectivo(pr)
                                        const mg = margen(pr)
                                        return (
                                            <tr key={pr.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                <td style={{ padding: '8px 12px', fontSize: '13px' }}>{pr.nombre}</td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px', color: '#888' }}>
                                                    {pr.precio_compra ? `Gs. ${pr.precio_compra.toLocaleString()}` : '—'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                    {conDescuento ? (
                                                        <span>
                                                            <span style={{ textDecoration: 'line-through', color: '#888', fontSize: '11px' }}>Gs. {pr.precio_venta.toLocaleString()}</span>
                                                            <span style={{ marginLeft: '6px', color: '#10b981', fontWeight: '600' }}>Gs. {precio.toLocaleString()}</span>
                                                            <span style={{ marginLeft: '4px', fontSize: '10px', background: '#d1fae5', color: '#065f46', padding: '1px 5px', borderRadius: '10px' }}>🏷️</span>
                                                        </span>
                                                    ) : (
                                                        `Gs. ${(pr.precio_venta || 0).toLocaleString()}`
                                                    )}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                                                    {pr.descuento_activo && pr.precio_descuento ? (
                                                        <span style={{ color: '#10b981' }}>
                                                            Activo hasta {new Date(pr.descuento_hasta).toLocaleDateString('es-PY')}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                    {mg !== null ? (
                                                        <span style={{ color: mg >= 20 ? '#10b981' : mg >= 10 ? '#f59e0b' : '#ef4444', fontWeight: '600' }}>
                                                            {mg}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                    <span style={{ fontWeight: '600', color: pr.stock <= 2 ? '#ef4444' : pr.stock <= 5 ? '#f59e0b' : '#10b981' }}>
                                                        {pr.stock}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '8px 12px', fontSize: '13px', display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleActualizarStock(pr.id, pr.stock)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', fontSize: '11px', cursor: 'pointer' }}>
                                                        Stock
                                                    </button>
                                                    <button onClick={() => abrirModalPrecio(pr)} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #ddd', background: 'white', fontSize: '11px', cursor: 'pointer' }}>
                                                        Precio
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ))}

            {/* Modal marcas */}
            {modalMarca && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Gestión de marcas</h3>
                            <button onClick={() => { setModalMarca(false); setErrorMarca('') }} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>

                        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: '#888' }}>NUEVA MARCA</p>
                            <input
                                value={nuevaMarca}
                                onChange={e => { setNuevaMarca(e.target.value); setErrorMarca('') }}
                                placeholder="Ej: CIBAU"
                                style={inputStyle}
                            />
                            {errorMarca && (
                                <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: '8px', fontSize: '12px', color: '#991b1b', marginBottom: '8px' }}>
                                    {errorMarca}
                                </div>
                            )}
                            <button onClick={handleCrearMarca} style={{ ...btnPrimario, width: '100%' }}>
                                + Agregar marca
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {marcas.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No hay marcas creadas.</p>
                            ) : (
                                marcas.map(marca => (
                                    <div key={marca.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <p style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{marca.nombre}</p>
                                        <button
                                            onClick={() => handleEliminarMarca(marca)}
                                            style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nuevo producto */}
            {modalProducto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '420px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Nuevo producto</h3>
                        <label style={labelStyle}>Marca</label>
                        <select value={nuevoProducto.marca_id} onChange={e => setNuevoProducto({ ...nuevoProducto, marca_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin marca</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        <label style={labelStyle}>Nombre del producto</label>
                        <input placeholder="Ej: Adulto Maxi" value={nuevoProducto.nombre} onChange={e => setNuevoProducto({ ...nuevoProducto, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Descripción</label>
                        <input placeholder="Opcional" value={nuevoProducto.descripcion} onChange={e => setNuevoProducto({ ...nuevoProducto, descripcion: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Calidad</label>
                        <select value={nuevoProducto.calidad} onChange={e => setNuevoProducto({ ...nuevoProducto, calidad: e.target.value })} style={inputStyle}>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="premium_special">Premium Special</option>
                            <option value="super_premium">Super Premium</option>
                        </select>
                        <label style={labelStyle}>Categoría</label>
                        <select value={nuevoProducto.categoria_id} onChange={e => setNuevoProducto({ ...nuevoProducto, categoria_id: e.target.value })} style={inputStyle}>
                            <option value="">Seleccionar categoría</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalProducto(false)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleCrearProducto} style={btnPrimario}>Crear</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal editar producto */}
            {modalEditarProducto && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '420px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Editar producto</h3>
                        <label style={labelStyle}>Marca</label>
                        <select value={editarForm.marca_id} onChange={e => setEditarForm({ ...editarForm, marca_id: e.target.value })} style={inputStyle}>
                            <option value="">Sin marca</option>
                            {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        <label style={labelStyle}>Nombre del producto</label>
                        <input value={editarForm.nombre} onChange={e => setEditarForm({ ...editarForm, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Descripción</label>
                        <input value={editarForm.descripcion} onChange={e => setEditarForm({ ...editarForm, descripcion: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Calidad</label>
                        <select value={editarForm.calidad} onChange={e => setEditarForm({ ...editarForm, calidad: e.target.value })} style={inputStyle}>
                            <option value="standard">Standard</option>
                            <option value="premium">Premium</option>
                            <option value="premium_special">Premium Special</option>
                            <option value="super_premium">Super Premium</option>
                        </select>
                        <label style={labelStyle}>Categoría</label>
                        <select value={editarForm.categoria_id} onChange={e => setEditarForm({ ...editarForm, categoria_id: e.target.value })} style={inputStyle}>
                            <option value="">Seleccionar categoría</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalEditarProducto(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleEditarProducto} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nueva presentación */}
            {modalPresentacion && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ marginBottom: '16px' }}>Nueva presentación</h3>
                        <label style={labelStyle}>Nombre</label>
                        <input placeholder="Ej: 3kg" value={nuevaPresentacion.nombre} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, nombre: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Precio de compra (Gs.)</label>
                        <input placeholder="Lo que pagás al proveedor" type="number" value={nuevaPresentacion.precio_compra} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_compra: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Precio de venta (Gs.)</label>
                        <input placeholder="Lo que cobra la tienda" type="number" value={nuevaPresentacion.precio_venta} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, precio_venta: e.target.value })} style={inputStyle} />
                        <label style={labelStyle}>Stock inicial</label>
                        <input type="number" value={nuevaPresentacion.stock} onChange={e => setNuevaPresentacion({ ...nuevaPresentacion, stock: e.target.value })} style={inputStyle} />
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button onClick={() => setModalPresentacion(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={() => handleAgregarPresentacion(modalPresentacion)} style={btnPrimario}>Agregar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal precio y descuento */}
            {modalPrecio && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '4px' }}>Precio y descuento</h3>
                        <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>{modalPrecio.nombre}</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                            <div>
                                <label style={labelStyle}>Precio de compra (Gs.)</label>
                                <input type="number" value={precioForm.precio_compra} onChange={e => setPrecioForm({ ...precioForm, precio_compra: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Precio de venta (Gs.)</label>
                                <input type="number" value={precioForm.precio_venta} onChange={e => setPrecioForm({ ...precioForm, precio_venta: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                            </div>
                        </div>

                        {precioForm.precio_compra && precioForm.precio_venta && (
                            <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#166534' }}>
                                Margen: {Math.round(((precioForm.precio_venta - precioForm.precio_compra) / precioForm.precio_venta) * 100)}%
                                · Ganancia: Gs. {(precioForm.precio_venta - precioForm.precio_compra).toLocaleString()}
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <input
                                    type="checkbox"
                                    id="descuento_activo"
                                    checked={precioForm.descuento_activo}
                                    onChange={e => setPrecioForm({ ...precioForm, descuento_activo: e.target.checked })}
                                />
                                <label htmlFor="descuento_activo" style={{ fontSize: '13px', fontWeight: '500', cursor: 'pointer' }}>
                                    Activar descuento temporal
                                </label>
                            </div>

                            {precioForm.descuento_activo && (
                                <>
                                    <div style={{ background: '#f0f4ff', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#3730a3', marginBottom: '10px' }}>Precios con descuento</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div>
                                                <label style={labelStyle}>P. compra con descuento (Gs.)</label>
                                                <input type="number" placeholder="Lo que pagás al proveedor" value={precioForm.precio_compra_descuento || ''} onChange={e => setPrecioForm({ ...precioForm, precio_compra_descuento: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                            <div>
                                                <label style={labelStyle}>P. venta con descuento (Gs.)</label>
                                                <input type="number" placeholder="Lo que cobra la tienda" value={precioForm.precio_descuento} onChange={e => setPrecioForm({ ...precioForm, precio_descuento: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                            </div>
                                        </div>

                                        {precioForm.precio_descuento && precioForm.precio_compra_descuento && (
                                            <div style={{ marginTop: '10px', padding: '8px', background: 'white', borderRadius: '8px', fontSize: '12px', color: '#3730a3' }}>
                                                Ganancia: Gs. {(parseInt(precioForm.precio_descuento) - parseInt(precioForm.precio_compra_descuento)).toLocaleString()}
                                                · Margen: {Math.round(((parseInt(precioForm.precio_descuento) - parseInt(precioForm.precio_compra_descuento)) / parseInt(precioForm.precio_descuento)) * 100)}%
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <div>
                                            <label style={labelStyle}>Desde</label>
                                            <input type="datetime-local" value={precioForm.descuento_desde} onChange={e => setPrecioForm({ ...precioForm, descuento_desde: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Hasta</label>
                                            <input type="datetime-local" value={precioForm.descuento_hasta} onChange={e => setPrecioForm({ ...precioForm, descuento_hasta: e.target.value })} style={{ ...inputStyle, marginBottom: 0 }} />
                                        </div>
                                    </div>

                                    <label style={{ ...labelStyle, marginTop: '8px' }}>Límite de stock con descuento (opcional)</label>
                                    <input type="number" placeholder="Dejar vacío = sin límite" value={precioForm.descuento_stock} onChange={e => setPrecioForm({ ...precioForm, descuento_stock: e.target.value })} style={inputStyle} />
                                </>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setModalPrecio(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleGuardarPrecio} style={btnPrimario}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal categorías */}
            {modalCategorias && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3>Gestión de categorías</h3>
                            <button onClick={() => setModalCategorias(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#888' }}>✕</button>
                        </div>

                        <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                            <p style={{ fontSize: '12px', fontWeight: '600', marginBottom: '10px', color: '#888' }}>NUEVA CATEGORÍA</p>
                            <input
                                placeholder="Nombre (ej: Perros adultos, Accesorios)"
                                value={nuevaCategoria.nombre}
                                onChange={e => setNuevaCategoria({ ...nuevaCategoria, nombre: e.target.value })}
                                style={inputStyle}
                            />
                            <input
                                placeholder="Descripción (opcional)"
                                value={nuevaCategoria.descripcion}
                                onChange={e => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })}
                                style={{ ...inputStyle, marginBottom: '0' }}
                            />
                            <button onClick={handleCrearCategoria} style={{ ...btnPrimario, marginTop: '10px', width: '100%' }}>
                                + Agregar categoría
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {categorias.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No hay categorías creadas.</p>
                            ) : (
                                categorias.map(cat => (
                                    <div key={cat.id} style={{ padding: '10px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {editandoCategoria === cat.id ? (
                                            <>
                                                <input
                                                    defaultValue={cat.nombre}
                                                    id={`cat-edit-${cat.id}`}
                                                    style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                                                />
                                                <button
                                                    onClick={() => handleEditarCategoria(cat.id, { nombre: document.getElementById(`cat-edit-${cat.id}`).value })}
                                                    style={{ ...btnPrimario, padding: '6px 12px' }}
                                                >
                                                    Guardar
                                                </button>
                                                <button onClick={() => setEditandoCategoria(null)} style={{ ...btnSecundario, padding: '6px 12px' }}>
                                                    Cancelar
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: '13px', fontWeight: '500' }}>{cat.nombre}</p>
                                                    {cat.descripcion && <p style={{ fontSize: '11px', color: '#888' }}>{cat.descripcion}</p>}
                                                </div>
                                                <button onClick={() => setEditandoCategoria(cat.id)} style={{ ...btnSecundario, padding: '4px 10px', fontSize: '12px' }}>
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleEliminarCategoria(cat)} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #fca5a5', background: '#fee2e2', color: '#991b1b', fontSize: '12px', cursor: 'pointer' }}>
                                                    🗑️
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar eliminar marca */}
            {confirmEliminarMarca && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ marginBottom: '12px', color: confirmEliminarMarca.cantidad > 0 ? '#ef4444' : '#333' }}>
                            {confirmEliminarMarca.cantidad > 0 ? '⚠️ Atención' : 'Eliminar marca'}
                        </h3>
                        {confirmEliminarMarca.cantidad > 0 ? (
                            <div>
                                <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                                    La marca <strong>{confirmEliminarMarca.nombre}</strong> tiene <strong>{confirmEliminarMarca.cantidad} producto{confirmEliminarMarca.cantidad > 1 ? 's' : ''}</strong> asociado{confirmEliminarMarca.cantidad > 1 ? 's' : ''}.
                                </p>
                                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#991b1b' }}>
                                    Eliminar esta marca desvinculará todos sus productos y puede afectar el historial de ventas y estadísticas.
                                </div>
                                <p style={{ fontSize: '13px', color: '#555' }}>¿Estás seguro que querés continuar?</p>
                            </div>
                        ) : (
                            <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                                ¿Eliminar la marca <strong>{confirmEliminarMarca.nombre}</strong>? Esta acción no se puede deshacer.
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button onClick={() => setConfirmEliminarMarca(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarMarca} style={{ ...btnPrimario, background: '#ef4444' }}>
                                Eliminar igual
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar eliminar categoría */}
            {confirmEliminarCategoria && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
                        <h3 style={{ marginBottom: '12px', color: confirmEliminarCategoria.cantidad > 0 ? '#ef4444' : '#333' }}>
                            {confirmEliminarCategoria.cantidad > 0 ? '⚠️ Atención' : 'Eliminar categoría'}
                        </h3>
                        {confirmEliminarCategoria.cantidad > 0 ? (
                            <div>
                                <p style={{ fontSize: '13px', marginBottom: '12px' }}>
                                    La categoría <strong>{confirmEliminarCategoria.nombre}</strong> tiene <strong>{confirmEliminarCategoria.cantidad} producto{confirmEliminarCategoria.cantidad > 1 ? 's' : ''}</strong> asociado{confirmEliminarCategoria.cantidad > 1 ? 's' : ''}.
                                </p>
                                <div style={{ padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#991b1b' }}>
                                    Eliminar esta categoría desvinculará todos sus productos y puede afectar el historial de ventas y estadísticas.
                                </div>
                                <p style={{ fontSize: '13px', color: '#555' }}>¿Estás seguro que querés continuar?</p>
                            </div>
                        ) : (
                            <p style={{ fontSize: '13px', marginBottom: '16px' }}>
                                ¿Eliminar la categoría <strong>{confirmEliminarCategoria.nombre}</strong>? Esta acción no se puede deshacer.
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                            <button onClick={() => setConfirmEliminarCategoria(null)} style={btnSecundario}>Cancelar</button>
                            <button onClick={handleConfirmarEliminarCategoria} style={{ ...btnPrimario, background: '#ef4444' }}>
                                Eliminar igual
                            </button>
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

export default Inventario