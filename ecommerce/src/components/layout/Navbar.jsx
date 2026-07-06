import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { NAV_LINKS } from '@/constants/categories'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/hooks/useAuth'

// ─── Icons ──────────────────────────────────────────────────
function IconSearch({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
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
function IconUser({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>
    </svg>
  )
}
function IconHeart({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8Z"/>
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
function IconChevron({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function IconLogout({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}

// ─── Wordmark / Logo ─────────────────────────────────────────
function Wordmark() {
  return (
    <Link to="/" aria-label="Sosa BULLS — Inicio" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
      <div style={{ borderRadius: 8, background: 'var(--color-primary)', display: 'grid', placeItems: 'center', flexShrink: 0, padding: 2 }}>
        <img
          src="/logo.png"
          alt="Sosa BULLS"
          width={36}
          height={36}
          style={{ objectFit: 'contain', display: 'block' }}
        />
      </div>
      <div style={{ lineHeight: 1 }}>
        <div style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: 0.3 }}>
          Sosa <span style={{ color: 'var(--color-primary)' }}>BULLS</span>
        </div>
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: 10, color: 'var(--color-text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 }}>
          Pet Shop · PY
        </div>
      </div>
    </Link>
  )
}

// ─── Cart badge ──────────────────────────────────────────────
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
      className={bouncing ? 'animate-bounce-badge' : ''}
      style={{
        position: 'absolute', top: -6, right: -6,
        background: 'var(--color-primary)', color: '#fff',
        fontSize: 10, fontWeight: 700, borderRadius: '50%',
        minWidth: 18, height: 18, padding: '0 3px',
        display: 'grid', placeItems: 'center', lineHeight: 1,
        border: '2px solid #fff',
      }}
      aria-label={`${count} productos en el carrito`}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

// ─── Desktop Search ──────────────────────────────────────────
function DesktopSearch() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) navigate(`/buscar?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form onSubmit={handleSubmit} role="search" style={{ flex: '1 1 0', minWidth: 0, maxWidth: 560, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--color-bg-elevated)',
        borderRadius: 999,
        padding: '11px 20px',
        border: `1.5px solid ${focused ? 'var(--color-primary)' : 'transparent'}`,
        boxShadow: focused ? '0 0 0 3px rgba(255,166,1,0.12)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <IconSearch size={16} />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Que necesita tu mascota hoy?"
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            flex: 1, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
            color: 'var(--color-text)', minWidth: 0,
          }}
          aria-label="Buscar productos"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Limpiar" style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', padding: 2, cursor: 'pointer', display: 'flex' }}>
            <IconClose size={13} />
          </button>
        )}
      </div>
    </form>
  )
}

// ─── Mobile Search Bar ───────────────────────────────────────
function MobileSearchBar({ onClose }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { inputRef.current?.focus() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) { navigate(`/buscar?q=${encodeURIComponent(query.trim())}`); onClose() }
  }

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', background: '#fff' }}>
      <form onSubmit={handleSubmit} role="search" style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'var(--color-bg-elevated)', borderRadius: 999, padding: '10px 16px', border: '1.5px solid var(--color-primary)', boxShadow: '0 0 0 3px rgba(255,166,1,0.10)' }}>
          <IconSearch size={16} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar productos..."
            style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, color: 'var(--color-text)' }}
            aria-label="Buscar productos"
          />
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar busqueda" style={{ background: 'var(--color-bg-elevated)', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)', flexShrink: 0 }}>
          <IconClose size={18} />
        </button>
      </form>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────
function userInitials(str = '') {
  const parts = str.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── User Menu Dropdown ───────────────────────────────────────
function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const nombre = user?.nombre || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'

  useEffect(() => {
    if (!open) return
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function go(path) { setOpen(false); navigate(path) }
  async function handleSignOut() { setOpen(false); await onSignOut() }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu de usuario"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px 5px 5px', borderRadius: 999,
          border: open ? '1.5px solid var(--color-primary)' : '1.5px solid rgba(255,166,1,0.28)',
          background: open ? 'rgba(255,166,1,0.06)' : 'transparent',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
          {userInitials(nombre)}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nombre.split(' ')[0]}
        </span>
        <span style={{ color: 'var(--color-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', display: 'flex' }}>
          <IconChevron />
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          background: '#fff', borderRadius: 14, border: '1px solid var(--color-border)',
          boxShadow: '0 12px 36px rgba(26,18,8,0.12)', minWidth: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{nombre}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--color-text-muted)' }}>{user?.email}</p>
          </div>
          {[{ label: 'Mi perfil', path: '/perfil' }, { label: 'Mis pedidos', path: '/perfil' }].map(item => (
            <button key={item.path + item.label} onClick={() => go(item.path)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '11px 16px', background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >{item.label}</button>
          ))}
          <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px' }}>
            <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 8px', background: 'none', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', cursor: 'pointer' }}>
              <IconLogout /> Cerrar sesion
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mobile Drawer ───────────────────────────────────────────
function MobileDrawer({ open, onClose, user, isAuthenticated, onSignOut }) {
  const navigate = useNavigate()
  const nombre = user?.nombre || user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleSignOut() { onClose(); await onSignOut() }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 40, backgroundColor: 'rgba(61,44,30,0.40)', backdropFilter: 'blur(4px)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 0.3s' }}
      />
      <div
        role="dialog" aria-modal="true" aria-label="Menu de navegacion"
        style={{ position: 'fixed', top: 0, right: 0, height: '100%', zIndex: 50, width: 280, display: 'flex', flexDirection: 'column', background: '#fff', boxShadow: '-8px 0 32px rgba(61,44,30,0.15)', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s cubic-bezier(.4,0,.2,1)', borderLeft: '1px solid var(--color-border)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontFamily: 'Montserrat, system-ui, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--color-text)' }}>
            Sosa <span style={{ color: 'var(--color-primary)' }}>Bulls</span>
          </span>
          <button onClick={onClose} aria-label="Cerrar menu" style={{ background: 'var(--color-bg-elevated)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'grid', placeItems: 'center', color: 'var(--color-text-muted)' }}>
            <IconClose size={18} />
          </button>
        </div>

        {isAuthenticated && (
          <button onClick={() => { onClose(); navigate('/perfil') }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: 'none', border: 'none', width: '100%', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(145deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {userInitials(nombre)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', margin: 0 }}>Ver mi perfil</p>
            </div>
          </button>
        )}

        <nav aria-label="Menu movil" style={{ display: 'flex', flexDirection: 'column', padding: '12px 12px', gap: 2, flex: 1, overflowY: 'auto' }}>
          {NAV_LINKS.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'block', padding: '11px 16px', borderRadius: 10,
                backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text)',
                fontFamily: 'Montserrat, system-ui, sans-serif',
                fontWeight: isActive ? 700 : 600, fontSize: 14, textDecoration: 'none',
                transition: 'background 0.12s',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
          {isAuthenticated ? (
            <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: 'var(--color-danger)', cursor: 'pointer', padding: '0 0 12px', width: '100%' }}>
              <IconLogout /> Cerrar sesion
            </button>
          ) : (
            <Link to="/login" onClick={onClose} className="btn-primary" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              Ingresar
            </Link>
          )}
          <p style={{ fontSize: 12, color: 'var(--color-text-faint)', margin: 0 }}>Envios a todo Paraguay</p>
        </div>
      </div>
    </>
  )
}

// ─── Navbar principal ─────────────────────────────────────────
export default function Navbar() {
  const { itemCount: cartCount } = useCart()
  const { user, isAuthenticated, signOut } = useAuth()
  const [searchOpen, setSearchOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { closeSearch(); closeDrawer() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSearch, closeDrawer])

  // Categorias sin "Inicio"
  const catLinks = NAV_LINKS.filter(l => l.path !== '/')

  return (
    <>
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', boxShadow: '0 2px 8px rgba(61,44,30,0.06)' }}>

        {/* Barra de busqueda mobile (expandible) */}
        {searchOpen && <MobileSearchBar onClose={closeSearch} />}

        {!searchOpen && (
          <>
            {/* ── Row 1: Logo | Search | Icons ── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'center',
              gap: 24,
              padding: '14px 24px',
            }}>
              <Wordmark />

              {/* Search — visible en desktop, oculto en mobile */}
              <div className="navbar-search">
                <DesktopSearch />
              </div>

              {/* Spacer en mobile */}
              <div className="navbar-spacer" />

              {/* Icons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Busqueda en mobile */}
                <button
                  className="nav-icon navbar-search-btn"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Abrir busqueda"
                >
                  <IconSearch size={20} />
                </button>

                {/* Favoritos (decorativo) */}
                <button className="nav-icon navbar-fav-btn" aria-label="Favoritos">
                  <IconHeart size={20} />
                </button>

                {/* Usuario */}
                {isAuthenticated ? (
                  <UserMenu user={user} onSignOut={signOut} />
                ) : (
                  <Link to="/login" className="nav-icon" aria-label="Ingresar" title="Ingresar">
                    <IconUser size={20} />
                  </Link>
                )}

                {/* Carrito */}
                <Link to="/carrito" aria-label="Ver carrito" style={{ position: 'relative', display: 'grid', placeItems: 'center', padding: 8, borderRadius: '50%', color: 'var(--color-text)', textDecoration: 'none', background: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >
                  <IconCart size={20} />
                  <CartBadge count={cartCount} />
                </Link>

                {/* Hamburger — solo mobile */}
                <button
                  className="nav-icon navbar-menu-btn"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Abrir menu"
                  aria-expanded={drawerOpen}
                >
                  <IconMenu size={22} />
                </button>
              </div>
            </div>

            {/* ── Row 2: Category strip — desktop only ── */}
            <nav
              aria-label="Categorias"
              className="navbar-cats"
            >
              {catLinks.map(({ label, path }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) => `navbar-catlink${isActive ? ' navbar-catlink--active' : ''}`}
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        user={user}
        isAuthenticated={isAuthenticated}
        onSignOut={signOut}
      />

      <style>{`
        .nav-icon {
          background: none; border: none; color: var(--color-text);
          cursor: pointer; padding: 8px; border-radius: 50%;
          display: grid; place-items: center; transition: background 0.15s;
          min-width: 36px; min-height: 36px;
          text-decoration: none;
        }
        .nav-icon:hover { background: var(--color-bg-elevated); }

        .navbar-cats {
          background: var(--color-bg-elevated);
          border-top: 1px solid rgba(61,44,30,0.06);
          display: flex;
          gap: 0;
          padding: 0 20px;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .navbar-cats::-webkit-scrollbar { display: none; }

        .navbar-catlink {
          padding: 13px 18px;
          font-size: 14px;
          font-weight: 700;
          font-family: Montserrat, system-ui, sans-serif;
          color: var(--color-text);
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
          display: block;
        }
        .navbar-catlink:hover {
          color: var(--color-primary);
        }
        .navbar-catlink--active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }

        /* Desktop: show search in row 1, hide mobile buttons */
        .navbar-search { display: none; }
        .navbar-search-btn { display: none; }
        .navbar-fav-btn { display: none; }
        .navbar-menu-btn { display: none; }
        .navbar-spacer { display: flex; flex: 1 1 0%; }

        @media (min-width: 768px) {
          .navbar-search { display: flex; flex: 1 1 0; }
          .navbar-search-btn { display: none; }
          .navbar-fav-btn { display: grid; }
          .navbar-menu-btn { display: none; }
          .navbar-spacer { display: none; }
        }

        @media (max-width: 767px) {
          .navbar-search-btn { display: grid; }
          .navbar-menu-btn { display: grid; }
          .navbar-cats { display: none; }
        }
      `}</style>
    </>
  )
}
