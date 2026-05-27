import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useBanners } from '@/hooks/useBanners'

const STATS = [
  { value: '+1.000', label: 'clientes satisfechos' },
  { value: 'Envíos', label: 'a todo el país' },
  { value: '100%',  label: 'garantía' },
]

const GRADIENT_FALLBACKS = [
  'linear-gradient(135deg, #3d2c1e 0%, #6b4c35 60%, #ffa601 100%)',
  'linear-gradient(135deg, #1e3a3d 0%, #2d6b4c 60%, #3d9b6c 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #3d2c1e 50%, #ffa601 100%)',
]

function ArrowBtn({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === 'prev' ? 'Banner anterior' : 'Banner siguiente'}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(61,44,30,0.15)',
        background: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
        fontSize: 18, lineHeight: 1, color: 'var(--color-text)', flexShrink: 0,
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.color = 'var(--color-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(61,44,30,0.15)'; e.currentTarget.style.color = 'var(--color-text)' }}
    >
      {dir === 'prev' ? '‹' : '›'}
    </button>
  )
}

export default function HeroBanner() {
  const { banners, loading } = useBanners()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = banners.length

  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total])
  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total])

  useEffect(() => {
    if (paused || total === 0) return
    const t = setInterval(next, 6000)
    return () => clearInterval(t)
  }, [paused, next, total])

  useEffect(() => { setCurrent(0) }, [total])

  if (loading) {
    return (
      <div style={{ minHeight: 440, background: 'var(--color-bg-elevated)', maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, padding: '48px clamp(24px, 4vw, 56px)', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ width: 160, height: 28, borderRadius: 999, background: 'var(--color-border)' }} className="animate-pulse" />
          <div style={{ width: '90%', height: 80, borderRadius: 10, background: 'var(--color-border)' }} className="animate-pulse" />
          <div style={{ width: '75%', height: 48, borderRadius: 10, background: 'var(--color-border)' }} className="animate-pulse" />
          <div style={{ width: 220, height: 46, borderRadius: 999, background: 'var(--color-border)' }} className="animate-pulse" />
        </div>
        <div style={{ height: 340, borderRadius: 18, background: 'var(--color-border)' }} className="animate-pulse" />
      </div>
    )
  }

  if (total === 0) return null

  const slide = banners[current]

  return (
    <section
      aria-label="Banner promocional"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: 'var(--color-bg)', overflow: 'hidden' }}
    >
      {/* ── Editorial split ── */}
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: 'clamp(32px, 4vw, 56px) clamp(24px, 4vw, 56px)' }}>
      <div className="hero-grid" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.3fr',
        alignItems: 'stretch',
        gap: 'clamp(32px, 3vw, 56px)',
        minHeight: 440,
      }}>
        {/* ── Left: editorial copy ── */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0, position: 'relative', zIndex: 2 }}>

          {/* Badge */}
          {slide.badge && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
              background: 'var(--color-primary)', color: '#fff',
              padding: '6px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase', marginBottom: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
              {slide.badge}
            </div>
          )}

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontSize: 'clamp(32px, 4.5vw, 64px)',
            lineHeight: 0.95,
            color: 'var(--color-text)',
            margin: '0 0 18px',
            letterSpacing: -1,
            maxWidth: 520,
          }}>
            {slide.titulo}
          </h1>

          {/* Subtitulo */}
          {slide.subtitulo && (
            <p style={{
              fontSize: 'clamp(14px, 1.4vw, 17px)',
              lineHeight: 1.55,
              color: 'rgba(61,44,30,0.75)',
              maxWidth: 420,
              margin: '0 0 28px',
            }}>
              {slide.subtitulo}
            </p>
          )}

          {/* Botones */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 36 }}>
            {slide.cta_texto && (
              <Link
                to={slide.cta_url ?? '/'}
                className="btn-primary"
                style={{ boxShadow: '0 6px 0 rgba(217,139,0,0.5)', fontFamily: 'Montserrat, system-ui, sans-serif' }}
              >
                {slide.cta_texto}
              </Link>
            )}
            <Link
              to="/categoria/perros"
              className="btn-outline"
            >
              Ver catálogo
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 'clamp(16px, 3vw, 32px)', flexWrap: 'wrap' }}>
            {STATS.map(s => (
              <div key={s.label} style={{ fontSize: 13, color: 'rgba(61,44,30,0.7)' }}>
                <strong style={{ color: 'var(--color-text)', fontFamily: 'Montserrat, system-ui, sans-serif' }}>{s.value}</strong>{' '}{s.label}
              </div>
            ))}
          </div>

          {/* Navegacion entre slides */}
          {total > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28 }}>
              <ArrowBtn dir="prev" onClick={prev} />
              <div style={{ display: 'flex', gap: 6 }}>
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    aria-label={`Slide ${i + 1}`}
                    style={{
                      width: i === current ? 24 : 8, height: 8,
                      borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
                      background: i === current ? 'var(--color-primary)' : 'rgba(61,44,30,0.2)',
                      transition: 'width 0.25s ease, background 0.25s ease',
                    }}
                  />
                ))}
              </div>
              <ArrowBtn dir="next" onClick={next} />
            </div>
          )}
        </div>

        {/* ── Right: image ── */}
        <div style={{ position: 'relative', minHeight: 280 }}>

          {/* Image or gradient fallback */}
          {slide.imagen_url ? (
            <img
              src={slide.imagen_url}
              alt={slide.titulo}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18, display: 'block', minHeight: 280 }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', minHeight: 280, borderRadius: 18, background: GRADIENT_FALLBACKS[current % GRADIENT_FALLBACKS.length] }} />
          )}

          {/* Floating promo badge */}
          {slide.badge && (
            <div style={{
              position: 'absolute', bottom: 20, left: 20,
              background: '#fff', borderRadius: 10,
              padding: '12px 16px', boxShadow: '0 8px 24px rgba(61,44,30,0.14)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                %
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'rgba(61,44,30,0.6)', lineHeight: 1 }}>Oferta especial</div>
                <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2, marginTop: 2 }}>{slide.badge}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
          }
          .hero-grid > div:last-child {
            display: none;
          }
        }
      `}</style>
    </section>
  )
}
