import { Link } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://sosabulls.com.py'

const nosotrosSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'AboutPage',
      '@id': `${SITE_URL}/nosotros#webpage`,
      url: `${SITE_URL}/nosotros`,
      name: 'Nosotros — Sosa BULLS',
      description: 'Conoce la historia de Sosa BULLS, fundada por Osvaldo Sosa en Lambare, Paraguay. Tienda de alimentos balanceados y accesorios para mascotas con delivery a todo el pais.',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      breadcrumb: { '@id': `${SITE_URL}/nosotros#breadcrumb` },
      inLanguage: 'es-PY',
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE_URL}/nosotros#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Nosotros', item: `${SITE_URL}/nosotros` },
      ],
    },
  ],
}

const STATS = [
  { n: '10+', l: 'años en el mercado' },
  { n: '+1.000', l: 'clientes satisfechos' },
  { n: '+500', l: 'productos en stock' },
]

const VALUES = [
  {
    t: 'Calidad sin atajos',
    d: 'Trabajamos solo con distribuidores autorizados. Cero adulteraciones, siempre stock verificado.',
  },
  {
    t: 'Atención personalizada',
    d: 'Conocemos a nuestros clientes por su nombre y el de su mascota. Recomendamos lo que realmente funciona.',
  },
  {
    t: 'Delivery a todo el país',
    d: 'Entregamos en Asunción, Departamento Central y todo Paraguay. Rápido, seguro y al mejor precio.',
  },
]

export default function Nosotros() {
  return (
    <>
      <SEOHead
        title="Nosotros"
        description="Conocé la historia de Sosa BULLS. Fundada por Osvaldo Sosa en Lambaré, Paraguay. Tienda de alimentos balanceados y accesorios para mascotas con delivery a todo el país."
        schema={nosotrosSchema}
      />

      <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
        {/* Breadcrumb */}
        <div style={{ padding: '16px clamp(20px, 4vw, 48px) 0', maxWidth: 1400, margin: '0 auto' }}>
          <nav aria-label="Ruta de navegación" style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}>Inicio</Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span style={{ color: 'var(--color-text)' }}>Nosotros</span>
          </nav>
        </div>

        {/* Hero strip */}
        <div style={{
          margin: 'clamp(16px, 2vw, 20px) clamp(20px, 4vw, 48px)',
          padding: 'clamp(36px, 5vw, 56px) clamp(24px, 4vw, 48px)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(135deg, var(--color-secondary) 0%, #3d2c1e 100%)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ maxWidth: 620, position: 'relative', zIndex: 2 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, letterSpacing: 2,
              color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 12,
            }}>
              Nuestra historia
            </div>
            <h1 style={{
              fontFamily: 'Montserrat, system-ui, sans-serif',
              fontWeight: 800, fontSize: 'clamp(32px, 5vw, 52px)',
              lineHeight: 1.05, margin: 0, letterSpacing: -0.8, color: '#fff',
            }}>
              Pasión por las mascotas, <span style={{ color: 'var(--color-primary)' }}>desde siempre</span>.
            </h1>
            <p style={{ fontSize: 'clamp(14px, 2vw, 17px)', lineHeight: 1.55, opacity: 0.85, marginTop: 18, maxWidth: 520 }}>
              Sosa BULLS nació en Lambaré con un objetivo claro: que cada perro, gato y mascota del Paraguay tenga acceso a productos de calidad y atención cercana.
            </p>
          </div>
          <div style={{
            position: 'absolute', right: -60, bottom: -60,
            width: 280, height: 280, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          <div style={{
            position: 'absolute', right: 20, bottom: -30,
            width: 180, height: 180, borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }} />
        </div>

        {/* Stats row */}
        <div style={{
          padding: '20px clamp(20px, 4vw, 48px)',
          maxWidth: 1400, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
        }}>
          {STATS.map(s => (
            <div key={s.l} style={{
              background: 'var(--color-bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: 24,
              border: '1px solid var(--color-border)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{
                fontFamily: 'Montserrat, system-ui, sans-serif',
                fontWeight: 800, fontSize: 'clamp(28px, 3vw, 36px)',
                color: 'var(--color-primary)', letterSpacing: -0.5,
              }}>{s.n}</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Story */}
        <div style={{
          padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 48px)',
          maxWidth: 1400, margin: '0 auto',
        }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{
              fontSize: 12, fontWeight: 800, letterSpacing: 2,
              color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 10,
            }}>La historia</div>
            <h2 style={{
              fontFamily: 'Montserrat, system-ui, sans-serif',
              fontWeight: 800, fontSize: 'clamp(24px, 3vw, 36px)',
              margin: '0 0 16px', letterSpacing: -0.4,
            }}>
              De un local en Lambaré a todo el país
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-muted)' }}>
              Todo empezó en 2014 cuando Osvaldo Sosa comenzó a vender alimentos balanceados en el Barrio San Rafael de Lambaré. Lo que arrancó como un emprendimiento familiar fue creciendo de a poco, de cliente en cliente, de mascota en mascota. Para 2018 ya éramos una tienda formal con local propio, stock propio y, sobre todo, reputación ganada de verdad.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-muted)', marginTop: 12 }}>
              Lo que nos diferenciaba desde el primer día era simple: conocer a cada cliente por su nombre y al de su mascota, recomendar lo que de verdad funcionaba, y nunca vender algo que nosotros no les daríamos a nuestros propios animales. Esa filosofía no cambió.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: 'var(--color-text-muted)', marginTop: 12 }}>
              Hoy hacemos delivery a Asunción, todo el Departamento Central y a cualquier punto del Paraguay. Pero seguimos siendo la misma tienda de barrio que te atiende con confianza: cada mascota merece lo mejor.
            </p>
          </div>
        </div>

        {/* Values */}
        <div style={{ padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 48px) clamp(40px, 5vw, 60px)', maxWidth: 1400, margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'Montserrat, system-ui, sans-serif',
            fontWeight: 800, fontSize: 'clamp(24px, 3vw, 32px)',
            margin: '0 0 24px', letterSpacing: -0.4, textAlign: 'center',
          }}>
            Lo que nos mueve
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            {VALUES.map(v => (
              <div key={v.t} style={{
                background: 'var(--color-bg-card)',
                borderRadius: 'var(--radius-lg)',
                padding: 28,
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--radius)',
                  background: 'var(--color-bg-elevated)',
                  display: 'grid', placeItems: 'center',
                  marginBottom: 14,
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontWeight: 800, fontSize: 19, marginBottom: 8 }}>{v.t}</div>
                <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--color-text-muted)' }}>{v.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 clamp(20px, 4vw, 48px) clamp(48px, 6vw, 80px)', maxWidth: 1400, margin: '0 auto' }}>
          <div style={{
            background: 'var(--color-primary)',
            color: '#fff',
            padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 48px)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24, flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontWeight: 800, fontSize: 'clamp(18px, 2.5vw, 26px)', letterSpacing: -0.3 }}>
                ¿Querés conocernos en persona?
              </div>
              <div style={{ fontSize: 14, opacity: 0.92, marginTop: 6 }}>
                Visitanos en nuestra tienda física o escribinos por WhatsApp.
              </div>
            </div>
            <Link
              to="/contacto"
              style={{
                background: 'var(--color-secondary)',
                color: '#fff',
                padding: '14px 28px',
                borderRadius: 'var(--radius-pill)',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 15,
                letterSpacing: 0.4,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Ir a contacto
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
