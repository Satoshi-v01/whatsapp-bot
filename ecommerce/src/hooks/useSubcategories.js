import { useState, useEffect } from 'react'
import api from '@/services/api'

export function useSubcategories(categoriaSlug) {
  const [subcategories, setSubcategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!categoriaSlug) {
      setSubcategories([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    api.get('/api/ecommerce/subcategorias', { params: { categoria: categoriaSlug } })
      .then(({ data }) => { if (!cancelled) setSubcategories(data) })
      .catch(() => { if (!cancelled) setSubcategories([]) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [categoriaSlug])

  return { subcategories, loading }
}
