import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'
import StockBadge from '@/components/ui/StockBadge'
import { useProduct } from '@/hooks/useProduct'
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
      className="w-full h-full object-cover"
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
      <div className="rounded-2xl bg-gray-200" style={{ aspectRatio: '1/1' }} />
      <div className="flex flex-col gap-4 pt-2">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
        <div className="h-6 bg-gray-200 rounded w-1/3 mt-2" />
        <div className="h-20 bg-gray-200 rounded mt-2" />
        <div className="h-12 bg-gray-200 rounded-xl mt-4" />
      </div>
    </div>
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
          Este producto no existe o fue removido del catalogo.
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
          No se pudo obtener la informacion. Intentalo nuevamente.
        </p>
        <button onClick={() => navigate(-1)} className="btn-outline">
          Volver
        </button>
      </main>
    )
  }

  const { nombre, descripcion, precio_venta, stock, imagen_url, categoria_slug, es_novedad } = product
  const category = CATEGORIES.find(c => c.slug === categoria_slug)
  const outOfStock = stock === 0

  function handleAddToCart() {
    addItem({ ...product, cantidad: qty })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <>
      <SEOHead
        title={nombre}
        description={descripcion ?? `Compra ${nombre} en Sosa Bulls. Envio a domicilio en Paraguay.`}
        image={imagen_url}
        type="product"
      />

      <main>
        {/* Breadcrumb */}
        <nav aria-label="Ruta de navegacion" className="container-base px-4 md:px-6 pt-6 pb-2">
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
                className="rounded-2xl overflow-hidden border"
                style={{
                  aspectRatio: '1/1',
                  borderColor: 'var(--color-border)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <ProductImage src={imagen_url} alt={nombre} />
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
                      {stock <= 10 && (
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          ({stock} disponibles)
                        </span>
                      )}
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
      </main>
    </>
  )
}
