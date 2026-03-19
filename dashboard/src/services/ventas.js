import api from './api'

export async function getVentas() {
    const res = await api.get('/ventas')
    return res.data
}

export async function getVentasPorEstado(estado) {
    const res = await api.get(`/ventas/estado/${estado}`)
    return res.data
}

export async function actualizarEstadoVenta(id, estado) {
    const res = await api.patch(`/ventas/${id}/estado`, { estado })
    return res.data
}

export async function registrarVentaPresencial(datos) {
    const res = await api.post('/ventas/presencial', datos)
    return res.data
}

export async function getHistorial(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/ventas/historial${query ? `?${query}` : ''}`)
    return res.data
}