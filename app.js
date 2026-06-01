require('dotenv').config()
process.env.TZ = 'America/Asuncion'
const path = require('path')
const express = require('express')
const rateLimit = require('express-rate-limit')
const { query } = require('./src/db/index')
const webhookRoutes = require('./src/routes/webhook')
const sesionesRoutes = require('./src/routes/sesiones')
const ventasRoutes = require('./src/routes/ventas')
const productosRoutes = require('./src/routes/productos')
const authRoutes = require('./src/routes/auth')
const clientesRoutes = require('./src/routes/clientes')
const { autenticar } = require('./src/middleware/auth')
const deliveriesRoutes = require('./src/routes/deliveries')
const estadisticasRoutes = require('./src/routes/estadisticas')
const usuariosRoutes = require('./src/routes/usuarios')
const configuracionRoutes = require('./src/routes/configuracion')
const proveedoresRoutes = require('./src/routes/proveedores')
const zonasRoutes = require('./src/routes/zonas')
const ordenesRoutes = require('./src/routes/ordenes')
const carritoRoutes = require('./src/routes/carrito')
const { procesarTimeouts } = require('./src/bot/recordatorios')
const helmet = require('helmet')
const cors = require('cors')
const logger = require('./src/middleware/logger')
const lotesRoutes = require('./src/routes/lotes')
const auditoriaRoutes = require('./src/routes/auditoria')
const transformacionesRoutes = require('./src/routes/transformaciones')
const ecommerceRoutes = require('./src/routes/ecommerce')
const uploadsRoutes = require('./src/routes/uploads')
const sitemapRoutes = require('./src/routes/sitemap')
const mediaRoutes = require('./src/routes/media')

const app = express()

// Render.com (y cualquier reverse proxy) pone X-Forwarded-For
// Sin esto express-rate-limit tira ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
app.set('trust proxy', 1)

// Rate limiting general
const limiterGeneral = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { error: 'Demasiadas solicitudes, intentá de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
})

// Rate limiting estricto para login
const limiterAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiados intentos de login, intentá de nuevo en 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
})

app.use(express.json())

// Seguridad HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc:      ["'self'"],
            scriptSrc:       ["'self'", "'unsafe-inline'"],
            styleSrc:        ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:         ["'self'", "data:", "https://fonts.gstatic.com"],
            imgSrc:          ["'self'", "data:", "blob:", "https:"],
            mediaSrc:        ["'self'", "blob:", "https:"],
            connectSrc:      ["'self'", "https:"],
            objectSrc:       ["'none'"],
            frameAncestors:  ["'none'"],
        }
    }
}))

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://sosabulls.com.py',
            'https://www.sosabulls.com.py',
            'https://whatsapp-bot-0272.onrender.com',
          ]
        : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))

// Middleware de logs para todas las rutas
app.use((req, res, next) => {
    const start = Date.now()
    res.on('finish', () => {
        const duration = Date.now() - start
        // Solo loguear errores 400+ y requests lentos (+2000ms)
        if (res.statusCode >= 400) {
            logger.error(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`)
        } else if (duration > 2000) {
            logger.warn(`Request lento: ${req.method} ${req.url} ${res.statusCode} ${duration}ms`)
        }
    })
    next()
})

app.use('/public', express.static(path.join(__dirname, 'public')))

// Alias /api para compatibilidad con frontend
app.use('/api/auth', limiterAuth, authRoutes)
app.use('/api/usuarios', limiterGeneral, autenticar, usuariosRoutes)
app.use('/api/configuracion', limiterGeneral, autenticar, configuracionRoutes)
app.use('/api/sesiones', limiterGeneral, autenticar, sesionesRoutes)
app.use('/api/ventas', limiterGeneral, autenticar, ventasRoutes)
app.use('/api/ordenes', limiterGeneral, autenticar, ordenesRoutes)
app.use('/api/productos', limiterGeneral, autenticar, productosRoutes)
app.use('/api/deliveries', limiterGeneral, autenticar, deliveriesRoutes)
app.use('/api/proveedores', limiterGeneral, autenticar, proveedoresRoutes)
app.use('/api/estadisticas', limiterGeneral, autenticar, estadisticasRoutes)
app.use('/api/clientes', limiterGeneral, autenticar, clientesRoutes)
app.use('/api/zonas', limiterGeneral, autenticar, zonasRoutes)
app.use('/api/carrito', limiterGeneral, autenticar, carritoRoutes)
app.use('/api/lotes', limiterGeneral, autenticar, lotesRoutes)
app.use('/api/auditoria', limiterGeneral, autenticar, auditoriaRoutes)
app.use('/api/transformaciones', limiterGeneral, autenticar, transformacionesRoutes)
app.use('/api/ecommerce', limiterGeneral, ecommerceRoutes)
app.use('/api/uploads', limiterGeneral, uploadsRoutes)
app.use('/api/media', limiterGeneral, mediaRoutes)

// Rutas
app.use('/webhook', webhookRoutes)
app.use('/auth', limiterAuth, authRoutes)
app.use('/usuarios', limiterGeneral, autenticar, usuariosRoutes)
app.use('/configuracion', limiterGeneral, autenticar, configuracionRoutes)
app.use('/sesiones', limiterGeneral, autenticar, sesionesRoutes)
app.use('/ventas', limiterGeneral, autenticar, ventasRoutes)
app.use('/ordenes', limiterGeneral, autenticar, ordenesRoutes)
app.use('/productos', limiterGeneral, autenticar, productosRoutes)
app.use('/deliveries', limiterGeneral, autenticar, deliveriesRoutes)
app.use('/proveedores', limiterGeneral, autenticar, proveedoresRoutes)
app.use('/estadisticas', limiterGeneral, autenticar, estadisticasRoutes)
app.use('/clientes', limiterGeneral, autenticar, clientesRoutes)
app.use('/zonas/publico', limiterGeneral, zonasRoutes)
app.use('/zonas', limiterGeneral, autenticar, zonasRoutes)
app.use('/carrito', limiterGeneral, autenticar, carritoRoutes)
app.use('/lotes', limiterGeneral, autenticar, lotesRoutes)
app.use('/auditoria', limiterGeneral, autenticar, auditoriaRoutes)
app.use('/transformaciones', limiterGeneral, autenticar, transformacionesRoutes)

// Servir imágenes subidas — CORP cross-origin para que el dashboard pueda cargarlas
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    next()
}, express.static(path.join(__dirname, 'public/uploads')))

const staticAssetHeaders = (res, filePath) => {
    if (/\.(html|txt|xml)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'no-cache')
    } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
}

// Servir dashboard estático
// GET /dashboard sin trailing slash sirve el index directamente — evita el doble redirect
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/dist/index.html'))
})
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard/dist'), { setHeaders: staticAssetHeaders }))
app.get('/dashboard/*splat', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard/dist/index.html'))
})

// robots.txt — sirve el del ecommerce (tiene allowlist de AI crawlers)
app.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.sendFile(path.join(__dirname, 'ecommerce/public/robots.txt'))
})

// Sitemap dinámico — sitemapRoutes es el handler correcto (tiene lastmod y /nosotros, /contacto)
app.use(sitemapRoutes)

// Landing page pública en /
app.use(express.static(path.join(__dirname, 'landing'), { setHeaders: staticAssetHeaders }))
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'landing/index.html'))
})

// Ecommerce SPA en /ecommerce — assets estáticos con prefijo
// Montar /ecommerce/assets de forma explícita para evitar ambiguedad de path-stripping en Express 5
app.use('/ecommerce/assets', express.static(path.join(__dirname, 'ecommerce/dist/assets'), { setHeaders: staticAssetHeaders }))
app.use('/ecommerce', express.static(path.join(__dirname, 'ecommerce/dist'), { setHeaders: staticAssetHeaders }))

// SSR meta-injection: Googlebot ve title/description/schema reales desde la DB
// React hidrata normalmente en el cliente y Helmet toma el control
const fs = require('fs')
const SITE = 'https://sosabulls.com.py'
const ECO_INDEX = path.join(__dirname, 'ecommerce/dist/index.html')

function toSlugSsr(text) {
    return String(text).toLowerCase().normalize('NFD')
        .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const CAT_META = {
    perros:       { title: 'Alimento para Perros en Paraguay — Envio a Domicilio',           desc: 'Compra alimento balanceado para perros en Paraguay. Cachorro, adulto, senior, raza grande y pequeña. Marcas premium con delivery a Asuncion y todo el pais.' },
    gatos:        { title: 'Alimento para Gatos en Paraguay — Royal Canin, Pro Plan y mas',  desc: 'Alimento para gatos, arena sanitaria y accesorios. Royal Canin, Pro Plan, Whiskas y mas. Delivery a Asuncion y todo Paraguay.' },
    medicamentos: { title: 'Antiparasitarios y Vitaminas para Mascotas — Paraguay',           desc: 'Antiparasitarios, vitaminas y suplementos para perros y gatos en Paraguay. Productos veterinarios originales con envio a domicilio.' },
    accesorios:   { title: 'Accesorios para Mascotas — Correas, Camas, Comederos',            desc: 'Correas, camas, comederos, bebederos y juguetes para perros y gatos en Paraguay. Envio a domicilio en Asuncion y todo el pais.' },
    cuidado:      { title: 'Cuidado e Higiene para Mascotas — Shampoos y Grooming',           desc: 'Shampoos, cepillos, toallitas y productos de grooming e higiene para mascotas en Paraguay.' },
    ofertas:      { title: 'Ofertas en Alimentos y Accesorios para Mascotas',                 desc: 'Promociones y descuentos en alimentos balanceados y accesorios para mascotas en Paraguay.' },
}

async function serveEco(req, res) {
    let html
    try { html = fs.readFileSync(ECO_INDEX, 'utf-8') } catch { return res.status(500).end() }

    const canonical  = `${SITE}${req.path}`
    let title        = 'Sosa BULLS — Tienda de Mascotas en Paraguay'
    let desc         = 'Alimentos balanceados, accesorios y medicamentos para perros y gatos. Envio a domicilio en Asuncion, Gran Asuncion y todo Paraguay. Tienda fisica en Lambare.'
    let img          = `${SITE}/logo.png`
    let extraSchema  = ''

    const productMatch  = req.path.match(/^\/ecommerce\/producto\/(.+)$/)
    const catMatch      = req.path.match(/^\/ecommerce\/categoria\/([^/]+)/)

    if (productMatch) {
        const idMatch = productMatch[1].match(/-(\d+)$/)
        if (idMatch) {
            try {
                const { rows } = await query(
                    `SELECT pr.id, pr.nombre, pr.precio_venta, pr.stock, pr.imagen_url,
                            p.descripcion, p.categoria_slug
                     FROM presentaciones pr
                     JOIN productos p ON p.id = pr.producto_id
                     WHERE pr.id = $1 AND pr.disponible = true`,
                    [parseInt(idMatch[1])]
                )
                if (rows.length) {
                    const p = rows[0]
                    title = `${p.nombre} — Sosa BULLS`
                    desc  = p.descripcion || `Compra ${p.nombre} en Sosa BULLS. Envio a domicilio en Paraguay.`
                    if (p.imagen_url) img = p.imagen_url
                    const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    extraSchema = JSON.stringify({
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'Product',
                                '@id': `${canonical}#product`,
                                name: p.nombre,
                                description: desc,
                                sku: String(p.id),
                                ...(img !== `${SITE}/logo.png` && { image: { '@type': 'ImageObject', url: img, contentUrl: img } }),
                                offers: {
                                    '@type': 'Offer',
                                    priceCurrency: 'PYG',
                                    price: p.precio_venta,
                                    priceValidUntil,
                                    availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                                    url: canonical,
                                    seller: { '@id': `${SITE}/#organization` },
                                },
                            },
                            {
                                '@type': 'BreadcrumbList',
                                itemListElement: [
                                    { '@type': 'ListItem', position: 1, name: 'Inicio',           item: `${SITE}/` },
                                    { '@type': 'ListItem', position: 2, name: p.categoria_slug,   item: `${SITE}/categoria/${p.categoria_slug}` },
                                    { '@type': 'ListItem', position: 3, name: p.nombre,            item: canonical },
                                ],
                            },
                        ],
                    })
                }
            } catch { /* DB error no bloquea el render */ }
        }
    } else if (catMatch) {
        const cat = CAT_META[catMatch[1]]
        if (cat) { title = `${cat.title} — Sosa BULLS`; desc = cat.desc }
    }

    const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const inject = [
        `<link rel="canonical" href="${canonical}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(desc)}" />`,
        `<meta property="og:image" content="${img}" />`,
        `<meta property="og:url" content="${canonical}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${esc(title)}" />`,
        `<meta name="twitter:description" content="${esc(desc)}" />`,
        `<meta name="twitter:image" content="${img}" />`,
        extraSchema ? `<script type="application/ld+json">${extraSchema}</script>` : '',
    ].join('\n  ')

    html = html
        .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/,  `$1${esc(desc)}$2`)
        .replace('</head>', `  ${inject}\n</head>`)

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=60')
    res.send(html)
}

app.get('/ecommerce',                    serveEco)
app.get('/ecommerce/categoria/*splat',   serveEco)
app.get('/ecommerce/producto/*splat',    serveEco)
app.get('/ecommerce/nosotros',           serveEco)
app.get('/ecommerce/contacto',           serveEco)
app.get('/ecommerce/carrito',            (req, res) => res.sendFile(ECO_INDEX))
app.get('/ecommerce/buscar',             (req, res) => res.sendFile(ECO_INDEX))
app.get('/ecommerce/login',              (req, res) => res.sendFile(ECO_INDEX))
app.get('/ecommerce/registro',           (req, res) => res.sendFile(ECO_INDEX))
app.get('/ecommerce/perfil',             (req, res) => res.sendFile(ECO_INDEX))
// Assets con extension (.js, .css, .ico, etc.) devuelven 404 si no existen
// — evita que CDNs cacheen HTML como si fuera un asset valido
app.get('/ecommerce/*splat', (req, res) => {
    if (/\.\w{1,6}$/.test(req.path)) return res.status(404).end()
    res.sendFile(ECO_INDEX)
})



app.get('/test-db', async (req, res) => {
  try {
    const result = await query('SELECT NOW()');
    res.json({ dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manejo global de errores
app.use((err, req, res, next) => {
    logger.error({
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method
    })
    res.status(500).json({ error: 'Error interno del servidor' })
})

// Manejo de promesas no capturadas
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', { reason, promise })
})

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error)
    // No exitamos — Render/nodemon reinician si es fatal
})

const PORT = process.env.PORT || 8080


let corriendo = false

setInterval(async () => {
    if (corriendo) return  // evita superposición si tarda más de 5 min
    corriendo = true
    try {
        await procesarTimeouts()
    } catch (err) {
        console.error('Error en timeout job:', err.message)
    } finally {
        corriendo = false
    }
}, 5 * 60 * 1000)

app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Servidor corriendo en puerto ${PORT}`)
})