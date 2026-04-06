import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/formatPrice'
import StockBadge from './StockBadge'
import ShimmerButton from './ShimmerButton'

function PlaceholderImage({ nombre }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-2"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-primary)' }}
    >
      <svg width="48" height="48" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
        <ellipse cx="50" cy="65" rx="24" ry="20" />
        <circle cx="22" cy="38" r="11" />
        <circle cx="42" cy="26" r="11" />
        <circle cx="62" cy="26" r="11" />
        <circle cx="78" cy="38" r="11" />
      </svg>
      <span
        className="text-xs font-body text-center px-2 leading-tight"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {nombre}
      </span>
    </div>
  )
}

function AddToCartButton({ stock, onClick }) {
  const [adding, setAdding] = useState(false)

  async function handleClick(e) {
    e.preventDefault()
    if (!stock || adding) return
    setAdding(true)
    await onClick()
    setTimeout(() => setAdding(false), 700)
  }

  if (stock === 0) {
    return (
      <button
        disabled
        className="w-full py-3 rounded-xl text-sm font-bold font-body cursor-not-allowed min-h-[44px]"
        style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-muted)' }}
      >
        Sin stock
      </button>
    )
  }

  return (
    <ShimmerButton
      onClick={handleClick}
      disabled={adding}
      className="w-full py-3 rounded-xl text-sm font-bold font-body min-h-[44px] transition-colors duration-200"
      style={{
        backgroundColor: adding ? 'var(--color-primary-dark)' : 'var(--color-primary)',
        color: 'white',
        cursor: adding ? 'default' : 'pointer',
      }}
      shimmerColor="rgba(255,255,255,0.38)"
      shimmerDuration="2.2s"
      aria-label="Agregar al carrito"
    >
      {adding ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Agregado
        </>
      ) : (
        'Agregar al carrito'
      )}
    </ShimmerButton>
  )
}

export default function ProductCard({ product, onAddToCart }) {
  const { nombre, precio_venta, stock, imagen_url, es_novedad, slug } = product
  const outOfStock = stock === 0

  // ── Spotlight cursor-tracking ──────────────────────────────
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
    e.currentTarget.style.boxShadow = 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.8)'
  }, [])

  return (
    <motion.article
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onMouseEnter={e => {
        if (!outOfStock) e.currentTarget.style.boxShadow = 'var(--shadow-card-hover), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={outOfStock ? {} : { y: -4 }}
      className="relative flex flex-col rounded-2xl overflow-hidden border h-full"
      style={{
        '--sx': '-400px',
        '--sy': '-400px',
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        borderWidth: '1.5px',
        boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.8)',
        opacity: outOfStock ? 0.72 : 1,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
    >
      {/* ── Spotlight glow ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={{
          background: 'radial-gradient(420px circle at var(--sx) var(--sy), rgba(255,166,1,0.12), transparent 65%)',
        }}
      />

      {/* ── Badge novedad ── */}
      {es_novedad && (
        <div
          className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          NUEVO
        </div>
      )}

      {/* ── Imagen ── */}
      <Link
        to={`/producto/${slug}`}
        className="block cursor-pointer relative z-[2] group/img"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div
          className="w-full overflow-hidden relative"
          style={{ aspectRatio: '1 / 1', backgroundColor: 'var(--color-bg)' }}
        >
          {imagen_url ? (
            <img
              src={imagen_url}
              alt={nombre}
              className="w-full h-full object-cover transition-transform duration-350 group-hover/img:scale-107"
              style={{ transition: 'transform 0.35s ease' }}
              loading="lazy"
            />
          ) : (
            <PlaceholderImage nombre={nombre} />
          )}
          {/* Overlay lupa al hacer hover */}
          {imagen_url && (
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-250"
              style={{
                backgroundColor: 'rgba(26,18,8,0.28)',
                backdropFilter: 'blur(1px)',
                transition: 'opacity 0.25s ease',
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  <line x1="11" y1="8" x2="11" y2="14" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </Link>

      {/* ── Contenido ── */}
      <div className="flex flex-col gap-2 p-4 flex-1 relative z-[2]">
        <StockBadge stock={stock} />

        <Link
          to={`/producto/${slug}`}
          className="font-body font-semibold text-sm leading-snug cursor-pointer hover:underline decoration-primary/50"
          style={{ color: 'var(--color-text)' }}
        >
          {nombre}
        </Link>

        <p
          className="font-display text-xl mt-auto"
          style={{ color: 'var(--color-primary)' }}
          aria-label={`Precio: ${formatPrice(precio_venta)}`}
        >
          {formatPrice(precio_venta)}
        </p>

        <AddToCartButton
          stock={stock}
          onClick={() => onAddToCart?.(product)}
        />
      </div>
    </motion.article>
  )
}
