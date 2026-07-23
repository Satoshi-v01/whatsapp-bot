// Normaliza un RUC paraguayo al formato con puntos de miles: 4154264-9 -> 4.154.264-9
// Idempotente (si ya tiene puntos los saca y los vuelve a poner bien) para que no
// importe como lo haya tipeado el usuario, siempre se guarda igual y evita
// duplicados de cliente por el mismo RUC con distinto formato.
function normalizarRuc(ruc) {
    if (!ruc) return ruc
    const valor = String(ruc).trim().replace(/\s+/g, '')
    const match = valor.match(/^(\d[\d.]*)-([\dkK])$/)
    if (!match) return valor
    const numero = match[1].replace(/\./g, '')
    const digitoVerificador = match[2]
    const conPuntos = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${conPuntos}-${digitoVerificador}`
}

module.exports = { normalizarRuc }
