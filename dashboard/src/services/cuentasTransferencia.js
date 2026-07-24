import api from './api'

export async function getCuentasTransferencia() {
    const res = await api.get('/cuentas-transferencia')
    return res.data
}

export async function getCuentasTransferenciaTodas() {
    const res = await api.get('/cuentas-transferencia/todas')
    return res.data
}

export async function crearCuentaTransferencia(datos) {
    const res = await api.post('/cuentas-transferencia', datos)
    return res.data
}

export async function editarCuentaTransferencia(id, datos) {
    const res = await api.patch(`/cuentas-transferencia/${id}`, datos)
    return res.data
}

export async function eliminarCuentaTransferencia(id) {
    const res = await api.delete(`/cuentas-transferencia/${id}`)
    return res.data
}
