import { useState } from 'react'
import { motion } from 'framer-motion'
import api from '@/services/api'

export const AVISO_PEDIDO_EXCLUSIVO = 'Algunos productos se pueden conseguir en el día, otros pueden tardar de 24 a 48 hs aproximadamente. El pedido se realiza con una seña del 20%.'

// ─── Selector de cantidad ────────────────────────────────────
export function QuantitySelector({ value, max, onChange }) {
  return (
    <div className="flex items-center gap-0 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)', width: 'fit-content' }}>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Disminuir cantidad"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
      >
        -
      </button>
      <span
        className="w-12 min-h-[44px] flex items-center justify-center text-sm font-bold"
        aria-live="polite"
        aria-label={`Cantidad: ${value}`}
        style={{ color: 'var(--color-text)', backgroundColor: 'white' }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Aumentar cantidad"
        className="min-w-[44px] min-h-[44px] flex items-center justify-center text-lg font-bold cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ color: 'var(--color-text)', backgroundColor: 'var(--color-bg)' }}
      >
        +
      </button>
    </div>
  )
}

// ─── Modal "Hacer pedido" (producto sin stock) ────────────────
export default function PedidoExclusivoModal({ presentacionId, maxQty = 20, onClose }) {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nombre.trim() || !telefono.trim()) {
      setError('Completá tu nombre y teléfono.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post('/api/ecommerce/pedidos-exclusivos', {
        presentacion_id: presentacionId,
        cantidad,
        cliente: { nombre: nombre.trim(), telefono: telefono.trim() },
      })
      setResultado(data)
    } catch (err) {
      setError(err.response?.data?.error ?? 'No se pudo registrar el pedido. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,18,8,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ backgroundColor: '#fff' }}
        onClick={e => e.stopPropagation()}
      >
        {resultado ? (
          <div className="flex flex-col gap-4 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: 'rgba(37,211,102,0.12)' }}
              aria-hidden="true"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="font-display text-xl" style={{ color: 'var(--color-secondary)' }}>
              Pedido {resultado.numero} registrado
            </h3>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Envialo por WhatsApp para que un agente lo coordine con vos.
            </p>
            <a
              href={resultado.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full justify-center"
              style={{ backgroundColor: '#25D366' }}
            >
              Enviar pedido por WhatsApp
            </a>
            <button type="button" onClick={onClose} className="text-sm underline" style={{ color: 'var(--color-text-muted)' }}>
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h3 className="font-display text-xl" style={{ color: 'var(--color-secondary)' }}>
              Hacer pedido
            </h3>
            <p className="text-sm rounded-xl p-3" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-text)' }}>
              {AVISO_PEDIDO_EXCLUSIVO}
            </p>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pe-nombre" className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Nombre</label>
              <input id="pe-nombre" className="input-base" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" autoComplete="name" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pe-telefono" className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Teléfono</label>
              <input id="pe-telefono" className="input-base" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="0981 000 000" type="tel" autoComplete="tel" />
            </div>

            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Cantidad:</span>
              <QuantitySelector value={cantidad} max={maxQty} onChange={setCantidad} />
            </div>

            {error && <p className="text-sm" style={{ color: 'var(--color-danger)' }} role="alert">{error}</p>}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-outline flex-1 justify-center">Cancelar</button>
              <motion.button
                type="submit" whileTap={{ scale: 0.97 }} disabled={loading}
                className="btn-primary flex-1 justify-center"
                style={loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
              >
                {loading ? 'Enviando...' : 'Enviar pedido'}
              </motion.button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  )
}
