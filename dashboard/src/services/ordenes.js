import api from './api'

export async function getOrdenes(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/ordenes?${query}`)
    return res.data
}

export async function getOrden(id) {
    const res = await api.get(`/ordenes/${id}`)
    return res.data
}

export async function crearOrden(datos) {
    const res = await api.post('/ordenes', datos)
    return res.data
}

export async function reclamarOrden(id) {
    const res = await api.post(`/ordenes/${id}/reclamar`)
    return res.data
}

export async function liberarOrden(id) {
    const res = await api.post(`/ordenes/${id}/liberar`)
    return res.data
}

export async function confirmarOrden(id, datos = {}) {
    const res = await api.post(`/ordenes/${id}/confirmar`, datos)
    return res.data
}

export async function cancelarOrden(id, motivo = '') {
    const res = await api.patch(`/ordenes/${id}/cancelar`, { motivo })
    return res.data
}

export async function getResumenOrdenes() {
    const res = await api.get('/ordenes/stats/resumen')
    return res.data
}