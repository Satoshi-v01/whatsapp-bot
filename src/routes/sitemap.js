const express = require('express')
const db = require('../db/index')

const router = express.Router()

const BASE_URL = 'https://sosabulls.com.py'

const CATEGORIAS = ['perros', 'gatos', 'accesorios', 'medicamentos', 'cuidado', 'ofertas']

function toSlug(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
}

function url(loc, lastmod, changefreq, priority) {
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
}

router.get('/sitemap.xml', async (req, res) => {
    const hoy = new Date().toISOString().split('T')[0]

    const urls = []

    // Páginas estáticas
    urls.push(url(`${BASE_URL}/`,          hoy, 'weekly',  '1.0'))
    urls.push(url(`${BASE_URL}/nosotros`,  hoy, 'monthly', '0.6'))
    urls.push(url(`${BASE_URL}/contacto`,  hoy, 'monthly', '0.6'))

    // Categorías
    for (const slug of CATEGORIAS) {
        urls.push(url(`${BASE_URL}/categoria/${slug}`, hoy, 'daily', '0.8'))
    }

    // Productos activos
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
                : hoy
            urls.push(url(`${BASE_URL}/producto/${slug}`, lastmod, 'weekly', '0.7'))
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
