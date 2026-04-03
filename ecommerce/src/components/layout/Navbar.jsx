import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { NAV_LINKS } from '@/constants/categories'
import { useCart } from '@/hooks/useCart'

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

// ─── Search bar ──────────────────────────────────────────────
function SearchBar({ onClose }) {
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
function MobileDrawer({ open, onClose }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

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
          className="px-6 py-4 border-t text-xs"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-faint)' }}
        >
          Envios a todo Paraguay
        </div>
      </div>
    </>
  )
}

// ─── Navbar principal — floating pill igual que landing ──────
export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const { itemCount } = useCart()

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
          width: 'min(calc(100% - 28px), 1080px)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255,166,1,0.22)',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-nav)',
          overflow: 'hidden',
        }}
      >
        {/* Fila principal */}
        <div className="flex items-center justify-between gap-4 px-5 py-3">

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
            aria-label="Sosa Bulls — Inicio"
          >
            <div
              className="w-9 h-9 flex items-center justify-center text-white font-display font-black text-sm"
              style={{
                background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
                borderRadius: '10px',
                boxShadow: '0 2px 8px var(--brand-glow)',
              }}
              aria-hidden="true"
            >
              SB
            </div>
            <span
              className="font-display font-bold text-base hidden sm:block"
              style={{ color: 'var(--color-text)', letterSpacing: '-0.3px' }}
            >
              Sosa <span style={{ color: 'var(--color-primary)' }}>Bulls</span>
            </span>
          </Link>

          {/* Nav links — Desktop */}
          {!searchOpen && (
            <nav aria-label="Navegacion principal" className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(({ label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  className="px-4 py-2 text-sm font-body font-semibold cursor-pointer transition-all duration-150"
                  style={({ isActive }) => ({
                    borderRadius: 'var(--radius-pill)',
                    backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive ? 'white' : 'var(--color-text-muted)',
                    fontWeight: isActive ? 700 : 600,
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Search expandida en desktop */}
          {searchOpen && (
            <div className="hidden md:flex flex-1 max-w-xs animate-fade-in">
              <SearchBar onClose={closeSearch} />
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-1">
            {/* Search desktop */}
            {!searchOpen && (
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Abrir busqueda"
                className="hidden md:flex min-w-[44px] min-h-[44px] items-center justify-center cursor-pointer rounded-full transition-colors duration-150"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
              >
                <IconSearch />
              </button>
            )}

            {/* Search mobile */}
            <button
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer rounded-full transition-colors duration-150"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Buscar"
              onClick={() => setSearchOpen(v => !v)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <IconSearch />
            </button>

            {/* Cart */}
            <Link
              to="/carrito"
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer rounded-full transition-colors duration-150"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={`Carrito${itemCount ? ` — ${itemCount} productos` : ''}`}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <IconCart />
              <CartBadge count={itemCount} />
            </Link>

            {/* Hamburger mobile */}
            <button
              className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer rounded-full transition-colors duration-150"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(v => !v)}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-primary-light)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <IconMenu />
            </button>
          </div>
        </div>

        {/* Search bar mobile expandida */}
        {searchOpen && (
          <div className="md:hidden px-4 pb-3 animate-slide-up">
            <SearchBar onClose={closeSearch} />
          </div>
        )}
      </header>

      <MobileDrawer open={menuOpen} onClose={closeMenu} />
    </>
  )
}
