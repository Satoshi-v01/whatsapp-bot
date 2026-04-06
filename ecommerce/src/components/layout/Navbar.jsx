import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { NAV_LINKS } from '@/constants/categories'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'

function IconSearch({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )
}
function IconCart({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}
function IconClose({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}
function IconMenu({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  )
}

// ─── Cart badge ─────────────────────────────────────────────
function CartBadge({ count }) {
  const [bouncing, setBouncing] = useState(false)
  const prevCount = useRef(count)

  useEffect(() => {
    if (count !== prevCount.current && count > 0) {
      setBouncing(true)
      const t = setTimeout(() => setBouncing(false), 400)
      prevCount.current = count
      return () => clearTimeout(t)
    }
    prevCount.current = count
  }, [count])

  if (!count) return null

  return (
    <span
      className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1
        flex items-center justify-center text-[10px] font-bold text-white rounded-full
        ${bouncing ? 'animate-bounce-badge' : ''}`}
      style={{ backgroundColor: 'var(--color-primary)', lineHeight: 1 }}
      aria-label={`${count} productos en el carrito`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── Search bar desktop (persistente) ───────────────────────
function DesktopSearch() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex items-center" style={{ flex: '1 1 0', minWidth: 160 }}>
      <div
        className="flex items-center gap-2 w-full px-3 py-2 transition-all duration-200"
        style={{
          borderRadius: 'var(--radius-pill)',
          border: `2px solid ${focused ? 'var(--color-primary)' : 'rgba(180,130,0,0.55)'}`,
          backgroundColor: 'white',
          boxShadow: focused ? '0 0 0 3px rgba(255,166,1,0.15)' : '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <IconSearch size={14} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Buscar productos..."
          className="flex-1 bg-transparent outline-none min-w-0"
          style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--color-text)' }}
          aria-label="Buscar productos"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar busqueda"
            className="flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--color-text-muted)', padding: 2 }}
          >
            <IconClose size={13} />
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Search bar mobile (expandible) ─────────────────────────
function MobileSearchBar({ onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/buscar?q=${encodeURIComponent(query.trim())}`)
      onClose()
    }
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="flex items-center gap-2">
      <div
        className="flex items-center gap-2 flex-1 px-4 py-2.5 transition-all duration-200"
        style={{
          borderRadius: 'var(--radius-pill)',
          border: '1.5px solid var(--color-primary)',
          backgroundColor: 'white',
          boxShadow: '0 0 0 4px rgba(255,166,1,0.10)',
        }}
      >
        <IconSearch size={16} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar productos..."
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          style={{ fontFamily: 'Inter, sans-serif', color: 'var(--color-text)' }}
          aria-label="Buscar productos"
        />
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar busqueda"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer rounded-full transition-colors duration-150"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <IconClose size={18} />
      </button>
    </form>
  )
}

// ─── Mobile Drawer ───────────────────────────────────────────
function MobileDrawer({ open, onClose, user, isAuthenticated, onSignOut }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navigate = useNavigate()
  const nombre = user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''

  async function handleSignOut() {
    onClose()
    await onSignOut()
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          backgroundColor: 'rgba(26,18,8,0.40)',
          backdropFilter: 'blur(4px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegacion"
        className="fixed top-0 right-0 h-full z-50 w-72 flex flex-col shadow-lg transition-transform duration-300"
        style={{
          backgroundColor: 'var(--color-bg)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <span
            className="font-display font-bold text-lg"
            style={{ color: 'var(--color-text)', letterSpacing: '-0.3px' }}
          >
            Sosa <span style={{ color: 'var(--color-primary)' }}>Bulls</span>
          </span>
          <button
            onClick={onClose}
            aria-label="Cerrar menu"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full cursor-pointer transition-colors duration-150"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Perfil mobile — cuando hay sesion */}
        {isAuthenticated && (
          <div
            style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            onClick={() => { onClose(); navigate('/perfil') }}
          >
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0, fontFamily: 'Poppins, sans-serif' }}>
              {userInitials(nombre)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Ver mi perfil</p>
            </div>
          </div>
        )}

        <nav aria-label="Menu movil" className="flex flex-col px-4 py-6 gap-1 flex-1">
          {NAV_LINKS.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className="flex items-center px-4 py-3 font-body font-semibold text-base transition-all duration-150 cursor-pointer"
              style={({ isActive }) => ({
                borderRadius: 'var(--radius-pill)',
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text)',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div
          className="px-6 py-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {isAuthenticated ? (
            <button
              onClick={handleSignOut}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', padding: 0, marginBottom: 12 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Cerrar sesion
            </button>
          ) : (
            <NavLink
              to="/login"
              onClick={onClose}
              className="btn-primary w-full justify-center mb-3"
              style={{ display: 'flex', marginBottom: 12 }}
            >
              Ingresar
            </NavLink>
          )}
          <p className="text-xs" style={{ color: 'var(--color-text-faint)' }}>Envios a todo Paraguay</p>
        </div>
      </div>
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function userInitials(str = '') {
  const parts = str.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Avatar + Dropdown ────────────────────────────────────────
function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const navigate        = useNavigate()
  const nombre          = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  useEffect(() => {
    if (!open) return
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function go(path) {
    setOpen(false)
    navigate(path)
  }

  async function handleSignOut() {
    setOpen(false)
    await onSignOut()
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu de usuario"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 10px 4px 4px',
          borderRadius: 'var(--radius-pill)',
          border: open ? '1.5px solid var(--color-primary)' : '1.5px solid rgba(255,166,1,0.30)',
          background: open ? 'rgba(255,166,1,0.06)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {/* Avatar circulo */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0,
          fontFamily: 'Poppins, sans-serif',
        }}>
          {userInitials(nombre)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombre.split(' ')[0]}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          background: 'white',
          border: '1px solid rgba(255,166,1,0.18)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(26,18,8,0.12)',
          minWidth: 180,
          zIndex: 200,
          overflow: 'hidden',
          padding: '6px 0',
        }}>
          {/* Info usuario */}
          <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,166,1,0.10)', marginBottom: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-faint)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>

          {[
            { label: 'Mi perfil',    icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', path: '/perfil' },
            { label: 'Mis pedidos',  icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7v6 M9 10h6', path: '/perfil?tab=pedidos' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => go(item.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-primary-light)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {item.icon.split(' ').map((d, i) => <path key={i} d={d} />)}
              </svg>
              {item.label}
            </button>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,166,1,0.10)', margin: '4px 0' }} />

          <button
            onClick={handleSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 16px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', textAlign: 'left', transition: 'background 0.1s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesion
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Navbar principal ────────────────────────────────────────
// Layout desktop:
//   Fila 1 — [Logo]  [Search flex-1]  [Login | UserMenu] [Cart]
//   Fila 2 — [Nav links]
// Layout mobile:
//   Fila 1 — [Logo]  [spacer]  [SearchIcon] [Cart] [Menu]
//   Fila 2 — expandible al tocar búsqueda
export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen]     = useState(false)
  const { itemCount } = useCart()
  const { user, isAuthenticated, signOut } = useAuth()

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeMenu   = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!searchOpen) return
    function onKey(e) { if (e.key === 'Escape') closeSearch() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [searchOpen, closeSearch])

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(calc(100% - 28px), 1100px)',
          zIndex: 100,
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,166,1,0.22)',
          borderRadius: '20px',
          boxShadow: 'var(--shadow-nav)',
          overflow: 'hidden',
        }}
      >
        {/* ══ Fila 1: Logo | Search (desktop) | Login + Cart | Mobile icons ══ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px' }}>

          {/* Logo — siempre a la izquierda */}
          <Link
            to="/"
            className="flex items-center gap-2 shrink-0 cursor-pointer"
            aria-label="Sosa Bulls — Inicio"
          >
            <div
              className="flex items-center justify-center text-white font-display font-black"
              style={{
                width: 34, height: 34,
                background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                borderRadius: '10px',
                boxShadow: '0 2px 8px var(--brand-glow)',
                fontSize: 12, flexShrink: 0,
              }}
              aria-hidden="true"
            >
              SB
            </div>
            <span
              className="font-display font-bold hidden sm:block"
              style={{ color: 'var(--color-text)', letterSpacing: '-0.3px', whiteSpace: 'nowrap', fontSize: 15 }}
            >
              Sosa <span style={{ color: 'var(--color-primary)' }}>Bulls</span>
            </span>
          </Link>

          {/* Search bar — siempre visible, ocupa todo el espacio central */}
          <div className="flex" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 560 }}>
            <DesktopSearch />
          </div>

          {/* Spacer mobile — empuja los iconos a la derecha */}
          <div className="flex-1 md:hidden" />

          {/* ── Acciones — siempre a la derecha ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 'auto' }}>

            {/* Icono búsqueda — solo mobile */}
            <button
              className="md:hidden flex items-center justify-center cursor-pointer"
              onClick={() => setSearchOpen(v => !v)}
              aria-label="Buscar"
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent',
                color: 'var(--color-text-muted)',
              }}
            >
              <IconSearch size={18} />
            </button>

            {/* Login / UserMenu — desktop */}
            <div className="hidden md:flex">
              {isAuthenticated ? (
                <UserMenu user={user} onSignOut={signOut} />
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5"
                  aria-label="Iniciar sesion"
                  style={{
                    height: 36, padding: '0 14px', borderRadius: '10px',
                    border: '1.5px solid rgba(255,166,1,0.30)',
                    background: 'transparent',
                    color: 'var(--color-text-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                    e.currentTarget.style.color = 'var(--color-primary)'
                    e.currentTarget.style.background = 'rgba(255,166,1,0.06)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,166,1,0.30)'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  Ingresar
                </Link>
              )}
            </div>

            {/* Carrito — siempre a la derecha del todo */}
            <Link
              to="/carrito"
              className="relative flex items-center justify-center"
              aria-label={`Carrito${itemCount ? ` — ${itemCount} productos` : ''}`}
              style={{
                width: 40, height: 40, borderRadius: '50%', color: 'var(--color-text-muted)',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <IconCart size={20} />
              <CartBadge count={itemCount} />
            </Link>

            {/* Hamburger — solo mobile */}
            <button
              className="md:hidden flex items-center justify-center cursor-pointer"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              style={{
                width: 40, height: 40, borderRadius: '50%', border: 'none', background: 'transparent',
                color: 'var(--color-text-muted)',
              }}
            >
              <IconMenu size={18} />
            </button>
          </div>
        </div>

        {/* ══ Fila 2 mobile: Search expandida ══ */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3" style={{ borderTop: '1px solid rgba(255,166,1,0.10)' }}>
            <MobileSearchBar onClose={closeSearch} />
          </div>
        )}
      </header>

      <MobileDrawer open={menuOpen} onClose={closeMenu} user={user} isAuthenticated={isAuthenticated} onSignOut={signOut} />
    </>
  )
}
