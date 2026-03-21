import api from './api'

export async function getZonas() {
    const res = await api.get('/zonas/todas')
    return res.data
}

export async function crearZona(datos) {
    const res = await api.post('/zonas', datos)
    return res.data
}

export async function editarZona(id, datos) {
    const res = await api.patch(`/zonas/${id}`, datos)
    return res.data
}

export async function eliminarZona(id) {
    const res = await api.delete(`/zonas/${id}`)
    return res.data
}