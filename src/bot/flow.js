// src/bot/flow.js

const { obtenerSesion, actualizarSesion, reiniciarSesion } = require('./estados')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { calcularPrecioEfectivo } = require('../services/precios')
const { getCarrito, agregarAlCarrito, quitarDelCarrito, limpiarCarrito, limpiarReservasPostVenta, calcularTotal, formatearCarrito } = require('../services/carrito')
const { getZonasActivas, formatearListaZonas } = require('../services/zonas')
const { verificarStockParaVenta } = require('../services/stock')
const { esReset, esPedidoAgente, esSaludo, parsearSeleccion, limpiarParaBusqueda, mensajeMenuPrincipal } = require('./helpers')
const { recalcularStats } = require('../routes/clientes')
const { estaAbierto, getMensajeFueraHorario, estaAbiertoParaDelivery } = require('../services/horario')
const db = require('../db/index')

async function enviarYGuardar(numero, texto) {
    await enviarMensaje(numero, texto)
    await guardarMensaje(numero, texto, 'bot')
}

async function procesarMensaje(numero, texto, tipoMensaje = 'text') {
    const sesion = await obtenerSesion(numero)

    if (sesion.modo === 'humano') return

    if (sesion.modo === 'esperando_agente') {
        await enviarYGuardar(numero, 'Un agente te atendera en breve. Por favor aguarda 🙏')
        return
    }

    // Verificar horario — solo bloquear si está en inicio o buscando producto
    // Si ya tiene un pedido en curso, dejarlo continuar
    const pasosLibres = ['confirmando_pedido', 'datos_delivery', 'eligiendo_zona', 'factura', 'ruc_factura', 'eligiendo_envio', 'eligiendo_cantidad', 'agregando_mas', 'viendo_carrito', 'quitando_producto']

    if (!pasosLibres.includes(sesion.paso)) {
        const abierto = await estaAbierto()
        if (!abierto) {
            const msgFuera = await getMensajeFueraHorario()
            await enviarYGuardar(numero,
                `${msgFuera}\n\n` +
                `Igual podes dejarnos tu pedido y lo procesamos cuando abramos 🐾\n\n` +
                `Escribi el producto que queres pedir.`
            )
            // No bloqueamos — dejamos que el flujo continúe para que pueda pedir igual
        }
    }

    if (['audio', 'image', 'video', 'document', 'sticker'].includes(tipoMensaje)) {
        await enviarYGuardar(numero, `Perdon 😅 por ahora solo puedo leer mensajes de texto. Escribime lo que necesitas.`)
        return
    }

    if (esReset(texto) && sesion.paso !== 'inicio') {
        await limpiarCarrito(numero)
        await reiniciarSesion(numero)
        await enviarYGuardar(numero, `Volvemos al inicio.\n\n${mensajeMenuPrincipal()}`)
        return
    }

    if (esPedidoAgente(texto)) {
        await actualizarSesion(numero, { paso: 'esperando_agente', modo: 'esperando_agente', datos: sesion.datos })
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atendera en breve.\n\nPor favor aguarda, estaremos contigo pronto 🐾`)
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
        case 'eligiendo_cantidad':
            await manejarEleccionCantidad(numero, texto, sesion)
            break
        case 'viendo_carrito':
            await manejarViendoCarrito(numero, texto, sesion)
            break
        case 'quitando_producto':
            await manejarQuitandoProducto(numero, texto, sesion)
            break
        case 'agregando_mas':
            await manejarAgregandoMas(numero, texto, sesion)
            break
        case 'eligiendo_envio':
            await manejarEleccionEnvio(numero, texto, sesion)
            break
        case 'eligiendo_zona':
            await manejarEleccionZona(numero, texto, sesion)
            break
        case 'confirmando_delivery_tarde':
            await manejarConfirmandoDeliveryTarde(numero, texto, sesion)
            break
        case 'viendo_zonas_info':
            await manejarViendoZonasInfo(numero, texto, sesion)
            break
        case 'confirmando_pedido':
            await manejarConfirmandoPedido(numero, texto, sesion)
            break
        case 'factura':
            await manejarFactura(numero, texto, sesion)
            break
        case 'ruc_factura':
            await manejarRucFactura(numero, texto, sesion)
            break
        case 'datos_delivery':
            await manejarDatosDelivery(numero, texto, sesion, tipoMensaje)
            break
        default:
            await manejarInicio(numero, texto, sesion)
        
    }
}

// ─────────────────────────────────────────────
// INICIO
// ─────────────────────────────────────────────
async function manejarInicio(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') { await manejarOpcionZonas(numero, sesion); return }
    if (t === '2') {
        await actualizarSesion(numero, { paso: 'esperando_agente', modo: 'esperando_agente', datos: {} })
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atendera en breve.\n\nPor favor aguarda, estaremos contigo pronto 🐾`)
        return
    }
    if (t === '3') { await mostrarCarrito(numero, sesion); return }

    if (esSaludo(texto)) {
        const cliente = await db.query(`SELECT nombre FROM clientes WHERE telefono = $1`, [numero])
        const nombre = cliente.rows[0]?.nombre?.startsWith('Cliente ') ? null : cliente.rows[0]?.nombre
        await enviarYGuardar(numero, mensajeMenuPrincipal(nombre))
        return
    }

    await buscarYMostrarProductos(numero, texto, sesion)
}

// ─────────────────────────────────────────────
// BUSQUEDA DE PRODUCTOS
// ─────────────────────────────────────────────
async function buscarYMostrarProductos(numero, texto, sesion) {
    const palabras = limpiarParaBusqueda(texto)

    if (palabras.length === 0) {
        await enviarYGuardar(numero, `Que producto estas buscando? Escribi el nombre (ej: "cibau", "premier") 🐾`)
        return
    }

    const condiciones = palabras.map((_, i) =>
        `(LOWER(p.nombre) ILIKE $${i + 1} OR LOWER(COALESCE(p.descripcion,'')) ILIKE $${i + 1} OR LOWER(COALESCE(m.nombre,'')) ILIKE $${i + 1})`
    ).join(' OR ')
    const valores = palabras.map(p => `%${p}%`)

    const resultado = await db.query(
        `SELECT DISTINCT p.id, p.nombre, p.calidad, m.nombre as marca_nombre
         FROM productos p
         JOIN presentaciones pr ON pr.producto_id = p.id
         LEFT JOIN marcas m ON p.marca_id = m.id
         WHERE p.disponible = true
         AND stock_disponible(pr.id, $${palabras.length + 1}) > 0
         AND (${condiciones})`,
        [...valores, numero]
    )

    if (resultado.rows.length === 0) {
        await enviarYGuardar(numero,
            `No encontre productos con "${texto}" 😅\n\n` +
            `Proba con:\n` +
            `- Escribir el nombre de otra forma (ej: "cibau", "premier")\n` +
            `- 1 para ver zonas de delivery\n` +
            `- 2 para hablar con un agente`
        )
        return
    }

    if (resultado.rows.length === 1) {
        const producto = resultado.rows[0]
        const nombreCompleto = `${producto.marca_nombre ? producto.marca_nombre + ' ' : ''}${producto.nombre}`
        await actualizarSesion(numero, {
            paso: 'eligiendo_presentacion',
            modo: 'bot',
            datos: { ...sesion.datos, producto_id: producto.id, producto_nombre: nombreCompleto }
        })
        await mostrarPresentaciones(numero, producto.id, nombreCompleto)
        return
    }

    const lista = resultado.rows.map((p, i) =>
        `${i + 1}. ${p.marca_nombre ? p.marca_nombre + ' - ' : ''}${p.nombre}`
    ).join('\n')

    await actualizarSesion(numero, {
        paso: 'eligiendo_producto',
        modo: 'bot',
        datos: { ...sesion.datos, productos: resultado.rows }
    })

    await enviarYGuardar(numero, `Encontre estos productos:\n\n${lista}\n\nCual te interesa? Responde con el numero.`)
}

// ─────────────────────────────────────────────
// ELECCION DE PRODUCTO
// ─────────────────────────────────────────────
async function manejarEleccionProducto(numero, texto, sesion) {
    const sel = parsearSeleccion(texto)
    const productos = sesion.datos.productos

    if (!sel || sel.indice < 0 || sel.indice >= productos.length) {
        await enviarYGuardar(numero, `Por favor responde con un numero entre 1 y ${productos.length}.`)
        return
    }

    const producto = productos[sel.indice]
    const nombreCompleto = `${producto.marca_nombre ? producto.marca_nombre + ' - ' : ''}${producto.nombre}`
    await actualizarSesion(numero, {
        paso: 'eligiendo_presentacion',
        modo: 'bot',
        datos: { ...sesion.datos, producto_id: producto.id, producto_nombre: nombreCompleto }
    })
    await mostrarPresentaciones(numero, producto.id, nombreCompleto)
}

// ─────────────────────────────────────────────
// MOSTRAR PRESENTACIONES
// ─────────────────────────────────────────────
async function mostrarPresentaciones(numero, productoId, productoNombre) {
    const resultado = await db.query(
        `SELECT id, nombre, precio_venta, precio_descuento, descuento_activo,
                descuento_desde, descuento_hasta, descuento_stock, stock,
                stock_disponible(id, $2) as disponible
         FROM presentaciones
         WHERE producto_id = $1 AND disponible = true AND stock > 0`,
        [productoId, numero]
    )

    const conStock = resultado.rows.filter(pr => parseInt(pr.disponible) > 0)

    if (conStock.length === 0) {
        await enviarYGuardar(numero, `Lo sentimos, *${productoNombre}* no tiene stock disponible en este momento 😔`)
        return
    }

    const lista = conStock.map((p, i) => {
        const { precio, con_descuento } = calcularPrecioEfectivo(p)
        const precioTexto = con_descuento
            ? `~~Gs. ${p.precio_venta.toLocaleString('es-PY')}~~ *Gs. ${precio.toLocaleString('es-PY')}* (oferta)`
            : `Gs. ${precio.toLocaleString('es-PY')}`
        return `${i + 1}. ${p.nombre} - ${precioTexto}`
    }).join('\n')

    await enviarYGuardar(numero,
        `*${productoNombre}*\n\n${lista}\n\n` +
        `Cual queres? Responde con el numero.`
    )
}

// ─────────────────────────────────────────────
// ELECCION DE PRESENTACION
// ─────────────────────────────────────────────
async function manejarEleccionPresentacion(numero, texto, sesion) {
    const resultado = await db.query(
        `SELECT id, nombre, precio_venta, precio_descuento, descuento_activo,
                descuento_desde, descuento_hasta, descuento_stock, stock,
                stock_disponible(id, $2) as disponible
         FROM presentaciones
         WHERE producto_id = $1 AND disponible = true AND stock > 0`,
        [sesion.datos.producto_id, numero]
    )

    const conStock = resultado.rows.filter(pr => parseInt(pr.disponible) > 0)
    const sel = parsearSeleccion(texto)

    if (!sel || sel.indice < 0 || sel.indice >= conStock.length) {
        await enviarYGuardar(numero, `Por favor responde con un numero entre 1 y ${conStock.length}.`)
        return
    }

    const presentacion = conStock[sel.indice]
    const { precio } = calcularPrecioEfectivo(presentacion)
    const disponible = parseInt(presentacion.disponible)

    await actualizarSesion(numero, {
        paso: 'eligiendo_cantidad',
        modo: 'bot',
        datos: {
            ...sesion.datos,
            presentacion_seleccionada: {
                id: presentacion.id,
                nombre: presentacion.nombre,
                precio,
                stock: disponible
            }
        }
    })

    await enviarYGuardar(numero,
        `*${sesion.datos.producto_nombre} - ${presentacion.nombre}*\n` +
        `Precio: Gs. ${precio.toLocaleString('es-PY')}\n\n` +
        `Cuantas unidades queres?\n` +
        `_(Responde con un numero, ej: 1, 2, 3...)_`
    )
}

// ─────────────────────────────────────────────
// ELECCION DE CANTIDAD
// ─────────────────────────────────────────────
async function manejarEleccionCantidad(numero, texto, sesion) {
    const cantidad = parseInt(texto.trim())
    const pr = sesion.datos.presentacion_seleccionada

    if (!pr) {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Algo salio mal. Volvemos al inicio.\n\n${mensajeMenuPrincipal()}`)
        return
    }

    if (isNaN(cantidad) || cantidad < 1) {
        await enviarYGuardar(numero, `Por favor responde con un numero. Cuantas unidades queres?`)
        return
    }

    if (cantidad > pr.stock) {
        await enviarYGuardar(numero, `Solo hay ${pr.stock} unidades disponibles. Cuantas queres? (maximo ${pr.stock})`)
        return
    }

    const resultado = await agregarAlCarrito(numero, {
        presentacion_id: pr.id,
        presentacion_nombre: pr.nombre,
        producto_nombre: sesion.datos.producto_nombre,
        precio: pr.precio,
        cantidad
    })

    if (!resultado.ok) {
        await enviarYGuardar(numero, resultado.mensaje)
        return
    }

    await actualizarSesion(numero, { paso: 'agregando_mas', modo: 'bot', datos: sesion.datos })

    await enviarYGuardar(numero,
        `Agregado al carrito:\n` +
        `*${sesion.datos.producto_nombre} - ${pr.nombre}* x${cantidad}\n\n` +
        `${formatearCarrito(resultado.carrito)}\n\n` +
        `Que queres hacer?\n` +
        `1. Agregar otro producto\n` +
        `2. Continuar con el pedido\n` +
        `3. Quitar un producto`
    )
}

// ─────────────────────────────────────────────
// AGREGANDO MAS PRODUCTOS
// ─────────────────────────────────────────────
async function manejarAgregandoMas(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero, `Que producto queres agregar? Escribi el nombre.`)
        return
    }
    if (t === '2') {
        const carrito = await getCarrito(numero)
        if (!carrito.length) {
            await enviarYGuardar(numero, `Tu carrito esta vacio. Busca un producto primero.`)
            await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
            return
        }
        await actualizarSesion(numero, { paso: 'eligiendo_envio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero, `Como queres recibir tu pedido?\n\n1. Retiro en tienda\n2. Delivery`)
        return
    }
    if (t === '3') {
        await mostrarCarritoParaQuitar(numero, sesion)
        return
    }

    await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: sesion.datos })
    await buscarYMostrarProductos(numero, texto, sesion)
}

// ─────────────────────────────────────────────
// VER CARRITO
// ─────────────────────────────────────────────
async function mostrarCarrito(numero, sesion) {
    const carrito = await getCarrito(numero)

    if (!carrito.length) {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Tu carrito esta vacio.\n\nEscribi un producto para comenzar.`)
        return
    }

    await actualizarSesion(numero, { paso: 'viendo_carrito', modo: 'bot', datos: sesion.datos })
    await enviarYGuardar(numero,
        `${formatearCarrito(carrito)}\n\n` +
        `Que queres hacer?\n` +
        `1. Continuar con el pedido\n` +
        `2. Agregar producto\n` +
        `3. Quitar producto\n` +
        `4. Vaciar carrito`
    )
}

async function manejarViendoCarrito(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'eligiendo_envio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero, `Como queres recibir tu pedido?\n\n1. Retiro en tienda\n2. Delivery`)
        return
    }
    if (t === '2') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero, `Que producto queres agregar? Escribi el nombre.`)
        return
    }
    if (t === '3') {
        await mostrarCarritoParaQuitar(numero, sesion)
        return
    }
    if (t === '4') {
        await limpiarCarrito(numero)
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Carrito vaciado.\n\nEscribi un producto para comenzar.`)
        return
    }

    await enviarYGuardar(numero, `Responde con 1, 2, 3 o 4 por favor.`)
}

async function mostrarCarritoParaQuitar(numero, sesion) {
    const carrito = await getCarrito(numero)
    if (!carrito.length) {
        await enviarYGuardar(numero, `Tu carrito esta vacio.`)
        return
    }

    const lista = carrito.map((item, i) =>
        `${i + 1}. ${item.producto_nombre} - ${item.presentacion_nombre} x${item.cantidad}`
    ).join('\n')

    await actualizarSesion(numero, {
        paso: 'quitando_producto',
        modo: 'bot',
        datos: { ...sesion.datos, carrito_snapshot: carrito }
    })

    await enviarYGuardar(numero, `Cual queres quitar?\n\n${lista}\n\nResponde con el numero.`)
}

async function manejarQuitandoProducto(numero, texto, sesion) {
    const carrito = sesion.datos.carrito_snapshot || []
    const sel = parsearSeleccion(texto)

    if (!sel || sel.indice < 0 || sel.indice >= carrito.length) {
        await enviarYGuardar(numero, `Por favor responde con un numero entre 1 y ${carrito.length}.`)
        return
    }

    const item = carrito[sel.indice]
    const nuevoCarrito = await quitarDelCarrito(numero, item.presentacion_id)

    if (!nuevoCarrito.length) {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Producto quitado. Tu carrito quedo vacio.\n\nEscribi un producto para comenzar.`)
        return
    }

    await actualizarSesion(numero, { paso: 'agregando_mas', modo: 'bot', datos: sesion.datos })
    await enviarYGuardar(numero,
        `Producto quitado.\n\n` +
        `${formatearCarrito(nuevoCarrito)}\n\n` +
        `Que queres hacer?\n` +
        `1. Agregar otro producto\n` +
        `2. Continuar con el pedido\n` +
        `3. Quitar un producto`
    )
}

// ─────────────────────────────────────────────
// ELECCION DE ENVIO
// ─────────────────────────────────────────────
async function manejarEleccionEnvio(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'factura', modo: 'bot', datos: { ...sesion.datos, modalidad: 'retiro' } })
        await enviarYGuardar(numero, `Necesitas factura?\n\n1. Si, con factura\n2. No, sin factura`)
        return
    }

    if (t === '2') {
        // Chequear horario de delivery PRIMERO
        const deliveryDisponible = await estaAbiertoParaDelivery()
        if (!deliveryDisponible) {
            await actualizarSesion(numero, {
                paso: 'confirmando_delivery_tarde',
                modo: 'bot',
                datos: { ...sesion.datos }
            })
            await enviarYGuardar(numero,
                `Los deliveries despues de las 16:00 se envian al dia siguiente.\n\n` +
                `Igual podes hacer tu pedido ahora y lo enviamos manana 🐾\n\n` +
                `1. Continuar con delivery (manana)\n` +
                `2. Retirar en tienda hoy`
            )
            return
        }

        const zonas = await getZonasActivas()
        if (!zonas.length) {
            await enviarYGuardar(numero, `Lo sentimos, por ahora no contamos con delivery disponible.\n\nQueres retirar en tienda? Responde 1.`)
            return
        }
        const lista = await formatearListaZonas(zonas)
        await actualizarSesion(numero, {
            paso: 'eligiendo_zona',
            modo: 'bot',
            datos: { ...sesion.datos, modalidad: 'delivery', zonas }
        })
        await enviarYGuardar(numero, `Zonas de delivery disponibles:\n\n${lista}\n\nResponde con el numero de tu zona.`)
        return
    }

    await enviarYGuardar(numero, `Responde *1* para retiro en tienda o *2* para delivery.`)
}
async function manejarConfirmandoDeliveryTarde(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        // Continuar con delivery igual
        const zonas = await getZonasActivas()
        if (!zonas.length) {
            await enviarYGuardar(numero, `Lo sentimos, no contamos con delivery disponible.\n\nQueres retirar en tienda? Responde 1.`)
            return
        }
        const lista = await formatearListaZonas(zonas)
        await actualizarSesion(numero, {
            paso: 'eligiendo_zona',
            modo: 'bot',
            datos: { ...sesion.datos, modalidad: 'delivery', zonas, delivery_dia_siguiente: true }
        })
        await enviarYGuardar(numero, `Zonas de delivery disponibles:\n\n${lista}\n\nResponde con el numero de tu zona.`)
        return
    }

    if (t === '2') {
        // Cambiar a retiro
        await actualizarSesion(numero, { paso: 'factura', modo: 'bot', datos: { ...sesion.datos, modalidad: 'retiro' } })
        await enviarYGuardar(numero, `Necesitas factura?\n\n1. Si, con factura\n2. No, sin factura`)
        return
    }

    await enviarYGuardar(numero, `Responde *1* para delivery (manana) o *2* para retirar en tienda hoy.`)
}


// ─────────────────────────────────────────────
// ELECCION DE ZONA
// ─────────────────────────────────────────────
async function manejarEleccionZona(numero, texto, sesion) {
    const zonas = sesion.datos.zonas || []
    const sel = parsearSeleccion(texto)

    if (!sel || sel.indice < 0 || sel.indice >= zonas.length) {
        await enviarYGuardar(numero, `Por favor responde con un numero entre 1 y ${zonas.length}.`)
        return
    }

    const zona = zonas[sel.indice]
    const carrito = await getCarrito(numero)

    await actualizarSesion(numero, {
        paso: 'factura',
        modo: 'bot',
        datos: { ...sesion.datos, zona_id: zona.id, zona_nombre: zona.nombre, costo_delivery: zona.costo }
    })

    await enviarYGuardar(numero,
        `Zona: ${zona.nombre}\n` +
        `Costo delivery: Gs. ${zona.costo.toLocaleString('es-PY')}\n\n` +
        `${formatearCarrito(carrito, zona.nombre, zona.costo)}\n\n` +
        `Necesitas factura?\n\n` +
        `1. Si, con factura\n` +
        `2. No, sin factura`
    )
}

// ─────────────────────────────────────────────
// ZONAS - VISTA INFORMATIVA
// ─────────────────────────────────────────────
async function manejarOpcionZonas(numero, sesion) {
    const zonas = await getZonasActivas()

    if (!zonas.length) {
        await enviarYGuardar(numero, `Por ahora no tenemos zonas de delivery configuradas.\n\nEscribi un producto para comenzar o habla con un agente.`)
        return
    }

    const lista = await formatearListaZonas(zonas)
    await actualizarSesion(numero, { paso: 'viendo_zonas_info', modo: 'bot', datos: { ...sesion.datos, zonas } })

    await enviarYGuardar(numero,
        `Zonas y costos de delivery:\n\n${lista}\n\n` +
        `Que queres hacer?\n` +
        `1. Hacer un pedido con delivery\n` +
        `2. Volver al inicio\n` +
        `3. Hablar con un agente`
    )
}

async function manejarViendoZonasInfo(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: { ...sesion.datos, modalidad_preseleccionada: 'delivery' } })
        await enviarYGuardar(numero, `Que producto queres pedir? Escribi el nombre.`)
        return
    }
    if (t === '2') {
        await reiniciarSesion(numero)
        await enviarYGuardar(numero, mensajeMenuPrincipal())
        return
    }
    if (t === '3') {
        await actualizarSesion(numero, { paso: 'esperando_agente', modo: 'esperando_agente', datos: {} })
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atendera en breve 🐾`)
        return
    }

    await enviarYGuardar(numero, `Responde 1, 2 o 3 por favor.`)
}

// ─────────────────────────────────────────────
// FACTURA
// ─────────────────────────────────────────────
async function manejarFactura(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'ruc_factura', modo: 'bot', datos: { ...sesion.datos, quiere_factura: true } })
        await enviarYGuardar(numero, `Ingresa tu NOMBRE o RAZON SOCIAL y tu RUC o cedula para la factura.\nEjemplo: Juan Perez *4.178.154-4*`)
        return
    }
    if (t === '2') {
        await continuar(numero, sesion, false)
        return
    }

    await enviarYGuardar(numero, `Responde *1* para con factura o *2* para sin factura.`)
}

async function manejarRucFactura(numero, texto, sesion) {
    const datos = { ...sesion.datos, quiere_factura: true, ruc_factura: texto, razon_social: `Cliente ${numero}` }

    if (sesion.datos.modalidad === 'retiro') {
        await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
        await mostrarResumenFinal(numero, datos)
    } else {
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...datos, paso_delivery: 'ubicacion' } })
        await enviarYGuardar(numero,
            `RUC registrado: *${texto}*\n\n` +
            `Paso 1 de 5 - Datos de entrega\n\n` +
            `Cual es tu ubicacion o barrio? Podes escribirla o compartir tu ubicacion por WhatsApp.`
        )
    }
}

async function continuar(numero, sesion, quiere_factura) {
    const datos = { ...sesion.datos, quiere_factura }

    if (sesion.datos.modalidad === 'retiro') {
        await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
        await mostrarResumenFinal(numero, datos)
    } else {
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...datos, paso_delivery: 'ubicacion' } })
        await enviarYGuardar(numero,
            `Paso 1 de 5 - Datos de entrega\n\n` +
            `Cual es tu ubicacion o barrio? Podes escribirla o compartir tu ubicacion por WhatsApp.`
        )
    }
}

// ─────────────────────────────────────────────
// DATOS DELIVERY
// ─────────────────────────────────────────────
async function manejarDatosDelivery(numero, texto, sesion, tipoMensaje = 'text') {
    const paso = sesion.datos.paso_delivery

    if (paso === 'ubicacion') {
        const ubicacion = tipoMensaje === 'location' ? `${texto}` : texto
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...sesion.datos, ubicacion, paso_delivery: 'referencia' } })
        await enviarYGuardar(numero, `Paso 2 de 5\nNumero de casa o referencia para encontrarte?`)
        return
    }
    if (paso === 'referencia') {
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...sesion.datos, referencia: texto, paso_delivery: 'horario' } })
        await enviarYGuardar(numero, `Paso 3 de 5\nEn que horario podes recibir la entrega?`)
        return
    }
    if (paso === 'horario') {
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...sesion.datos, horario: texto, paso_delivery: 'contacto' } })
        await enviarYGuardar(numero, `Paso 4 de 5\nNombre y numero de quien recibe el pedido?`)
        return
    }
    if (paso === 'contacto') {
        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos: { ...sesion.datos, contacto_entrega: texto, paso_delivery: 'pago' } })
        await enviarYGuardar(numero,
            `Paso 5 de 5\nCual es tu metodo de pago?\n\n` +
            `1. Efectivo\n` +
            `2. Transferencia bancaria\n\n` +
            `_(Por el momento no aceptamos tarjeta para envios a domicilio)_`
        )
        return
    }
    if (paso === 'pago') {
        const t = texto.trim()
        if (t !== '1' && t !== '2') {
            await enviarYGuardar(numero, `Por favor responde *1* para efectivo o *2* para transferencia.`)
            return
        }
        const metodoPago = t === '1' ? 'efectivo' : 'transferencia'
        const datos = { ...sesion.datos, metodo_pago: metodoPago, paso_delivery: null }

        if (t === '2') {
            await enviarYGuardar(numero,
                `Genial, estos son los datos para la transferencia:\n\n` +
                `Banco Itau\n` +
                `Beneficiario: Osvaldo Sosa CI 1676634\n` +
                `Numero de cuenta: 025618408\n` +
                `O directamente al alias CI 1676634\n\n` +
                `Envianos el comprobante y una vez verificado el agente confirmara tu pedido!`
            )
        }

        await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
        await mostrarResumenFinal(numero, datos)
        return
    }
}

// ─────────────────────────────────────────────
// RESUMEN FINAL
// ─────────────────────────────────────────────
async function mostrarResumenFinal(numero, datos) {
    const carrito = await getCarrito(numero)
    const { total } = calcularTotal(carrito, datos.costo_delivery || 0)

    let resumen = `Resumen de tu pedido:\n\n`
    resumen += formatearCarrito(carrito, datos.zona_nombre, datos.costo_delivery || 0)
    resumen += `\n\n`

    if (datos.modalidad === 'delivery') {
        if (datos.delivery_dia_siguiente) {
            resumen += `Entrega: Manana (pedido realizado despues de las 16:00)\n`
        }
        resumen += `Ubicacion: ${datos.ubicacion}\n`
        resumen += `Referencia: ${datos.referencia}\n`
        resumen += `Horario: ${datos.horario}\n`
        resumen += `Contacto: ${datos.contacto_entrega}\n`
        resumen += `Pago: ${datos.metodo_pago}\n`
    } else {
        resumen += `Modalidad: Retiro en tienda\n`
    }

    if (datos.quiere_factura) {
        resumen += `Factura: Si (${datos.ruc_factura})\n`
    }

    resumen += `\nConfirmas el pedido?\n\n1. Confirmar\n2. Cancelar`

    await enviarYGuardar(numero, resumen)
}

// ─────────────────────────────────────────────
// CONFIRMACION FINAL
// ─────────────────────────────────────────────
async function manejarConfirmandoPedido(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') { await registrarPedido(numero, sesion); return }
    if (t === '2') {
        await limpiarCarrito(numero)
        await reiniciarSesion(numero)
        await enviarYGuardar(numero, `Pedido cancelado.\n\nPodes volver a escribir cuando quieras 🐾`)
        return
    }

    await enviarYGuardar(numero, `Responde *1* para confirmar o *2* para cancelar.`)
}

// ─────────────────────────────────────────────
// REGISTRAR PEDIDO
// ─────────────────────────────────────────────
async function registrarPedido(numero, sesion) {
    const client = await db.pool.connect()
    try {
        const carrito = await getCarrito(numero)
        if (!carrito.length) {
            await enviarYGuardar(numero, `Tu carrito esta vacio. Empieza de nuevo escribiendo un producto.`)
            return
        }

        const lineas = carrito.map(item => ({ presentacion_id: item.presentacion_id, cantidad: item.cantidad }))
        const stockCheck = await verificarStockParaVenta(lineas, numero)

        if (!stockCheck.ok) {
            const errMsg = stockCheck.errores.map(e =>
                `- *${e.nombre}*: pediste ${e.pedido}, solo hay ${e.disponible} disponibles`
            ).join('\n')
            await enviarYGuardar(numero,
                `Hay un problema con el stock:\n\n${errMsg}\n\n` +
                `Por favor modifica tu carrito:\n` +
                `1. Ver carrito\n` +
                `2. Hablar con un agente`
            )
            await actualizarSesion(numero, { paso: 'viendo_carrito', modo: 'bot', datos: sesion.datos })
            return
        }

        await client.query('BEGIN')

        let clienteId = null
        const clienteExistente = await client.query(`SELECT id FROM clientes WHERE telefono = $1`, [numero])

        if (clienteExistente.rows.length > 0) {
            clienteId = clienteExistente.rows[0].id
            if (sesion.datos.modalidad === 'delivery' && sesion.datos.ubicacion) {
                await client.query(`UPDATE clientes SET direccion = $1, updated_at = NOW() WHERE id = $2`, [sesion.datos.ubicacion, clienteId])
            }
        } else {
            const nuevo = await client.query(
                `INSERT INTO clientes (nombre, telefono, origen, direccion) VALUES ($1, $2, 'bot', $3) RETURNING id`,
                [`Cliente ${numero}`, numero, sesion.datos.ubicacion || null]
            )
            clienteId = nuevo.rows[0].id
        }

        const ventasIds = []

        for (let i = 0; i < carrito.length; i++) {
            const item = carrito[i]
            const venta = await client.query(
                `INSERT INTO ventas (
                    cliente_numero, presentacion_id, cantidad, precio,
                    canal, estado, cliente_id,
                    quiere_factura, ruc_factura, razon_social,
                    costo_delivery, zona_delivery
                 ) VALUES ($1, $2, $3, $4, 'whatsapp_bot', 'pendiente_pago', $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    numero, item.presentacion_id, item.cantidad, item.precio * item.cantidad,
                    clienteId,
                    sesion.datos.quiere_factura || false,
                    sesion.datos.ruc_factura || null,
                    sesion.datos.razon_social || null,
                    i === 0 ? (sesion.datos.costo_delivery || 0) : 0,
                    i === 0 ? (sesion.datos.zona_nombre || null) : null
                ]
            )
            await client.query(`UPDATE presentaciones SET stock = stock - $1 WHERE id = $2`, [item.cantidad, item.presentacion_id])
            ventasIds.push(venta.rows[0].id)
        }

        if (sesion.datos.modalidad === 'delivery') {
            await client.query(
                `INSERT INTO deliveries (venta_id, cliente_numero, ubicacion, referencia, horario, contacto_entrega, metodo_pago, estado)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente')`,
                [ventasIds[0], numero, sesion.datos.ubicacion, sesion.datos.referencia, sesion.datos.horario, sesion.datos.contacto_entrega, sesion.datos.metodo_pago || 'efectivo']
            )
        }

        await client.query('COMMIT')
        await limpiarReservasPostVenta(numero)
        await limpiarCarrito(numero)
        await reiniciarSesion(numero)

        if (clienteId) recalcularStats(clienteId).catch(() => {})

        const { total } = calcularTotal(carrito, sesion.datos.costo_delivery || 0)
        const modalidadTexto = sesion.datos.modalidad === 'delivery'
            ? `Delivery a ${sesion.datos.zona_nombre}`
            : `Retiro en tienda`

        await enviarYGuardar(numero,
            `Pedido registrado! 🐾\n\n` +
            `${modalidadTexto}\n` +
            `Total: Gs. ${total.toLocaleString('es-PY')}\n\n` +
            `Un agente confirmara tu pedido pronto. Gracias por elegirnos! 😊`
        )

    } catch (error) {
        await client.query('ROLLBACK')
        await enviarYGuardar(numero, `Hubo un error al registrar tu pedido 😔\nPor favor escribi *agente* para que te ayudemos.`)
        throw error
    } finally {
        client.release()
    }
}

module.exports = { procesarMensaje }