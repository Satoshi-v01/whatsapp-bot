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
          // Las categorias de la DB pueden ser subcategorias — siempre
          // usamos las constantes del frontend como fuente de verdad,
          // solo tomamos el count si el slug coincide
          const enriched = CATEGORIES.map(cat => {
            const dbCat = data.find(c => c.slug === cat.slug)
            return dbCat ? { ...cat, count: dbCat.count } : cat
          })
          setCategories(enriched)
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
