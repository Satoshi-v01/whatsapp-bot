import api from './api'

export async function getClientes(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/clientes${query ? `?${query}` : ''}`)
    return res.data
}

export async function getCliente(id) {
    const res = await api.get(`/clientes/${id}`)
    return res.data
}

export async function buscarClientes(q) {
    const res = await api.get(`/clientes/buscar/autocomplete?q=${q}`)
    return res.data
}

export async function crearCliente(datos) {
    const res = await api.post('/clientes', datos)
    return res.data
}

export async function editarCliente(id, datos) {
    const res = await api.patch(`/clientes/${id}`, datos)
    return res.data
}