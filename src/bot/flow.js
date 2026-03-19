const { obtenerSesion, actualizarSesion } = require('./estados')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { calcularPrecioEfectivo } = require('../services/precios')
const db = require('../db/index')

async function enviarYGuardar(numero, texto) {
    await enviarMensaje(numero, texto)
    await guardarMensaje(numero, texto, 'bot')
}

async function procesarMensaje(numero, texto, tipoMensaje = 'text') {
    const sesion = await obtenerSesion(numero)

    if (sesion.modo === 'humano') {
        return
    }

    if (sesion.modo === 'esperando_agente') {
        await enviarYGuardar(numero, 'Un agente te atenderá en breve, estamos contigo.')
        return
    }

    switch (sesion.paso) {
        case 'inicio':
            await manejarInicio(numero, texto, sesion)
            break
        case 'eligiendo_producto':
            await manejarEleccionProducto(numero, texto, sesion)
            break
        case 'eligiendo_presentacion':
            await manejarEleccionPresentacion(numero, texto, sesion)
            break
        case 'confirmando':
            await manejarConfirmacion(numero, texto, sesion)
            break
        case 'factura':
            await manejarFactura(numero, texto, sesion)
            break
        case 'ruc_factura':
            await manejarRucFactura(numero, texto, sesion)
            break
        case 'eligiendo_envio':
            await manejarEleccionEnvio(numero, texto, sesion)
            break
        case 'datos_delivery':
            await manejarDatosDelivery(numero, texto, sesion, tipoMensaje)
            break
        default:
            await manejarInicio(numero, texto, sesion)
    }
}

const PALABRAS_SALUDO = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'hi', 'hey', 'ola']

const PALABRAS_IGNORAR = ['tenes', 'tienen', 'tenés', 'tienen', 'quiero', 'busco', 'me das', 'hay', 'tienes', 'dame', 'necesito', 'me gustaria', 'quisiera', 'por favor', 'porfavor', 'gracias', 'un', 'una', 'el', 'la', 'los', 'las', 'de', 'del', 'para', 'con', 'que', 'me', 'si', 'no']

async function manejarInicio(numero, texto, sesion) {
    const textoBajo = texto.toLowerCase().trim()

    const esSaludo = PALABRAS_SALUDO.some(saludo => textoBajo === saludo || textoBajo.startsWith(saludo + ' '))

    if (esSaludo) {
        await enviarYGuardar(numero,
            `¡Hola! Bienvenido a Sosa Bulls 🐾\n\n` +
            `¿Qué producto estás buscando? Podés escribir el nombre del producto o la categoría.\n\n` +
            `Ejemplos:\n` +
            `• "cibau"\n` +
            `• "royal canin"\n` +
            `• "comida para perro"`
        )
        return
    }

    const palabras = textoBajo
        .split(' ')
        .filter(p => p.length > 2)
        .filter(p => !PALABRAS_IGNORAR.includes(p))

    if (palabras.length === 0) {
        await enviarYGuardar(numero, `¿Qué producto estás buscando? Escribí el nombre del producto.`)
        return
    }

    const condiciones = palabras.map((_, i) => `(LOWER(p.nombre) ILIKE $${i + 1} OR LOWER(p.descripcion) ILIKE $${i + 1})`).join(' OR ')
    const valores = palabras.map(p => `%${p}%`)

    const resultado = await db.query(
        `SELECT DISTINCT p.id, p.nombre, p.calidad
         FROM productos p
         JOIN presentaciones pr ON pr.producto_id = p.id
         WHERE p.disponible = true
         AND pr.stock > 0
         AND (${condiciones})`,
        valores
    )

    if (resultado.rows.length === 0) {
        await enviarYGuardar(numero,
            `No encontré productos con "${texto}".\n\n` +
            `¿Podés escribir el nombre del producto? Por ejemplo "cibau" o "royal canin".`
        )
        return
    }

    if (resultado.rows.length === 1) {
        const producto = resultado.rows[0]
        await actualizarSesion(numero, {
            paso: 'eligiendo_presentacion',
            modo: 'bot',
            datos: { producto_id: producto.id, producto_nombre: producto.nombre }
        })
        await mostrarPresentaciones(numero, producto.id, producto.nombre)
        return
    }

    const lista = resultado.rows
        .map((p, i) => `${i + 1}. ${p.nombre} (${p.calidad})`)
        .join('\n')

    await actualizarSesion(numero, {
        paso: 'eligiendo_producto',
        modo: 'bot',
        datos: { productos: resultado.rows }
    })

    await enviarYGuardar(numero,
        `Encontré estos productos:\n\n${lista}\n\n` +
        `¿Cuál te interesa? Respondé con el número.`
    )
}

async function manejarEleccionProducto(numero, texto, sesion) {
    const indice = parseInt(texto) - 1
    const productos = sesion.datos.productos

    if (isNaN(indice) || indice < 0 || indice >= productos.length) {
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${productos.length}.`)
        return
    }

    const producto = productos[indice]

    await actualizarSesion(numero, {
        paso: 'eligiendo_presentacion',
        modo: 'bot',
        datos: { producto_id: producto.id, producto_nombre: producto.nombre }
    })

    await mostrarPresentaciones(numero, producto.id, producto.nombre)
}

async function mostrarPresentaciones(numero, productoId, productoNombre) {
    const resultado = await db.query(
        `SELECT id, nombre, precio_venta, precio_descuento, descuento_activo,
                descuento_desde, descuento_hasta, descuento_stock, stock
         FROM presentaciones
         WHERE producto_id = $1
         AND disponible = true
         AND stock > 0`,
        [productoId]
    )

    if (resultado.rows.length === 0) {
        await enviarYGuardar(numero, `Lo sentimos, ${productoNombre} no tiene stock disponible en este momento.`)
        return
    }

    const lista = resultado.rows
        .map((p, i) => {
            const { precio, con_descuento } = calcularPrecioEfectivo(p)
            const precioTexto = con_descuento
                ? `~~Gs. ${p.precio_venta.toLocaleString()}~~ *Gs. ${precio.toLocaleString()}* 🏷️`
                : `Gs. ${precio.toLocaleString()}`
            return `${i + 1}. ${p.nombre} — ${precioTexto}`
        })
        .join('\n')

    await enviarYGuardar(numero,
        `*${productoNombre}*\n\n${lista}\n\n` +
        `¿Cuál presentación te interesa? Respondé con el número.`
    )
}

async function manejarEleccionPresentacion(numero, texto, sesion) {
    const resultado = await db.query(
        `SELECT id, nombre, precio_venta, precio_descuento, descuento_activo,
                descuento_desde, descuento_hasta, descuento_stock, stock
         FROM presentaciones
         WHERE producto_id = $1
         AND disponible = true
         AND stock > 0`,
        [sesion.datos.producto_id]
    )

    const indice = parseInt(texto) - 1

    if (isNaN(indice) || indice < 0 || indice >= resultado.rows.length) {
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${resultado.rows.length}.`)
        return
    }

    const presentacion = resultado.rows[indice]
    const { precio, con_descuento } = calcularPrecioEfectivo(presentacion)

    await actualizarSesion(numero, {
        paso: 'confirmando',
        modo: 'bot',
        datos: {
            producto_id: sesion.datos.producto_id,
            producto_nombre: sesion.datos.producto_nombre,
            presentacion_id: presentacion.id,
            presentacion_nombre: presentacion.nombre,
            precio: precio,
            precio_original: presentacion.precio_venta,
            con_descuento
        }
    })

    const precioTexto = con_descuento
        ? `~~Gs. ${presentacion.precio_venta.toLocaleString()}~~ *Gs. ${precio.toLocaleString()}* 🏷️`
        : `Gs. ${precio.toLocaleString()}`

    await enviarYGuardar(numero,
        `*${sesion.datos.producto_nombre} — ${presentacion.nombre}*\n` +
        `Precio: ${precioTexto}\n\n` +
        `¿Confirmás la compra? Respondé *si* o *no*.`
    )
}

async function manejarConfirmacion(numero, texto, sesion) {
    const respuesta = texto.toLowerCase().trim()

    if (respuesta === 'si' || respuesta === 'sí') {
        await actualizarSesion(numero, {
            paso: 'factura',
            modo: 'bot',
            datos: sesion.datos
        })

        await enviarYGuardar(numero,
            `¿Necesitás factura?\n\n` +
            `1. Sí, con factura\n` +
            `2. No, sin factura\n\n` +
            `Respondé con 1 o 2.`
        )

    } else if (respuesta === 'no') {
        await actualizarSesion(numero, {
            paso: 'inicio',
            modo: 'bot',
            datos: {}
        })

        await enviarYGuardar(numero, `Entendido, cancelado. ¿Puedo ayudarte con algo más?`)

    } else {
        await enviarYGuardar(numero, `Por favor respondé *si* o *no*.`)
    }
}

async function manejarFactura(numero, texto, sesion) {
    const respuesta = texto.trim()

    if (respuesta === '1') {
        await actualizarSesion(numero, {
            paso: 'ruc_factura',
            modo: 'bot',
            datos: { ...sesion.datos, quiere_factura: true }
        })
        await enviarYGuardar(numero,
            `Por favor ingresá tu RUC o cédula para la factura.\n` +
            `Ejemplo: *4154264-9*`
        )

    } else if (respuesta === '2') {
        await actualizarSesion(numero, {
            paso: 'eligiendo_envio',
            modo: 'bot',
            datos: { ...sesion.datos, quiere_factura: false }
        })
        await enviarYGuardar(numero,
            `¿Cómo preferís recibir tu pedido?\n\n` +
            `1. Retiro en tienda\n` +
            `2. Delivery\n\n` +
            `Respondé con 1 o 2.`
        )
    } else {
        await enviarYGuardar(numero, `Por favor respondé *1* para con factura o *2* para sin factura.`)
    }
}

async function manejarRucFactura(numero, texto, sesion) {
    await actualizarSesion(numero, {
        paso: 'eligiendo_envio',
        modo: 'bot',
        datos: { ...sesion.datos, ruc_factura: texto, razon_social: `Cliente ${numero}` }
    })

    await enviarYGuardar(numero,
        `✅ RUC registrado: *${texto}*\n\n` +
        `¿Cómo preferís recibir tu pedido?\n\n` +
        `1. Retiro en tienda\n` +
        `2. Delivery\n\n` +
        `Respondé con 1 o 2.`
    )
}

async function manejarEleccionEnvio(numero, texto, sesion) {
    const respuesta = texto.trim()

    if (respuesta === '1') {
        await registrarVenta(numero, sesion, 'retiro')

        await actualizarSesion(numero, {
            paso: 'inicio',
            modo: 'bot',
            datos: {}
        })

        await enviarYGuardar(numero,
            `✅ ¡Pedido registrado!\n` +
            `*${sesion.datos.producto_nombre} — ${sesion.datos.presentacion_nombre}*\n` +
            `Total: Gs. ${sesion.datos.precio.toLocaleString()}\n` +
            `Modalidad: Retiro en tienda\n\n` +
            `Un agente te confirmará la dirección y horario. ¡Gracias!`
        )

    } else if (respuesta === '2') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...sesion.datos, paso_delivery: 'ubicacion' }
        })

        await enviarYGuardar(numero,
            `Perfecto, delivery. Necesito algunos datos.\n\n` +
            `*Paso 1 de 5*\n` +
            `¿Cuál es tu ubicación o barrio? Podés escribirla o compartir tu ubicación de WhatsApp.`
        )

    } else {
        await enviarYGuardar(numero, `Por favor respondé *1* para retiro o *2* para delivery.`)
    }
}

async function manejarDatosDelivery(numero, texto, sesion, tipoMensaje = 'text') {
    const pasoDelivery = sesion.datos.paso_delivery

    if (pasoDelivery === 'ubicacion') {
        const ubicacionFinal = tipoMensaje === 'location'
            ? `📍 ${texto}`
            : texto

        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...sesion.datos, ubicacion: ubicacionFinal, paso_delivery: 'referencia' }
        })
        await enviarYGuardar(numero,
            `*Paso 2 de 5*\n` +
            `¿Número de casa o alguna referencia para encontrarte?`
        )

    } else if (pasoDelivery === 'referencia') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...sesion.datos, referencia: texto, paso_delivery: 'horario' }
        })
        await enviarYGuardar(numero,
            `*Paso 3 de 5*\n` +
            `¿En qué horario podés recibir la entrega?`
        )

    } else if (pasoDelivery === 'horario') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...sesion.datos, horario: texto, paso_delivery: 'contacto' }
        })
        await enviarYGuardar(numero,
            `*Paso 4 de 5*\n` +
            `¿Nombre y número de la persona que va a recibir el pedido?`
        )

    } else if (pasoDelivery === 'contacto') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...sesion.datos, contacto_entrega: texto, paso_delivery: 'pago' }
        })
        await enviarYGuardar(numero,
            `*Paso 5 de 5*\n` +
            `¿Cuál es tu método de pago?\n\n` +
            `1. Efectivo\n` +
            `2. Transferencia\n` +
            `3. Tarjeta\n\n` +
            `Respondé con el número.`
        )

    } else if (pasoDelivery === 'pago') {
        const metodos = { '1': 'Efectivo', '2': 'Transferencia', '3': 'Tarjeta' }
        const metodoPago = metodos[texto.trim()]

        if (!metodoPago) {
            await enviarYGuardar(numero, `Por favor respondé 1, 2 o 3.`)
            return
        }

        const datosCompletos = { ...sesion.datos, metodo_pago: metodoPago }

        await registrarVenta(numero, { datos: datosCompletos }, 'delivery')

        await actualizarSesion(numero, {
            paso: 'inicio',
            modo: 'bot',
            datos: {}
        })

        await enviarYGuardar(numero,
            `✅ ¡Pedido registrado!\n\n` +
            `*${datosCompletos.producto_nombre} — ${datosCompletos.presentacion_nombre}*\n` +
            `Total: Gs. ${datosCompletos.precio.toLocaleString()}\n` +
            `Modalidad: Delivery\n` +
            `Ubicación: ${datosCompletos.ubicacion}\n` +
            `Referencia: ${datosCompletos.referencia}\n` +
            `Horario: ${datosCompletos.horario}\n` +
            `Recibe: ${datosCompletos.contacto_entrega}\n` +
            `Pago: ${metodoPago}\n\n` +
            `Un agente confirmará tu pedido pronto. ¡Gracias!`
        )
    }
}

async function registrarVenta(numero, sesion, modalidad) {
    let clienteId = null
    const clienteExistente = await db.query(
        `SELECT id FROM clientes WHERE telefono = $1`,
        [numero]
    )

    if (clienteExistente.rows.length > 0) {
        clienteId = clienteExistente.rows[0].id
        if (modalidad === 'delivery' && sesion.datos.ubicacion) {
            await db.query(
                `UPDATE clientes SET direccion = $1, updated_at = NOW() WHERE id = $2`,
                [sesion.datos.ubicacion, clienteId]
            )
        }
    } else {
        const nuevoCliente = await db.query(
            `INSERT INTO clientes (nombre, telefono, origen, direccion)
             VALUES ($1, $2, 'bot', $3)
             RETURNING id`,
            [
                `Cliente ${numero}`,
                numero,
                modalidad === 'delivery' ? sesion.datos.ubicacion : null
            ]
        )
        clienteId = nuevoCliente.rows[0].id
    }

    const venta = await db.query(
        `INSERT INTO ventas (cliente_numero, presentacion_id, cantidad, precio, canal, estado, cliente_id, quiere_factura, ruc_factura, razon_social)
        VALUES ($1, $2, 1, $3, 'whatsapp_bot', 'pendiente_pago', $4, $5, $6, $7)
        RETURNING id`,
        [
            numero,
            sesion.datos.presentacion_id,
            sesion.datos.precio,
            clienteId,
            sesion.datos.quiere_factura || false,
            sesion.datos.ruc_factura || null,
            sesion.datos.razon_social || null
        ]
    )

    await db.query(
        `UPDATE presentaciones SET stock = stock - 1 WHERE id = $1`,
        [sesion.datos.presentacion_id]
    )

    if (modalidad === 'delivery') {
        await db.query(
            `INSERT INTO deliveries (venta_id, cliente_numero, ubicacion, referencia, horario, contacto_entrega, metodo_pago)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                venta.rows[0].id,
                numero,
                sesion.datos.ubicacion,
                sesion.datos.referencia,
                sesion.datos.horario,
                sesion.datos.contacto_entrega,
                sesion.datos.metodo_pago
            ]
        )
    }
}

module.exports = { procesarMensaje }