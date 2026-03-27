import api from './api'

export async function getLotesPresentacion(presentacionId) {
    const res = await api.get(`/lotes/presentacion/${presentacionId}`)
    return res.data
}

export async function getAlertasLotes(dias = 30) {
    const res = await api.get(`/lotes/alertas?dias=${dias}`)
    return res.data
}

export async function crearLote(datos) {
    const res = await api.post('/lotes', datos)
    return res.data
}

export async function eliminarLote(id) {
    const res = await api.delete(`/lotes/${id}`)
    return res.data
}