import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.PROD ? import.meta.env.VITE_API_URL : '',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  res => res,
  err => {
    console.error('[API Error]', err.config?.url, err.response?.status, err.message)
    return Promise.reject(err)
  }
)

export default api
