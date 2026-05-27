import { Link } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import HeroBanner from '@/components/ui/HeroBanner'
import CategoryTiles from '@/components/ui/CategoryTiles'
import ProductGrid from '@/components/ui/ProductGrid'
import WhyUs from '@/components/ui/WhyUs'
import { useProducts } from '@/hooks/useProducts'

function FeaturedProductsSection() {
  const { products, loading, error } = useProducts({
    sort: 'destacados',
    limit: 12,
    solo_disponibles: true,
  })

  return (
    <section style={{ padding: 'clamp(32px, 4vw, 48px) clamp(20px, 4vw, 48px)', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <div>
            <h2 style={{
              fontFamily: 'Montserrat, system-ui, sans-serif',
              fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 900,
              margin: 0, letterSpacing: -0.3, color: 'var(--color-text)',
            }}>
              Todos los productos
            </h2>
            {!loading && products.length > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(61,44,30,0.65)', marginTop: 4 }}>{products.length} productos</div>
            )}
          </div>
        </div>

        <ProductGrid
          products={products}
          loading={loading}
          error={error}
          heroFirst={false}
          skeletonCount={8}
        />
      </div>
    </section>
  )
}

function AboutStrip() {
  return (
    <section
      aria-labelledby="about-strip-title"
      style={{
        padding: 'clamp(40px, 5vw, 64px) clamp(20px, 4vw, 48px)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
        }}>
          <Link
            to="/nosotros"
            style={{ textDecoration: 'none', display: 'flex' }}
          >
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(135deg, var(--color-secondary) 0%, #3d2c1e 100%)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(28px, 3vw, 40px)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: 'var(--shadow-md)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-md)'
            }}
            >
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: 2,
                color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Nuestra historia
              </div>
              <h2 id="about-strip-title" style={{
                fontFamily: 'Montserrat, system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(22px, 2.5vw, 30px)',
                color: '#fff',
                margin: '0 0 12px',
                letterSpacing: -0.4,
              }}>
                Cuidando mascotas en Paraguay
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.75)', margin: '0 0 0', maxWidth: 420, flex: 1 }}>
                Empezamos como una tienda de barrio en Lambaré. Hoy somos el referente de balanceados y accesorios para mascotas en la región.
              </p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--color-primary)',
                marginTop: 20,
                alignSelf: 'flex-start',
              }}>
                Conocenos &rarr;
              </span>
              <div style={{
                position: 'absolute', right: -40, bottom: -40,
                width: 200, height: 200, borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                pointerEvents: 'none',
              }} />
            </div>
          </Link>

          <Link
            to="/contacto"
            style={{ textDecoration: 'none', display: 'flex' }}
          >
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--color-primary)',
              borderRadius: 'var(--radius-xl)',
              padding: 'clamp(28px, 3vw, 40px)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              boxShadow: 'var(--shadow-brand)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-3px)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,166,1,0.45)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'var(--shadow-brand)'
            }}
            >
              <div style={{
                fontSize: 12, fontWeight: 800, letterSpacing: 2,
                color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginBottom: 10,
              }}>
                Estamos para ayudarte
              </div>
              <h2 style={{
                fontFamily: 'Montserrat, system-ui, sans-serif',
                fontWeight: 800,
                fontSize: 'clamp(22px, 2.5vw, 30px)',
                color: '#fff',
                margin: '0 0 12px',
                letterSpacing: -0.4,
              }}>
                ¿Tenés alguna pregunta o consulta?
              </h2>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '0 0 0', maxWidth: 420, flex: 1 }}>
                Escribí por WhatsApp, visitá nuestra tienda en Barrio San Rafael, Lambaré, o mandanos un mensaje directo.
              </p>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                background: 'rgba(0,0,0,0.15)',
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                marginTop: 20,
                alignSelf: 'flex-start',
              }}>
                Contactanos &rarr;
              </span>
              <div style={{
                position: 'absolute', right: -40, bottom: -40,
                width: 200, height: 200, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                pointerEvents: 'none',
              }} />
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://sosabulls.com.py'

const homeSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: 'Sosa BULLS — Tienda de Mascotas en Paraguay | Delivery Asuncion y Lambare',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'es-PY',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Donde comprar alimento balanceado para perros en Lambare?',
          acceptedAnswer: { '@type': 'Answer', text: 'Sosa BULLS es la tienda de mascotas en Barrio San Rafael, Lambare, Departamento Central. Vendemos alimentos balanceados para perros y gatos de marcas premium. Tambien hacemos delivery a Asuncion y todo Paraguay.' },
        },
        {
          '@type': 'Question',
          name: 'Hace delivery Sosa BULLS a Asuncion?',
          acceptedAnswer: { '@type': 'Answer', text: 'Si, Sosa BULLS hace delivery a Asuncion, todo el Departamento Central y todo el Paraguay. Podes hacer tu pedido por WhatsApp al +595 982 211 934 o desde nuestra tienda online.' },
        },
        {
          '@type': 'Question',
          name: 'Cuales son los horarios de Sosa BULLS?',
          acceptedAnswer: { '@type': 'Answer', text: 'Atendemos de Lunes a Viernes de 9:00 a 19:00 y los Sabados de 8:00 a 19:00. Los domingos estamos cerrados. Podes escribirnos por WhatsApp al +595 982 211 934.' },
        },
        {
          '@type': 'Question',
          name: 'Como llegar a Sosa BULLS?',
          acceptedAnswer: { '@type': 'Answer', text: 'Nuestra tienda fisica esta en el Barrio San Rafael, Lambare, Paraguay. Podes ver la ubicacion exacta en Google Maps: https://maps.app.goo.gl/PAEox1norUjsNfftV o escribirnos por WhatsApp al +595 982 211 934.' },
        },
      ],
    },
  ],
}

export default function Home() {
  return (
    <>
      <SEOHead
        title="Tienda de Mascotas en Paraguay | Delivery Asuncion y Lambare"
        description="Alimentos balanceados, accesorios y medicamentos para perros y gatos. Envio a domicilio en Asuncion, Gran Asuncion y todo Paraguay. Tienda fisica en Lambare."
        schema={homeSchema}
      />

      {/* 1. Editorial hero banner */}
      <HeroBanner />

      {/* 2. Category tiles */}
      <CategoryTiles />

      {/* 3. Product grid */}
      <FeaturedProductsSection />

      {/* 4. Por que elegirnos */}
      <WhyUs />

      {/* 5. Nosotros + Contacto */}
      <AboutStrip />
    </>
  )
}
