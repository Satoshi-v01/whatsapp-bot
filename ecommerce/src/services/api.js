import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_API_URL : '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('eco_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let redirigiendo = false

api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url ?? ''
    const esRutaPrivada = /\/(mis-pedidos|mis-datos|mascotas|direcciones|fichas-facturacion|me$)/.test(url)
    if (err.response?.status === 401 && esRutaPrivada && !redirigiendo) {
      redirigiendo = true
      localStorage.removeItem('eco_token')
      localStorage.removeItem('eco_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
