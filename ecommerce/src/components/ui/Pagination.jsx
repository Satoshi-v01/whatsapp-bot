// Componente de paginacion reutilizable
// Uso: <Pagination page={page} totalPages={totalPages} onPage={setPage} color="#ffa601" />

export default function Pagination({ page, totalPages, onPage, color = 'var(--color-primary)' }) {
  if (totalPages <= 1) return null

  // Mostrar max 7 paginas con elipsis
  function getPages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = []
    pages.push(1)
    if (page > 3) pages.push('...')
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p)
    }
    if (page < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  const pages = getPages()

  const btnBase = {
    height: 40, borderRadius: 10, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: '1.5px solid rgba(255,166,1,0.2)',
    fontFamily: 'inherit', transition: 'all 0.15s',
  }

  return (
    <nav aria-label="Paginacion" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 40, flexWrap: 'wrap' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Pagina anterior"
        style={{
          ...btnBase,
          padding: '0 16px',
          background: 'white',
          color: 'var(--color-text)',
          opacity: page === 1 ? 0.38 : 1,
          cursor: page === 1 ? 'not-allowed' : 'pointer',
        }}
      >
        Anterior
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ width: 40, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13 }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            aria-label={`Pagina ${p}`}
            aria-current={p === page ? 'page' : undefined}
            style={{
              ...btnBase,
              width: 40,
              border: `1.5px solid ${p === page ? color : 'rgba(255,166,1,0.2)'}`,
              background: p === page ? color : 'white',
              color: p === page ? 'white' : 'var(--color-text)',
              fontWeight: p === page ? 700 : 600,
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page === totalPages}
        aria-label="Pagina siguiente"
        style={{
          ...btnBase,
          padding: '0 16px',
          background: 'white',
          color: 'var(--color-text)',
          opacity: page === totalPages ? 0.38 : 1,
          cursor: page === totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        Siguiente
      </button>
    </nav>
  )
}
