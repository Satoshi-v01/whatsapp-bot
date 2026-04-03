import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'

// 5 patitas con posiciones y rotaciones distintas
const PAWS = [
  { x: '12%',  y: '20%', size: 48, rotate: -20,  delay: 0 },
  { x: '78%',  y: '15%', size: 36, rotate: 30,   delay: 0.15 },
  { x: '60%',  y: '55%', size: 28, rotate: -10,  delay: 0.3 },
  { x: '22%',  y: '65%', size: 40, rotate: 15,   delay: 0.1 },
  { x: '85%',  y: '70%', size: 32, rotate: -35,  delay: 0.25 },
]

const PAW_SVG = (
  <svg viewBox="0 0 100 100" fill="currentColor" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
    <ellipse cx="50" cy="65" rx="24" ry="20" />
    <circle cx="22" cy="38" r="11" />
    <circle cx="42" cy="26" r="11" />
    <circle cx="62" cy="26" r="11" />
    <circle cx="78" cy="38" r="11" />
  </svg>
)

export default function NotFound() {
  return (
    <>
      <SEOHead title="Pagina no encontrada" noindex />

      <main
        className="relative flex flex-col items-center justify-center min-h-[72vh] px-4 text-center overflow-hidden"
        style={{ userSelect: 'none' }}
      >
        {/* Patitas decorativas de fondo */}
        {PAWS.map((p, i) => (
          <motion.div
            key={i}
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.4, rotate: p.rotate - 20 }}
            animate={{ opacity: 1, scale: 1, rotate: p.rotate }}
            transition={{ delay: p.delay, duration: 0.6, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              color: 'var(--color-primary)',
              opacity: 0.13,
              pointerEvents: 'none',
            }}
          >
            {PAW_SVG}
          </motion.div>
        ))}

        {/* Número grande */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="font-display font-black leading-none mb-2"
          style={{
            fontSize: 'clamp(7rem, 20vw, 14rem)',
            color: 'var(--color-primary)',
            opacity: 0.15,
            letterSpacing: '-0.05em',
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          404
        </motion.div>

        {/* Contenido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col items-center gap-4 relative z-10"
          style={{ marginTop: '-2rem' }}
        >
          {/* Ícono */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
            style={{ backgroundColor: 'var(--color-primary-light)' }}
            aria-hidden="true"
          >
            <svg width="32" height="32" viewBox="0 0 100 100" fill="var(--color-primary)">
              <ellipse cx="50" cy="65" rx="24" ry="20" />
              <circle cx="22" cy="38" r="11" />
              <circle cx="42" cy="26" r="11" />
              <circle cx="62" cy="26" r="11" />
              <circle cx="78" cy="38" r="11" />
            </svg>
          </div>

          <h1
            className="font-display text-2xl md:text-3xl"
            style={{ color: 'var(--color-secondary)' }}
          >
            ¡Ups! Esta página se la comió el perro
          </h1>

          <p
            className="text-base max-w-sm leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No pudimos encontrar lo que buscabas. Volvé al inicio y encontrá todo lo que tu mascota necesita.
          </p>

          <Link to="/" className="btn-primary mt-2">
            Volver al inicio
          </Link>
        </motion.div>
      </main>
    </>
  )
}
