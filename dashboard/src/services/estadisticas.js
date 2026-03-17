import api from './api'

export async function getResumen() {
    const res = await api.get('/estadisticas/resumen')
    return res.data
}

export async function getVentasSemana() {
    const res = await api.get('/estadisticas/ventas-semana')
    return res.data
}

export async function getTopProductos() {
    const res = await api.get('/estadisticas/top-productos')
    return res.data
}

export async function getNotificaciones() {
    const res = await api.get('/estadisticas/notificaciones')
    return res.data
}