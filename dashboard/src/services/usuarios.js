import api from './api'

export async function getUsuarios() {
    const res = await api.get('/usuarios')
    return res.data
}

export async function getRoles() {
    const res = await api.get('/usuarios/roles')
    return res.data
}

export async function crearRol(datos) {
    const res = await api.post('/usuarios/roles', datos)
    return res.data
}

export async function actualizarRol(id, datos) {
    const res = await api.patch(`/usuarios/roles/${id}`, datos)
    return res.data
}

export async function eliminarRol(id) {
    const res = await api.delete(`/usuarios/roles/${id}`)
    return res.data
}

export async function crearUsuario(datos) {
    const res = await api.post('/usuarios', datos)
    return res.data
}

export async function eliminarUsuario(id) {
    const res = await api.delete(`/usuarios/${id}`)
    return res.data
}

export async function cambiarPassword(id, password_actual, password_nueva) {
    const res = await api.patch(`/usuarios/${id}/password`, { password_actual, password_nueva })
    return res.data
}