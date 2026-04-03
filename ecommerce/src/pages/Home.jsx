import SEOHead from '@/components/seo/SEOHead'
import HeroBanner from '@/components/ui/HeroBanner'
import CategoryCard from '@/components/ui/CategoryCard'
import ProductGrid from '@/components/ui/ProductGrid'
import SectionTitle from '@/components/ui/SectionTitle'
import WhyUs from '@/components/ui/WhyUs'
import { useCategories } from '@/hooks/useCategories'
import { useProducts } from '@/hooks/useProducts'

function CategoriesSection() {
  const { categories, loading } = useCategories()

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl animate-pulse h-44"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {categories.map(cat => (
        <CategoryCard key={cat.slug} {...cat} />
      ))}
    </div>
  )
}

function FeaturedProducts() {
  const { products, loading, error } = useProducts({
    featured: true,
    limit: 8,
    solo_disponibles: true,
  })

  return (
    <ProductGrid
      products={products}
      loading={loading}
      error={error}
      skeletonCount={8}
    />
  )
}

function NewProducts() {
  const { products, loading, error } = useProducts({
    novedad: true,
    limit: 4,
    solo_disponibles: true,
  })

  if (!loading && products.length === 0) return null

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--color-bg-elevated)' }}>
      <div className="container-base">
        <SectionTitle
          title="Novedades"
          subtitle="Los productos que acaban de llegar a nuestra tienda."
        />
        <ProductGrid
          products={products}
          loading={loading}
          error={error}
          skeletonCount={4}
        />
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <SEOHead />

      <HeroBanner />

      <section className="section-padding" aria-labelledby="categories-title">
        <div className="container-base">
          <SectionTitle
            id="categories-title"
            title="Que estas buscando"
            subtitle="Encontra todo lo que tu mascota necesita."
          />
          <CategoriesSection />
        </div>
      </section>

      <section
        className="section-padding"
        aria-labelledby="featured-title"
        style={{ backgroundColor: 'var(--color-bg-elevated)' }}
      >
        <div className="container-base">
          <SectionTitle
            id="featured-title"
            title="Productos destacados"
            subtitle="Los mas elegidos por las familias paraguayas."
          />
          <FeaturedProducts />
        </div>
      </section>

      <WhyUs />

      <NewProducts />
    </>
  )
}
