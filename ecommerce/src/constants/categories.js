export const CATEGORIES = [
  {
    slug: 'perros',
    label: 'Perros',
    seoTitle: 'Alimento para Perros en Paraguay — Envio a Domicilio',
    description: 'Compra alimento balanceado para perros en Paraguay. Cachorro, adulto, senior, raza grande y pequeña. Marcas premium con delivery a Asuncion y todo el pais.',
    color: '#ffa601',
    bg: '#fff8e6',
  },
  {
    slug: 'gatos',
    label: 'Gatos',
    seoTitle: 'Alimento para Gatos en Paraguay — Royal Canin, Pro Plan y mas',
    description: 'Alimento para gatos, arena sanitaria y accesorios. Royal Canin, Pro Plan, Whiskas y mas. Delivery a Asuncion, Gran Asuncion y todo Paraguay.',
    color: '#7c3aed',
    bg: '#f3eeff',
  },
  {
    slug: 'medicamentos',
    label: 'Medicamentos',
    seoTitle: 'Antiparasitarios y Vitaminas para Mascotas — Paraguay',
    description: 'Antiparasitarios, vitaminas y suplementos para perros y gatos en Paraguay. Productos veterinarios originales con envio a domicilio.',
    color: '#0ea5e9',
    bg: '#e6f6ff',
  },
  {
    slug: 'accesorios',
    label: 'Accesorios',
    seoTitle: 'Accesorios para Mascotas — Correas, Camas, Comederos',
    description: 'Correas, camas, comederos, bebederos y juguetes para perros y gatos en Paraguay. Envio a domicilio en Asuncion y todo el pais.',
    color: '#f97316',
    bg: '#fff3e8',
  },
  {
    slug: 'cuidado',
    label: 'Cuidado',
    seoTitle: 'Cuidado e Higiene para Mascotas — Shampoos y Grooming',
    description: 'Shampoos, cepillos, toallitas y productos de grooming e higiene para mascotas en Paraguay. Delivery a Asuncion y todo el pais.',
    color: '#10b981',
    bg: '#e8fdf4',
  },
  {
    slug: 'ofertas',
    label: 'Ofertas',
    seoTitle: 'Ofertas en Alimentos y Accesorios para Mascotas',
    description: 'Promociones y descuentos en alimentos balanceados y accesorios para mascotas en Paraguay. Envio a domicilio en Asuncion y Gran Asuncion.',
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
