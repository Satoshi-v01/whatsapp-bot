import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/formatPrice'
import StockBadge from './StockBadge'
import ShimmerButton from './ShimmerButton'

/**
 * HeroProductCard — versión grande del ProductCard que ocupa 2 columnas.
 * Layout horizontal: imagen a la izquierda, info a la derecha.
 */
export default function HeroProductCard({ product, onAddToCart }) {
  const { nombre, precio_venta, stock, imagen_url, es_novedad, slug } = product
  const [adding, setAdding] = useState(false)
  const outOfStock = stock === 0

  // Spotlight
  const cardRef = useRef(null)
  const onMouseMove = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    const { left, top } = el.getBoundingClientRect()
    el.style.setProperty('--sx', `${e.clientX - left}px`)
    el.style.setProperty('--sy', `${e.clientY - top}px`)
  }, [])
  const onMouseLeave = useCallback((e) => {
    const el = cardRef.current
    if (!el) return
    el.style.setProperty('--sx', '-400px')
    el.style.setProperty('--sy', '-400px')
    e.currentTarget.style.boxShadow = 'var(--shadow-md)'
  }, [])

  async function handleAddToCart(e) {
    e.preventDefault()
    if (adding || outOfStock) return
    setAdding(true)
    await onAddToCart?.()
    setTimeout(() => setAdding(false), 700)
  }

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)' }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative flex flex-col sm:flex-row rounded-2xl overflow-hidden border h-full"
      style={{
        '--sx': '-400px',
        '--sy': '-400px',
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        borderWidth: '1.5px',
        boxShadow: 'var(--shadow-md)',
        opacity: outOfStock ? 0.75 : 1,
        minHeight: '200px',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Spotlight glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={{ background: 'radial-gradient(520px circle at var(--sx) var(--sy), rgba(255,166,1,0.11), transparent 65%)' }}
      />

      {/* Badge DESTACADO */}
      <div
        className="absolute top-3 left-3 z-20 px-3 py-1 rounded-full text-[11px] font-bold text-white"
        style={{ backgroundColor: 'var(--color-secondary)' }}
        aria-label="Producto destacado"
      >
        ★ DESTACADO
      </div>

      {es_novedad && (
        <div
          className="absolute top-3 right-3 z-20 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          NUEVO
        </div>
      )}

      {/* Imagen — ocupa la mitad izquierda */}
      <Link
        to={`/producto/${slug}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block shrink-0 relative group/hero-img"
        style={{ width: '50%', minWidth: '40%' }}
      >
        <div className="w-full h-full overflow-hidden relative" style={{ minHeight: '200px' }}>
          {imagen_url ? (
            <>
              <img
                src={imagen_url}
                alt={nombre}
                className="w-full h-full object-cover"
                style={{ transition: 'transform 0.4s ease' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
                loading="lazy"
              />
              {/* Overlay lupa */}
              <div
                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/hero-img:opacity-100"
                style={{ backgroundColor: 'rgba(26,18,8,0.25)', transition: 'opacity 0.25s ease' }}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)', minHeight: '200px' }}>
              <svg width="64" height="64" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
                <ellipse cx="50" cy="65" rx="24" ry="20" />
                <circle cx="22" cy="38" r="11" />
                <circle cx="42" cy="26" r="11" />
                <circle cx="62" cy="26" r="11" />
                <circle cx="78" cy="38" r="11" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      {/* Info — derecha */}
      <div className="flex flex-col justify-center gap-3 p-5 flex-1 relative z-[2]">
        <StockBadge stock={stock} />

        <Link
          to={`/producto/${slug}`}
          className="font-display text-xl md:text-2xl leading-snug hover:underline decoration-primary/40"
          style={{ color: 'var(--color-text)' }}
        >
          {nombre}
        </Link>

        <p
          className="font-display text-3xl"
          style={{ color: 'var(--color-primary)' }}
          aria-label={`Precio: ${formatPrice(precio_venta)}`}
        >
          {formatPrice(precio_venta)}
        </p>

        {outOfStock ? (
          <button disabled className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold cursor-not-allowed"
            style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-muted)' }}>
            Sin stock
          </button>
        ) : (
          <ShimmerButton
            onClick={handleAddToCart}
            disabled={adding}
            className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold min-h-[44px] transition-colors duration-200"
            style={{
              backgroundColor: adding ? 'var(--color-primary-dark)' : 'var(--color-primary)',
              color: 'white',
              cursor: adding ? 'default' : 'pointer',
            }}
            shimmerColor="rgba(255,255,255,0.38)"
            aria-label="Agregar al carrito"
          >
            {adding ? '✓ Agregado' : 'Agregar al carrito'}
          </ShimmerButton>
        )}
      </div>
    </motion.article>
  )
}
