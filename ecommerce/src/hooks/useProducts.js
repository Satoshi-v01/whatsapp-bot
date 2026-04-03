import { useState, useEffect } from 'react'
import api from '@/services/api'

export function useProducts(params = {}) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [total, setTotal] = useState(0)

  // Serializar params para el efecto
  const paramKey = JSON.stringify(params)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchProducts() {
      try {
        const { data } = await api.get('/api/ecommerce/productos', { params })
        if (!cancelled) {
          setProducts(data.items ?? data)
          setTotal(data.total ?? (data.items ?? data).length)
        }
      } catch (err) {
        if (!cancelled) {
          setError('No se pudieron cargar los productos')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProducts()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey])

  return { products, loading, error, total }
}
