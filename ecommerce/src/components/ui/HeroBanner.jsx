import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useBanners } from '@/hooks/useBanners'

const AUTOPLAY_INTERVAL = 5000

const GRADIENT_FALLBACKS = [
  'linear-gradient(135deg, #3d2c1e 0%, #6b4c35 60%, #ffa601 100%)',
  'linear-gradient(135deg, #1e3a3d 0%, #2d6b4c 60%, #3d9b6c 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #3d2c1e 50%, #ffa601 100%)',
]

function SlideContent({ slide, index }) {
  return (
    <motion.div
      key={slide.id}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="absolute inset-0 flex items-center"
    >
      {slide.imagen_url ? (
        <img
          src={slide.imagen_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: GRADIENT_FALLBACKS[index % GRADIENT_FALLBACKS.length] }}
          aria-hidden="true"
        />
      )}

      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.70) 0%, rgba(0,0,0,0.35) 50%, transparent 80%)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 container-base px-6 md:px-8 py-8 max-w-xl">
        {slide.badge && (
          <motion.span
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
            className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            {slide.badge}
          </motion.span>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="font-display text-3xl md:text-4xl lg:text-5xl text-white mb-3 leading-tight"
        >
          {slide.titulo}
        </motion.h1>

        {slide.subtitulo && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="text-white/80 text-base md:text-lg mb-6 leading-relaxed"
          >
            {slide.subtitulo}
          </motion.p>
        )}

        {slide.cta_texto && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <Link
              to={slide.cta_url ?? '/'}
              className="btn-primary text-base px-8 py-3.5 inline-flex items-center gap-2"
            >
              {slide.cta_texto}
              <span aria-hidden="true">&#8594;</span>
            </Link>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

function Dot({ active, onClick, index }) {
  return (
    // Wrapper de 44px para touch target accesible — el punto visual es pequeño
    <button
      onClick={onClick}
      aria-label={`Ir al slide ${index + 1}`}
      aria-current={active ? 'true' : undefined}
      className="flex items-center justify-center cursor-pointer"
      style={{ minWidth: '44px', minHeight: '44px', background: 'none', border: 'none', padding: 0 }}
    >
      <span
        className="transition-all duration-300 rounded-full block"
        style={{
          width: active ? '28px' : '8px',
          height: '8px',
          backgroundColor: active ? 'var(--color-primary)' : 'rgba(255,255,255,0.5)',
        }}
      />
    </button>
  )
}

function ArrowButton({ direction, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'prev' ? 'Slide anterior' : 'Slide siguiente'}
      className="hidden md:flex w-11 h-11 rounded-full items-center justify-center transition-all duration-200"
      style={{
        backgroundColor: 'rgba(255,255,255,0.15)',
        backdropFilter: 'blur(4px)',
        color: 'white',
        border: '1px solid rgba(255,255,255,0.25)',
        fontSize: '20px',
        lineHeight: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)' }}
    >
      {direction === 'prev' ? '\u2039' : '\u203a'}
    </button>
  )
}

export default function HeroBanner() {
  const { banners, loading } = useBanners()
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = banners.length

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + total) % total)
  }, [total])

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total)
  }, [total])

  useEffect(() => {
    if (paused || total === 0) return
    const t = setInterval(next, AUTOPLAY_INTERVAL)
    return () => clearInterval(t)
  }, [paused, next, total])

  useEffect(() => {
    setCurrent(0)
  }, [total])

  if (loading) {
    return (
      <div
        className="w-full animate-pulse"
        style={{
          height: 'clamp(260px, 40vw, 520px)',
          backgroundColor: 'var(--color-border)',
        }}
        aria-busy="true"
        aria-label="Cargando banner"
      />
    )
  }

  if (total === 0) return null

  return (
    <section
      aria-label="Banners promocionales"
      className="relative w-full overflow-hidden"
      style={{ height: 'clamp(280px, 42vw, 520px)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <SlideContent
          key={banners[current].id}
          slide={banners[current]}
          index={current}
        />
      </AnimatePresence>

      <div className="absolute bottom-5 left-0 right-0 z-20 flex items-center justify-center gap-3">
        <ArrowButton direction="prev" onClick={prev} />

        <div className="flex items-center gap-2" role="tablist" aria-label="Slides">
          {banners.map((_, i) => (
            <Dot
              key={i}
              index={i}
              active={i === current}
              onClick={() => setCurrent(i)}
            />
          ))}
        </div>

        <ArrowButton direction="next" onClick={next} />
      </div>
    </section>
  )
}
