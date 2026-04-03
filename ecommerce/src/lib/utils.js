/**
 * Combina clases CSS condicionalmente (similar a clsx/cn de shadcn)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
