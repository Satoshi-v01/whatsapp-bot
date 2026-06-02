import { useState, useEffect } from 'react'
import api from '@/services/api'

let _cache = null
let _promise = null

export function useShopConfig() {
  const [config, setConfig] = useState(_cache || {})

  useEffect(() => {
    if (_cache) { setConfig(_cache); return }
    if (!_promise) {
      _promise = api.get('/api/ecommerce/config')
        .then(({ data }) => { _cache = data; return data })
        .catch(() => { _promise = null; return {} })
    }
    _promise.then(data => setConfig(data))
  }, [])

  return {
    ...config,
    mostrarSinStock: config?.mostrar_sin_stock === 'true',
  }
}
