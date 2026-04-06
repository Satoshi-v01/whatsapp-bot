// AuthContext — STUB de desarrollo
// Cuando se integre Supabase (paso 1 y 2) se reemplaza el interior
// de este archivo pero la API exportada NO cambia:
//   { user, loading, signIn, signOut, isAuthenticated }
//
// Shape del user (espeja Supabase Auth):
//   { id, email, user_metadata: { full_name, avatar_url } }

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const SESSION_KEY = 'sb_dev_session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Al montar: recuperar sesion guardada
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // nada
    }
    setLoading(false)
  }, [])

  // signIn — stub: acepta cualquier email/password
  // Al integrar Supabase: supabase.auth.signInWithPassword({ email, password })
  const signIn = useCallback(async (email, password) => {
    if (!email?.trim() || !password?.trim()) {
      return { error: 'Completa email y contraseña' }
    }

    const mockUser = {
      id: 'dev-' + Math.random().toString(36).slice(2),
      email: email.trim().toLowerCase(),
      user_metadata: {
        full_name: email.split('@')[0].replace(/[._-]/g, ' '),
        avatar_url: null,
      },
    }

    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(mockUser))
    } catch {
      // nada
    }
    setUser(mockUser)
    return { error: null }
  }, [])

  // signOut
  // Al integrar Supabase: supabase.auth.signOut()
  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      // nada
    }
    setUser(null)
  }, [])

  const isAuthenticated = Boolean(user)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext debe usarse dentro de <AuthProvider>')
  return ctx
}
