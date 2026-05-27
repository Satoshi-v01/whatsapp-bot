import axios from 'axios'

// El dashboard corre en el mismo servidor Express que la API,
// por lo que /api funciona tanto en dev (via Vite proxy) como en prod.
const api = axios.create({
    baseURL: '/api'
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