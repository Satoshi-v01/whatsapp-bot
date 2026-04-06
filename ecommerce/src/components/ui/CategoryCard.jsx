import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const ICONS = {
  perros: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <ellipse cx="32" cy="40" rx="18" ry="14" />
      <circle cx="32" cy="22" r="12" />
      <ellipse cx="22" cy="13" rx="6" ry="9" transform="rotate(-15 22 13)" />
      <ellipse cx="42" cy="13" rx="6" ry="9" transform="rotate(15 42 13)" />
      <ellipse cx="32" cy="26" rx="3" ry="2" fill="white" opacity="0.5" />
    </svg>
  ),
  gatos: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <ellipse cx="32" cy="42" rx="16" ry="13" />
      <circle cx="32" cy="24" r="13" />
      <polygon points="20,14 14,2 26,10" />
      <polygon points="44,14 50,2 38,10" />
      <polygon points="32,27 30,30 34,30" fill="white" opacity="0.5" />
      <path d="M48 42 Q58 30 55 20" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  ),
  medicamentos: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <rect x="24" y="8" width="16" height="48" rx="8" />
      <rect x="8" y="24" width="48" height="16" rx="8" />
    </svg>
  ),
  accesorios: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <rect x="18" y="28" width="28" height="8" rx="4" />
      <circle cx="14" cy="24" r="7" />
      <circle cx="14" cy="40" r="7" />
      <circle cx="50" cy="24" r="7" />
      <circle cx="50" cy="40" r="7" />
    </svg>
  ),
  cuidado: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <path d="M32 10 C20 10 10 20 10 30 C10 48 32 58 32 58 C32 58 54 48 54 30 C54 20 44 10 32 10Z" />
      <path d="M32 22 C27 22 22 27 22 32 C22 40 32 46 32 46 C32 46 42 40 42 32 C42 27 37 22 32 22Z" fill="white" opacity="0.35" />
    </svg>
  ),
  ofertas: (
    <svg width="36" height="36" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">
      <path d="M8 8 L40 8 L56 32 L40 56 L8 56 Z" />
      <circle cx="20" cy="20" r="4" fill="white" opacity="0.7" />
      <text x="20" y="46" fontSize="20" fontWeight="bold" fill="white" opacity="0.9">%</text>
    </svg>
  ),
}

export default function CategoryCard({ slug, label, description, color = '#ffa601', bg = '#fff8e6', count }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -5, scale: 1.03 }}
    >
      <Link
        to={`/categoria/${slug}`}
        aria-label={`Ver categoria ${label}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 20,
          overflow: 'hidden',
          textDecoration: 'none',
          background: '#ffffff',
          border: `1.5px solid ${color}28`,
          boxShadow: `0 4px 20px ${color}14`,
          transition: 'box-shadow 0.2s, border-color 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 8px 32px ${color}30`
          e.currentTarget.style.borderColor = `${color}55`
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = `0 4px 20px ${color}14`
          e.currentTarget.style.borderColor = `${color}28`
        }}
      >
        {/* Cabecera coloreada con ícono */}
        <div style={{
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 16px 22px',
          position: 'relative',
        }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: `0 6px 20px ${color}55`,
          }}>
            {ICONS[slug] ?? ICONS.perros}
          </div>
        </div>

        {/* Texto */}
        <div style={{
          padding: '14px 18px 18px',
          textAlign: 'center',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <p style={{
            margin: 0,
            fontFamily: "'Poppins', sans-serif",
            fontSize: 15,
            fontWeight: 700,
            color: '#1a1208',
            letterSpacing: '-0.2px',
          }}>
            {label}
          </p>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: '#8b6f47',
            lineHeight: 1.4,
          }}>
            {description}
          </p>
          {count !== undefined && (
            <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color }}>
              {count} productos
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}
