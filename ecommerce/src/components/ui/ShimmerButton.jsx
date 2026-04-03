import { motion } from 'framer-motion'

/**
 * ShimmerButton — botón estilo 21st.dev con efecto de brillo animado
 * que cruza la superficie de izquierda a derecha.
 *
 * Props equivalentes a <button> estándar, más:
 *   shimmerColor    — color del brillo  (default: blanco semitransparente)
 *   shimmerDuration — duración del ciclo (default: '2.4s')
 */
export default function ShimmerButton({
  children,
  className = '',
  style = {},
  disabled = false,
  type = 'button',
  shimmerColor = 'rgba(255,255,255,0.42)',
  shimmerDuration = '2.4s',
  onClick,
  'aria-label': ariaLabel,
  ...props
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={disabled ? {} : { scale: 0.96 }}
      className={`relative overflow-hidden ${className}`}
      style={style}
      {...props}
    >
      {/* Shimmer sweep — desactivado cuando el botón está disabled */}
      {!disabled && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-1/3"
          style={{
            background: `linear-gradient(100deg, transparent 20%, ${shimmerColor} 50%, transparent 80%)`,
            animation: `shimmer-sweep ${shimmerDuration} ease-in-out infinite`,
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  )
}
