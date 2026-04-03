export const CATEGORIES = [
  {
    slug: 'perros',
    label: 'Perros',
    description: 'Alimentos y accesorios para tu perro',
    color: '#ffa601',
  },
  {
    slug: 'gatos',
    label: 'Gatos',
    description: 'Todo lo que tu gato necesita',
    color: '#3d2c1e',
  },
  {
    slug: 'accesorios',
    label: 'Accesorios',
    description: 'Juguetes, camas, correas y mas',
    color: '#6b4c35',
  },
  {
    slug: 'ofertas',
    label: 'Ofertas',
    description: 'Promociones y descuentos especiales',
    color: '#dc2626',
  },
]

export const NAV_LINKS = [
  { label: 'Inicio', path: '/' },
  { label: 'Perros', path: '/categoria/perros' },
  { label: 'Gatos', path: '/categoria/gatos' },
  { label: 'Accesorios', path: '/categoria/accesorios' },
  { label: 'Ofertas', path: '/categoria/ofertas' },
]

export const STOCK_THRESHOLDS = {
  LOW: 10,
}
