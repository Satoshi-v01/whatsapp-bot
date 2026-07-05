import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatPrice } from '@/utils/formatPrice'
import { useShopConfig } from '@/hooks/useShopConfig'

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

  if (!stock || stock === 0) {
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

export default function ProductCard({ product, onAddToCart, eager = false }) {
  const { nombre, imagen_url, es_novedad, slug, marca, presentaciones = [], tiene_stock } = product
  const { mostrarSinStock } = useShopConfig()

  const [hovered, setHovered] = useState(false)
  const [selectedPres, setSelectedPres] = useState(() => presentaciones.find(p => p.stock > 0) || presentaciones[0] || null)

  const precio = selectedPres?.precio_venta || product.precio_desde || 0
  const stock = selectedPres?.stock || 0
  const imagenActual = selectedPres?.imagen_url || imagen_url
  // tiene_stock viene del backend; fallback al cálculo local
  const hayStock = tiene_stock ?? presentaciones.some(p => p.stock > 0)
  const outOfStock = !hayStock

  const cartItem = selectedPres ? {
    id: selectedPres.id,
    nombre: presentaciones.length > 1 ? `${nombre} — ${selectedPres.nombre}` : nombre,
    precio_venta: selectedPres.precio_venta,
    stock: selectedPres.stock,
    imagen_url: imagenActual,
    slug,
    marca,
  } : null

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
      {/* ── Imagen ── */}
      <Link to={`/producto/${slug}`} tabIndex={-1} aria-hidden="true" style={{ display: 'block', position: 'relative', aspectRatio: '1 / 1', background: '#fff', overflow: 'hidden', flexShrink: 0 }}>
        {imagenActual ? (
          <img
            key={imagenActual}
            src={imagenActual}
            alt={nombre}
            loading={eager ? 'eager' : 'lazy'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }}
          />
        ) : (
          <PlaceholderImage nombre={nombre} />
        )}
        {es_novedad && !outOfStock && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'var(--color-primary)', color: '#fff',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          }}>
            Nuevo
          </div>
        )}
        {outOfStock && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(100,116,139,0.9)', color: '#fff',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 800, letterSpacing: 0.5,
          }}>
            Fuera de stock
          </div>
        )}
      </Link>

      {/* ── Contenido ── */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>

        {marca && (
          <div style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {marca}
          </div>
        )}

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

        {/* Pills de presentaciones */}
        {presentaciones.length > 1 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
            {presentaciones.map(pr => {
              const sinStock = pr.stock === 0
              const seleccionado = selectedPres?.id === pr.id
              return (
                <button
                  key={pr.id}
                  onClick={e => { e.preventDefault(); setSelectedPres(pr) }}
                  disabled={sinStock && !mostrarSinStock}
                  style={{
                    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                    border: `2px solid ${seleccionado ? (sinStock ? '#94a3b8' : 'var(--color-primary)') : 'var(--color-border)'}`,
                    background: seleccionado ? (sinStock ? '#e2e8f0' : 'var(--color-primary)') : 'transparent',
                    color: seleccionado ? (sinStock ? '#64748b' : '#fff') : sinStock ? 'var(--color-text-muted)' : 'var(--color-text)',
                    cursor: (sinStock && !mostrarSinStock) ? 'not-allowed' : 'pointer',
                    opacity: (sinStock && !mostrarSinStock) ? 0.4 : 1,
                    transition: 'all 0.15s',
                    textDecoration: (sinStock && !mostrarSinStock) ? 'line-through' : 'none',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  {pr.nombre}
                </button>
              )
            })}
          </div>
        )}

        {/* Precio + agregar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', gap: 8, paddingTop: 4 }}>
          <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 19, fontWeight: 800, color: 'var(--color-text)', letterSpacing: -0.3, lineHeight: 1.1 }}>
            {formatPrice(precio)}
          </div>
          <AddToCartBtn stock={stock} onClick={() => cartItem && onAddToCart?.(cartItem)} />
        </div>

        {outOfStock && (
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
            Fuera de stock
          </div>
        )}
      </div>
    </article>
  )
}
