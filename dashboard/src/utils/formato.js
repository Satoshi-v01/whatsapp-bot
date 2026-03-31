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
