import { useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'
import StockBadge from '@/components/ui/StockBadge'
import ProductCard from '@/components/ui/ProductCard'
import { useProduct } from '@/hooks/useProduct'
import { useProducts } from '@/hooks/useProducts'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/utils/formatPrice'
import { CATEGORIES } from '@/constants/categories'

// ─── Imagen con fallback ─────────────────────────────────────
function ProductImage({ src, alt }) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)' }}
      >
        <svg width="80" height="80" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
          <ellipse cx="50" cy="65" rx="24" ry="20" />
          <circle cx="22" cy="38" r="11" />
          <circle cx="42" cy="26" r="11" />
          <circle cx="62" cy="26" r="11" />
          <circle cx="78" cy="38" r="11" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className="w-full h-full object-contain"
      style={{ padding: '16px' }}
    />
  )
}

// ─── Selector de cantidad ────────────────────────────────────
function QuantitySelector({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-0 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', width: 'fit-content' }}>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Disminuir cantidad"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
      >
        -
      </button>
      <span
        className="w-12 min-h-[44px] flex items-center justify-center text-sm font-bold"
        aria-live="polite"
        aria-label={`Cantidad: ${value}`}
        style={{ color: 'var(--color-text)', backgroundColor: 'white' }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
      >
        +
      </button>
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
      <div className="rounded-2xl" style={{ aspectRatio: '1/1', backgroundColor: 'var(--color-border)' }} />
      <div className="flex flex-col gap-4 pt-2">
        <div className="h-8 rounded w-3/4" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="h-4 rounded w-1/4" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="h-6 rounded w-1/3 mt-2" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="h-20 rounded mt-2" style={{ backgroundColor: 'var(--color-border)' }} />
        <div className="h-12 rounded-xl mt-4" style={{ backgroundColor: 'var(--color-border)' }} />
      </div>
    </div>
  )
}

// ─── Grupo de productos dentro de la seccion ─────────────────
function ProductGroup({ title, products, excludeSlug, limit = 4 }) {
  const filtered = products.filter(p => p.slug !== excludeSlug).slice(0, limit)
  if (filtered.length === 0) return null
  return (
    <div>
      <h3 style={{
        fontFamily: 'Montserrat, system-ui, sans-serif',
        fontSize: 'clamp(16px, 2vw, 20px)',
        fontWeight: 800,
        color: 'var(--color-text)',
        margin: '0 0 16px',
        letterSpacing: -0.2,
      }}>
        {title}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filtered.map(p => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  )
}

// ─── Seccion principal de complementarios ────────────────────
function ComplementarySection({ categoriaSlug, excludeSlug }) {
  const isPerros = categoriaSlug === 'perros'
  const isGatos  = categoriaSlug === 'gatos'
  const isEspecie = isPerros || isGatos
  const especieLabel = isPerros ? 'perros' : 'gatos'

  const paramsSame = useMemo(() => ({
    categoria: categoriaSlug,
    solo_disponibles: true,
    sort: 'mas_vendido',
    limit: 8,
  }), [categoriaSlug])

  const paramsAcc = useMemo(() => ({
    categoria: 'accesorios',
    solo_disponibles: true,
    sort: 'mas_vendido',
    limit: 4,
  }), [])

  const { products: sameCat, loading: loadingSame } = useProducts(paramsSame)
  const { products: accesorios, loading: loadingAcc }  = useProducts(paramsAcc)

  if (loadingSame || (isEspecie && loadingAcc)) return null

  const hasSame = sameCat.filter(p => p.slug !== excludeSlug).length > 0
  const hasAcc  = isEspecie && accesorios.length > 0

  if (!hasSame && !hasAcc) return null

  return (
    <section className="section-padding !pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container-base">
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 12, fontWeight: 800, letterSpacing: 2,
            color: 'var(--color-primary)', textTransform: 'uppercase',
            marginBottom: 6, fontFamily: 'Inter, system-ui, sans-serif',
          }}>
            Completar pedido
          </div>
          <h2 style={{
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontSize: 'clamp(22px, 3vw, 30px)',
            fontWeight: 800,
            color: 'var(--color-text)',
            margin: 0,
            letterSpacing: -0.3,
          }}>
            {isEspecie
              ? `Snacks y accesorios para ${especieLabel}`
              : 'Productos similares'}
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {hasSame && (
            <ProductGroup
              title={isEspecie ? `Snacks y alimentos para ${especieLabel}` : 'Más productos'}
              products={sameCat}
              excludeSlug={excludeSlug}
            />
          )}
          {hasAcc && (
            <ProductGroup
              title={`Accesorios para ${especieLabel}`}
              products={accesorios}
              excludeSlug={excludeSlug}
              limit={4}
            />
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Pagina principal ────────────────────────────────────────
export default function Product() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { product, loading, error } = useProduct(slug)
  const { addItem } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedPres, setSelectedPres] = useState(null)

  // Seleccionar primera presentación con stock cuando carga
  const presentaciones = product?.presentaciones || []
  const presActual = selectedPres || presentaciones.find(p => p.stock > 0) || presentaciones[0] || null

  if (loading) {
    return (
      <main className="section-padding">
        <div className="container-base">
          <ProductSkeleton />
        </div>
      </main>
    )
  }

  if (error === 'not_found') {
    return (
      <main className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-text)' }}>
          Producto no encontrado
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Este producto no existe o fue removido del catálogo.
        </p>
        <Link to="/" className="btn-primary">
          Volver al inicio
        </Link>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[50vh] gap-6 px-4 text-center">
        <h1 className="font-display text-3xl" style={{ color: 'var(--color-text)' }}>
          Error al cargar el producto
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          No se pudo obtener la información. Intentalo nuevamente.
        </p>
        <button onClick={() => navigate(-1)} className="btn-outline">
          Volver
        </button>
      </main>
    )
  }

  const { id, nombre, descripcion, imagen_url, categoria_slug, es_novedad, marca } = product
  const precio_venta = presActual?.precio_venta || product.precio_desde || 0
  const stock = presActual?.stock || 0
  const category = CATEGORIES.find(c => c.slug === categoria_slug)
  const outOfStock = !presActual || stock === 0

  const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://sosabulls.com.py'

  const nextYear = new Date()
  nextYear.setFullYear(nextYear.getFullYear() + 1)
  const priceValidUntil = nextYear.toISOString().split('T')[0]

  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${SITE_URL}/producto/${slug}#webpage`,
        url: `${SITE_URL}/producto/${slug}`,
        name: `${nombre} — Sosa BULLS`,
        isPartOf: { '@id': `${SITE_URL}/#website` },
        breadcrumb: { '@id': `${SITE_URL}/producto/${slug}#breadcrumb` },
        mainEntity: { '@id': `${SITE_URL}/producto/${slug}#product` },
        inLanguage: 'es-PY',
      },
      {
        '@type': 'Product',
        '@id': `${SITE_URL}/producto/${slug}#product`,
        name: nombre,
        description: descripcion ?? `${nombre} disponible en Sosa BULLS. Envio a domicilio en Paraguay.`,
        sku: String(id),
        ...(marca && { brand: { '@type': 'Brand', name: marca } }),
        ...(imagen_url && { image: { '@type': 'ImageObject', url: imagen_url, contentUrl: imagen_url } }),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PYG',
          price: precio_venta,
          priceValidUntil,
          availability: outOfStock
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          url: `${SITE_URL}/producto/${slug}`,
          seller: { '@id': `${SITE_URL}/#organization` },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'PY' },
            deliveryTime: {
              '@type': 'ShippingDeliveryTime',
              handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 2, unitCode: 'DAY' },
            },
          },
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${SITE_URL}/producto/${slug}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: category?.label ?? categoria_slug, item: `${SITE_URL}/categoria/${categoria_slug}` },
          { '@type': 'ListItem', position: 3, name: nombre, item: `${SITE_URL}/producto/${slug}` },
        ],
      },
    ],
  }

  function handleAddToCart() {
    if (!presActual) return
    addItem({
      id: presActual.id,
      nombre: presentaciones.length > 1 ? `${nombre} — ${presActual.nombre}` : nombre,
      precio_venta: presActual.precio_venta,
      stock: presActual.stock,
      imagen_url,
      slug,
      marca,
      cantidad: qty,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <>
      <SEOHead
        title={nombre}
        description={descripcion ?? `Compra ${nombre} en Sosa BULLS. Envío a domicilio en Paraguay.`}
        image={imagen_url}
        type="product"
        schema={schema}
      />

      <main>
        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegación" className="container-base px-4 md:px-6 pt-6 pb-2">
          <ol className="flex items-center gap-2 text-sm flex-wrap" style={{ color: 'var(--color-text-muted)' }}>
            <li>
              <Link to="/" style={{ color: 'var(--color-primary)' }} className="hover:underline transition-colors duration-150">
                Inicio
              </Link>
            </li>
            {category && (
              <>
                <li aria-hidden="true">&#47;</li>
                <li>
                  <Link to={`/categoria/${categoria_slug}`} style={{ color: 'var(--color-primary)' }} className="hover:underline transition-colors duration-150">
                    {category.label}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">&#47;</li>
            <li aria-current="page" style={{ color: 'var(--color-text)' }}>{nombre}</li>
          </ol>
        </nav>

        <section className="section-padding !pt-8">
          <div className="container-base">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">

              {/* Imagen */}
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="relative"
              >
                {/* Sombra decorativa desplazada */}
                <div
                  aria-hidden="true"
                  className="absolute rounded-2xl"
                  style={{
                    inset: 0,
                    transform: 'translate(10px, 10px)',
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                    opacity: 0.18,
                    borderRadius: 'var(--radius-xl)',
                    zIndex: 0,
                  }}
                />

                {/* Marco con gradiente sutil */}
                <div
                  className="relative rounded-2xl overflow-hidden"
                  style={{
                    aspectRatio: '1/1',
                    border: '1.5px solid var(--color-border)',
                    boxShadow: 'var(--shadow-lg)',
                    background: 'linear-gradient(145deg, var(--color-primary-light) 0%, #fff 60%, var(--color-bg-elevated) 100%)',
                    zIndex: 1,
                  }}
                >
                  <ProductImage src={imagen_url} alt={nombre} />

                  {/* Overlay hover zoom hint */}
                  {imagen_url && (
                    <div
                      className="absolute inset-0 flex items-end justify-end p-3 opacity-0 hover:opacity-100 transition-opacity duration-250"
                      style={{ background: 'linear-gradient(to top, rgba(26,18,8,0.22) 0%, transparent 50%)' }}
                    >
                      <span
                        className="text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: 'rgba(26,18,8,0.55)', backdropFilter: 'blur(4px)' }}
                      >
                        Ver detalle
                      </span>
                    </div>
                  )}
                </div>

                {/* Punto decorativo — esquina superior izquierda */}
                <div
                  aria-hidden="true"
                  className="absolute -top-2 -left-2 w-5 h-5 rounded-full z-10"
                  style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 0 0 3px var(--color-primary-light)' }}
                />
                {/* Punto decorativo — esquina inferior derecha */}
                <div
                  aria-hidden="true"
                  className="absolute -bottom-2 -right-2 w-3 h-3 rounded-full z-10"
                  style={{ backgroundColor: 'var(--color-primary-dark)', opacity: 0.5 }}
                />
              </motion.div>

              {/* Detalle */}
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="flex flex-col gap-5"
              >
                {/* Badges superiores */}
                <div className="flex items-center gap-2 flex-wrap">
                  <StockBadge stock={stock} />
                  {es_novedad && (
                    <span
                      className="inline-block px-2.5 py-1 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      NUEVO
                    </span>
                  )}
                </div>

                {/* Nombre */}
                <h1
                  className="font-display text-3xl md:text-4xl leading-tight"
                  style={{ color: 'var(--color-text)' }}
                >
                  {nombre}
                </h1>

                {/* Selector de presentaciones */}
                {presentaciones.length > 1 && (
                  <div>
                    <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Presentación:
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {presentaciones.map(pr => (
                        <button
                          key={pr.id}
                          onClick={() => { setSelectedPres(pr); setQty(1) }}
                          disabled={!pr.disponible || pr.stock === 0}
                          style={{
                            padding: '8px 18px', borderRadius: 999, fontSize: 13, fontWeight: 700,
                            border: `2px solid ${presActual?.id === pr.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                            background: presActual?.id === pr.id ? 'var(--color-primary)' : '#fff',
                            color: presActual?.id === pr.id ? '#fff' : (!pr.disponible || pr.stock === 0) ? 'var(--color-text-muted)' : 'var(--color-text)',
                            cursor: (!pr.disponible || pr.stock === 0) ? 'not-allowed' : 'pointer',
                            opacity: (!pr.disponible || pr.stock === 0) ? 0.45 : 1,
                            textDecoration: (!pr.disponible || pr.stock === 0) ? 'line-through' : 'none',
                            transition: 'all 0.15s',
                            fontFamily: 'Inter, system-ui, sans-serif',
                          }}
                        >
                          {pr.nombre}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precio */}
                <p
                  className="font-display text-4xl"
                  style={{ color: 'var(--color-primary)' }}
                  aria-label={`Precio: ${formatPrice(precio_venta)}`}
                >
                  {formatPrice(precio_venta)}
                </p>

                {/* Descripcion */}
                {descripcion && (
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {descripcion}
                  </p>
                )}

                <hr style={{ borderColor: 'var(--color-border)' }} />

                {/* Cantidad + carrito */}
                {!outOfStock && (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                        Cantidad:
                      </span>
                      <QuantitySelector
                        value={qty}
                        max={stock}
                        onChange={setQty}
                      />
                    </div>

                    <motion.button
                      onClick={handleAddToCart}
                      whileTap={{ scale: 0.97 }}
                      disabled={added}
                      className="btn-primary w-full md:w-auto justify-center text-base py-4 px-8"
                      style={added ? { backgroundColor: 'var(--color-success)' } : {}}
                    >
                      {added ? 'Agregado al carrito' : 'Agregar al carrito'}
                    </motion.button>
                  </div>
                )}

                {outOfStock && (
                  <button
                    disabled
                    className="w-full md:w-auto px-8 py-4 rounded-xl text-base font-bold cursor-not-allowed"
                    style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-muted)' }}
                  >
                    Sin stock
                  </button>
                )}

                {/* Link al carrito si se agrego */}
                {added && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Link
                      to="/carrito"
                      className="text-sm font-semibold underline"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Ver carrito y finalizar compra
                    </Link>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {categoria_slug && (
          <ComplementarySection categoriaSlug={categoria_slug} excludeSlug={slug} />
        )}
      </main>
    </>
  )
}
