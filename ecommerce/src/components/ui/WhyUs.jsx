import { motion } from 'framer-motion'

const REASONS = [
  {
    title: 'Envio a domicilio',
    description: 'Llevamos tus pedidos a cualquier punto de Asuncion y Gran Asuncion.',
  },
  {
    title: 'Productos originales',
    description: 'Solo trabajamos con marcas y distribuidores autorizados. Cero adulteraciones.',
  },
  {
    title: 'Asesoramiento personalizado',
    description: 'Nuestro equipo te ayuda a elegir el mejor alimento segun la raza y edad de tu mascota.',
  },
  {
    title: 'Pagos flexibles',
    description: 'Efectivo, transferencia y proximamente tarjeta. Facilitamos tu compra.',
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.45, ease: 'easeOut' },
  }),
}

export default function WhyUs() {
  return (
    <section
      aria-labelledby="why-us-title"
      className="section-padding"
      style={{ backgroundColor: '#1a1208' }}
    >
      <div className="container-base">
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
          <p style={{ color: 'rgba(255,255,255,0.65)' }} className="text-lg max-w-xl mx-auto">
            Mas de 5 anos siendo la tienda de confianza de las familias paraguayas y sus mascotas.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {REASONS.map((reason, i) => (
            <motion.div
              key={reason.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              className="flex flex-col items-center text-center gap-4 p-6 rounded-2xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                border: '1.5px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              <h3 className="font-display text-lg text-white">
                {reason.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
