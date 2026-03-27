// src/bot/flow.js

const { obtenerSesion, actualizarSesion, reiniciarSesion } = require('./estados')
const { enviarMensaje } = require('../services/whatsapp')
const { guardarMensaje } = require('../services/mensajes')
const { calcularPrecioEfectivo } = require('../services/precios')
const { getCarrito, agregarAlCarrito, quitarDelCarrito, limpiarCarrito, calcularTotal, formatearCarrito } = require('../services/carrito')
const { getZonasActivas, formatearListaZonas } = require('../services/zonas')
const { verificarStockParaVenta } = require('../services/stock')
const { esReset, esPedidoAgente, esSaludo, parsearSeleccion, limpiarParaBusqueda, mensajeMenuPrincipal } = require('./helpers')
const { recalcularStats } = require('../routes/clientes')
const { estaAbierto, getMensajeFueraHorario, estaAbiertoParaDelivery } = require('../services/horario')
const db = require('../db/index')

// ─────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────
async function enviarYGuardar(numero, texto) {
    await enviarMensaje(numero, texto)
    await guardarMensaje(numero, texto, 'bot')
}

// ─────────────────────────────────────────────
// PROCESADOR PRINCIPAL
// ─────────────────────────────────────────────
async function procesarMensaje(numero, texto, tipoMensaje = 'text') {
    const sesion = await obtenerSesion(numero)

    if (sesion.modo === 'humano') return

    if (sesion.modo === 'esperando_agente') {
        await enviarYGuardar(numero, `Un agente te atenderá en breve. Por favor aguardá 🙏`)
        return
    }

    // Verificar horario — solo en pasos iniciales
    const pasosLibres = [
        'confirmando_pedido', 'datos_delivery', 'eligiendo_zona',
        'factura', 'ruc_factura', 'eligiendo_envio', 'eligiendo_cantidad',
        'agregando_mas', 'viendo_carrito', 'quitando_producto',
        'confirmando_delivery_tarde', 'viendo_zonas_info'
    ]

    if (!pasosLibres.includes(sesion.paso)) {
        const abierto = await estaAbierto()
        if (!abierto && !sesion.datos.aviso_horario_enviado) {
            const msgFuera = await getMensajeFueraHorario()
            await enviarYGuardar(numero,
                `${msgFuera}\n\n` +
                `Igual podés dejarnos tu pedido y lo procesamos cuando abramos 🐾\n\n` +
                `Escribí el producto que querés pedir.`
            )
            await actualizarSesion(numero, {
                paso: sesion.paso,
                modo: sesion.modo,
                datos: { ...sesion.datos, aviso_horario_enviado: true }
            })
        }
    }

    // Audios, videos, documentos, stickers
    if (['audio', 'video', 'document', 'sticker'].includes(tipoMensaje)) {
        await enviarYGuardar(numero, `Perdón 😅 por ahora solo puedo leer mensajes de texto. Escribime lo que necesitás.`)
        return
    }

    // Imágenes — puede ser comprobante de transferencia
    if (tipoMensaje === 'image') {
        if (sesion.datos.esperando_comprobante) {
            await actualizarSesion(numero, {
                paso: sesion.paso,
                modo: 'esperando_agente',
                datos: { ...sesion.datos, esperando_comprobante: false, comprobante_recibido: true }
            })
            await enviarYGuardar(numero,
                `✅ *¡Comprobante recibido!*\n\n` +
                `Un agente verificará el pago y confirmará tu pedido en breve.\n` +
                `¡Gracias por tu paciencia! 🐾`
            )
            return
        }
        await enviarYGuardar(numero, `Perdón 😅 por ahora solo puedo leer mensajes de texto. Escribime lo que necesitás.`)
        return
    }

    // Reset global
    if (esReset(texto) && sesion.paso !== 'inicio') {
        await limpiarCarrito(numero)
        await reiniciarSesion(numero)
        await enviarYGuardar(numero, `Volvemos al inicio.\n\n${mensajeMenuPrincipal()}`)
        return
    }

    // Pedido de agente
    if (esPedidoAgente(texto)) {
        await actualizarSesion(numero, { paso: 'esperando_agente', modo: 'esperando_agente', datos: sesion.datos })
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atenderá en breve.\n\nPor favor aguardá, estaremos con vos pronto 🐾`)
        return
    }

    switch (sesion.paso) {
        case 'inicio':                      await manejarInicio(numero, texto, sesion); break
        case 'ofreciendo_repetir':     await manejarOfreciendoRepetir(numero, texto, sesion); break
        case 'confirmando_ubicacion':  await manejarConfirmandoUbicacion(numero, texto, sesion); break
        case 'eligiendo_producto':          await manejarEleccionProducto(numero, texto, sesion); break
        case 'eligiendo_presentacion':      await manejarEleccionPresentacion(numero, texto, sesion); break
        case 'eligiendo_cantidad':          await manejarEleccionCantidad(numero, texto, sesion); break
        case 'viendo_carrito':              await manejarViendoCarrito(numero, texto, sesion); break
        case 'quitando_producto':           await manejarQuitandoProducto(numero, texto, sesion); break
        case 'agregando_mas':               await manejarAgregandoMas(numero, texto, sesion); break
        case 'eligiendo_envio':             await manejarEleccionEnvio(numero, texto, sesion); break
        case 'eligiendo_zona':              await manejarEleccionZona(numero, texto, sesion); break
        case 'confirmando_delivery_tarde':  await manejarConfirmandoDeliveryTarde(numero, texto, sesion); break
        case 'viendo_zonas_info':           await manejarViendoZonasInfo(numero, texto, sesion); break
        case 'confirmando_pedido':          await manejarConfirmandoPedido(numero, texto, sesion); break
        case 'factura':                     await manejarFactura(numero, texto, sesion); break
        case 'ruc_factura':                 await manejarRucFactura(numero, texto, sesion); break
        case 'datos_delivery':              await manejarDatosDelivery(numero, texto, sesion, tipoMensaje); break
        default:                            await manejarInicio(numero, texto, sesion); break
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
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atenderá en breve.\n\nPor favor aguardá, estaremos con vos pronto 🐾`)
        return
    }
    if (t === '3') { await mostrarCarrito(numero, sesion); return }

    if (esSaludo(texto)) {
        await manejarSaludoCliente(numero, sesion)
        return
    }

    await buscarYMostrarProductos(numero, texto, sesion)
}


async function manejarSaludoCliente(numero, sesion) {
    // Verificar si el número ya existe — si no, verificar si hay cliente con mismo RUC
    // (esto se maneja cuando el cliente ingresa datos de factura en manejarRucFactura)
    // Al guardar factura, si el RUC ya existe en DB, asociar el número al cliente existente
    // Buscar cliente por número
    const clienteRes = await db.query(
        `SELECT c.*, 
            v.presentacion_id as ultima_presentacion_id,
            pr.nombre as ultima_presentacion_nombre,
            p.nombre as ultimo_producto_nombre,
            m.nombre as ultima_marca_nombre,
            v.canal as ultimo_canal,
            v.created_at as ultima_compra_at
         FROM clientes c
         LEFT JOIN LATERAL (
             SELECT v.presentacion_id, v.canal, v.created_at
             FROM ventas v
             WHERE v.cliente_id = c.id
             AND v.estado != 'cancelado'
             ORDER BY v.created_at DESC
             LIMIT 1
         ) v ON true
         LEFT JOIN presentaciones pr ON v.presentacion_id = pr.id
         LEFT JOIN productos p ON pr.producto_id = p.id
         LEFT JOIN marcas m ON p.marca_id = m.id
         WHERE c.telefono = $1`,
        [numero]
    )

    const cliente = clienteRes.rows[0]

    // Cliente nuevo — flujo normal
    if (!cliente) {
        await enviarYGuardar(numero, mensajeMenuPrincipal())
        return
    }

    const nombre = cliente.nombre?.startsWith('Cliente ') ? null : cliente.nombre

    // Cliente sin compras previas
    if (!cliente.ultima_presentacion_id) {
        await enviarYGuardar(numero, mensajeMenuPrincipal(nombre))
        return
    }

    // Verificar stock de última compra
    const stockRes = await db.query(
        `SELECT stock_disponible($1, $2) as disponible, 
                precio_venta, nombre
         FROM presentaciones WHERE id = $1`,
        [cliente.ultima_presentacion_id, numero]
    )
    const pr = stockRes.rows[0]
    const conStock = pr && parseInt(pr.disponible) > 0

    const nombreProducto = `${cliente.ultima_marca_nombre ? cliente.ultima_marca_nombre + ' — ' : ''}${cliente.ultimo_producto_nombre} — ${cliente.ultima_presentacion_nombre}`

    if (!conStock) {
        // Sin stock — ofrecer alternativa
        await actualizarSesion(numero, {
            paso: 'inicio',
            modo: 'bot',
            datos: { ...sesion.datos }
        })
        await enviarYGuardar(numero,
            `¡Hola${nombre ? ', ' + nombre : ''}! 👋 Qué bueno verte de nuevo 🐾\n\n` +
            `Tu producto habitual *${nombreProducto}* no tiene stock disponible en este momento 😔\n\n` +
            `¿Qué querés hacer?\n` +
            `1. Explorar otros productos\n` +
            `2. Hablar con un agente`
        )
        return
    }

    // Tiene stock — ofrecer repetir
    await actualizarSesion(numero, {
        paso: 'ofreciendo_repetir',
        modo: 'bot',
        datos: {
            ...sesion.datos,
            ultima_presentacion_id: cliente.ultima_presentacion_id,
            ultima_presentacion_nombre: cliente.ultima_presentacion_nombre,
            ultimo_producto_nombre: cliente.ultimo_producto_nombre,
            ultima_marca_nombre: cliente.ultima_marca_nombre,
            ultimo_precio: parseInt(pr.precio_venta),
            ultimo_canal: cliente.ultimo_canal
        }
    })

    await enviarYGuardar(numero,
        `¡Hola${nombre ? ', ' + nombre : ''}! 👋 Bienvenido de nuevo a Sosa Bulls 🐾\n\n` +
        `La última vez pediste:\n` +
        `*${nombreProducto}*\n` +
        `Gs. ${parseInt(pr.precio_venta).toLocaleString('es-PY')}\n\n` +
        `¿Querés pedirlo de nuevo?\n` +
        `1. Sí, quiero el mismo\n` +
        `2. No, quiero ver otros productos`
    )
}

async function manejarOfreciendoRepetir(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '2') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, mensajeMenuPrincipal())
        return
    }

    if (t !== '1') {
        // Si escribió algo que no es 1 ni 2, buscar como producto
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await buscarYMostrarProductos(numero, texto, sesion)
        return
    }

    // Eligió repetir — preguntar modalidad
    await actualizarSesion(numero, {
        paso: 'eligiendo_envio',
        modo: 'bot',
        datos: {
            ...sesion.datos,
            presentacion_seleccionada: {
                id: sesion.datos.ultima_presentacion_id,
                nombre: sesion.datos.ultima_presentacion_nombre,
                precio: sesion.datos.ultimo_precio,
                stock: 99
            },
            producto_nombre: `${sesion.datos.ultima_marca_nombre ? sesion.datos.ultima_marca_nombre + ' — ' : ''}${sesion.datos.ultimo_producto_nombre}`,
            cantidad_preseleccionada: 1
        }
    })

    await enviarYGuardar(numero,
        `¡Perfecto! 🎉\n\n` +
        `🚀 *¿Cómo querés recibir tu pedido?*\n\n` +
        `1. Retiro en tienda\n` +
        `2. Delivery a domicilio`
    )
}

// ─────────────────────────────────────────────
// BUSQUEDA DE PRODUCTOS
// ─────────────────────────────────────────────
async function buscarYMostrarProductos(numero, texto, sesion) {
    const palabras = limpiarParaBusqueda(texto)

    if (palabras.length === 0) {
        await enviarYGuardar(numero, `¿Qué producto estás buscando? Escribí el nombre (ej: "cibau", "premier") 🐾`)
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
            `No encontré productos con "*${texto}*" 😅\n\n` +
            `Podés intentar con:\n` +
            `- Otro nombre (ej: "cibau", "premier")\n` +
            `1. Ver zonas de delivery\n` +
            `2. Hablar con un agente`
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
        `${i + 1}. ${p.marca_nombre ? p.marca_nombre + ' — ' : ''}${p.nombre}`
    ).join('\n')

    await actualizarSesion(numero, {
        paso: 'eligiendo_producto',
        modo: 'bot',
        datos: { ...sesion.datos, productos: resultado.rows }
    })

    await enviarYGuardar(numero,
        `Encontré estos productos:\n\n${lista}\n\n` +
        `¿Cuál te interesa? Respondé con el número.`
    )
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
            ? `~~Gs. ${p.precio_venta.toLocaleString('es-PY')}~~ *Gs. ${precio.toLocaleString('es-PY')}* 🏷️`
            : `Gs. ${precio.toLocaleString('es-PY')}`
        return `${i + 1}. ${p.nombre} — ${precioTexto}`
    }).join('\n')

    await enviarYGuardar(numero,
        `*${productoNombre}*\n\n${lista}\n\n` +
        `¿Cuál querés? Respondé con el número.`
    )
}

// ─────────────────────────────────────────────
// ELECCION DE PRODUCTO
// ─────────────────────────────────────────────
async function manejarEleccionProducto(numero, texto, sesion) {
    const sel = parsearSeleccion(texto)
    const productos = sesion.datos.productos

    if (!sel || sel.indice < 0 || sel.indice >= productos.length) {
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${productos.length}.`)
        return
    }

    const producto = productos[sel.indice]
    const nombreCompleto = `${producto.marca_nombre ? producto.marca_nombre + ' — ' : ''}${producto.nombre}`
    await actualizarSesion(numero, {
        paso: 'eligiendo_presentacion',
        modo: 'bot',
        datos: { ...sesion.datos, producto_id: producto.id, producto_nombre: nombreCompleto }
    })
    await mostrarPresentaciones(numero, producto.id, nombreCompleto)
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
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${conStock.length}.`)
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
        `*${sesion.datos.producto_nombre} — ${presentacion.nombre}*\n` +
        `Precio: Gs. ${precio.toLocaleString('es-PY')}\n\n` +
        `¿Cuántas unidades querés?\n` +
        `_(Respondé con un número, ej: 1, 2, 3...)_`
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
        await enviarYGuardar(numero, `Algo salió mal. Volvemos al inicio.\n\n${mensajeMenuPrincipal()}`)
        return
    }

    if (isNaN(cantidad) || cantidad < 1) {
        await enviarYGuardar(numero, `Por favor respondé con un número. ¿Cuántas unidades querés?`)
        return
    }

    if (cantidad > pr.stock) {
        await enviarYGuardar(numero, `Solo hay ${pr.stock} unidades disponibles. ¿Cuántas querés? (máximo ${pr.stock})`)
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
        `✅ Agregado al carrito:\n` +
        `*${sesion.datos.producto_nombre} — ${pr.nombre}* x${cantidad}\n\n` +
        `${formatearCarrito(resultado.carrito)}\n\n` +
        `¿Qué querés hacer?\n` +
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
        await enviarYGuardar(numero, `¿Qué producto querés agregar? Escribí el nombre.`)
        return
    }
    if (t === '2') {
        const carrito = await getCarrito(numero)
        if (!carrito.length) {
            await enviarYGuardar(numero, `Tu carrito está vacío. Buscá un producto primero.`)
            await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
            return
        }
        await actualizarSesion(numero, { paso: 'eligiendo_envio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero,
            `🚀 *¿Cómo querés recibir tu pedido?*\n\n` +
            `1. Retiro en tienda\n` +
            `2. Delivery a domicilio`
        )
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
        await enviarYGuardar(numero, `Tu carrito está vacío.\n\nEscribí un producto para comenzar 🛒`)
        return
    }

    await actualizarSesion(numero, { paso: 'viendo_carrito', modo: 'bot', datos: sesion.datos })
    await enviarYGuardar(numero,
        `🛒 *Tu carrito*\n\n` +
        `${formatearCarrito(carrito)}\n\n` +
        `¿Qué querés hacer?\n` +
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
        await enviarYGuardar(numero,
            `🚀 *¿Cómo querés recibir tu pedido?*\n\n` +
            `1. Retiro en tienda\n` +
            `2. Delivery a domicilio`
        )
        return
    }
    if (t === '2') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: sesion.datos })
        await enviarYGuardar(numero, `¿Qué producto querés agregar? Escribí el nombre.`)
        return
    }
    if (t === '3') {
        await mostrarCarritoParaQuitar(numero, sesion)
        return
    }
    if (t === '4') {
        await limpiarCarrito(numero)
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Carrito vaciado. Escribí un producto para comenzar 🛒`)
        return
    }

    await enviarYGuardar(numero, `Respondé con 1, 2, 3 o 4 por favor.`)
}

async function mostrarCarritoParaQuitar(numero, sesion) {
    const carrito = await getCarrito(numero)
    if (!carrito.length) {
        await enviarYGuardar(numero, `Tu carrito está vacío.`)
        return
    }

    const lista = carrito.map((item, i) =>
        `${i + 1}. ${item.producto_nombre} — ${item.presentacion_nombre} x${item.cantidad}`
    ).join('\n')

    await actualizarSesion(numero, {
        paso: 'quitando_producto',
        modo: 'bot',
        datos: { ...sesion.datos, carrito_snapshot: carrito }
    })

    await enviarYGuardar(numero,
        `¿Cuál querés quitar?\n\n${lista}\n\nRespondé con el número.`
    )
}

async function manejarQuitandoProducto(numero, texto, sesion) {
    const carrito = sesion.datos.carrito_snapshot || []
    const sel = parsearSeleccion(texto)

    if (!sel || sel.indice < 0 || sel.indice >= carrito.length) {
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${carrito.length}.`)
        return
    }

    const item = carrito[sel.indice]
    const nuevoCarrito = await quitarDelCarrito(numero, item.presentacion_id)

    if (!nuevoCarrito.length) {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: {} })
        await enviarYGuardar(numero, `Producto quitado. Tu carrito quedó vacío.\n\nEscribí un producto para comenzar 🛒`)
        return
    }

    await actualizarSesion(numero, { paso: 'agregando_mas', modo: 'bot', datos: sesion.datos })
    await enviarYGuardar(numero,
        `✅ Producto quitado.\n\n` +
        `${formatearCarrito(nuevoCarrito)}\n\n` +
        `¿Qué querés hacer?\n` +
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
        // Si viene de repetir pedido, precargar producto al carrito
        if (sesion.datos.cantidad_preseleccionada) {
            await agregarAlCarrito(numero, {
                presentacion_id: sesion.datos.presentacion_seleccionada.id,
                presentacion_nombre: sesion.datos.presentacion_seleccionada.nombre,
                producto_nombre: sesion.datos.producto_nombre,
                precio: sesion.datos.presentacion_seleccionada.precio,
                cantidad: sesion.datos.cantidad_preseleccionada
            })
        }
        await actualizarSesion(numero, { paso: 'factura', modo: 'bot', datos: { ...sesion.datos, modalidad: 'retiro' } })
        await enviarYGuardar(numero,
            `🧾 *¿Necesitás factura?*\n\n` +
            `1. Sí, con factura\n` +
            `2. No, sin factura`
        )
        return
    }

    if (t === '2') {
        // Si viene de repetir pedido, precargar producto al carrito
        if (sesion.datos.cantidad_preseleccionada) {
            await agregarAlCarrito(numero, {
                presentacion_id: sesion.datos.presentacion_seleccionada.id,
                presentacion_nombre: sesion.datos.presentacion_seleccionada.nombre,
                producto_nombre: sesion.datos.producto_nombre,
                precio: sesion.datos.presentacion_seleccionada.precio,
                cantidad: sesion.datos.cantidad_preseleccionada
            })
        }

        const deliveryDisponible = await estaAbiertoParaDelivery()
        if (!deliveryDisponible) {
            await actualizarSesion(numero, { paso: 'confirmando_delivery_tarde', modo: 'bot', datos: sesion.datos })
            await enviarYGuardar(numero,
                `⏰ Los deliveries después de las 16:00 se envían al día siguiente.\n\n` +
                `Igual podés hacer tu pedido ahora y lo enviamos mañana 🐾\n\n` +
                `1. Continuar con delivery (mañana)\n` +
                `2. Retirar en tienda hoy`
            )
            return
        }

        // Si tiene ubicación anterior, ofrecerla
        const clienteRes = await db.query(
            `SELECT direccion, referencia_delivery, ciudad FROM clientes WHERE telefono = $1`,
            [numero]
        )
        const cliente = clienteRes.rows[0]

        if (cliente?.direccion) {
            await actualizarSesion(numero, {
                paso: 'confirmando_ubicacion',
                modo: 'bot',
                datos: { ...sesion.datos, modalidad: 'delivery' }
            })
            await enviarYGuardar(numero,
                `📍 Tu última ubicación registrada:\n` +
                `*${cliente.direccion}*` +
                `${cliente.referencia_delivery ? `\nReferencia: ${cliente.referencia_delivery}` : ''}\n\n` +
                `¿Querés entregar en la misma dirección?\n` +
                `1. Sí, misma dirección\n` +
                `2. No, quiero poner una nueva`
            )
            return
        }

        // Sin ubicación anterior — flujo normal de zonas
        const zonas = await getZonasActivas()
        if (!zonas.length) {
            await enviarYGuardar(numero, `Lo sentimos, por ahora no contamos con delivery disponible.\n\n¿Querés retirar en tienda? Respondé *1*.`)
            return
        }
        const lista = await formatearListaZonas(zonas)
        await actualizarSesion(numero, {
            paso: 'eligiendo_zona',
            modo: 'bot',
            datos: { ...sesion.datos, modalidad: 'delivery', zonas }
        })
        await enviarYGuardar(numero,
            `🚚 *Zonas de delivery disponibles:*\n\n${lista}\n\n` +
            `Respondé con el número de tu zona.`
        )
        return
    }

    await enviarYGuardar(numero, `Respondé *1* para retiro en tienda o *2* para delivery.`)
}

// ─────────────────────────────────────────────
// ELECCION DE ZONA
// ─────────────────────────────────────────────
async function manejarEleccionZona(numero, texto, sesion) {
    const zonas = sesion.datos.zonas || []
    const sel = parsearSeleccion(texto)

    if (!sel || sel.indice < 0 || sel.indice >= zonas.length) {
        await enviarYGuardar(numero, `Por favor respondé con un número entre 1 y ${zonas.length}.`)
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
        `📍 Zona: *${zona.nombre}*\n` +
        `🚚 Costo delivery: *Gs. ${zona.costo.toLocaleString('es-PY')}*\n\n` +
        `${formatearCarrito(carrito, zona.nombre, zona.costo)}\n\n` +
        `🧾 *¿Necesitás factura?*\n\n` +
        `1. Sí, con factura\n` +
        `2. No, sin factura`
    )
}

async function manejarConfirmandoUbicacion(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        // Usar ubicación anterior
        const clienteRes = await db.query(
            `SELECT direccion, referencia_delivery, ciudad FROM clientes WHERE telefono = $1`,
            [numero]
        )
        const cliente = clienteRes.rows[0]

        // Buscar zona por ciudad
        const zonas = await getZonasActivas()
        const normalizar = str => str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() || ''
        const zonaMatch = zonas.find(z => normalizar(z.nombre) === normalizar(cliente?.ciudad))

        const datos = {
            ...sesion.datos,
            modalidad: 'delivery',
            ubicacion: cliente.direccion,
            referencia: cliente.referencia_delivery || '',
            zona_id: zonaMatch?.id || null,
            zona_nombre: zonaMatch?.nombre || cliente?.ciudad || '',
            costo_delivery: zonaMatch?.costo || 0,
            zonas,
            paso_delivery: 'horario'
        }

        await actualizarSesion(numero, { paso: 'datos_delivery', modo: 'bot', datos })
        await enviarYGuardar(numero,
            `🕐 *¿En qué horario podés recibir la entrega?*`
        )
        return
    }

    if (t === '2') {
        // Nueva ubicación — flujo normal de zonas
        const zonas = await getZonasActivas()
        if (!zonas.length) {
            await enviarYGuardar(numero, `Lo sentimos, por ahora no contamos con delivery disponible.`)
            return
        }
        const lista = await formatearListaZonas(zonas)
        await actualizarSesion(numero, {
            paso: 'eligiendo_zona',
            modo: 'bot',
            datos: { ...sesion.datos, modalidad: 'delivery', zonas }
        })
        await enviarYGuardar(numero,
            `🚚 *Zonas de delivery disponibles:*\n\n${lista}\n\n` +
            `Respondé con el número de tu zona.`
        )
        return
    }

    await enviarYGuardar(numero, `Respondé *1* para usar la misma dirección o *2* para ingresar una nueva.`)
}

// ─────────────────────────────────────────────
// ZONAS — VISTA INFORMATIVA
// ─────────────────────────────────────────────
async function manejarOpcionZonas(numero, sesion) {
    const zonas = await getZonasActivas()

    if (!zonas.length) {
        await enviarYGuardar(numero,
            `Por ahora no tenemos zonas de delivery configuradas.\n\n` +
            `Escribí un producto para comenzar o hablá con un agente.`
        )
        return
    }

    const lista = await formatearListaZonas(zonas)
    await actualizarSesion(numero, { paso: 'viendo_zonas_info', modo: 'bot', datos: { ...sesion.datos, zonas } })

    await enviarYGuardar(numero,
        `🗺️ *Zonas y costos de delivery:*\n\n${lista}\n\n` +
        `¿Qué querés hacer?\n` +
        `1. Hacer un pedido con delivery\n` +
        `2. Volver al inicio\n` +
        `3. Hablar con un agente`
    )
}

async function manejarViendoZonasInfo(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'inicio', modo: 'bot', datos: { ...sesion.datos, modalidad_preseleccionada: 'delivery' } })
        await enviarYGuardar(numero, `¿Qué producto querés pedir? Escribí el nombre.`)
        return
    }
    if (t === '2') {
        await reiniciarSesion(numero)
        await enviarYGuardar(numero, mensajeMenuPrincipal())
        return
    }
    if (t === '3') {
        await actualizarSesion(numero, { paso: 'esperando_agente', modo: 'esperando_agente', datos: {} })
        await enviarYGuardar(numero, `Entendido 👍 Un agente te atenderá en breve 🐾`)
        return
    }

    await enviarYGuardar(numero, `Respondé 1, 2 o 3 por favor.`)
}

// ─────────────────────────────────────────────
// FACTURA
// ─────────────────────────────────────────────
async function manejarFactura(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await actualizarSesion(numero, { paso: 'ruc_factura', modo: 'bot', datos: { ...sesion.datos, quiere_factura: true } })
        await enviarYGuardar(numero,
            `🧾 *Datos para la factura*\n\n` +
            `Ingresá tu nombre o razón social seguido de tu RUC o cédula.\n\n` +
            `Ejemplo: _Juan Pérez 4.178.154-4_`
        )
        return
    }
    if (t === '2') {
        await continuar(numero, sesion, false)
        return
    }

    await enviarYGuardar(numero, `Respondé *1* para con factura o *2* para sin factura.`)
}

async function manejarRucFactura(numero, texto, sesion) {
    const partes = texto.trim().split(' ')
    let ruc = ''
    let razonSocial = ''

    // Si el RUC ya existe en otro cliente, asociar este número
    const clienteConRuc = await db.query(
        `SELECT id, nombre FROM clientes WHERE ruc = $1 AND telefono != $2`,
        [ruc, numero]
    )
    if (clienteConRuc.rows.length > 0) {
        const clienteExistente = clienteConRuc.rows[0]
        await db.query(
            `UPDATE clientes SET telefono = $1, updated_at = NOW() WHERE id = $2`,
            [numero, clienteExistente.id]
        )
        // Actualizar nombre si el cliente se llama "Cliente {numero}"
        const clienteActual = await db.query(`SELECT nombre FROM clientes WHERE telefono = $1`, [numero])
        if (clienteActual.rows[0]?.nombre?.startsWith('Cliente ')) {
            await db.query(`DELETE FROM clientes WHERE telefono = $1 AND nombre LIKE 'Cliente %'`, [numero])
        }
    }

    const ultimaParte = partes[partes.length - 1]
    const esRuc = /^[\d\.\-]+$/.test(ultimaParte)

    if (esRuc && partes.length > 1) {
        ruc = ultimaParte
        razonSocial = partes.slice(0, -1).join(' ')
    } else {
        razonSocial = texto.trim()
        ruc = texto.trim()
    }

    const datos = {
        ...sesion.datos,
        quiere_factura: true,
        ruc_factura: ruc,
        razon_social: razonSocial
    }

    if (razonSocial && !razonSocial.startsWith('Cliente ')) {
        db.query(
            `UPDATE clientes SET nombre = $1 WHERE telefono = $2`,
            [razonSocial, numero]
        ).catch(() => {})
    }

    if (sesion.datos.modalidad === 'retiro') {
        await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
        await mostrarResumenFinal(numero, datos)
    } else {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...datos, paso_delivery: 'ubicacion' }
        })
        await enviarYGuardar(numero,
            `✅ Registrado: *${razonSocial}* — RUC/CI: *${ruc}*\n\n` +
            `🏠 *Paso 1 de 5 — Datos de entrega*\n\n` +
            `¿Cuál es tu ubicación o barrio?\n` +
            `_Podés escribirla o compartir tu ubicación por WhatsApp._`
        )
    }
}

async function continuar(numero, sesion, quiere_factura) {
    const datos = { ...sesion.datos, quiere_factura }

    if (sesion.datos.modalidad === 'retiro') {
        await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
        await mostrarResumenFinal(numero, datos)
    } else {
        await actualizarSesion(numero, {
            paso: 'datos_delivery',
            modo: 'bot',
            datos: { ...datos, paso_delivery: 'ubicacion' }
        })
        await enviarYGuardar(numero,
            `🏠 *Paso 1 de 5 — Datos de entrega*\n\n` +
            `¿Cuál es tu ubicación o barrio?\n` +
            `_Podés escribirla o compartir tu ubicación por WhatsApp._`
        )
    }
}

// ─────────────────────────────────────────────
// DATOS DELIVERY
// ─────────────────────────────────────────────
async function manejarDatosDelivery(numero, texto, sesion, tipoMensaje = 'text') {
    const paso = sesion.datos.paso_delivery

    if (paso === 'ubicacion') {
        const ubicacion = tipoMensaje === 'location' ? texto : texto
        await actualizarSesion(numero, {
            paso: 'datos_delivery', modo: 'bot',
            datos: { ...sesion.datos, ubicacion, paso_delivery: 'referencia' }
        })
        await enviarYGuardar(numero,
            `📍 *Paso 2 de 5 — Referencia*\n\n` +
            `¿Número de casa o referencia para encontrarte?`
        )
        return
    }
    if (paso === 'referencia') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery', modo: 'bot',
            datos: { ...sesion.datos, referencia: texto, paso_delivery: 'horario' }
        })
        await enviarYGuardar(numero,
            `🕐 *Paso 3 de 5 — Horario*\n\n` +
            `¿En qué horario podés recibir la entrega?`
        )
        return
    }
    if (paso === 'horario') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery', modo: 'bot',
            datos: { ...sesion.datos, horario: texto, paso_delivery: 'contacto' }
        })
        await enviarYGuardar(numero,
            `👤 *Paso 4 de 5 — Contacto*\n\n` +
            `¿Nombre y número de quien recibe el pedido?`
        )
        return
    }
    if (paso === 'contacto') {
        await actualizarSesion(numero, {
            paso: 'datos_delivery', modo: 'bot',
            datos: { ...sesion.datos, contacto_entrega: texto, paso_delivery: 'pago' }
        })
        await enviarYGuardar(numero,
            `💳 *Paso 5 de 5 — Método de pago*\n\n` +
            `1. Efectivo\n` +
            `2. Transferencia bancaria\n\n` +
            `_Por el momento no aceptamos tarjeta para envíos a domicilio._`
        )
        return
    }
    if (paso === 'pago') {
        const t = texto.trim()
        if (t !== '1' && t !== '2') {
            await enviarYGuardar(numero, `Por favor respondé *1* para efectivo o *2* para transferencia.`)
            return
        }
        const metodoPago = t === '1' ? 'efectivo' : 'transferencia'
        const datos = { ...sesion.datos, metodo_pago: metodoPago, paso_delivery: null }

        if (t === '2') {
            datos.esperando_comprobante = true
            await actualizarSesion(numero, { paso: 'confirmando_pedido', modo: 'bot', datos })
            await enviarYGuardar(numero,
                `🏦 *Datos para la transferencia*\n\n` +
                `Banco: Itaú\n` +
                `Beneficiario: Osvaldo Sosa CI 1676634\n` +
                `Cuenta: 025618408\n` +
                `Alias: CI 1676634\n\n` +
                `📸 *Enviá el comprobante por aquí una vez realizada la transferencia.*\n\n` +
                `Un agente verificará el pago y confirmará tu pedido en breve.`
            )
            await mostrarResumenFinal(numero, datos)
            return
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

    const modalidadTexto = datos.modalidad === 'delivery'
        ? `🚚 Delivery a *${datos.zona_nombre}*`
        : `🏪 Retiro en tienda`

    const facturaTexto = datos.quiere_factura
        ? `\n🧾 Factura: *${datos.razon_social}* — RUC/CI: ${datos.ruc_factura}`
        : ''

    const deliveryTexto = datos.modalidad === 'delivery'
        ? `\n📍 Dirección: ${datos.ubicacion}` +
          `\n🏠 Referencia: ${datos.referencia || '—'}` +
          `\n🕐 Horario: ${datos.horario || '—'}` +
          `\n👤 Contacto: ${datos.contacto_entrega || '—'}` +
          `\n💳 Pago: *${datos.metodo_pago === 'transferencia' ? 'Transferencia' : 'Efectivo'}*`
        : ''

    const comprobanteTexto = datos.esperando_comprobante
        ? `\n\n⚠️ *Recordá enviar el comprobante de transferencia para confirmar tu pedido.*`
        : ''

    await enviarYGuardar(numero,
        `📋 *Resumen de tu pedido*\n\n` +
        `${formatearCarrito(carrito, datos.zona_nombre, datos.costo_delivery)}\n\n` +
        `${modalidadTexto}${deliveryTexto}${facturaTexto}\n\n` +
        `💰 *Total: Gs. ${total.toLocaleString('es-PY')}*` +
        comprobanteTexto +
        `\n\n¿Confirmás tu pedido?\n\n` +
        `1. Sí, confirmar\n` +
        `2. No, cancelar`
    )
}

// ─────────────────────────────────────────────
// CONFIRMAR PEDIDO
// ─────────────────────────────────────────────
async function manejarConfirmandoPedido(numero, texto, sesion) {
    const t = texto.trim()

    if (t === '1') {
        await registrarPedido(numero, sesion)
        return
    }
    if (t === '2') {
        await limpiarCarrito(numero)
        await reiniciarSesion(numero)
        await enviarYGuardar(numero,
            `❌ Pedido cancelado.\n\n` +
            `Si querés hacer un nuevo pedido, escribí el producto que buscás 🐾`
        )
        return
    }

    await enviarYGuardar(numero, `Respondé *1* para confirmar o *2* para cancelar.`)
}

// ─────────────────────────────────────────────
// REGISTRAR PEDIDO (OP)
// ─────────────────────────────────────────────
async function registrarPedido(numero, sesion) {
    const client = await db.pool.connect()
    try {
        const carrito = await getCarrito(numero)
        if (!carrito.length) {
            await enviarYGuardar(numero, `Tu carrito está vacío. Empezá de nuevo escribiendo un producto.`)
            return
        }

        const stockCheck = await verificarStockParaVenta(
            carrito.map(item => ({ presentacion_id: item.presentacion_id, cantidad: item.cantidad })),
            numero
        )

        if (!stockCheck.ok) {
            const errMsg = stockCheck.errores.map(e =>
                `— *${e.nombre}*: pediste ${e.pedido}, solo hay ${e.disponible} disponibles`
            ).join('\n')
            await enviarYGuardar(numero,
                `⚠️ Hay un problema con el stock:\n\n${errMsg}\n\n` +
                `Por favor modificá tu carrito:\n` +
                `1. Ver carrito\n` +
                `2. Hablar con un agente`
            )
            await actualizarSesion(numero, { paso: 'viendo_carrito', modo: 'bot', datos: sesion.datos })
            return
        }

        await client.query('BEGIN')

        // Buscar o crear cliente
        let clienteId = null
        const clienteExistente = await client.query(
            `SELECT id FROM clientes WHERE telefono = $1`, [numero]
        )
        if (clienteExistente.rows.length > 0) {
            clienteId = clienteExistente.rows[0].id
            if (sesion.datos.modalidad === 'delivery' && sesion.datos.ubicacion) {
                await client.query(
                    `UPDATE clientes SET direccion = $1, ciudad = $2, updated_at = NOW() WHERE id = $3`,
                    [sesion.datos.ubicacion, sesion.datos.zona_nombre || null, clienteId]
                )
            }
        } else {
            const nuevo = await client.query(
                `INSERT INTO clientes (nombre, telefono, origen, direccion, ciudad)
                 VALUES ($1, $2, 'bot', $3, $4) RETURNING id`,
                [`Cliente ${numero}`, numero, sesion.datos.ubicacion || null, sesion.datos.zona_nombre || null]
            )
            clienteId = nuevo.rows[0].id
        }

        // Tiempo de reserva desde configuración
        const configRes = await client.query(
            `SELECT valor FROM configuracion WHERE clave = 'op_tiempo_reserva_horas'`
        )
        const horas = parseInt(configRes.rows[0]?.valor || '2')
        const expira_at = new Date(Date.now() + horas * 60 * 60 * 1000)

        // Crear OP
        const orden = await client.query(
            `INSERT INTO ordenes_pedido (
                canal, cliente_id, cliente_numero,
                modalidad, ubicacion, referencia, horario,
                contacto_entrega, metodo_pago,
                zona_delivery, costo_delivery, zona_id,
                quiere_factura, ruc_factura, razon_social,
                expira_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
             RETURNING *`,
            [
                'whatsapp_bot', clienteId, numero,
                sesion.datos.modalidad || 'retiro',
                sesion.datos.ubicacion || null,
                sesion.datos.referencia || null,
                sesion.datos.horario || null,
                sesion.datos.contacto_entrega || null,
                sesion.datos.metodo_pago || null,
                sesion.datos.zona_nombre || null,
                sesion.datos.costo_delivery || 0,
                sesion.datos.zona_id || null,
                sesion.datos.quiere_factura || false,
                sesion.datos.ruc_factura || null,
                sesion.datos.razon_social || null,
                expira_at
            ]
        )

        const ordenId = orden.rows[0].id
        const numeroOrden = orden.rows[0].numero

        // Items
        for (const item of carrito) {
            await client.query(
                `INSERT INTO ordenes_pedido_items (orden_id, presentacion_id, cantidad, precio_unitario, precio_total)
                 VALUES ($1, $2, $3, $4, $5)`,
                [ordenId, item.presentacion_id, item.cantidad, item.precio, item.precio * item.cantidad]
            )
        }

        await client.query('COMMIT')
        
        await limpiarCarrito(numero)

        if (sesion.datos.esperando_comprobante) {
            // No reiniciar — mantener sesión esperando comprobante
            await actualizarSesion(numero, {
                paso: 'inicio',
                modo: 'bot',
                datos: { esperando_comprobante: true }
            })
        } else {
            await reiniciarSesion(numero)
        }

        if (clienteId) recalcularStats(clienteId).catch(() => {})

        const { total } = calcularTotal(carrito, sesion.datos.costo_delivery || 0)
        const modalidadTexto = sesion.datos.modalidad === 'delivery'
            ? `Delivery a ${sesion.datos.zona_nombre}`
            : `Retiro en tienda`

        const abierto = await estaAbierto()
        const mensajeCierre = !abierto
            ? `\n\n⏰ _Estamos fuera de horario. Tu orden será procesada cuando abramos._`
            : ''

        const mensajeComprobante = sesion.datos.esperando_comprobante
            ? `\n\n📸 _No olvides enviar el comprobante de transferencia para confirmar tu pedido._`
            : ''

        await enviarYGuardar(numero,
            `✅ *¡Tu orden fue registrada!* 🐾\n\n` +
            `📋 *Número de orden: ${numeroOrden}*\n` +
            `${modalidadTexto}\n` +
            `💰 Total: Gs. ${total.toLocaleString('es-PY')}` +
            mensajeComprobante +
            `\n\nUn agente confirmará tu pedido pronto. ¡Gracias por elegirnos! 😊` +
            mensajeCierre
        )

    } catch (error) {
        await client.query('ROLLBACK')
        await enviarYGuardar(numero,
            `😔 Hubo un error al registrar tu pedido.\n` +
            `Por favor escribí *agente* para que te ayudemos.`
        )
        throw error
    } finally {
        client.release()
    }
}

module.exports = { procesarMensaje }