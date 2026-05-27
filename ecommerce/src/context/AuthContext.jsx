import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '@/services/api'

const TOKEN_KEY = 'eco_token'
const USER_KEY  = 'eco_user'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
    setLoading(false)
  }, [])

  const signIn = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/api/ecommerce/auth/login', { email, password })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
      setUser(data.usuario)
      return { error: null }
    } catch (err) {
      return { error: err.response?.data?.error ?? 'Error al iniciar sesion' }
    }
  }, [])

  const signUp = useCallback(async ({ nombre, email, password, telefono }) => {
    try {
      const { data } = await api.post('/api/ecommerce/auth/register', { nombre, email, password, telefono })
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.usuario))
      setUser(data.usuario)
      return { error: null }
    } catch (err) {
      return { error: err.response?.data?.error ?? 'Error al crear la cuenta' }
    }
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  // Actualiza el nombre en el estado local tras editar datos
  const actualizarUsuario = useCallback((cambios) => {
    setUser(prev => {
      const nuevo = { ...prev, ...cambios }
      localStorage.setItem(USER_KEY, JSON.stringify(nuevo))
      return nuevo
    })
  }, [])

  const isAuthenticated = Boolean(user)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, isAuthenticated, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de <AuthProvider>')
  return ctx
}
