import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SEOHead from '@/components/seo/SEOHead'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/utils/formatPrice'
import api from '@/services/api'

// ─── Item del carrito ────────────────────────────────────────
function CartItem({ item, onUpdateQty, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
      className="flex gap-4 items-center py-4 border-b"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Imagen */}
      <div
        className="w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
      >
        {item.imagen_url ? (
          <img src={item.imagen_url} alt={item.nombre} className="w-full h-full object-cover" />
        ) : (
          <svg width="28" height="28" viewBox="0 0 100 100" fill="var(--color-primary)" aria-hidden="true">
            <ellipse cx="50" cy="65" rx="24" ry="20" />
            <circle cx="22" cy="38" r="11" />
            <circle cx="42" cy="26" r="11" />
            <circle cx="62" cy="26" r="11" />
            <circle cx="78" cy="38" r="11" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-snug truncate" style={{ color: 'var(--color-text)' }}>
          {item.nombre}
        </p>
        <p className="text-sm mt-0.5 font-bold" style={{ color: 'var(--color-primary)' }}>
          {formatPrice(item.precio_venta)}
        </p>
      </div>

      {/* Cantidad */}
      <div className="flex items-center gap-1 rounded-xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--color-border)' }}>
        <button
          onClick={() => onUpdateQty(item.id, item.cantidad - 1)}
          aria-label="Disminuir cantidad"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--color-secondary)' }}
          disabled={item.cantidad <= 1}
        >
          -
        </button>
        <span className="w-8 text-center text-sm font-bold" style={{ color: 'var(--color-text)' }} aria-live="polite">
          {item.cantidad}
        </span>
        <button
          onClick={() => onUpdateQty(item.id, item.cantidad + 1)}
          aria-label="Aumentar cantidad"
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 hover:bg-primary-light disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ color: 'var(--color-secondary)' }}
          disabled={item.cantidad >= (item.stock ?? 99)}
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <p className="text-sm font-bold w-24 text-right shrink-0" style={{ color: 'var(--color-secondary)' }}>
        {formatPrice(item.precio_venta * item.cantidad)}
      </p>

      {/* Eliminar */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label={`Eliminar ${item.nombre} del carrito`}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150 hover:bg-red-50 shrink-0"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
        </svg>
      </button>
    </motion.div>
  )
}

// ─── Carrito vacio ───────────────────────────────────────────
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center px-4">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'var(--color-primary-light)' }}
        aria-hidden="true"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
      </div>
      <div>
        <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--color-secondary)' }}>
          Tu carrito esta vacio
        </h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Agrega productos desde el catalogo para comenzar.
        </p>
      </div>
      <Link to="/" className="btn-primary">
        Ver productos
      </Link>
    </div>
  )
}

// ─── Confirmacion de pedido ──────────────────────────────────
function OrderConfirmation({ numero, mensaje, total, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center gap-6 py-16 px-4 max-w-md mx-auto"
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: 'rgba(61,155,108,0.12)' }}
        aria-hidden="true"
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div>
        <h2 className="font-display text-3xl mb-2" style={{ color: 'var(--color-secondary)' }}>
          Pedido recibido
        </h2>
        <p className="text-2xl font-bold mb-3" style={{ color: 'var(--color-primary)' }}>
          {numero}
        </p>
        <p style={{ color: 'var(--color-text-muted)' }} className="text-base leading-relaxed">
          {mensaje}
        </p>
      </div>

      <div
        className="w-full rounded-xl px-6 py-4 text-center"
        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Total del pedido</p>
        <p className="font-display text-2xl" style={{ color: 'var(--color-secondary)' }}>
          {formatPrice(total)}
        </p>
      </div>

      <Link to="/" className="btn-primary w-full justify-center" onClick={onClose}>
        Seguir comprando
      </Link>
    </motion.div>
  )
}

// ─── Formulario de datos del cliente ────────────────────────
function CustomerForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' })
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido'
    if (!form.telefono.trim()) errs.telefono = 'El telefono es requerido'
    if (!form.direccion.trim()) errs.direccion = 'La direccion es requerida'
    return errs
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(e => ({ ...e, [name]: undefined }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <h2 className="font-display text-xl" style={{ color: 'var(--color-secondary)' }}>
        Datos de entrega
      </h2>

      {[
        { name: 'nombre',    label: 'Nombre completo',  type: 'text',     placeholder: 'Juan Perez', required: true },
        { name: 'telefono',  label: 'Telefono',         type: 'tel',      placeholder: '0981 000 000', required: true },
        { name: 'direccion', label: 'Direccion',        type: 'text',     placeholder: 'Calle, numero, barrio, ciudad', required: true },
      ].map(field => (
        <div key={field.name} className="flex flex-col gap-1.5">
          <label
            htmlFor={field.name}
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {field.label}
            {field.required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
          </label>
          <input
            id={field.name}
            name={field.name}
            type={field.type}
            value={form[field.name]}
            onChange={handleChange}
            placeholder={field.placeholder}
            autoComplete={field.name === 'nombre' ? 'name' : field.name === 'telefono' ? 'tel' : 'street-address'}
            className="input-base"
            style={errors[field.name] ? { borderColor: 'var(--color-danger)' } : {}}
            aria-invalid={errors[field.name] ? 'true' : undefined}
            aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
          />
          {errors[field.name] && (
            <p id={`${field.name}-error`} className="text-xs" style={{ color: 'var(--color-danger)' }} role="alert">
              {errors[field.name]}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notas" className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          Notas adicionales <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          value={form.notas}
          onChange={handleChange}
          placeholder="Horario preferido, referencias de la casa, etc."
          rows={3}
          className="input-base resize-none"
        />
      </div>

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.97 }}
        className="btn-primary w-full justify-center text-base py-4"
        style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
      >
        {loading ? 'Enviando pedido...' : 'Confirmar pedido'}
      </motion.button>
    </form>
  )
}

// ─── Indicador de pasos ─────────────────────────────────────
const STEPS = ['Carrito', 'Datos', 'Confirmado']

function CartSteps({ active }) {
  return (
    <nav aria-label="Pasos del proceso de compra" className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done   = i < active
        const current = i === active
        return (
          <div key={label} className="flex items-center">
            {/* Paso */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                animate={{
                  backgroundColor: current ? 'var(--color-primary)' : done ? 'var(--color-success)' : 'transparent',
                  borderColor: current ? 'var(--color-primary)' : done ? 'var(--color-success)' : 'var(--color-border)',
                  scale: current ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{ color: current || done ? 'white' : 'var(--color-text-muted)' }}
                aria-current={current ? 'step' : undefined}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : i + 1}
              </motion.div>
              <span
                className="text-xs font-semibold whitespace-nowrap"
                style={{ color: current ? 'var(--color-primary)' : done ? 'var(--color-success)' : 'var(--color-text-faint)' }}
              >
                {label}
              </span>
            </div>

            {/* Línea conectora */}
            {i < STEPS.length - 1 && (
              <div
                className="h-[2px] w-12 md:w-20 mx-1 mb-5 rounded-full transition-colors duration-400"
                style={{ backgroundColor: done ? 'var(--color-success)' : 'var(--color-border)' }}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

// ─── Pagina principal del carrito ────────────────────────────
export default function Cart() {
  const { items, total, updateQty, removeItem, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)
  const [confirmacion, setConfirmacion] = useState(null)

  if (confirmacion) {
    return (
      <>
        <SEOHead title="Pedido confirmado" noindex />
        <main className="section-padding !pt-8">
          <div className="container-base max-w-lg mx-auto">
            <CartSteps active={2} />
            <OrderConfirmation
              numero={confirmacion.numero}
              mensaje={confirmacion.mensaje}
              total={confirmacion.total}
              onClose={clearCart}
            />
          </div>
        </main>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <SEOHead title="Carrito" noindex />
        <main><EmptyCart /></main>
      </>
    )
  }

  async function handleSubmit(clienteData) {
    setLoading(true)
    setApiError(null)

    try {
      const payload = {
        items: items.map(i => ({ id: i.id, cantidad: i.cantidad })),
        cliente: {
          nombre: clienteData.nombre,
          telefono: clienteData.telefono,
          direccion: clienteData.direccion,
        },
        notas: clienteData.notas || undefined,
      }

      const { data } = await api.post('/api/ecommerce/pedidos', payload)

      clearCart()
      setConfirmacion({
        numero: data.numero,
        mensaje: data.mensaje,
        total: data.total,
      })
    } catch (err) {
      const msg = err.response?.data?.error ?? 'No se pudo procesar el pedido. Intenta nuevamente.'
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SEOHead title="Carrito" noindex />

      <main className="section-padding !pt-8">
        <div className="container-base">
          <CartSteps active={1} />
          <h1 className="font-display text-3xl md:text-4xl mb-8" style={{ color: 'var(--color-secondary)' }}>
            Tu carrito
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Lista de items */}
            <div className="lg:col-span-2">
              <AnimatePresence initial={false}>
                {items.map(item => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQty={updateQty}
                    onRemove={removeItem}
                  />
                ))}
              </AnimatePresence>

              <div className="flex justify-between items-center mt-6">
                <button
                  onClick={clearCart}
                  className="text-sm underline transition-colors duration-150"
                  style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
                >
                  Vaciar carrito
                </button>
                <Link
                  to="/"
                  className="text-sm font-semibold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Seguir comprando
                </Link>
              </div>
            </div>

            {/* Panel lateral: resumen + formulario */}
            <div className="lg:col-span-1">
              <div
                className="rounded-2xl p-6 mb-6 border"
                style={{ backgroundColor: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
              >
                <h2 className="font-display text-xl mb-4" style={{ color: 'var(--color-secondary)' }}>
                  Resumen
                </h2>

                <div className="flex flex-col gap-2 text-sm mb-4">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {item.nombre} x{item.cantidad}
                      </span>
                      <span className="shrink-0 font-semibold" style={{ color: 'var(--color-text)' }}>
                        {formatPrice(item.precio_venta * item.cantidad)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="flex justify-between items-center pt-4 border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span className="font-bold" style={{ color: 'var(--color-text)' }}>Total</span>
                  <span className="font-display text-2xl" style={{ color: 'var(--color-primary)' }}>
                    {formatPrice(total)}
                  </span>
                </div>

                <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                  El costo de envio se coordina al contactarte.
                </p>
              </div>

              {/* Error de API */}
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl px-4 py-3 mb-4 text-sm"
                  style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: 'var(--color-danger)', border: '1px solid rgba(220,38,38,0.2)' }}
                  role="alert"
                >
                  {apiError}
                </motion.div>
              )}

              <CustomerForm onSubmit={handleSubmit} loading={loading} />
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
