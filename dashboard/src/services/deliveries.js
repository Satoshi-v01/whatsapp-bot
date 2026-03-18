import api from './api'

export async function getDeliveries() {
    const res = await api.get('/deliveries')
    return res.data
}

export async function actualizarEstadoDelivery(id, estado, notas) {
    const res = await api.patch(`/deliveries/${id}/estado`, { estado, notas })
    return res.data
}