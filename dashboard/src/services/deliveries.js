import api from './api'

export async function actualizarEstadoDelivery(id, estado, nota) {
    const res = await api.patch(`/deliveries/${id}/estado`, { estado, nota })
    return res.data
}

export async function agregarNota(id, texto, tipo = 'nota') {
    const res = await api.post(`/deliveries/${id}/nota`, { texto, tipo })
    return res.data
}

export async function crearDeliveryManual(datos) {
    const res = await api.post('/deliveries', datos)
    return res.data
}

export async function getMisDeliveries(repartidorId) {
    const res = await api.get(`/deliveries/mis-deliveries?repartidor_id=${repartidorId}`)
    return res.data
}

export async function asignarRepartidor(deliveryId, repartidorId) {
    const res = await api.patch(`/deliveries/${deliveryId}/asignar`, { repartidor_id: repartidorId })
    return res.data
}

export async function cambiarEstadoRepartidor(deliveryId, estado) {
    const res = await api.patch(`/deliveries/${deliveryId}/estado-repartidor`, { estado })
    return res.data
}

export async function getDeliveries(fecha = null) {
    const params = fecha ? `?fecha=${fecha}` : ''
    const res = await api.get(`/deliveries${params}`)
    return res.data
}