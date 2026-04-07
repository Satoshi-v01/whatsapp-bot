import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import HeroProductCard from './HeroProductCard'
import { useCart } from '@/hooks/useCart'

// ─── Helpers de tamano por breakpoint ────────────────────
// Se calcula via CSS custom property en el wrapper
const SLIDE_STYLE = {
  flex: '0 0 var(--slide-size, 72%)',
  minWidth: 0,
}

function SkeletonCard() {
  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden',
      border: '1px solid rgba(255,166,1,0.12)', background: '#fff',
    }}>
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#f5f0e8', animation: 'pulse 1.5s infinite' }} />
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 14, borderRadius: 6, background: '#f0e8d8', width: '65%' }} />
        <div style={{ height: 12, borderRadius: 6, background: '#f5f0e8', width: '90%' }} />
        <div style={{ height: 20, borderRadius: 6, background: '#f0e8d8', width: '45%', marginTop: 4 }} />
        <div style={{ height: 40, borderRadius: 12, background: '#f5e6c0' }} />
      </div>
    </div>
  )
}

function Arrow({ onClick, disabled, dir }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Anterior' : 'Siguiente'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 44, height: 44, borderRadius: '50%', border: '1.5px solid rgba(255,166,1,0.3)',
        background: disabled ? '#f5f0e8' : hover ? '#ffa601' : '#fff',
        color: disabled ? '#c4a882' : hover ? '#fff' : '#1a1208',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.18s', flexShrink: 0,
        boxShadow: disabled ? 'none' : '0 2px 12px rgba(255,166,1,0.18)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'prev'
          ? <polyline points="15 18 9 12 15 6" />
          : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  )
}

function Dot({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ir a slide"
      style={{
        width: active ? 24 : 8, height: 8, borderRadius: 4, border: 'none', padding: 0,
        background: active ? '#ffa601' : 'rgba(255,166,1,0.25)',
        cursor: 'pointer', transition: 'all 0.25s ease',
      }}
    />
  )
}

export default function ProductSlider({ products = [], loading, error, skeletonCount = 5 }) {
  const { addItem } = useCart()

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', dragFree: true })

  const [prevOk, setPrevOk] = useState(false)
  const [nextOk, setNextOk] = useState(true)
  const [snap, setSnap]     = useState(0)
  const [snaps, setSnaps]   = useState([])

  const sync = useCallback(() => {
    if (!emblaApi) return
    setSnap(emblaApi.selectedScrollSnap())
    setPrevOk(emblaApi.canScrollPrev())
    setNextOk(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    setSnaps(emblaApi.scrollSnapList())
    emblaApi.on('select', sync)
    emblaApi.on('reInit', sync)
    sync()
    return () => { emblaApi.off('select', sync); emblaApi.off('reInit', sync) }
  }, [emblaApi, sync])

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi])
  const to   = useCallback(i => emblaApi?.scrollTo(i), [emblaApi])

  const [hero, ...rest] = products

  return (
    <>
      {/* CSS para los breakpoints del slide */}
      <style>{`
        .embla-slide        { flex: 0 0 72%; min-width: 0; }
        .embla-slide-hero   { flex: 0 0 72%; min-width: 0; }
        @media (min-width: 640px)  {
          .embla-slide      { flex: 0 0 calc(50% - 10px); }
          .embla-slide-hero { flex: 0 0 calc(100% - 10px); }
        }
        @media (min-width: 1024px) {
          .embla-slide      { flex: 0 0 calc(25% - 15px); }
          .embla-slide-hero { flex: 0 0 calc(50% - 10px); }
        }
        @keyframes skpulse { 0%,100% { opacity:1 } 50% { opacity:.5 } }
        .sk-pulse { animation: skpulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Slider con flechas a los costados */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Arrow onClick={prev} disabled={!prevOk} dir="prev" />

        <div ref={emblaRef} style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>

            {loading && Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="embla-slide sk-pulse">
                <SkeletonCard />
              </div>
            ))}

            {!loading && !error && hero && (
              <div className="embla-slide-hero">
                <HeroProductCard product={hero} onAddToCart={() => addItem(hero)} />
              </div>
            )}

            {!loading && !error && rest.map((product, i) => (
              <motion.div
                key={product.id}
                className="embla-slide"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <ProductCard product={product} onAddToCart={() => addItem(product)} />
              </motion.div>
            ))}

          </div>
        </div>

        <Arrow onClick={next} disabled={!nextOk} dir="next" />
      </div>

      {/* Dots */}
      {!loading && snaps.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 24 }}>
          {snaps.map((_, i) => (
            <Dot key={i} active={i === snap} onClick={() => to(i)} />
          ))}
        </div>
      )}
    </>
  )
}
