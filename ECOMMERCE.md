# ECOMMERCE.md — Memoria del proyecto Ecommerce Sosa Bulls
> Claude Code: leer este archivo AL INICIO de cada sesión antes de hacer cualquier cosa.
> Actualizar AL FINAL de cada sesión con los cambios realizados.

---

## Estado general
- **Fase actual:** FASE 6 completada — ecommerce funcional end-to-end
- **Ultima sesion:** 2026-04-02
- **Proximo paso:** Deploy — configurar servicio Render Static Site o Vercel apuntando a ecommerce/dist/

---

## Progreso por fase

### FASE 1 — Base y layout ✅
- [x] Setup inicial (vite@5, tailwind@3, react-router-dom@6, axios, framer-motion@11, react-helmet-async@2)
- [ ] `components.json` — 21st.dev init (pendiente, opcional antes de Fase 3)
- [x] globals.css con variables CSS completas, keyframes, clases utilitarias
- [x] FloatingPaws.jsx — idéntica a landing: 18 patitas, risePaw (sube 110vh→-120px, rota 720°), colores naranja
- [x] Navbar.jsx — sticky, blur backdrop, shadow on scroll, search expandible, drawer mobile, cart badge bounce
- [x] Footer.jsx — 3 columnas, social links, bottom bar

### FASE 2 — Home ✅
- [x] api.js — Axios baseURL desde VITE_API_URL
- [x] useBanners.js — fetch + fallback estático de 3 slides
- [x] useProducts.js — fetch con params (featured, novedad, limit, offset, solo_disponibles)
- [x] useCategories.js — fetch + enriquece con íconos/colores de constants
- [x] HeroBanner.jsx — AnimatePresence slide horizontal, autoplay 5s, dots + flechas, pause on hover, fallback gradientes
- [x] CategoryCard.jsx — Framer Motion whileInView + whileHover, hover border naranja
- [x] ProductCard.jsx + StockBadge.jsx — badge stock verde/naranja/rojo, ribbon NUEVO, placeholder SVG patita, AddToCart con feedback
- [x] ProductGrid.jsx — skeletons, empty state, error state, stagger Framer Motion
- [x] SectionTitle.jsx — línea decorativa naranja reutilizable
- [x] WhyUs.jsx — sección fondo marrón, 4 tarjetas con stagger, íconos
- [x] Home.jsx ensamblado — HeroBanner + Categorías + Destacados + WhyUs + Novedades

### FASE 3 — Paginas internas
- [x] Category.jsx (/categoria/:slug) — filtros disponibles, orden, paginacion, breadcrumb
- [x] Product.jsx (/producto/:slug) — imagen con fallback, selector cantidad, agregar al carrito, breadcrumb, estados error/not_found
- [x] NotFound.jsx
- [x] useProduct.js — hook para detalle de producto por slug

### FASE 4 — Carrito
- [x] CartContext.jsx (useReducer + localStorage 'sosa_bulls_cart')
- [x] useCart.js
- [x] Cart.jsx — items con controles qty/remove, resumen, formulario cliente, pantalla confirmacion con numero de pedido

### FASE 5 — Backend ecommerce
- [x] src/routes/ecommerce.js creado
- [x] GET /api/ecommerce/banners — fallback 200 [] si tabla no existe aun
- [x] GET /api/ecommerce/productos — filtros: categoria, search, solo_disponibles, novedad, sort, limit, offset
- [x] GET /api/ecommerce/productos/:slug — extrae presentacion_id del slug, retorna 404 si no existe
- [x] GET /api/ecommerce/categorias — con conteo de productos disponibles
- [x] POST /api/ecommerce/pedidos — transaccion: busca/crea cliente, verifica stock FOR UPDATE, crea ordenes_pedido + items, retorna numero ECO-XXXXX
- [x] Ruta registrada en app.js (sin autenticar, con limiterGeneral)
- [x] CORS dev: agregado puerto 5174
- [x] Migracion SQL: src/db/migrations/ecommerce_banners.sql (PENDIENTE ejecutar en Supabase)

### FASE 6 — Pulido y deploy
- [x] SEOHead en todas las paginas (Home, Category, Product, Cart, NotFound)
- [x] Accesibilidad: skip-to-content link, aria-label, aria-live, aria-current, roles semanticos, focus visible
- [x] CategoryCard: reemplazados emojis por SVGs inline (perro, gato, hueso, etiqueta)
- [x] Code splitting: React.lazy + Suspense en App.jsx — cada pagina es un chunk separado
- [x] manualChunks en vite.config: vendor-react, vendor-motion, vendor-axios separados
- [x] index.html: preload fonts, viewport-fit=cover, meta color-scheme
- [x] globals.css: sr-only, focus:not-sr-only, animate-spin
- [x] Build exitoso: 15 chunks, 2.33s, framer-motion 38kb gzip (separado del bundle principal)
- [x] UI/UX Pro Max audit aplicado: cursor-pointer, touch targets 44px, claymorphism inner shadow, disabled cursor-not-allowed, dots HeroBanner con wrapper 44px, emoji en Navbar footer eliminado
- [ ] Deploy configurado (pendiente)

---

## Archivos creados / modificados

| Fecha      | Archivo | Acción | Notas |
|------------|---------|--------|-------|
| 2026-04-02 | `ecommerce/package.json` | Creado | vite@5, tailwind@3, react-router@6, framer-motion@11, react-helmet-async@2 |
| 2026-04-02 | `ecommerce/vite.config.js` | Creado | alias `@` → `src/`, proxy `/api` → localhost:3001, port 5174 |
| 2026-04-02 | `ecommerce/tailwind.config.js` | Creado | fonts Fredoka One + Nunito, colores brand, shadows, keyframes |
| 2026-04-02 | `ecommerce/postcss.config.js` | Creado | tailwindcss + autoprefixer |
| 2026-04-02 | `ecommerce/index.html` | Creado | Google Fonts, lang=es, meta SEO base |
| 2026-04-02 | `ecommerce/.gitignore` | Creado | node_modules, dist, .env.local |
| 2026-04-02 | `ecommerce/.env.local` | Creado | VITE_API_URL=localhost:3001 |
| 2026-04-02 | `ecommerce/.env.production` | Creado | VITE_API_URL=render |
| 2026-04-02 | `ecommerce/src/styles/globals.css` | Creado | Variables CSS completas, keyframes, btn-primary, card-base, etc. |
| 2026-04-02 | `ecommerce/src/lib/utils.js` | Creado | función cn() |
| 2026-04-02 | `ecommerce/src/utils/formatPrice.js` | Creado | "Gs. 25.000" |
| 2026-04-02 | `ecommerce/src/utils/slugify.js` | Creado | NFD normalize |
| 2026-04-02 | `ecommerce/src/constants/categories.js` | Creado | CATEGORIES, NAV_LINKS, STOCK_THRESHOLDS |
| 2026-04-02 | `ecommerce/src/components/ui/FloatingPaws.jsx` | Actualizado | Idéntica a landing: risePaw animation, 18 patitas, SVG de 4 círculos + elipse |
| 2026-04-02 | `ecommerce/src/components/layout/Navbar.jsx` | Creado | Completo |
| 2026-04-02 | `ecommerce/src/components/layout/Footer.jsx` | Creado | 3 columnas + social |
| 2026-04-02 | `ecommerce/src/components/seo/SEOHead.jsx` | Creado | Helmet OG + Twitter |
| 2026-04-02 | `ecommerce/src/components/ui/HeroBanner.jsx` | Creado | AnimatePresence, autoplay 5s, dots, flechas desktop, pause on hover, gradientes fallback |
| 2026-04-02 | `ecommerce/src/components/ui/CategoryCard.jsx` | Creado | whileInView + whileHover, border naranja en hover |
| 2026-04-02 | `ecommerce/src/components/ui/StockBadge.jsx` | Creado | Verde/naranja pulsante/rojo por nivel de stock |
| 2026-04-02 | `ecommerce/src/components/ui/ProductCard.jsx` | Creado | Ribbon NUEVO, placeholder patita SVG, AddToCart con feedback visual |
| 2026-04-02 | `ecommerce/src/components/ui/ProductGrid.jsx` | Creado | Skeletons, empty, error, stagger |
| 2026-04-02 | `ecommerce/src/components/ui/SectionTitle.jsx` | Creado | Línea decorativa naranja reutilizable |
| 2026-04-02 | `ecommerce/src/components/ui/WhyUs.jsx` | Creado | Fondo marrón, 4 razones con stagger |
| 2026-04-02 | `ecommerce/src/context/CartContext.jsx` | Creado | useReducer + localStorage |
| 2026-04-02 | `ecommerce/src/hooks/useCart.js` | Creado | Re-export del context |
| 2026-04-02 | `ecommerce/src/hooks/useBanners.js` | Creado | Fetch + 3 fallback slides |
| 2026-04-02 | `ecommerce/src/hooks/useProducts.js` | Creado | Fetch con params configurables |
| 2026-04-02 | `ecommerce/src/hooks/useCategories.js` | Creado | Fetch + enriquece con íconos locales |
| 2026-04-02 | `ecommerce/src/services/api.js` | Creado | Axios + interceptor |
| 2026-04-02 | `ecommerce/src/pages/Home.jsx` | Actualizado | Ensamblado completo: Banner + Categorías + Destacados + WhyUs + Novedades |
| 2026-04-02 | `ecommerce/src/pages/NotFound.jsx` | Creado | 404 friendly |
| 2026-04-02 | `ecommerce/src/App.jsx` | Creado | Layout + routes |
| 2026-04-02 | `ecommerce/src/main.jsx` | Creado | Entry point |

---

## Componentes de 21st.dev instalados
<!-- Próxima sesión: instalar carousel/slider para HeroBanner y card para productos si aplica -->

| Componente | URL 21st.dev | Usado en | Customizaciones |
|-----------|--------------|----------|-----------------|
| -         | -            | -        | -               |

---

## Decisiones técnicas tomadas

- **Color secundario:** #3d2c1e (marrón cacao) en lugar de negro puro — más cálido
- **Stack:** React + Vite (NO Next.js) — coherencia con dashboard existente
- **Carrito:** localStorage + sin pasarela de pago en fase inicial
- **Pedidos:** Se registran con canal 'ecommerce' en el sistema ERP existente
- **Carpeta:** `ecommerce/` dentro del mismo repo (no branch separado) — Render ignora la carpeta
- **react-helmet-async:** instalado con `--legacy-peer-deps` (peer dep declara React 16-18, funciona con 19)
- **Puerto dev:** 5174 (no choca con dashboard en 5173)
- **Alias `@`:** apunta a `src/`
- **FloatingPaws:** IGUAL a landing — risePaw keyframe sube 110vh→-120px, rota 720°, 18 patitas en franjas, opacidad 0.11, colores naranja (#ffa601)
- **HeroBanner fallback:** 3 slides estáticos hardcodeados en useBanners cuando la API falla
- **useProducts params:** se serializan a JSON para el dependency array del efecto (evita loops)

---

## Problemas conocidos / Bugs pendientes

| Descripción | Archivo afectado | Prioridad | Estado |
|-------------|-----------------|-----------|--------|
| `font-600` en Tailwind inline puede no resolverse (usar `font-semibold`) | Navbar.jsx líneas inline | Baja | Pendiente |
| App.jsx tiene rutas /categoria y /producto comentadas — activar en Fase 3 | App.jsx | Alta | Pendiente |

---

## Notas de sesiones anteriores

### 2026-04-02 — Sesión 1 (Fases 1 + 2)
- **Qué se hizo:** Setup completo Fase 1 + todos los componentes de Fase 2. FloatingPaws actualizada para ser idéntica a landing (risePaw animation). Build limpio en 2.29s.
- **Qué quedó pendiente:** Fase 3 (Category, Product), Fase 4 (Cart.jsx), Fase 5 (backend endpoints), Cart.jsx con formulario.
- **Problemas encontrados:** `font-700` no existe en Tailwind → corregido a `font-bold`. `react-helmet-async` requiere `--legacy-peer-deps` con React 19.
- **Próximos pasos:** Fase 3 páginas internas + Fase 5 backend en paralelo si es posible.

---

## Variables de entorno necesarias
```env
# ecommerce/.env.local (desarrollo)
VITE_API_URL=http://localhost:3001
VITE_SITE_NAME=Sosa Bulls
VITE_SITE_URL=https://sosabulls.com.py

# ecommerce/.env.production
VITE_API_URL=https://whatsapp-bot-0272.onrender.com
```

---

## Comandos útiles
```bash
# Iniciar ecommerce en desarrollo
cd ecommerce && npm run dev
# → http://localhost:5174

# Build de producción
cd ecommerce && npm run build

# Instalar componente de 21st.dev
cd ecommerce && npx shadcn@latest add "https://21st.dev/r/[autor]/[componente]"
```

---
*Este archivo es mantenido por Claude Code. No editar manualmente salvo para correcciones críticas.*
