import { useState, useEffect } from 'react'
import api from '@/services/api'

export function useProduct(slug) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)

    async function fetchProduct() {
      try {
        const { data } = await api.get(`/api/ecommerce/productos/${slug}`)
        if (!cancelled) setProduct(data)
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.status === 404 ? 'not_found' : 'error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProduct()
    return () => { cancelled = true }
  }, [slug])

  return { product, loading, error }
}
