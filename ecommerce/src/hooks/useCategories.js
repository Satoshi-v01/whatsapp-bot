import { useState, useEffect } from 'react'
import api from '@/services/api'
import { CATEGORIES } from '@/constants/categories'

export function useCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCategories() {
      try {
        const { data } = await api.get('/api/ecommerce/categorias')
        if (!cancelled) {
          // Enriquecer datos del backend con íconos/colores locales
          const enriched = data.map(cat => {
            const local = CATEGORIES.find(c => c.slug === cat.slug)
            return { ...local, ...cat }
          })
          setCategories(enriched.length ? enriched : CATEGORIES)
        }
      } catch {
        if (!cancelled) {
          setCategories(CATEGORIES)
          setError('No se pudieron cargar las categorías')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCategories()
    return () => { cancelled = true }
  }, [])

  return { categories, loading, error }
}
