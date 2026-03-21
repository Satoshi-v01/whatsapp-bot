// src/bot/helpers.js

const PALABRAS_RESET = ['empezar', 'reiniciar', 'volver', 'inicio', 'menu', 'menú', 'otra cosa', 'quiero otra', 'cancelar todo', 'reset']
const PALABRAS_AGENTE = ['agente', 'humano', 'persona', 'asesor', 'hablar con alguien', 'operador', 'ayuda']
const PALABRAS_SALUDO = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hi', 'hey', 'ola']
const PALABRAS_IGNORAR = ['tenes', 'tienen', 'tenés', 'quiero', 'busco', 'me das', 'hay', 'tienes', 'dame', 'necesito', 'me gustaria', 'quisiera', 'por favor', 'porfavor', 'gracias', 'un', 'una', 'el', 'la', 'los', 'las', 'de', 'del', 'para', 'con', 'que', 'me', 'si', 'no']

function esReset(texto) {
    const t = texto.toLowerCase().trim()
    return PALABRAS_RESET.some(p => t.includes(p))
}

function esPedidoAgente(texto) {
    const t = texto.toLowerCase().trim()
    return PALABRAS_AGENTE.some(p => t.includes(p))
}

function esSaludo(texto) {
    const t = texto.toLowerCase().trim()
    return PALABRAS_SALUDO.some(s => t === s || t.startsWith(s + ' '))
}

function parsearSeleccion(texto) {
    const t = texto.toLowerCase().trim()

    const matchX = t.match(/^(\d+)\s*x\s*(\d+)$/)
    if (matchX) return { indice: parseInt(matchX[1]) - 1, cantidad: parseInt(matchX[2]) }

    const matchU = t.match(/^(\d+)\s*(unidad|unidades|und|u)$/)
    if (matchU) return { indice: 0, cantidad: parseInt(matchU[1]) }

    const num = parseInt(t)
    if (!isNaN(num) && num > 0) return { indice: num - 1, cantidad: 1 }

    return null
}

function limpiarParaBusqueda(texto) {
    return texto
        .toLowerCase()
        .trim()
        .split(' ')
        .filter(p => p.length > 2)
        .filter(p => !PALABRAS_IGNORAR.includes(p))
}

function mensajeMenuPrincipal(nombre = null) {
    const saludo = nombre ? `Hola, ${nombre}! 👋` : 'Hola! Bienvenido a Sosa Bulls 🐾'
    return (
        `${saludo}\n\n` +
        `Que queres hacer?\n\n` +
        `Escribi directamente el producto que buscas (ej: "cibau", "royal canin")\n\n` +
        `O elegi una opcion:\n` +
        `1. Ver zonas y costos de delivery\n` +
        `2. Hablar con un agente\n` +
        `3. Ver mi carrito`
    )
}

module.exports = {
    esReset, esPedidoAgente, esSaludo,
    parsearSeleccion, limpiarParaBusqueda,
    mensajeMenuPrincipal,
    PALABRAS_SALUDO, PALABRAS_IGNORAR
}