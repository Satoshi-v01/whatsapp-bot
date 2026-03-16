import axios from 'axios'

const API = '/api'

export async function getProductos() {
    const res = await axios.get(`${API}/productos`)
    return res.data
}

export async function getCategorias() {
    const res = await axios.get(`${API}/productos/categorias`)
    return res.data
}

export async function crearProducto(datos) {
    const res = await axios.post(`${API}/productos`, datos)
    return res.data
}

export async function editarProducto(id, datos) {
    const res = await axios.patch(`${API}/productos/${id}`, datos)
    return res.data
}

export async function agregarPresentacion(productoId, datos) {
    const res = await axios.post(`${API}/productos/${productoId}/presentaciones`, datos)
    return res.data
}

export async function actualizarStock(presentacionId, stock) {
    const res = await axios.patch(`${API}/productos/presentaciones/${presentacionId}/stock`, { stock })
    return res.data
}