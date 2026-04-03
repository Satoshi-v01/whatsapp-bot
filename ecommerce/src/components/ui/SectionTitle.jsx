/**
 * SectionTitle — título de sección reutilizable con línea decorativa naranja
 */
export default function SectionTitle({ title, subtitle, center = false, className = '' }) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : ''} ${className}`}>
      <h2
        className="font-display text-3xl md:text-4xl mb-3"
        style={{ color: 'var(--color-secondary)' }}
      >
        {title}
      </h2>
      {/* Línea decorativa */}
      <div className={`flex ${center ? 'justify-center' : ''} mb-4`}>
        <div
          className="h-1 w-16 rounded-full"
          style={{ backgroundColor: 'var(--color-primary)' }}
          aria-hidden="true"
        />
      </div>
      {subtitle && (
        <p className="text-brand-muted text-lg max-w-2xl" style={center ? { margin: '0 auto' } : {}}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
