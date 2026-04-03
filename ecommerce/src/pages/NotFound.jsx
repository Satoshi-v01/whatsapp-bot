import { Link } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'

export default function NotFound() {
  return (
    <>
      <SEOHead title="Pagina no encontrada" noindex />
      <main className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <h1 className="font-display text-4xl md:text-5xl mb-4" style={{ color: 'var(--color-secondary)' }}>
          Pagina no encontrada
        </h1>
        <p className="text-lg mb-8 max-w-md" style={{ color: 'var(--color-text-muted)' }}>
          Esta pagina no existe o fue movida. Volve al inicio y encontra todo lo que tu mascota necesita.
        </p>
        <Link to="/" className="btn-primary">
          Volver al inicio
        </Link>
      </main>
    </>
  )
}
