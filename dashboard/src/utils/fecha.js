export function formatearFecha(fecha, opciones = {}) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleString('es-PY', {
        timeZone: 'America/Asuncion',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...opciones
    })
}

export function formatearSoloFecha(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-PY', {
        timeZone: 'America/Asuncion',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export function formatearSoloHora(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleTimeString('es-PY', {
        timeZone: 'America/Asuncion',
        hour: '2-digit',
        minute: '2-digit'
    })
}