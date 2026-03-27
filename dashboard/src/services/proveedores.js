import api from './api'

export async function getProveedores(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/proveedores?${query}`)
    return res.data
}

export async function getProveedor(id) {
    const res = await api.get(`/proveedores/${id}`)
    return res.data
}

export async function crearProveedor(datos) {
    const res = await api.post('/proveedores', datos)
    return res.data
}

export async function editarProveedor(id, datos) {
    const res = await api.patch(`/proveedores/${id}`, datos)
    return res.data
}

export async function getFacturas(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/proveedores/facturas?${query}`)
    return res.data
}

export async function getFacturasProveedor(proveedorId, params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/proveedores/${proveedorId}/facturas?${query}`)
    return res.data
}

export async function crearFactura(proveedorId, datos) {
    const res = await api.post(`/proveedores/${proveedorId}/facturas`, datos)
    return res.data
}

export async function editarFactura(id, datos) {
    const res = await api.patch(`/proveedores/facturas/${id}`, datos)
    return res.data
}

export async function registrarPago(facturaId, datos) {
    const res = await api.post(`/proveedores/facturas/${facturaId}/pagos`, datos)
    return res.data
}

export async function getReportes(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/proveedores/reportes/resumen?${query}`)
    return res.data
}