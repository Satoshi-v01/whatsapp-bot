import { motion } from 'framer-motion'
import ProductCard from './ProductCard'
import HeroProductCard from './HeroProductCard'
import { useCart } from '@/hooks/useCart'

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden border animate-pulse" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
      <div className="w-full bg-gray-200" style={{ aspectRatio: '1/1' }} />
      <div className="p-4 flex flex-col gap-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-6 bg-gray-200 rounded w-1/2 mt-auto" />
        <div className="h-10 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

function SkeletonHero() {
  return (
    <div className="col-span-2 rounded-2xl overflow-hidden border animate-pulse" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
      <div className="w-full bg-gray-200" style={{ aspectRatio: '2/1' }} />
    </div>
  )
}

function EmptyState({ message = 'No hay productos disponibles.' }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p style={{ color: 'var(--color-text-muted)' }} className="text-lg">
        {message}
      </p>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p style={{ color: 'var(--color-danger)' }} className="text-lg">
        {message}
      </p>
    </div>
  )
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

/**
 * ProductGrid — muestra el primer producto como card hero (2 columnas)
 * y el resto en grid normal 2/3/4 columnas.
 *
 * Props:
 *   heroFirst — si es true (default), el primer producto ocupa 2 columnas
 */
export default function ProductGrid({ products = [], loading, error, skeletonCount = 8, heroFirst = true }) {
  const { addItem } = useCart()

  const [hero, ...rest] = products
  const showHero = heroFirst && !loading && !error && hero

  return (
    <motion.div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="list"
      aria-label="Listado de productos"
    >
      {loading && (
        <>
          <SkeletonHero />
          {Array.from({ length: skeletonCount - 1 }).map((_, i) => (
            <div key={i} role="listitem"><SkeletonCard /></div>
          ))}
        </>
      )}

      {!loading && error && <ErrorState message={error} />}

      {!loading && !error && products.length === 0 && <EmptyState />}

      {showHero && (
        <div className="col-span-2" role="listitem">
          <HeroProductCard
            product={hero}
            onAddToCart={() => addItem(hero)}
          />
        </div>
      )}

      {!loading && !error && (showHero ? rest : products).map(product => (
        <div key={product.id} role="listitem">
          <ProductCard
            product={product}
            onAddToCart={() => addItem(product)}
          />
        </div>
      ))}
    </motion.div>
  )
}
