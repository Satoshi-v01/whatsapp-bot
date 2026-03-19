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

export async function getVentasPorDia(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ventas-por-dia${query ? `?${query}` : ''}`)
    return res.data
}

export async function getVentasPorCanal(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ventas-por-canal${query ? `?${query}` : ''}`)
    return res.data
}

export async function getRankingProductos(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ranking-productos${query ? `?${query}` : ''}`)
    return res.data
}

export async function getTopClientes(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/top-clientes${query ? `?${query}` : ''}`)
    return res.data
}

export async function getMetricas(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/metricas${query ? `?${query}` : ''}`)
    return res.data
}