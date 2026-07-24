const TZ = 'America/Asuncion'

export function formatearFecha(fecha, opciones = {}) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleString('es-PY', {
        timeZone: TZ,
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
        timeZone: TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

export function formatearSoloHora(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleTimeString('es-PY', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function formatearHora(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleTimeString('es-PY', {
        timeZone: TZ,
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function fechaHoyPY() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' })
}

export function fechaInicioMesPY() {
    const d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Asuncion' }))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function soloFechaPY(fecha) {
    return new Date(fecha).toLocaleDateString('en-CA', { timeZone: TZ })
}

export function formatearSeparadorFecha(fecha) {
    if (!fecha) return ''
    const dia = soloFechaPY(fecha)
    const hoy = fechaHoyPY()
    if (dia === hoy) return 'Hoy'
    const ayer = new Date(new Date(`${hoy}T12:00:00`).getTime() - 86400000).toLocaleDateString('en-CA')
    if (dia === ayer) return 'Ayer'
    return formatearSoloFecha(fecha)
}