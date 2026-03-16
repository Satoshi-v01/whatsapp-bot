import axios from 'axios'

const API = '/api'

export async function getVentas() {
    const res = await axios.get(`${API}/ventas`)
    return res.data
}

export async function actualizarEstadoVenta(id, estado) {
    const res = await axios.patch(`${API}/ventas/${id}/estado`, { estado })
    return res.data
}