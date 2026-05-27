import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'

const TILE_PALETTE = [
  { bg: '#ffa601' },
  { bg: '#f59200' },
  { bg: '#ffb733' },
  { bg: '#e8960a' },
  { bg: '#ffc34d' },
  { bg: '#ff9a00' },
]

const PAW_SVG = (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }} aria-hidden="true">
    <ellipse cx="50" cy="65" rx="24" ry="20" fill="currentColor" />
    <circle cx="22" cy="38" r="11" fill="currentColor" />
    <circle cx="42" cy="26" r="11" fill="currentColor" />
    <circle cx="62" cy="26" r="11" fill="currentColor" />
    <circle cx="78" cy="38" r="11" fill="currentColor" />
  </svg>
)

function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function TilePaws({ tileIndex }) {
  const COUNT = 6
  const configs = Array.from({ length: COUNT }, (_, i) => {
    const seed = tileIndex * 100 + i
    const r1 = seededRandom(seed * 3)
    const r2 = seededRandom(seed * 3 + 1)
    const r3 = seededRandom(seed * 3 + 2)
    return {
      size:     14 + r1 * 20,
      leftPct:  5 + r2 * 85,
      duration: 7 + r3 * 7,
      delay:    -(r1 * (7 + r3 * 7)),
    }
  })

  return (
    <>
      {configs.map((cfg, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${cfg.leftPct}%`,
            width: cfg.size,
            height: cfg.size,
            color: 'rgba(61,44,30,0.22)',
            opacity: 0,
            animation: `riseTilePaw ${cfg.duration}s ${cfg.delay}s linear infinite`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        >
          {PAW_SVG}
        </div>
      ))}
    </>
  )
}

function CategoryTile({ cat, palette, tileIndex }) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      to={`/categoria/${cat.slug}`}
      aria-label={`Ver ${cat.label}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden',
        background: palette.bg,
        color: 'var(--color-text)',
        padding: 24, display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between', minHeight: 220,
        textDecoration: 'none', cursor: 'pointer',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered ? '0 12px 32px rgba(61,44,30,0.16)' : '0 4px 12px rgba(61,44,30,0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Paws — contenidas en su propio overflow:hidden para no romper el layout */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 1, pointerEvents: 'none' }}>
        <TilePaws tileIndex={tileIndex} />
      </div>

      {/* Text */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <h3 style={{
          fontFamily: 'Montserrat, system-ui, sans-serif',
          fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 800,
          margin: 0, letterSpacing: -0.3,
          color: 'var(--color-text)',
        }}>{cat.label}</h3>
        {cat.description && (
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4, maxWidth: 160, lineHeight: 1.4 }}>{cat.description}</div>
        )}
      </div>

      {/* Imagen esquina inferior derecha */}
      {cat.imagen_url && (
        <div style={{
          position: 'absolute', right: 0, bottom: 0,
          width: 220, height: 220,
          pointerEvents: 'none', zIndex: 2,
        }}>
          <img
            src={cat.imagen_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
          />
        </div>
      )}

      {/* Explorar */}
      <div style={{
        position: 'relative', zIndex: 3, alignSelf: 'flex-start',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
        padding: '8px 14px', borderRadius: 999,
        fontSize: 13, fontWeight: 700,
        color: 'var(--color-text)',
        border: '1px solid rgba(61,44,30,0.1)',
        marginTop: 16,
      }}>
        Explorar →
      </div>
    </Link>
  )
}

export default function CategoryTiles() {
  const { categories, loading } = useCategories()
  const tiles = loading ? [] : categories.slice(0, 3)

  return (
    <section style={{ padding: 'clamp(32px, 4vw, 48px) clamp(20px, 4vw, 48px)', background: 'var(--color-bg)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Inter, system-ui, sans-serif' }}>
            Bienvenidos a Sosa BULLS
          </div>
          <h2 style={{
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontSize: 'clamp(28px, 4vw, 52px)',
            fontWeight: 900, lineHeight: 1, margin: 0,
            color: 'var(--color-text)', letterSpacing: -0.5, maxWidth: 620,
          }}>
            Todo lo que tu mascota necesita,{' '}
            <span style={{ color: 'var(--color-primary)' }}>en un solo lugar</span>.
          </h2>
        </div>
        <Link
          to="/categoria/perros"
          style={{
            color: 'var(--color-text)', fontWeight: 700, fontSize: 14,
            textDecoration: 'none', borderBottom: '2px solid var(--color-primary)',
            paddingBottom: 2, whiteSpace: 'nowrap', fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Ver todas las categorias →
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ minHeight: 220, borderRadius: 18, background: 'var(--color-bg-elevated)' }} className="animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="cat-tiles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {tiles.map((cat, i) => (
            <CategoryTile key={cat.slug} cat={cat} palette={TILE_PALETTE[i] ?? TILE_PALETTE[0]} tileIndex={i} />
          ))}
        </div>
      )}

      <style>{`
        @keyframes riseTilePaw {
          0%   { opacity: 0;   transform: translateY(300px) rotate(0deg); }
          12%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { opacity: 0;   transform: translateY(-300px) rotate(720deg); }
        }
        @media (max-width: 640px) {
          .cat-tiles-grid { grid-template-columns: 1fr 1fr !important; }
          .cat-tiles-grid > *:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 400px) {
          .cat-tiles-grid { grid-template-columns: 1fr !important; }
          .cat-tiles-grid > *:last-child { grid-column: auto; }
        }
      `}</style>
    </section>
  )
}
