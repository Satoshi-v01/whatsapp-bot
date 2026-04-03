import { motion } from 'framer-motion'
import SpotlightCard from './SpotlightCard'

// ── Íconos SVG para cada razón ───────────────────────────────
const IconTruck = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <path d="M16 8h4l3 5v4h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
)

const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
)

const IconChat = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <line x1="9" y1="10" x2="15" y2="10" />
    <line x1="9" y1="14" x2="13" y2="14" />
  </svg>
)

const IconCard = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
    <line x1="6" y1="16" x2="10" y2="16" />
    <line x1="14" y1="16" x2="18" y2="16" />
  </svg>
)

const REASONS = [
  {
    icon: IconTruck,
    title: 'Envio a domicilio',
    description: 'Llevamos tus pedidos a cualquier punto de Asuncion y Gran Asuncion.',
    accent: '#ffa601',
  },
  {
    icon: IconShield,
    title: 'Productos originales',
    description: 'Solo trabajamos con marcas y distribuidores autorizados. Cero adulteraciones.',
    accent: '#3d9b6c',
  },
  {
    icon: IconChat,
    title: 'Asesoramiento personalizado',
    description: 'Nuestro equipo te ayuda a elegir el mejor alimento segun la raza y edad de tu mascota.',
    accent: '#6b8cff',
  },
  {
    icon: IconCard,
    title: 'Pagos flexibles',
    description: 'Efectivo, transferencia y proximamente tarjeta. Facilitamos tu compra.',
    accent: '#e08900',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const cardVariants = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function WhyUs() {
  return (
    <section
      aria-labelledby="why-us-title"
      className="section-padding"
      style={{ backgroundColor: '#1a1208' }}
    >
      <div className="container-base">
        {/* Encabezado */}
        <div className="text-center mb-12">
          <h2
            id="why-us-title"
            className="font-display text-3xl md:text-4xl mb-3 text-white"
          >
            Por que elegirnos
          </h2>
          <div className="flex justify-center mb-4">
            <div
              className="h-1 w-16 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
              aria-hidden="true"
            />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.6)' }} className="text-lg max-w-xl mx-auto">
            Mas de 5 anos siendo la tienda de confianza de las familias paraguayas y sus mascotas.
          </p>
        </div>

        {/* Cards con Spotlight */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {REASONS.map((reason) => {
            const Icon = reason.icon
            return (
              <motion.div key={reason.title} variants={cardVariants}>
                <SpotlightCard
                  className="h-full rounded-2xl"
                  color={`${reason.accent}20`}
                  radius={360}
                  style={{
                    border: '1.5px solid rgba(255,255,255,0.10)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.18)',
                  }}
                >
                  <div
                    className="flex flex-col items-center text-center gap-4 p-6 h-full rounded-[inherit]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.055)' }}
                  >
                    {/* Ícono con fondo coloreado */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${reason.accent}22`,
                        color: reason.accent,
                        boxShadow: `0 0 0 1px ${reason.accent}30`,
                      }}
                    >
                      <Icon />
                    </div>

                    <h3 className="font-display text-lg text-white leading-snug">
                      {reason.title}
                    </h3>

                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>
                      {reason.description}
                    </p>
                  </div>
                </SpotlightCard>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
