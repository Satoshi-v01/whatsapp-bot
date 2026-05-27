import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/formatPrice'

function IconPlus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}
function IconCheck({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}
function IconStar({ size = 13, filled = true }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#ffa601' : 'none'} stroke="#ffa601" strokeWidth="1.5" aria-hidden="true">
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1Z"/>
    </svg>
  )
}
function IconHeart({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/>
    </svg>
  )
}

function PlaceholderImage({ nombre }) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--color-bg-elevated)', color: 'var(--color-primary)' }}>
      <svg width="48" height="48" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
        <ellipse cx="50" cy="65" rx="24" ry="20" />
        <circle cx="22" cy="38" r="11" />
        <circle cx="42" cy="26" r="11" />
        <circle cx="62" cy="26" r="11" />
        <circle cx="78" cy="38" r="11" />
      </svg>
      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>{nombre}</span>
    </div>
  )
}

function AddToCartBtn({ stock, onClick }) {
  const [added, setAdded] = useState(false)

  async function handleClick(e) {
    e.preventDefault()
    if (!stock || added) return
    setAdded(true)
    await onClick()
    setTimeout(() => setAdded(false), 1200)
  }

  if (stock === 0) {
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(61,44,30,0.08)', display: 'grid', placeItems: 'center',
        color: 'var(--color-text-muted)',
      }} title="Sin stock">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      aria-label="Agregar al carrito"
      style={{
        width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: added ? 'var(--color-primary-dark)' : 'var(--color-primary)',
        color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0,
        boxShadow: added ? '0 2px 0 rgba(217,139,0,0.3)' : '0 4px 0 rgba(217,139,0,0.4)',
        transition: 'background 0.2s, box-shadow 0.2s, transform 0.1s',
        transform: added ? 'scale(0.95)' : 'scale(1)',
      }}
    >
      {added ? <IconCheck size={16} /> : <IconPlus size={16} />}
    </button>
  )
}

// Static 4-star display (puede evolucionar cuando el API tenga ratings)
function StarRating({ rating = 4.8, reviews }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <IconStar size={13} />
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{rating}</span>
      {reviews && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>({reviews})</span>}
    </div>
  )
}

export default function ProductCard({ product, onAddToCart, eager = false }) {
  const { nombre, precio_venta, precio_original, stock, imagen_url, es_novedad, slug, marca, rating, reviews } = product
  const [hovered, setHovered] = useState(false)
  const outOfStock = stock === 0

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', borderRadius: 18,
        border: '1px solid rgba(61,44,30,0.06)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', height: '100%',
        transform: hovered && !outOfStock ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered && !outOfStock
          ? '0 12px 28px rgba(61,44,30,0.12)'
          : '0 2px 8px rgba(61,44,30,0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        opacity: outOfStock ? 0.75 : 1,
      }}
    >
      {/* ── Image ── */}
      <Link to={`/producto/${slug}`} tabIndex={-1} aria-hidden="true" style={{ display: 'block', position: 'relative', aspectRatio: '1 / 1', background: 'var(--color-bg-elevated)', overflow: 'hidden', flexShrink: 0 }}>
        {imagen_url ? (
          <img
            src={imagen_url}
            alt={nombre}
            loading={eager ? 'eager' : 'lazy'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
          />
        ) : (
          <PlaceholderImage nombre={nombre} />
        )}

        {/* Badge */}
        {es_novedad && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--color-primary)', color: '#fff',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          }}>
            Nuevo
          </div>
        )}

        {/* Heart */}
        <button
          aria-label="Agregar a favoritos"
          onClick={e => e.preventDefault()}
          style={{
            position: 'absolute', top: 10, right: 10,
            background: '#fff', border: 'none', borderRadius: '50%',
            width: 34, height: 34, cursor: 'pointer', display: 'grid', placeItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)', color: 'var(--color-text-muted)',
          }}
        >
          <IconHeart size={16} />
        </button>
      </Link>

      {/* ── Content ── */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>

        {/* Brand */}
        {marca && (
          <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {marca}
          </div>
        )}

        {/* Name */}
        <Link
          to={`/producto/${slug}`}
          style={{
            fontSize: 14, color: 'var(--color-text)', fontWeight: 700, lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', minHeight: 36, textDecoration: 'none',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {nombre}
        </Link>

        {/* Stars */}
        <StarRating rating={rating ?? 4.8} reviews={reviews} />

        {/* Price + Add to cart */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8, paddingTop: 4 }}>
          <div>
            {precio_original && (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textDecoration: 'line-through', lineHeight: 1 }}>
                {formatPrice(precio_original)}
              </div>
            )}
            <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: -0.3, lineHeight: 1.1 }}>
              {formatPrice(precio_venta)}
            </div>
          </div>
          <AddToCartBtn stock={stock} onClick={() => onAddToCart?.(product)} />
        </div>

        {/* Sin stock label */}
        {outOfStock && (
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 4 }}>
            Sin stock
          </div>
        )}
      </div>
    </article>
  )
}
