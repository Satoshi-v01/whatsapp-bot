import { createContext, useContext, useReducer, useEffect } from 'react'

const STORAGE_KEY = 'sosa_bulls_cart'

// ─── Estado inicial ──────────────────────────────────────────
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ─── Reducer ─────────────────────────────────────────────────
function cartReducer(state, action) {
  switch (action.type) {

    case 'ADD_ITEM': {
      const existing = state.find(i => i.id === action.item.id)
      if (existing) {
        return state.map(i =>
          i.id === action.item.id
            ? { ...i, cantidad: i.cantidad + (action.item.cantidad ?? 1) }
            : i
        )
      }
      return [...state, { ...action.item, cantidad: action.item.cantidad ?? 1 }]
    }

    case 'REMOVE_ITEM':
      return state.filter(i => i.id !== action.id)

    case 'UPDATE_QTY':
      if (action.cantidad <= 0) return state.filter(i => i.id !== action.id)
      return state.map(i =>
        i.id === action.id ? { ...i, cantidad: action.cantidad } : i
      )

    case 'CLEAR_CART':
      return []

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────
export const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(cartReducer, [], loadFromStorage)

  // Persistir en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      // localStorage puede estar lleno o bloqueado
    }
  }, [items])

  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0)
  const total = items.reduce((sum, i) => sum + i.precio_venta * i.cantidad, 0)

  function addItem(item) {
    dispatch({ type: 'ADD_ITEM', item })
  }

  function removeItem(id) {
    dispatch({ type: 'REMOVE_ITEM', id })
  }

  function updateQty(id, cantidad) {
    dispatch({ type: 'UPDATE_QTY', id, cantidad })
  }

  function clearCart() {
    dispatch({ type: 'CLEAR_CART' })
  }

  return (
    <CartContext.Provider value={{ items, itemCount, total, addItem, removeItem, updateQty, clearCart }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCartContext() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCartContext debe usarse dentro de <CartProvider>')
  return ctx
}
