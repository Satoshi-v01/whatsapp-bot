/**
 * Formatea un número como precio en Guaraníes paraguayos.
 * Ejemplo: 25000 → "Gs. 25.000"
 */
export function formatPrice(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Gs. 0'
  return `Gs. ${Number(amount).toLocaleString('es-PY')}`
}
