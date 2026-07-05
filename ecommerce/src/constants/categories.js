export const CATEGORIES = [
  {
    slug: 'perros',
    label: 'Perros',
    seoTitle: 'Alimento para Perros en Paraguay — Envio a Domicilio',
    description: 'Alimento balanceado, húmedos, snacks y accesorios para perros.',
    color: '#ffa601',
    bg: '#fff8e6',
  },
  {
    slug: 'gatos',
    label: 'Gatos',
    seoTitle: 'Alimento para Gatos en Paraguay — Royal Canin, Pro Plan y mas',
    description: 'Alimento balanceado, húmedos, snacks, arena sanitaria y accesorios para gatos.',
    color: '#7c3aed',
    bg: '#f3eeff',
  },
  {
    slug: 'medicamentos',
    label: 'Medicamentos',
    seoTitle: 'Antiparasitarios y Vitaminas para Mascotas — Paraguay',
    description: 'Antiparasitarios, vitaminas y suplementos para perros y gatos.',
    color: '#0ea5e9',
    bg: '#e6f6ff',
  },
  {
    slug: 'accesorios',
    label: 'Accesorios',
    seoTitle: 'Accesorios para Mascotas — Correas, Camas, Comederos',
    description: 'Correas, camas, comederos, bebederos y juguetes para perros y gatos.',
    color: '#f97316',
    bg: '#fff3e8',
  },
  {
    slug: 'cuidado',
    label: 'Cuidado',
    seoTitle: 'Cuidado e Higiene para Mascotas — Shampoos y Grooming',
    description: 'Shampoos, cepillos, toallitas y productos de grooming e higiene para mascotas.',
    color: '#10b981',
    bg: '#e8fdf4',
  },
  {
    slug: 'ofertas',
    label: 'Ofertas',
    seoTitle: 'Ofertas en Alimentos y Accesorios para Mascotas',
    description: 'Promociones y descuentos en alimentos balanceados y accesorios para mascotas.',
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
