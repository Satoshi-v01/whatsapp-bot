import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { formatPrice } from '@/utils/formatPrice'
import StockBadge from './StockBadge'

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
    setTimeout(() => setAdding(false), 600)
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
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.96 }}
      className="w-full py-3 rounded-xl text-sm font-bold font-body cursor-pointer transition-all duration-200 min-h-[44px]"
      style={{
        backgroundColor: adding ? 'var(--color-primary-dark)' : 'var(--color-primary)',
        color: 'white',
      }}
      aria-label="Agregar al carrito"
    >
      {adding ? 'Agregado' : 'Agregar al carrito'}
    </motion.button>
  )
}

export default function ProductCard({ product, onAddToCart }) {
  const { nombre, precio_venta, stock, imagen_url, es_novedad, slug } = product
  const outOfStock = stock === 0

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={outOfStock ? {} : { y: -4 }}
      className="relative flex flex-col rounded-2xl overflow-hidden border"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        borderColor: 'var(--color-border)',
        borderWidth: '1.5px',
        boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.8)',
        opacity: outOfStock ? 0.72 : 1,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => {
        if (!outOfStock) e.currentTarget.style.boxShadow = 'var(--shadow-card-hover), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      {es_novedad && (
        <div
          className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          NUEVO
        </div>
      )}

      <Link
        to={`/producto/${slug}`}
        className="block cursor-pointer"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div
          className="w-full overflow-hidden"
          style={{ aspectRatio: '1 / 1', backgroundColor: 'var(--color-bg)' }}
        >
          {imagen_url ? (
            <img
              src={imagen_url}
              alt={nombre}
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
            />
          ) : (
            <PlaceholderImage nombre={nombre} />
          )}
        </div>
      </Link>

      <div className="flex flex-col gap-2 p-4 flex-1">
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
