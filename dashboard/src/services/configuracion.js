import api from './api'

export async function getConfiguracion() {
    const res = await api.get('/configuracion')
    return res.data
}

export async function actualizarConfiguracion(clave, valor) {
    const res = await api.patch(`/configuracion/${clave}`, { valor })
    return res.data
}

export async function guardarConfiguracionBulk(configuraciones) {
    const res = await api.post('/configuracion/bulk', { configuraciones })
    return res.data
}