import api from './api'

export async function getLogs(params = {}) {
    const query = new URLSearchParams(params).toString()
    const res = await api.get(`/auditoria?${query}`)
    return res.data
}