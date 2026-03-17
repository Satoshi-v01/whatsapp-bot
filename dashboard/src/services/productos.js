import api from './api'

export async function getProductos() {
    const res = await api.get('/productos')
    return res.data
}

export async function getCategorias() {
    const res = await api.get('/productos/categorias')
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