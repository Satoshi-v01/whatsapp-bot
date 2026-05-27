import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { CartProvider } from '@/context/CartContext'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import FloatingPaws from '@/components/ui/FloatingPaws'

// Code splitting — cada pagina se carga solo cuando se navega a ella
const Home     = lazy(() => import('@/pages/Home'))
const Category = lazy(() => import('@/pages/Category'))
const Product  = lazy(() => import('@/pages/Product'))
const Cart     = lazy(() => import('@/pages/Cart'))
const Search   = lazy(() => import('@/pages/Search'))
const Login    = lazy(() => import('@/pages/Login'))
const Registro = lazy(() => import('@/pages/Registro'))
const Perfil   = lazy(() => import('@/pages/Perfil'))
const NotFound  = lazy(() => import('@/pages/NotFound'))
const Nosotros  = lazy(() => import('@/pages/Nosotros'))
const Contacto  = lazy(() => import('@/pages/Contacto'))

function PageLoader() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: '50vh' }}
      aria-label="Cargando pagina"
      role="status"
    >
      <div
        className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
        aria-hidden="true"
      />
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <AuthProvider>
        <CartProvider>
          {/* Skip-to-content para teclado y lectores de pantalla */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:font-bold focus:text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Saltar al contenido principal
          </a>

          <FloatingPaws />

          <div className="flex flex-col min-h-screen">
            <Navbar />

            <main id="main-content" className="flex-1">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"                element={<Home />} />
                  <Route path="/categoria/:slug" element={<Category />} />
                  <Route path="/producto/:slug"  element={<Product />} />
                  <Route path="/carrito"         element={<Cart />} />
                  <Route path="/buscar"          element={<Search />} />
                  <Route path="/login"           element={<Login />} />
                  <Route path="/registro"        element={<Registro />} />
                  <Route path="/perfil"          element={
                    <ProtectedRoute>
                      <Perfil />
                    </ProtectedRoute>
                  } />
                  <Route path="/nosotros"        element={<Nosotros />} />
                  <Route path="/contacto"        element={<Contacto />} />
                  <Route path="*"               element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>

            <Footer />
          </div>
        </CartProvider>
      </AuthProvider>
    </HelmetProvider>
  )
}
