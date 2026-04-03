/**
 * FloatingPaws — Patitas animadas idénticas a landing/index.html
 *
 * Animación: suben de abajo (110vh) hacia arriba (-120px) + rotación 720°
 * 18 patitas distribuidas en franjas horizontales iguales
 * Configs generadas a nivel módulo (deterministas, no cambian en re-renders)
 */

const COUNT = 22
const STRIP_W = 100 / COUNT // % de ancho por franja

// Generador pseudo-aleatorio seeded por índice (evita cambios en re-render)
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

// SVG idéntico al de landing
const PAW_SVG = (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }} aria-hidden="true">
    <ellipse cx="50" cy="65" rx="24" ry="20" />
    <circle cx="22" cy="38" r="11" />
    <circle cx="42" cy="26" r="11" />
    <circle cx="62" cy="26" r="11" />
    <circle cx="78" cy="38" r="11" />
  </svg>
)

// Generar configs una sola vez al cargar el módulo
const PAW_CONFIGS = Array.from({ length: COUNT }, (_, i) => {
  const r1 = seededRandom(i * 3)
  const r2 = seededRandom(i * 3 + 1)
  const r3 = seededRandom(i * 3 + 2)

  const size     = 16 + r1 * 44                       // 16–60px
  const leftPct  = i * STRIP_W + r2 * STRIP_W * 0.85  // distribuido en franja
  const duration = 12 + r3 * 16                        // 12–28s
  const delay    = -(r1 * duration)                    // inicio aleatorio

  return { size, leftPct, duration, delay }
})

export default function FloatingPaws() {
  // Respetar prefers-reduced-motion
  if (typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes risePaw {
          0%   { opacity: 0;    transform: translateY(110vh) rotate(0deg); }
          8%   { opacity: .18; }
          88%  { opacity: .18; }
          100% { opacity: 0;    transform: translateY(-120px) rotate(720deg); }
        }
      `}</style>

      {PAW_CONFIGS.map((cfg, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            bottom: 0,
            left: `${cfg.leftPct}%`,
            width: `${cfg.size}px`,
            height: `${cfg.size}px`,
            fill: 'var(--color-primary)',
            opacity: 0,
            animation: `risePaw ${cfg.duration}s ${cfg.delay}s linear infinite`,
          }}
        >
          {PAW_SVG}
        </div>
      ))}
    </div>
  )
}
