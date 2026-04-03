import { useRef, useCallback } from 'react'

/**
 * SpotlightCard — wrapper estilo 21st.dev que proyecta un glow radial
 * que sigue la posición del cursor sobre la tarjeta.
 *
 * Props:
 *   children     — contenido de la tarjeta
 *   className    — clases Tailwind adicionales para el wrapper
 *   style        — estilos inline adicionales
 *   color        — color del spotlight (default: amber con 13% opacidad)
 *   radius       — radio del gradiente en px (default: 480)
 */
export default function SpotlightCard({
  children,
  className = '',
  style = {},
  color = 'rgba(255,166,1,0.13)',
  radius = 480,
}) {
  const ref = useRef(null)

  const onMouseMove = useCallback((e) => {
    const el = ref.current
    if (!el) return
    const { left, top } = el.getBoundingClientRect()
    el.style.setProperty('--sx', `${e.clientX - left}px`)
    el.style.setProperty('--sy', `${e.clientY - top}px`)
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--sx', '-400px')
    el.style.setProperty('--sy', '-400px')
  }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`relative ${className}`}
      style={{ '--sx': '-400px', '--sy': '-400px', ...style }}
    >
      {/* Capa spotlight — pointer-events none para no bloquear clicks */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] rounded-[inherit]"
        style={{
          background: `radial-gradient(${radius}px circle at var(--sx) var(--sy), ${color}, transparent 65%)`,
          transition: 'background 0.1s ease',
        }}
      />
      {children}
    </div>
  )
}
