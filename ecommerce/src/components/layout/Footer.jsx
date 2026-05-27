import { Link } from 'react-router-dom'
import { NAV_LINKS } from '@/constants/categories'

const SOCIAL_LINKS = [
  {
    label: 'WhatsApp',
    href: 'https://wa.me/595982211934',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://instagram.com/sosabulls',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@sosabulls',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
      </svg>
    ),
  },
]

function isOpen() {
  const now = new Date()
  const dt  = new Date(now.toLocaleString('en-US', { timeZone: 'America/Asuncion' }))
  const day  = dt.getDay()
  const mins = dt.getHours() * 60 + dt.getMinutes()
  if (day >= 1 && day <= 5 && mins >= 540 && mins < 1140) return 'weekday'
  if (day === 6 && mins >= 480 && mins < 1140) return 'saturday'
  return null
}

const OPEN_STATUS = isOpen()

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer style={{ backgroundColor: '#3d2c1e' }}>
      <div className="container-base section-padding" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Logo + descripcion + sociales */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Sosa BULLS"
                width={40}
                height={40}
                style={{ borderRadius: 10, objectFit: 'contain' }}
              />
              <span className="font-display font-bold text-lg text-white" style={{ letterSpacing: '-0.3px' }}>
                Sosa <span style={{ color: 'var(--color-primary)' }}>BULLS</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Tu tienda de confianza para productos de mascotas.
              Calidad, precios justos y entrega a domicilio.
            </p>
            <div className="flex gap-3 mt-2">
              {SOCIAL_LINKS.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h3 className="font-display text-lg text-white mb-4">Categorias</h3>
            <nav aria-label="Navegacion del footer - categorias">
              <ul className="flex flex-col gap-2">
                {NAV_LINKS.map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      to={path}
                      className="text-sm transition-colors duration-200"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Empresa */}
          <div>
            <h3 className="font-display text-lg text-white mb-4">Empresa</h3>
            <nav aria-label="Navegacion del footer - empresa">
              <ul className="flex flex-col gap-2">
                {[
                  { label: 'Nosotros', path: '/nosotros' },
                  { label: 'Contacto', path: '/contacto' },
                ].map(({ label, path }) => (
                  <li key={path}>
                    <Link
                      to={path}
                      className="text-sm transition-colors duration-200"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-primary)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Contacto + horarios */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-white mb-1">Contacto</h3>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <li>Barrio San Rafael, Lambare, PY</li>
              <li><a href="tel:+595972108110" style={{ color: 'inherit', textDecoration: 'none' }}>+595 972 108 110</a></li>
            </ul>

            {/* Horarios */}
            <ul className="flex flex-col gap-1 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {[
                { day: 'Lun – Vie', time: '9:00 – 19:00', open: OPEN_STATUS === 'weekday' },
                { day: 'Sabados',   time: '8:00 – 19:00', open: OPEN_STATUS === 'saturday' },
                { day: 'Domingos',  time: 'Cerrado',       open: false, closed: true },
              ].map(({ day, time, open, closed }) => (
                <li key={day} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '5px 0', borderBottom: '1px solid rgba(255,166,1,0.08)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {day}
                    {open && (
                      <span style={{
                        display: 'inline-block', padding: '1px 8px',
                        background: 'rgba(37,211,102,0.14)', color: '#25d366',
                        borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        Abierto
                      </span>
                    )}
                  </span>
                  <span style={{ fontWeight: closed ? 400 : 700, fontStyle: closed ? 'italic' : 'normal', color: closed ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.85)' }}>
                    {time}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA WhatsApp */}
            <a
              href="https://wa.me/595982211934?text=Hola%2C%20me%20interesa%20un%20producto%20de%20Sosa%20BULLS"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 mt-1"
              style={{
                backgroundColor: '#25D366',
                color: 'white',
                boxShadow: '0 4px 16px rgba(37,211,102,0.35)',
                width: 'fit-content',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(37,211,102,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,0.35)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Escribinos por WhatsApp
            </a>
          </div>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="container-base px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
            &copy; {year} Sosa <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>BULLS</span>. Todos los derechos reservados.
          </p>
          <p className="text-xs font-body" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Desarrollado por <span style={{ color: 'rgba(255,255,255,0.55)' }}>Satoshi</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
