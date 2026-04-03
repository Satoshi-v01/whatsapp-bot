import { Helmet } from 'react-helmet-async'

const SITE_NAME = import.meta.env.VITE_SITE_NAME ?? 'Sosa Bulls'
const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://sosabulls.com.py'
const DEFAULT_IMAGE = `${SITE_URL}/assets/og-image.jpg`

export default function SEOHead({
  title,
  description = 'Alimentos, accesorios y productos premium para perros y gatos en Paraguay.',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
}) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — Tienda de Mascotas en Paraguay`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  )
}
