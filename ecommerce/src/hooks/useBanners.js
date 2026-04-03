import { useState, useEffect } from 'react'
import api from '@/services/api'

const FALLBACK_BANNERS = [
  {
    id: 1,
    titulo: 'Nutricion premium para tu mejor amigo',
    subtitulo: 'Royal Canin, Purina Pro Plan y mas marcas lideres con envio a domicilio.',
    cta_texto: 'Ver productos',
    cta_url: '/categoria/perros',
    imagen_url: null,
    badge: 'Novedad',
  },
  {
    id: 2,
    titulo: 'Todo lo que tu gato necesita',
    subtitulo: 'Alimentos, accesorios y juguetes seleccionados para el bienestar felino.',
    cta_texto: 'Explorar',
    cta_url: '/categoria/gatos',
    imagen_url: null,
    badge: null,
  },
  {
    id: 3,
    titulo: 'Ofertas de la semana',
    subtitulo: 'Hasta 30% de descuento en productos seleccionados. Por tiempo limitado.',
    cta_texto: 'Ver ofertas',
    cta_url: '/categoria/ofertas',
    imagen_url: null,
    badge: 'Oferta',
  },
]

export function useBanners() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchBanners() {
      try {
        const { data } = await api.get('/api/ecommerce/banners')
        if (!cancelled) {
          setBanners(data.length ? data : FALLBACK_BANNERS)
        }
      } catch {
        if (!cancelled) {
          setBanners(FALLBACK_BANNERS)
          setError('No se pudieron cargar los banners')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchBanners()
    return () => { cancelled = true }
  }, [])

  return { banners, loading, error }
}
