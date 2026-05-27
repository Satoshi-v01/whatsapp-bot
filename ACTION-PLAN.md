# Plan de Accion SEO — sosabulls.com.py
**Generado:** 2026-05-07 | **Actualizado:** 2026-05-07
**Score actual:** 23/100 | **Score post-fixes:** ~52/100 | **Objetivo (6 meses):** 65/100

**Leyenda:** ✅ Hecho | ⏳ Pendiente cliente | 🔧 Pendiente codigo | ⬛ Fuera de scope

---

## CRITICO

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| C1 | noindex en landing "Proximamente" | ⬛ No aplica | Usuario pidio no tocar landing |
| C2 | Desbloquear AI crawlers en robots.txt | ✅ Hecho | Google-Extended, OAI-SearchBot, PerplexityBot desbloqueados; CCBot y anthropic-ai bloqueados |
| C3 | JSON-LD PetStore en ecommerce | ✅ Hecho | Schema estatico en `ecommerce/index.html`; schema dinamico Product+BreadcrumbList en `Product.jsx` |
| C4 | Estandarizar nombre del negocio | ⏳ Pendiente cliente | Forma canonica: "SOSA Bulls Balanceados". Hay 4 variantes distintas. Requiere actualizar GBP + redes sociales |
| C5 | Canonical tag en ecommerce | ✅ Hecho | `SEOHead.jsx` inyecta canonical dinamico por ruta via `useLocation()` |
| C6 | OG tags completos en ecommerce | ✅ Hecho | `SEOHead.jsx` ya tenia og:title/description/image; se agrego og:url |

---

## ALTO

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| A1 | Sitemap.xml | ✅ Hecho | Endpoint dinamico `GET /sitemap.xml` en `app.js`: raiz + 6 categorias + todos los productos con stock desde DB. Cache 1h. |
| A2 | Google Business Profile | ⏳ Pendiente cliente | Verificar titularidad, completar horarios/fotos/descripcion, alinear nombre con "SOSA Bulls Balanceados" |
| A3 | Corregir doble redirect en /dashboard | ✅ Hecho | Agregado `app.get('/dashboard', ...)` antes del static middleware en `app.js` — elimina el redirect de trailing slash |
| A4 | Citations basicas | ⏳ Pendiente cliente | Paginas Amarillas PY, Facebook Business, Waze. Usar exactamente: "SOSA Bulls Balanceados \| Barrio San Rafael, Lambare \| +595 982 316 578" |

---

## MEDIO

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| M1 | SSR/SSG para el SPA React | 🔧 Pendiente codigo | El ecommerce no es crawleable sin JS. Opciones: Next.js (recomendado), react-snap, o upgrade Render $7/mes |
| M2 | Sitemap dinamico para ecommerce | ✅ Hecho | Incluido en A1 — el sitemap ya lista productos y categorias del ecommerce |
| M3 | Google Fonts — font-display swap | ✅ Ya estaba | `ecommerce/index.html` ya tenia `&display=swap` en la URL de Google Fonts |
| M4 | noindex en /dashboard | ✅ Ya estaba | `dashboard/index.html` y `dashboard/dist/index.html` ya tienen `<meta name="robots" content="noindex,nofollow">` |
| M5 | Paginas /nosotros y /contacto | ✅ Hecho | `Nosotros.jsx` + `Contacto.jsx` con SEOHead, BreadcrumbList schema, NAP real, embed Google Maps, horarios reales |

---

## BAJO / BACKLOG

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| B1 | llms.txt | ✅ Hecho | Creado en `landing/llms.txt` con nombre, ubicacion, horarios, productos y URLs de categorias |
| B2 | og:image de calidad | ⏳ Pendiente cliente | Crear imagen 1200x630px con logo + colores de marca (#ffa601). Subir a `/assets/og-image.jpg` |
| B3 | Google Search Console | ⏳ Pendiente cliente | Verificar propiedad sosabulls.com.py (Cloudflare facilita verificacion DNS), enviar sitemap |
| B4 | Resenas post-compra via WhatsApp | 🔧 Pendiente codigo | Mensaje automatico 2h post-entrega con link a resena Google Maps. Implementar en `src/bot/flow.js` |

---

## Extras implementados (no estaban en el plan original)

| Tarea | Archivo | Notas |
|-------|---------|-------|
| WebSite schema | `ecommerce/index.html` | Segundo bloque JSON-LD estatico. Habilita sitelinks searchbox en Google |
| Organization schema | `ecommerce/index.html` | Tercer bloque JSON-LD estatico con logo y contacto. Habilita Knowledge Panel |
| BreadcrumbList en categorias | `Category.jsx` | Schema dinamico: Inicio → Categoria. Migas de pan en resultados Google |
| BreadcrumbList en productos | `Product.jsx` | Combinado con Product schema en `@graph`: Inicio → Categoria → Producto |
| Descriptions con keywords | `categories.js` | Las 6 categorias tienen descriptions con terminos reales de busqueda (Royal Canin, Frontline, Paraguay, etc.) |
| Fonts no-render-blocking | `ecommerce/index.html` | Google Fonts cambiado a `rel="preload"` + `onload` — elimina bloqueo de render LCP |
| ClaudeBot desbloqueado | `landing/robots.txt` | Agrega visibilidad en Claude.ai y respuestas de Anthropic |

---

## Resumen de estado

| Estado | Cantidad |
|--------|---------|
| ✅ Hecho | 10 |
| ⏳ Pendiente cliente | 5 |
| 🔧 Pendiente codigo | 4 |
| ⬛ Fuera de scope | 1 |
| **Total** | **20** |

**Proximas acciones recomendadas:**
1. `M5` — Paginas `/nosotros` y `/contacto` en ecommerce — pendiente por decision del usuario
2. `B4` — Bot de resenas post-entrega — pendiente por decision del usuario
3. `M1` — SSR/SSG — decision arquitectural pendiente (Next.js / react-snap / upgrade Render $7)
4. Cliente: Google Business Profile, citations, og:image, Google Search Console
