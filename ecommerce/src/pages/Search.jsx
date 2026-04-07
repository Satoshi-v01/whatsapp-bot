import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import ProductGrid from '@/components/ui/ProductGrid'
import Pagination from '@/components/ui/Pagination'
import { useProducts } from '@/hooks/useProducts'
import { CATEGORIES } from '@/constants/categories'

const PAGE_SIZE = 20

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const [page, setPage] = useState(1)

  // Reset pagina cuando cambia la query
  useEffect(() => { setPage(1) }, [q])

  const params = useMemo(() => ({
    search: q,
    solo_disponibles: true,
    sort: 'nombre',
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [q, page])

  const { products, loading, error, total } = useProducts(params)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <SEOHead title={q ? `Busqueda: ${q}` : 'Buscar'} />

      <main style={{ background: '#fffbf4', minHeight: '100vh' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 24px 64px' }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <nav aria-label="Breadcrumb">
              <ol style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b6f47', listStyle: 'none', margin: '0 0 14px', padding: 0 }}>
                <li><Link to="/" style={{ color: '#ffa601', textDecoration: 'none', fontWeight: 600 }}>Inicio</Link></li>
                <li style={{ color: '#c4a882' }}>/</li>
                <li style={{ color: '#1a1208', fontWeight: 600 }}>Buscar</li>
              </ol>
            </nav>

            {q ? (
              <>
                <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1208', fontFamily: "'Poppins', sans-serif" }}>
                  Resultados para <span style={{ color: '#ffa601' }}>"{q}"</span>
                </h1>
                {!loading && (
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b6f47' }}>
                    {total === 0 ? 'Sin resultados' : `${total} ${total === 1 ? 'producto' : 'productos'}`}
                  </p>
                )}
              </>
            ) : (
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a1208', fontFamily: "'Poppins', sans-serif" }}>
                Buscar productos
              </h1>
            )}
          </div>

          {/* Sin query — mostrar categorias */}
          {!q && (
            <div>
              <div style={{ textAlign: 'center', padding: '32px 0 24px', color: 'var(--color-text-muted)' }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', opacity: 0.6 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p style={{ fontSize: 15, fontWeight: 600, marginTop: 12, color: 'var(--color-text)' }}>Ingresa una busqueda</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>o explora nuestras categorias</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                {CATEGORIES.map(cat => (
                  <Link
                    key={cat.slug}
                    to={`/categoria/${cat.slug}`}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 10, padding: '20px 12px', borderRadius: 16, textDecoration: 'none',
                      background: cat.bg, border: `1.5px solid ${cat.color}28`,
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 6px 20px ${cat.color}22` }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: cat.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 3px 10px ${cat.color}40` }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: cat.color, textAlign: 'center' }}>{cat.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Resultados */}
          {q && (
            <>
              <ProductGrid products={products} loading={loading} error={error} skeletonCount={PAGE_SIZE} heroFirst={false} />

              {/* Sin resultados */}
              {!loading && total === 0 && (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ fontSize: 15, color: '#8b6f47', marginBottom: 16 }}>
                    No encontramos productos para <strong>"{q}"</strong>
                  </p>
                  <Link to="/" style={{ color: '#ffa601', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                    Ver todos los productos
                  </Link>
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              />
            </>
          )}
        </div>
      </main>
    </>
  )
}
