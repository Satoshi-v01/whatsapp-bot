import { useState } from 'react'
import { formatearSoloFecha } from '../utils/fecha'

// Curva Catmull-Rom -> Bezier: suaviza la linea entre puntos sin librerias externas
function construirPathSuave(pts) {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i - 1] || pts[i]
        const p1 = pts[i]
        const p2 = pts[i + 1]
        const p3 = pts[i + 2] || p2
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
}

// Grafico de tendencia (area + linea suave) para series de ventas por dia.
// Reemplaza los bar charts de ancho fijo: con muchos dias las barras o se
// apretaban o estiraban el layout (min-content de un grid item nunca se
// achica solo). Una linea no necesita ancho minimo por punto, asi que
// escala a cualquier cantidad de dias sin verse comprimida ni romper nada.
//
// resaltarHoy: si esta activo, el ultimo punto (hoy) muestra su etiqueta
// como "HOY" en negrita y su punto queda siempre visible, no solo al hover
// — pensado para el resumen de "ultimos 7 dias" de Inicio.
function GraficoTendenciaVentas({ datos, colorLinea, colorTexto, colorTextoMuted, colorGrid, colorFondo, maxEtiquetas = 6, resaltarHoy = false }) {
    const [hoverIndex, setHoverIndex] = useState(null)

    const W = 1000, H = 220
    const PADDING_TOP = 20, PADDING_BOTTOM = 30
    const alturaUtil = H - PADDING_TOP - PADDING_BOTTOM
    const maxVal = Math.max(...datos.map(d => parseInt(d.total)), 1)
    const n = datos.length

    const puntos = datos.map((d, i) => ({
        x: n === 1 ? W / 2 : (i / (n - 1)) * W,
        y: PADDING_TOP + alturaUtil - (parseInt(d.total) / maxVal) * alturaUtil,
        dia: d
    }))

    const pathLinea = construirPathSuave(puntos)
    const pathArea = `${pathLinea} L ${puntos[n - 1].x} ${H - PADDING_BOTTOM} L ${puntos[0].x} ${H - PADDING_BOTTOM} Z`

    // Como mucho `maxEtiquetas` fechas en el eje X, distribuidas parejo (siempre incluye la ultima)
    const step = Math.max(1, Math.ceil(n / maxEtiquetas))
    const indicesLabels = puntos.map((_, i) => i).filter(i => i % step === 0 || i === n - 1)

    const gradId = `grad-tendencia-${colorLinea.replace('#', '')}`
    const activo = hoverIndex !== null ? puntos[hoverIndex] : (resaltarHoy ? puntos[n - 1] : null)

    return (
        <div style={{ position: 'relative' }}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '200px', display: 'block', overflow: 'visible' }}
                onMouseLeave={() => setHoverIndex(null)}>
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colorLinea} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={colorLinea} stopOpacity="0" />
                    </linearGradient>
                </defs>

                <line x1="0" y1={H - PADDING_BOTTOM} x2={W} y2={H - PADDING_BOTTOM} stroke={colorGrid} strokeWidth="1" />

                <path d={pathArea} fill={`url(#${gradId})`} stroke="none" />
                <path d={pathLinea} fill="none" stroke={colorLinea} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {puntos.map((p, i) => (
                    <rect key={i} x={n === 1 ? 0 : (i / n) * W} y="0" width={n === 1 ? W : W / n} height={H}
                        fill="transparent" onMouseEnter={() => setHoverIndex(i)} style={{ cursor: 'pointer' }} />
                ))}

                {hoverIndex !== null && (
                    <line x1={puntos[hoverIndex].x} y1={PADDING_TOP} x2={puntos[hoverIndex].x} y2={H - PADDING_BOTTOM}
                        stroke={colorGrid} strokeWidth="1" strokeDasharray="3,3" />
                )}
                {activo && (
                    <circle cx={activo.x} cy={activo.y} r="4.5" fill={colorLinea} stroke={colorFondo} strokeWidth="2" />
                )}

                {indicesLabels.map(i => {
                    const esUltimaYHoy = resaltarHoy && i === n - 1
                    return (
                        <text key={i} x={puntos[i].x} y={H - 8} textAnchor="middle" fontSize="10"
                            fontWeight={esUltimaYHoy ? '700' : '400'}
                            fill={esUltimaYHoy ? colorTexto : colorTextoMuted}>
                            {esUltimaYHoy ? 'HOY' : formatearSoloFecha(puntos[i].dia.fecha).slice(0, 5)}
                        </text>
                    )
                })}
            </svg>

            {hoverIndex !== null && (
                <div style={{
                    position: 'absolute',
                    left: `${(puntos[hoverIndex].x / W) * 100}%`,
                    top: `${(puntos[hoverIndex].y / H) * 100}%`,
                    // Cerca de los extremos, el tooltip centrado se sale del Card (overflow-hidden)
                    // y queda cortado — se ancla al costado en vez de centrarlo en esos casos.
                    transform: `translate(${hoverIndex === 0 ? '0%' : hoverIndex === n - 1 ? '-100%' : '-50%'}, -130%)`,
                    background: colorFondo,
                    border: `1px solid ${colorGrid}`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: colorTexto,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 5
                }}>
                    <div style={{ fontWeight: 700 }}>Gs. {parseInt(puntos[hoverIndex].dia.total).toLocaleString('es-PY')}</div>
                    <div style={{ color: colorTextoMuted, marginTop: '2px' }}>{formatearSoloFecha(puntos[hoverIndex].dia.fecha)} · {puntos[hoverIndex].dia.cantidad} ventas</div>
                </div>
            )}
        </div>
    )
}

export default GraficoTendenciaVentas
