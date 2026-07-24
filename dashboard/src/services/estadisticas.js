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

export async function getMetricas(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/metricas?${query}`)
    return res.data
}

export async function getVentasPorDia(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ventas-por-dia?${query}`)
    return res.data
}

export async function getVentasPorCanal(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ventas-por-canal?${query}`)
    return res.data
}

export async function getRankingProductos(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/ranking-productos?${query}`)
    return res.data
}

export async function getTopClientes(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/top-clientes?${query}`)
    return res.data
}

export async function getDeliveryZonas(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/delivery-zonas?${query}`)
    return res.data
}

export async function getComparativas(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/comparativas?${query}`)
    return res.data
}

export async function getClientesRetencion(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/clientes-retencion?${q}`)
    return res.data
}

export async function getRentabilidad(params = {}) {
    const q = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/rentabilidad?${q}`)
    return res.data
}

export async function getTransferenciasPorCuenta(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/transferencias-por-cuenta?${query}`)
    return res.data
}

export async function getRfm() {
    const res = await api.get('/estadisticas/rfm')
    return res.data
}

export async function getHistorialPrecios(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/historial-precios?${query}`)
    return res.data
}

export async function getStockMuerto(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/stock-muerto?${query}`)
    return res.data
}

export async function getRotacionInventario(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/rotacion-inventario?${query}`)
    return res.data
}

export async function getPrecioEspecialEfectividad(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/precio-especial?${query}`)
    return res.data
}

export async function getCarritosAbandonados(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/estadisticas/carritos-abandonados?${query}`)
    return res.data
}