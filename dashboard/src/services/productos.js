import api from './api'

export async function getProductos() {
    const res = await api.get('/productos')
    return res.data
}

export async function getCategorias() {
    const res = await api.get('/productos/categorias')
    return res.data
}

export async function getMarcas() {
    const res = await api.get('/productos/marcas')
    return res.data
}

export async function crearMarca(datos) {
    const res = await api.post('/productos/marcas', datos)
    return res.data
}

export async function verificarEliminarMarca(id) {
    const res = await api.delete(`/productos/marcas/${id}`)
    return res.data
}

export async function confirmarEliminarMarca(id) {
    const res = await api.delete(`/productos/marcas/${id}/confirmar`)
    return res.data
}

export async function crearCategoria(datos) {
    const res = await api.post('/productos/categorias', datos)
    return res.data
}

export async function editarCategoria(id, datos) {
    const res = await api.patch(`/productos/categorias/${id}`, datos)
    return res.data
}

export async function verificarEliminarCategoria(id) {
    const res = await api.delete(`/productos/categorias/${id}`)
    return res.data
}

export async function confirmarEliminarCategoria(id) {
    const res = await api.delete(`/productos/categorias/${id}/confirmar`)
    return res.data
}

export async function crearProducto(datos) {
    const res = await api.post('/productos', datos)
    return res.data
}

export async function editarProducto(id, datos) {
    const res = await api.patch(`/productos/${id}`, datos)
    return res.data
}

export async function agregarPresentacion(productoId, datos) {
    const res = await api.post(`/productos/${productoId}/presentaciones`, datos)
    return res.data
}

export async function actualizarStock(presentacionId, stock) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/stock`, { stock })
    return res.data
}

export async function actualizarPrecio(presentacionId, datos) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/precio`, datos)
    return res.data
}

export async function actualizarDisponible(presentacionId, disponible) {
    const res = await api.patch(`/productos/presentaciones/${presentacionId}/disponible`, { disponible })
    return res.data
}

export async function actualizarCodigoBarras(id, codigo_barras) {
    const res = await api.patch(`/productos/presentaciones/${id}/codigos`, { codigo_barras })
    return res.data
}