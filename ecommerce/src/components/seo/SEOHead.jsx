import { useLocation } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'

const SITE_NAME = import.meta.env.VITE_SITE_NAME ?? 'Sosa BULLS'
const SITE_URL  = import.meta.env.VITE_SITE_URL  ?? 'https://sosabulls.com.py'
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`

export default function SEOHead({
  title,
  description = 'Alimentos, accesorios y productos premium para perros y gatos en Paraguay.',
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  schema = null,
}) {
  const { pathname } = useLocation()
  const canonical  = `${SITE_URL}${pathname}`
  const fullTitle  = title
    ? `${title} — ${SITE_NAME}`
    : `${SITE_NAME} — Tienda de Mascotas en Paraguay`

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex,nofollow" />}

      {/* Open Graph */}
      <meta property="og:site_name"   content={SITE_NAME} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image"       content={image} />
      {image === DEFAULT_IMAGE && <meta property="og:image:width"  content="512" />}
      {image === DEFAULT_IMAGE && <meta property="og:image:height" content="512" />}
      <meta property="og:type"        content={type} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:locale"      content="es_PY" />

      {/* Twitter / X Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:site"        content="@sosabulls" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image"       content={image} />

      {/* JSON-LD por pagina */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  )
}
