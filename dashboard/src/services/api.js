import axios from 'axios'

const baseURL = import.meta.env.PROD 
    ? 'https://whatsapp-bot-0272.onrender.com'
    : '/api'
    
const api = axios.create({
    baseURL
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

api.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            localStorage.removeItem('usuario')
            window.location.href = '/'
        }
        return Promise.reject(error)
    }
)

export default api