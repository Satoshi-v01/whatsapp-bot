/**
 * Formatea un RUC para display visual: "4154264-9" → "4.154.264-9"
 * El valor almacenado siempre es sin puntos, solo con guion.
 */
export function formatRUC(ruc) {
    if (!ruc) return ''
    const partes = String(ruc).split('-')
    if (partes.length !== 2) return ruc
    const digitos = partes[0].replace(/\./g, '').replace(/[^0-9]/g, '')
    const verificador = partes[1]
    const conPuntos = parseInt(digitos, 10).toLocaleString('es-PY')
    return `${conPuntos}-${verificador}`
}

/**
 * Normaliza un RUC ingresado por el usuario para guardarlo en DB.
 * Elimina puntos y espacios, mantiene el guion: "4.154.264 - 9" → "4154264-9"
 */
export function normalizarRUC(ruc) {
    if (!ruc) return ''
    return String(ruc).replace(/\./g, '').replace(/\s/g, '').toUpperCase()
}

/**
 * Formatea un número con separador de miles (punto) al estilo paraguayo.
 * 1500000 → "1.500.000"
 */
export function formatMiles(valor) {
    const n = parseInt(valor, 10)
    if (isNaN(n)) return ''
    return n.toLocaleString('es-PY')
}

/**
 * Parsea un string formateado con puntos a número entero.
 * "1.500.000" → 1500000
 */
export function parseMiles(str) {
    if (!str && str !== 0) return ''
    return String(str).replace(/\./g, '').replace(/[^0-9]/g, '')
}

/**
 * Formatea valores snake_case de la DB a texto legible con título.
 * standard        → Standard
 * super_premium   → Super Premium
 * premium_special → Premium Special
 */
export function formatearCalidad(calidad) {
    if (!calidad) return '—'
    return calidad
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

/**
 * Formatea cualquier snake_case a Title Case.
 * "pending_payment" → "Pending Payment"
 */
export function formatearTag(valor) {
    if (!valor) return '—'
    return valor
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
}

/**
 * Formatea un canal de venta a su etiqueta visible.
 */
export function formatearCanal(canal) {
    const mapa = {
        presencial: 'Presencial',
        whatsapp:   'WhatsApp',
        web:        'Web',
        telefono:   'Teléfono',
    }
    return mapa[canal] || formatearTag(canal)
}

/**
 * Formatea un método de pago a su etiqueta visible.
 */
export function formatearMetodoPago(metodo) {
    const mapa = {
        efectivo:      'Efectivo',
        transferencia: 'Transferencia',
        tarjeta:       'Tarjeta',
        credito:       'Crédito',
        cheque:        'Cheque',
        qr:            'QR',
    }
    return mapa[metodo] || formatearTag(metodo)
}
