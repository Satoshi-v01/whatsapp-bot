import { motion } from 'framer-motion'

/**
 * SectionTitle — título de sección con animación de entrada y
 * línea decorativa estilo 21st.dev (gradiente que se expande al entrar en vista).
 */
export default function SectionTitle({ title, subtitle, center = false, id, className = '' }) {
  return (
    <motion.div
      className={`mb-6 ${center ? 'text-center' : ''} ${className}`}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <h2
        id={id}
        className="font-display text-3xl md:text-4xl mb-3"
        style={{ color: 'var(--color-secondary)' }}
      >
        {title}
      </h2>

      {/* Línea decorativa con gradiente animado */}
      <div className={`flex ${center ? 'justify-center' : ''} mb-4`} aria-hidden="true">
        <motion.div
          className="h-1 rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--color-primary) 0%, rgba(255,166,1,0.4) 65%, transparent 100%)',
          }}
          initial={{ width: 0, opacity: 0 }}
          whileInView={{ width: '4rem', opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.15 }}
        />
      </div>

      {subtitle && (
        <p className="text-brand-muted text-lg max-w-2xl" style={center ? { margin: '0 auto' } : {}}>
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}
