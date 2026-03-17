import axios from 'axios'

const API = '/api'

export async function getSesiones() {
    const res = await axios.get(`${API}/sesiones`)
    return res.data
}

export async function tomarSesion(numero, agente_id) {
    const res = await axios.patch(`${API}/sesiones/${numero}/tomar`, { agente_id })
    return res.data
}

export async function responderSesion(numero, texto) {
    const res = await axios.post(`${API}/sesiones/${numero}/responder`, { texto })
    return res.data
}

export async function devolverBot(numero) {
    const res = await axios.patch(`${API}/sesiones/${numero}/devolver`)
    return res.data
}