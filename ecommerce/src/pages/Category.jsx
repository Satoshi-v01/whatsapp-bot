import { useState, useMemo, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'
import ProductGrid from '@/components/ui/ProductGrid'
import PriceRangeSlider from '@/components/ui/PriceRangeSlider'
import { useProducts } from '@/hooks/useProducts'
import { useSubcategories } from '@/hooks/useSubcategories'
import { CATEGORIES } from '@/constants/categories'
import api from '@/services/api'

const SORT_OPTIONS = [
  { value: 'mas_vendido', label: 'Mas vendidos' },
  { value: 'precio_asc',  label: 'Menor precio' },
  { value: 'precio_desc', label: 'Mayor precio' },
  { value: 'nombre',      label: 'A - Z' },
]

const PAGE_SIZE = 16

// ─── SubcatChip ──────────────────────────────────────────
function SubcatChip({ sub, active, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: '9px 16px', borderRadius: 99,
        border: `2px solid ${active ? color : color + '28'}`,
        background: active ? bg : '#fff',
        cursor: 'pointer', transition: 'all 0.15s',
        boxShadow: active ? `0 3px 12px ${color}22` : 'none',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? color : '#8b6f47', whiteSpace: 'nowrap' }}>
        {sub.label ?? sub.nombre}
      </span>
    </button>
  )
}

// ─── Divider ─────────────────────────────────────────────
function Divider({ color }) {
  return <div style={{ height: 1, background: `${color}18`, margin: '4px 0' }} />
}

// ─── FilterPanel ─────────────────────────────────────────
function FilterPanel({ marcas, marcaId, onMarca, precioMin, precioMax, low, high, onPrecio, onClear, color, activeFilters }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1208' }}>Filtros</span>
          {activeFilters > 0 && (
            <span style={{ background: color, color: '#fff', borderRadius: 99, fontSize: 10, fontWeight: 800, padding: '2px 8px', lineHeight: '16px' }}>
              {activeFilters}
            </span>
          )}
        </div>
        {activeFilters > 0 && (
          <button
            onClick={onClear}
            style={{ fontSize: 12, color: color, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Limpiar todo
          </button>
        )}
      </div>

      {/* Precio */}
      {precioMax > precioMin && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b6f47', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>
            Rango de precio
          </p>
          <PriceRangeSlider min={precioMin} max={precioMax} low={low} high={high} onChange={onPrecio} />
          <Divider color={color} />
          <div style={{ marginTop: 16 }} />
        </>
      )}

      {/* Marcas */}
      {marcas.length > 0 && (
        <>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#8b6f47', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Marca
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {marcas.map(m => {
              const checked = marcaId === String(m.id)
              return (
                <label
                  key={m.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '7px 10px', borderRadius: 10, background: checked ? `${color}0f` : 'transparent', transition: 'background 0.15s' }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? color : '#ddd'}`,
                    background: checked ? color : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.15s',
                  }}>
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <input
                    type="checkbox" checked={checked}
                    onChange={() => onMarca(checked ? '' : String(m.id))}
                    style={{ display: 'none' }}
                  />
                  <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: checked ? '#1a1208' : '#8b6f47' }}>
                    {m.nombre}
                  </span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Paginacion ──────────────────────────────────────────
function Pagination({ page, totalPages, onPage, color }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  return (
    <nav aria-label="Paginacion" style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 40, flexWrap: 'wrap' }}>
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid rgba(255,166,1,0.2)', background: '#fff', color: '#1a1208', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.38 : 1, fontSize: 13, fontWeight: 600 }}>
        Anterior
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPage(p)}
          style={{ width: 40, height: 40, borderRadius: 10, border: `1.5px solid ${p === page ? color : 'rgba(255,166,1,0.2)'}`, background: p === page ? color : '#fff', color: p === page ? '#fff' : '#1a1208', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {p}
        </button>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid rgba(255,166,1,0.2)', background: '#fff', color: '#1a1208', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.38 : 1, fontSize: 13, fontWeight: 600 }}>
        Siguiente
      </button>
    </nav>
  )
}

// ─── Pagina ───────────────────────────────────────────────
export default function Category() {
  const { slug }   = useParams()
  const category   = CATEGORIES.find(c => c.slug === slug)
  const color      = category?.color ?? '#ffa601'
  const bg         = category?.bg    ?? '#fff8e6'

  const { subcategories: subcats } = useSubcategories(slug)

  const [subcatId,    setSubcatId]    = useState(null)
  const [marcaId,     setMarcaId]     = useState('')
  const [sort,        setSort]        = useState('mas_vendido')
  const [page,        setPage]        = useState(1)
  const [filterOpen,  setFilterOpen]  = useState(false)

  const [marcas,    setMarcas]    = useState([])
  const [precioMin, setPrecioMin] = useState(0)
  const [precioMax, setPrecioMax] = useState(0)
  const [low,       setLow]       = useState(0)
  const [high,      setHigh]      = useState(0)
  const [loadingFiltros, setLoadingFiltros] = useState(true)

  useEffect(() => {
    setLoadingFiltros(true)
    api.get('/api/ecommerce/filtros', { params: { categoria: slug } })
      .then(({ data }) => {
        setMarcas(data.marcas ?? [])
        setPrecioMin(data.precio_min); setPrecioMax(data.precio_max)
        setLow(data.precio_min);       setHigh(data.precio_max)
      })
      .catch(() => {})
      .finally(() => setLoadingFiltros(false))
  }, [slug])

  // Reset filtros al cambiar categoria
  useEffect(() => { setSubcatId(null); setMarcaId(''); setPage(1) }, [slug])

  const handlePrecio = useCallback((l, h) => { setLow(l); setHigh(h); setPage(1) }, [])

  function clearFilters() {
    setMarcaId(''); setSubcatId(null); setLow(precioMin); setHigh(precioMax); setPage(1)
  }

  const activeFilters = (marcaId ? 1 : 0) + (low > precioMin || high < precioMax ? 1 : 0)

  const params = useMemo(() => {
    const p = { categoria: slug, solo_disponibles: true, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }
    if (subcatId)         p.subcategoria_id = subcatId
    if (marcaId)          p.marca_id        = marcaId
    if (low  > precioMin) p.precio_min      = low
    if (high < precioMax) p.precio_max      = high
    return p
  }, [slug, subcatId, marcaId, sort, page, low, high, precioMin, precioMax])

  const { products, loading, error, total } = useProducts(params)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const pageTitle = category?.label ?? slug

  const hasSidebar = !loadingFiltros && (marcas.length > 0 || precioMax > precioMin)

  return (
    <>
      <SEOHead title={pageTitle} description={category?.description} />

      <style>{`
        @media (min-width: 1024px) {
          .cat-sidebar-desktop { display: block !important; }
          .cat-filter-btn-mobile { display: none !important; }
        }
      `}</style>

      <main style={{ background: '#fffbf4', minHeight: '100vh' }}>

        {/* Breadcrumb */}
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px 0' }}>
          <nav aria-label="Breadcrumb">
            <ol style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b6f47', listStyle: 'none', margin: 0, padding: 0 }}>
              <li><Link to="/" style={{ color, textDecoration: 'none', fontWeight: 600 }}>Inicio</Link></li>
              <li style={{ color: '#c4a882' }}>/</li>
              <li style={{ color: '#1a1208', fontWeight: 600 }}>{pageTitle}</li>
              {subcatId && <>
                <li style={{ color: '#c4a882' }}>/</li>
                <li style={{ color: '#1a1208' }}>{subcats.find(s => s.id === subcatId)?.nombre}</li>
              </>}
            </ol>
          </nav>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '18px 24px 64px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 16px ${color}40`, fontSize: 24 }}>
              {slug === 'perros' ? '🐕' : slug === 'gatos' ? '🐈' : slug === 'ofertas' ? '🏷️' : slug === 'medicamentos' ? '💊' : slug === 'cuidado' ? '🧴' : '🛍️'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1a1208', fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.3px' }}>{pageTitle}</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#8b6f47' }}>{category?.description}</p>
            </div>
          </div>

          {/* Subcategorias */}
          {subcats.length > 0 && (
            <div style={{ marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SubcatChip sub={{ slug: '', label: 'Todos' }} active={subcatId === null} color={color} bg={bg} onClick={() => { setSubcatId(null); setPage(1) }} />
                {subcats.map(s => (
                  <SubcatChip key={s.id} sub={s} active={subcatId === s.id} color={color} bg={bg}
                    onClick={() => { setSubcatId(subcatId === s.id ? null : s.id); setPage(1) }} />
                ))}
              </div>
            </div>
          )}

          {/* Layout principal */}
          <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

            {/* Sidebar filtros — desktop */}
            {hasSidebar && (
              <div style={{
                width: 232, flexShrink: 0, background: '#fff', borderRadius: 18,
                padding: '20px 18px', border: '1.5px solid rgba(255,166,1,0.14)',
                boxShadow: '0 2px 16px rgba(255,166,1,0.07)',
                position: 'sticky', top: 24,
                display: 'none', // hidden on mobile — toggled below
              }}
                className="cat-sidebar-desktop"
              >
                <FilterPanel
                  marcas={marcas} marcaId={marcaId} onMarca={v => { setMarcaId(v); setPage(1) }}
                  precioMin={precioMin} precioMax={precioMax} low={low} high={high} onPrecio={handlePrecio}
                  activeFilters={activeFilters} onClear={clearFilters} color={color}
                />
              </div>
            )}

            {/* Main */}
            <div style={{ flex: 1, minWidth: 0 }}>

              {/* Barra de controles */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                <p style={{ fontSize: 13, color: '#8b6f47', margin: 0 }}>
                  {loading ? 'Cargando...' : `${total} ${total === 1 ? 'producto' : 'productos'}`}
                </p>
                <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Boton filtros (siempre visible, opens panel below) */}
                  {hasSidebar && (
                    <button
                      onClick={() => setFilterOpen(v => !v)}
                      className="cat-filter-btn-mobile"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${activeFilters > 0 ? color : 'rgba(255,166,1,0.25)'}`, background: activeFilters > 0 ? color : '#fff', color: activeFilters > 0 ? '#fff' : '#8b6f47', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                      </svg>
                      Filtros {activeFilters > 0 && `(${activeFilters})`}
                    </button>
                  )}
                  {SORT_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => { setSort(opt.value); setPage(1) }}
                      style={{ padding: '7px 14px', borderRadius: 99, border: `1.5px solid ${sort === opt.value ? color : 'rgba(255,166,1,0.2)'}`, background: sort === opt.value ? color : '#fff', color: sort === opt.value ? '#fff' : '#8b6f47', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panel de filtros desplegable */}
              <AnimatePresence>
                {filterOpen && hasSidebar && (
                  <motion.div
                    key="filter-panel"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ background: '#fff', borderRadius: 16, padding: '20px 20px 24px', border: `1.5px solid ${color}20`, boxShadow: `0 4px 20px ${color}10` }}>
                      <FilterPanel
                        marcas={marcas} marcaId={marcaId} onMarca={v => { setMarcaId(v); setPage(1) }}
                        precioMin={precioMin} precioMax={precioMax} low={low} high={high} onPrecio={handlePrecio}
                        activeFilters={activeFilters} onClear={clearFilters} color={color}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <ProductGrid products={products} loading={loading} error={error} skeletonCount={PAGE_SIZE} heroFirst={false} />

              <Pagination page={page} totalPages={totalPages} color={color}
                onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
