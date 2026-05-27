const express = require('express')
const db = require('../db/index')

const router = express.Router()

const BASE_URL = 'https://sosabulls.com.py'
const ECO = `${BASE_URL}/ecommerce`

const CATEGORIAS = ['perros', 'gatos', 'accesorios', 'medicamentos', 'cuidado', 'ofertas']

// Fecha fija para páginas estáticas — evita que Google ignore lastmod por ser siempre "hoy"
const STATIC_LASTMOD = '2026-05-27'

function toSlug(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function url(loc, lastmod) {
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
}

router.get('/sitemap.xml', async (req, res) => {
    const urls = []

    // Landing
    urls.push(url(`${BASE_URL}/`,         STATIC_LASTMOD))
    urls.push(url(`${BASE_URL}/nosotros`, STATIC_LASTMOD))
    urls.push(url(`${BASE_URL}/contacto`, STATIC_LASTMOD))

    // Ecommerce SPA raiz
    urls.push(url(`${ECO}/`, STATIC_LASTMOD))

    // Categorías — prefijo /ecommerce/categoria/
    for (const slug of CATEGORIAS) {
        urls.push(url(`${ECO}/categoria/${slug}`, STATIC_LASTMOD))
    }

    // Productos activos — lastmod real desde la DB
    try {
        const result = await db.query(`
            SELECT
                pr.id,
                p.nombre  AS nombre_base,
                pr.nombre AS presentacion_nombre,
                COALESCE(pr.updated_at, pr.created_at) AS updated_at
            FROM presentaciones pr
            JOIN productos p ON p.id = pr.producto_id
            WHERE pr.activo = true
              AND p.activo  = true
            ORDER BY pr.id
        `)

        for (const row of result.rows) {
            const slug = `${toSlug(row.nombre_base)}-${toSlug(row.presentacion_nombre)}-${row.id}`
            const lastmod = row.updated_at
                ? new Date(row.updated_at).toISOString().split('T')[0]
                : STATIC_LASTMOD
            urls.push(url(`${ECO}/producto/${slug}`, lastmod))
        }
    } catch (err) {
        // Si falla la query de productos seguimos con el sitemap parcial
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`

    res.header('Content-Type', 'application/xml')
    res.header('Cache-Control', 'public, max-age=3600')
    res.send(xml)
})

module.exports = router
