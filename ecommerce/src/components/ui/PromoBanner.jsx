/**
 * PromoBanner — tira marquee animada debajo del HeroBanner.
 * Texto en loop infinito con separadores de patita.
 */

const ITEMS = [
  'Envío a domicilio',
  'Productos originales',
  'Pago en efectivo y transferencia',
  'Asunción y Gran Asunción',
  'Asesoramiento personalizado',
  'Más de 5 años de confianza',
]

const PAW = (
  <svg
    viewBox="0 0 100 100"
    width="14"
    height="14"
    fill="currentColor"
    aria-hidden="true"
    style={{ display: 'inline-block', flexShrink: 0 }}
  >
    <ellipse cx="50" cy="65" rx="24" ry="20" />
    <circle cx="22" cy="38" r="11" />
    <circle cx="42" cy="26" r="11" />
    <circle cx="62" cy="26" r="11" />
    <circle cx="78" cy="38" r="11" />
  </svg>
)

// Duplicamos los items para el loop sin corte
const TRACK = [...ITEMS, ...ITEMS, ...ITEMS]

export default function PromoBanner() {
  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: 'var(--color-primary)',
        overflow: 'hidden',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>{`
        @keyframes marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.333%); }
        }
        .marquee-track {
          display: flex;
          align-items: center;
          white-space: nowrap;
          animation: marquee-scroll 28s linear infinite;
          will-change: transform;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="marquee-track">
        {TRACK.map((item, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              paddingRight: '32px',
              color: 'white',
              fontSize: '12px',
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {PAW}
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
