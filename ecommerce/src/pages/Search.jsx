import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import SEOHead from '@/components/seo/SEOHead'
import ProductGrid from '@/components/ui/ProductGrid'
import { useProducts } from '@/hooks/useProducts'

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

          {/* Sin query */}
          {!q && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#8b6f47' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#ffa601" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600 }}>Ingresa una busqueda en el navbar</p>
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

              {/* Paginacion */}
              {totalPages > 1 && (
                <nav aria-label="Paginacion" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40, flexWrap: 'wrap' }}>
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                    style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid rgba(255,166,1,0.2)', background: '#fff', color: '#1a1208', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.38 : 1, fontSize: 13, fontWeight: 600 }}>
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${p === page ? '#ffa601' : 'rgba(255,166,1,0.2)'}`, background: p === page ? '#ffa601' : '#fff', color: p === page ? '#fff' : '#1a1208', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                    style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid rgba(255,166,1,0.2)', background: '#fff', color: '#1a1208', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.38 : 1, fontSize: 13, fontWeight: 600 }}>
                    Siguiente
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}
