export const CATEGORIES = [
  {
    slug: 'perros',
    label: 'Perros',
    description: 'Alimento, juguetes y accesorios para tu perro',
    color: '#ffa601',
    bg: '#fff8e6',
  },
  {
    slug: 'gatos',
    label: 'Gatos',
    description: 'Todo lo que tu gato necesita',
    color: '#7c3aed',
    bg: '#f3eeff',
  },
  {
    slug: 'medicamentos',
    label: 'Medicamentos',
    description: 'Antiparasitarios, vitaminas y salud',
    color: '#0ea5e9',
    bg: '#e6f6ff',
  },
  {
    slug: 'accesorios',
    label: 'Accesorios',
    description: 'Correas, camas, comederos y mas',
    color: '#f97316',
    bg: '#fff3e8',
  },
  {
    slug: 'cuidado',
    label: 'Cuidado',
    description: 'Shampoos, cepillos y grooming',
    color: '#10b981',
    bg: '#e8fdf4',
  },
  {
    slug: 'ofertas',
    label: 'Ofertas',
    description: 'Promociones y descuentos especiales',
    color: '#dc2626',
    bg: '#fff0f0',
  },
]

export const NAV_LINKS = [
  { label: 'Inicio',       path: '/' },
  { label: 'Perros',       path: '/categoria/perros' },
  { label: 'Gatos',        path: '/categoria/gatos' },
  { label: 'Medicamentos', path: '/categoria/medicamentos' },
  { label: 'Accesorios',   path: '/categoria/accesorios' },
  { label: 'Cuidado',      path: '/categoria/cuidado' },
  { label: 'Ofertas',      path: '/categoria/ofertas' },
]

export const SUBCATEGORIES = {
  perros: [
    { slug: 'cachorro',  label: 'Cachorro',  icon: '🐶' },
    { slug: 'adulto',    label: 'Adulto',    icon: '🐕' },
    { slug: 'senior',    label: 'Senior',    icon: '🦮' },
    { slug: 'castrado',  label: 'Castrado',  icon: '🐾' },
    { slug: 'raza-grande', label: 'Raza Grande', icon: '🦴' },
    { slug: 'raza-pequena', label: 'Raza Pequeña', icon: '🐩' },
  ],
  gatos: [
    { slug: 'gatito',   label: 'Gatito',    icon: '🐱' },
    { slug: 'adulto',   label: 'Adulto',    icon: '🐈' },
    { slug: 'senior',   label: 'Senior',    icon: '😺' },
    { slug: 'castrado', label: 'Castrado',  icon: '🐾' },
    { slug: 'indoor',   label: 'Indoor',    icon: '🏠' },
    { slug: 'sterilized', label: 'Esterilizado', icon: '✨' },
  ],
}

export const STOCK_THRESHOLDS = {
  LOW: 10,
}
