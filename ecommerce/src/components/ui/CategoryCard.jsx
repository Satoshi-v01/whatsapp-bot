import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

// SVG icons por categoria — sin dependencias externas
const CATEGORY_ICONS = {
  perros: (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      {/* Cuerpo */}
      <ellipse cx="32" cy="40" rx="18" ry="14" />
      {/* Cabeza */}
      <circle cx="32" cy="22" r="12" />
      {/* Orejas */}
      <ellipse cx="22" cy="13" rx="6" ry="9" transform="rotate(-15 22 13)" />
      <ellipse cx="42" cy="13" rx="6" ry="9" transform="rotate(15 42 13)" />
      {/* Nariz */}
      <ellipse cx="32" cy="26" rx="3" ry="2" fill="white" opacity="0.6" />
    </svg>
  ),
  gatos: (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      {/* Cuerpo */}
      <ellipse cx="32" cy="42" rx="16" ry="13" />
      {/* Cabeza */}
      <circle cx="32" cy="24" r="13" />
      {/* Orejas puntiagudas */}
      <polygon points="20,14 14,2 26,10" />
      <polygon points="44,14 50,2 38,10" />
      {/* Nariz */}
      <polygon points="32,27 30,30 34,30" fill="white" opacity="0.6" />
      {/* Cola */}
      <path d="M48 42 Q58 30 55 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  ),
  accesorios: (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      {/* Hueso */}
      <rect x="18" y="28" width="28" height="8" rx="4" />
      <circle cx="14" cy="24" r="7" />
      <circle cx="14" cy="40" r="7" />
      <circle cx="50" cy="24" r="7" />
      <circle cx="50" cy="40" r="7" />
    </svg>
  ),
  ofertas: (
    <svg width="32" height="32" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      {/* Etiqueta de precio */}
      <path d="M8 8 L40 8 L56 32 L40 56 L8 56 Z" />
      <circle cx="20" cy="20" r="4" fill="white" opacity="0.7" />
      {/* Signo % */}
      <text x="22" y="44" fontSize="18" fontWeight="bold" fill="white" opacity="0.9">%</text>
    </svg>
  ),
}

function CategoryIcon({ slug, color }) {
  const icon = CATEGORY_ICONS[slug]
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
      style={{ backgroundColor: `${color}18`, color }}
      aria-hidden="true"
    >
      {icon ?? (
        // Fallback: pata genérica
        <svg width="32" height="32" viewBox="0 0 100 100" fill="currentColor">
          <ellipse cx="50" cy="65" rx="24" ry="20" />
          <circle cx="22" cy="38" r="11" />
          <circle cx="42" cy="26" r="11" />
          <circle cx="62" cy="26" r="11" />
          <circle cx="78" cy="38" r="11" />
        </svg>
      )}
    </div>
  )
}

/**
 * CategoryCard
 * Props: { slug, label, description, color, count? }
 */
export default function CategoryCard({ slug, label, description, color = '#ffa601', count }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.02 }}
    >
      <Link
        to={`/categoria/${slug}`}
        className="group flex flex-col items-center text-center gap-4 p-6 rounded-2xl border transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-sm)',
          textDecoration: 'none',
          display: 'flex',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = 'var(--shadow-card-hover)'
          e.currentTarget.style.borderColor = 'var(--color-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          e.currentTarget.style.borderColor = 'var(--color-border)'
        }}
        aria-label={`Ver categoria ${label}`}
      >
        <CategoryIcon slug={slug} color={color} />

        <div>
          <h3
            className="font-display text-xl mb-1"
            style={{ color: 'var(--color-text)' }}
          >
            {label}
          </h3>
          <p className="text-sm leading-snug" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
          {count !== undefined && (
            <p className="text-xs mt-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
              {count} productos
            </p>
          )}
        </div>

        <span
          className="text-sm font-bold transition-all duration-200 group-hover:translate-x-1"
          style={{ color: 'var(--color-primary)' }}
          aria-hidden="true"
        >
          Ver todo &#8594;
        </span>
      </Link>
    </motion.div>
  )
}
