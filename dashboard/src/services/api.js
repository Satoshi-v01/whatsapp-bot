import axios from 'axios'

// En dev, /api relativo funciona via el proxy de Vite. En produccion
// apuntamos directo a la URL de Render (no al dominio custom): un
// redirect de dominio (www <-> sin www, a nivel Cloudflare/Render o
// incluso un 301 viejo cacheado por el navegador) rompe las llamadas a
// /api porque dejan de ser same-origin y no llevan headers CORS.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

let redirigiendo = false

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401 && !redirigiendo) {
            redirigiendo = true
            localStorage.removeItem('token')
            localStorage.removeItem('usuario')
            window.location.href = '/dashboard'
        }
        return Promise.reject(error)
    }
)

export default api