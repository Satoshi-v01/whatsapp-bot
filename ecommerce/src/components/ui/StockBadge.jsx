import { STOCK_THRESHOLDS } from '@/constants/categories'

/**
 * StockBadge — estado de disponibilidad del producto
 * stock > 10    → verde  "Disponible"
 * stock 1-10   → naranja "Últimas unidades" + pulso
 * stock === 0  → rojo   "Sin stock"
 */
export default function StockBadge({ stock, className = '' }) {
  if (stock === null || stock === undefined) return null

  if (stock === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${className}`}
        style={{ backgroundColor: 'rgba(220,38,38,0.12)', color: 'var(--color-danger)' }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
        Sin stock
      </span>
    )
  }

  if (stock <= STOCK_THRESHOLDS.LOW) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse-soft ${className}`}
        style={{ backgroundColor: 'rgba(255,166,1,0.15)', color: 'var(--color-primary-dark)' }}
        aria-label={`Últimas ${stock} unidades disponibles`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
        Últimas unidades
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${className}`}
      style={{ backgroundColor: 'rgba(61,155,108,0.12)', color: 'var(--color-success)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      Disponible
    </span>
  )
}
