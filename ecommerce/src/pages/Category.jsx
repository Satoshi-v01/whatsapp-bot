import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'
import SectionTitle from '@/components/ui/SectionTitle'
import ProductGrid from '@/components/ui/ProductGrid'
import { useProducts } from '@/hooks/useProducts'
import { CATEGORIES } from '@/constants/categories'

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevancia' },
  { value: 'precio_asc', label: 'Menor precio' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'nombre', label: 'Nombre A-Z' },
]

const PAGE_SIZE = 12

function FilterBar({ soloDisponibles, onToggleDisponibles, sort, onSort }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-6 border-b" style={{ borderColor: 'var(--color-border)' }}>

      {/* Toggle "Solo disponibles" */}
      <button
        type="button"
        role="switch"
        aria-checked={soloDisponibles}
        onClick={() => onToggleDisponibles(!soloDisponibles)}
        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer border"
        style={{
          backgroundColor: soloDisponibles ? 'var(--color-primary)' : 'transparent',
          color: soloDisponibles ? 'white' : 'var(--color-text-muted)',
          borderColor: soloDisponibles ? 'var(--color-primary)' : 'var(--color-border)',
        }}
      >
        <span
          className="w-2 h-2 rounded-full transition-colors duration-200"
          style={{ backgroundColor: soloDisponibles ? 'white' : 'var(--color-text-faint)' }}
          aria-hidden="true"
        />
        Solo disponibles
      </button>

      {/* Pill buttons de ordenamiento */}
      <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Ordenar productos">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSort(opt.value)}
            aria-pressed={sort === opt.value}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 cursor-pointer border"
            style={{
              backgroundColor: sort === opt.value ? 'var(--color-secondary)' : 'transparent',
              color: sort === opt.value ? 'white' : 'var(--color-text-muted)',
              borderColor: sort === opt.value ? 'var(--color-secondary)' : 'var(--color-border)',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginacion" className="flex justify-center gap-2 mt-10">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
        aria-label="Pagina anterior"
      >
        Anterior
      </button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
          className="w-10 h-10 rounded-xl text-sm font-bold transition-all duration-150"
          style={{
            backgroundColor: p === page ? 'var(--color-primary)' : 'var(--color-bg-card)',
            border: `1px solid ${p === page ? 'var(--color-primary)' : 'var(--color-border)'}`,
            color: p === page ? 'white' : 'var(--color-text)',
          }}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-40"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text)',
        }}
        aria-label="Pagina siguiente"
      >
        Siguiente
      </button>
    </nav>
  )
}

export default function Category() {
  const { slug } = useParams()
  const [page, setPage] = useState(1)
  const [soloDisponibles, setSoloDisponibles] = useState(true)
  const [sort, setSort] = useState('relevancia')

  const category = CATEGORIES.find(c => c.slug === slug)

  const params = useMemo(() => ({
    categoria: slug,
    solo_disponibles: soloDisponibles,
    sort,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  }), [slug, soloDisponibles, sort, page])

  const { products, loading, error, total } = useProducts(params)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleToggleDisponibles(val) {
    setSoloDisponibles(val)
    setPage(1)
  }

  function handleSort(val) {
    setSort(val)
    setPage(1)
  }

  const pageTitle = category?.label ?? slug
  const pageDescription = category?.description ?? `Productos de la categoria ${slug}`

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
      />

      <main>
        {/* Breadcrumb */}
        <nav
          aria-label="Ruta de navegacion"
          className="container-base px-4 md:px-6 pt-6 pb-2"
        >
          <ol className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <li>
              <Link
                to="/"
                className="transition-colors duration-150 hover:underline"
                style={{ color: 'var(--color-primary)' }}
              >
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">&#47;</li>
            <li aria-current="page" style={{ color: 'var(--color-text)' }}>
              {pageTitle}
            </li>
          </ol>
        </nav>

        <section className="section-padding !pt-6">
          <div className="container-base">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SectionTitle
                title={pageTitle}
                subtitle={pageDescription}
              />
            </motion.div>

            <FilterBar
              soloDisponibles={soloDisponibles}
              onToggleDisponibles={handleToggleDisponibles}
              sort={sort}
              onSort={handleSort}
            />

            {/* Contador de resultados */}
            {!loading && !error && (
              <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
                {total} {total === 1 ? 'producto' : 'productos'} encontrados
              </p>
            )}

            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              skeletonCount={PAGE_SIZE}
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              onPage={setPage}
            />
          </div>
        </section>
      </main>
    </>
  )
}
