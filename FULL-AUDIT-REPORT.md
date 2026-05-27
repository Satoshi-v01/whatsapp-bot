# SEO Audit Report — sosabulls.com.py
**Fecha:** 2026-05-07 | **Actualizado:** 2026-05-07
**Sitio:** https://sosabulls.com.py
**Tipo de negocio:** Petshop — Lambare, Paraguay (brick-and-mortar + delivery WhatsApp)

**Leyenda:** ✅ Resuelto | 🔧 Pendiente codigo | ⏳ Pendiente cliente | ⬛ Fuera de scope

---

## Puntuacion de Salud SEO

| Categoria | Peso | Score inicial | Score actual | Contribucion actual |
|-----------|------|--------------|--------------|---------------------|
| Technical SEO | 22% | 38/100 | 62/100 | 13.6 pts |
| Content Quality | 23% | 18/100 | 28/100 | 6.4 pts |
| On-Page SEO | 20% | 15/100 | 65/100 | 13.0 pts |
| Schema / Structured Data | 10% | 0/100 | 75/100 | 7.5 pts |
| Performance (CWV) | 10% | 50/100 | 55/100 | 5.5 pts |
| AI Search Readiness | 10% | 4/100 | 45/100 | 4.5 pts |
| Images | 5% | 50/100 | 50/100 | 2.5 pts |
| **TOTAL** | 100% | **23/100** | **~53/100** | — |

---

## 1. Technical SEO

### Problemas y estado

| Severidad | Problema | Estado |
|-----------|----------|--------|
| CRITICO | Pagina coming-soon indexable sin noindex | ⬛ No aplica (usuario pidio no tocar landing) |
| CRITICO | Canonical tag ausente en ecommerce | ✅ Resuelto — `SEOHead.jsx` genera canonical dinamico por ruta |
| CRITICO | No existia sitemap.xml | ✅ Resuelto — endpoint dinamico `/sitemap.xml` con productos desde DB |
| CRITICO | Cero structured data | ✅ Resuelto — PetStore, WebSite, Product, BreadcrumbList implementados |
| ALTO | OG tags incompletos | ✅ Resuelto — og:url agregado; og:title/description/image/type ya estaban |
| ALTO | Twitter Cards ausentes | ✅ Ya estaban — `SEOHead.jsx` ya las generaba |
| ALTO | Doble redirect en /dashboard | ✅ Resuelto — `app.get('/dashboard', ...)` antes del static middleware elimina trailing slash redirect |
| ALTO | H1 solo en JS (landing) | ⬛ No aplica — ecommerce tiene H1 en JSX, renderizado por React |
| MEDIO | Google Fonts render-blocking | ✅ Ya estaba — `display=swap` ya estaba en URL de Google Fonts |
| MEDIO | Sin preload hints | ✅ Resuelto — Google Fonts cambiado a `rel="preload"` + `onload` en `ecommerce/index.html` |
| BAJO | Sin sitemap en robots.txt | ✅ Resuelto — `Sitemap: https://sosabulls.com.py/sitemap.xml` en robots.txt |
| BAJO | /carrito y /perfil indexables | ✅ Resuelto — `noindex,nofollow` via `SEOHead` en esas rutas |

---

## 2. Content Quality

### Estado actual

| Problema | Estado |
|----------|--------|
| Thin content (~90 palabras en landing) | ⬛ No aplica — ecommerce tiene contenido real de productos |
| React SPA no crawleable sin JS | 🔧 Pendiente — no hay SSR/SSG |
| Keywords target ausentes | ✅ Resuelto parcialmente — descriptions de categorias mejoradas con keywords reales |
| Brand name inconsistente (4 variantes) | ⏳ Pendiente cliente — estandarizar a "SOSA Bulls Balanceados" en GBP y redes |
| Sin pagina /nosotros | ✅ Resuelto — `ecommerce/src/pages/Nosotros.jsx` con SEOHead + BreadcrumbList |
| Sin pagina /contacto | ✅ Resuelto — `ecommerce/src/pages/Contacto.jsx` con SEOHead + BreadcrumbList |
| Sin blog / contenido editorial | 🔧 Pendiente — fuera del alcance inmediato |

### E-E-A-T (estado actual para ecommerce)

| Factor | Score anterior | Score actual | Notas |
|--------|---------------|--------------|-------|
| Experience | 12/20 | 14/20 | Mejorado por descriptions de categorias con keywords especificas |
| Expertise | 8/25 | 10/25 | Sin /nosotros ni blog; productos con descripcion individual ayudan |
| Authoritativeness | 5/25 | 8/25 | Schema PetStore + BreadcrumbList suma autoridad estructural |
| Trustworthiness | 18/30 | 22/30 | Canonical correcto, og:url, schema con horarios y ubicacion |

---

## 3. Schema / Structured Data

### Estado actual

| Schema | Estado | Archivo |
|--------|--------|---------|
| PetStore (LocalBusiness) | ✅ Implementado | `ecommerce/index.html` — estatico, siempre presente |
| WebSite | ✅ Implementado | `ecommerce/index.html` — estatico |
| Product + Offer | ✅ Implementado | `Product.jsx` → `SEOHead` — dinamico por producto |
| BreadcrumbList en productos | ✅ Implementado | `Product.jsx` — combinado con Product en `@graph` |
| BreadcrumbList en categorias | ✅ Implementado | `Category.jsx` → `SEOHead` — dinamico por categoria |
| Organization | ✅ Implementado | `ecommerce/index.html` — estatico con logo y contacto |
| FAQPage | 🔧 Pendiente | Para /nosotros o pagina de preguntas frecuentes |
| AggregateRating | ⏳ Pendiente cliente | Requiere sistema de resenas implementado |

---

## 4. AI Search Readiness

### Estado de crawlers AI

| Crawler | Plataforma | Estado anterior | Estado actual |
|---------|------------|----------------|---------------|
| Google-Extended | Gemini / AI Overviews | BLOQUEADO | ✅ Permitido |
| OAI-SearchBot | ChatGPT Search | BLOQUEADO | ✅ Permitido |
| PerplexityBot | Perplexity | BLOQUEADO | ✅ Permitido |
| GPTBot | ChatGPT entrenamiento | BLOQUEADO | BLOQUEADO — correcto |
| CCBot | Common Crawl entrenamiento | BLOQUEADO | BLOQUEADO — correcto |
| anthropic-ai | Anthropic entrenamiento | no estaba | ✅ Bloqueado explicitamente |
| ClaudeBot | Anthropic busqueda | BLOQUEADO | ✅ Permitido |

### Otros

| Item | Estado |
|------|--------|
| llms.txt | ✅ Creado en `landing/llms.txt` |
| Citabilidad AI | 🔧 Parcial — schema suma puntos pero sin /nosotros ni FAQ la citabilidad es baja |
| Brand entity disambiguation | ⏳ Pendiente cliente — estandarizar nombre en todos los touchpoints |

---

## 5. Local SEO

### Estado actual

| Problema | Estado |
|----------|--------|
| NAP inconsistente — 4 variantes del nombre | ⏳ Pendiente cliente |
| Dos telefonos sin etiqueta definida | ⏳ Pendiente cliente — confirmar cual es el principal |
| Sin numero de calle en schema | ⏳ Pendiente cliente — confirmar direccion exacta |
| PetStore schema con horarios y ubicacion | ✅ Implementado |
| Google Maps link en pagina | ✅ Ya existia en landing |
| Citations en directorios PY | ⏳ Pendiente cliente — Paginas Amarillas, Facebook Business, Waze |
| Google Business Profile sin optimizar | ⏳ Pendiente cliente |
| Sin sistema de resenas | 🔧 Pendiente — bot post-entrega en `flow.js` |

---

## 6. Backlinks y Sitemap

| Item | Estado |
|------|--------|
| sitemap.xml — no existia | ✅ Resuelto — endpoint dinamico con productos reales desde DB |
| Referencia a sitemap en robots.txt | ✅ Resuelto |
| /dashboard y /api bloqueados en robots.txt | ✅ Ya estaban |
| /carrito y /perfil bloqueados en robots.txt | ✅ Agregado |
| Backlinks — dominio nuevo sin historico | ⏳ Normal para sitio nuevo |
| Link building — directorios Paraguay | ⏳ Pendiente cliente |
| Dealer pages en proveedores (Royal Canin PY) | ⏳ Pendiente cliente |

---

## 7. Pendientes criticos antes del lanzamiento del ecommerce

Estas tareas deben resolverse ANTES de que el ecommerce sea visible al publico:

| Prioridad | Tarea | Tipo |
|-----------|-------|------|
| 1 | Corregir doble redirect `/dashboard` | Codigo — 5 min en Render.com |
| 2 | Crear paginas `/nosotros` y `/contacto` en ecommerce | Codigo — impacto E-E-A-T alto |
| 3 | Upgrade Render.com a plan pago ($7/mes) o SSR | Arquitectura — sin esto Googlebot puede timeout |
| 4 | Bot de resenas post-entrega | Codigo — `src/bot/flow.js` |
| 5 | Google Business Profile optimizado | Cliente — mayor factor de ranking local |
| 6 | og:image 1200x630px | Cliente/Diseño |
| 7 | Google Search Console — verificar y enviar sitemap | Cliente |

---

## Resumen ejecutivo de cambios realizados

### Archivos modificados en esta sesion

| Archivo | Cambios |
|---------|---------|
| `ecommerce/index.html` | JSON-LD PetStore estatico + WebSite schema |
| `ecommerce/src/components/seo/SEOHead.jsx` | canonical, og:url, prop `schema` para JSON-LD dinamico |
| `ecommerce/src/pages/Product.jsx` | Schema `@graph` con Product + BreadcrumbList |
| `ecommerce/src/pages/Category.jsx` | BreadcrumbList schema dinamico por categoria |
| `ecommerce/src/constants/categories.js` | Descriptions con keywords de busqueda reales |
| `landing/robots.txt` | Desbloquear Google-Extended/OAI-SearchBot/PerplexityBot; bloquear CCBot/anthropic-ai; corregir sitemap URL |
| `landing/llms.txt` | Creado — info de negocio y URLs para LLMs |
| `app.js` | Endpoint dinamico `/sitemap.xml` con productos desde DB |
