import api from './api'

export async function getSesiones() {
    const res = await api.get('/sesiones')
    return res.data
}

export async function tomarSesion(numero, agente_id) {
    const res = await api.patch(`/sesiones/${numero}/tomar`, { agente_id })
    return res.data
}

export async function responderSesion(numero, texto) {
    const res = await api.post(`/sesiones/${numero}/responder`, { texto })
    return res.data
}

export async function devolverBot(numero) {
    const res = await api.patch(`/sesiones/${numero}/devolver`)
    return res.data
}

export async function cerrarConversacion(numero) {
    const res = await api.patch(`/sesiones/${numero}/cerrar`)
    return res.data
}