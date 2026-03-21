import api from './api'

export async function getDeliveries() {
    const res = await api.get('/deliveries')
    return res.data
}

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