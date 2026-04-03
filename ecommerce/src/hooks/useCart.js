import { useCartContext } from '@/context/CartContext'

/**
 * Hook público para acceder al carrito.
 * Re-exporta el contexto con una interfaz limpia.
 */
export function useCart() {
  return useCartContext()
}
