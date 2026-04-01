import api from './api'

export async function registrarTransformacion(datos) {
    const res = await api.post('/transformaciones', datos)
    return res.data
}

export async function getTransformaciones() {
    const res = await api.get('/transformaciones')
    return res.data
}
