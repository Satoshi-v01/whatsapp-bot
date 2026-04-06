import * as Slider from '@radix-ui/react-slider'

function fmt(n) {
  return `Gs. ${Math.round(n).toLocaleString('es-PY')}`
}

export default function PriceRangeSlider({ min, max, low, high, onChange }) {
  if (max <= min) return null

  return (
    <>
      <style>{`
        .prs-root  { position: relative; display: flex; align-items: center; width: 100%; height: 20px; touch-action: none; user-select: none; }
        .prs-track { background: rgba(255,166,1,0.18); position: relative; flex-grow: 1; border-radius: 9999px; height: 4px; }
        .prs-range { background: #ffa601; border-radius: 9999px; position: absolute; height: 100%; }
        .prs-thumb {
          display: block; width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 2.5px solid #ffa601;
          box-shadow: 0 2px 8px rgba(255,166,1,0.4);
          transition: box-shadow 0.15s, transform 0.15s;
          cursor: grab;
        }
        .prs-thumb:hover  { box-shadow: 0 0 0 6px rgba(255,166,1,0.15); transform: scale(1.1); }
        .prs-thumb:focus  { outline: none; box-shadow: 0 0 0 6px rgba(255,166,1,0.25); }
        .prs-thumb:active { cursor: grabbing; }
      `}</style>

      <Slider.Root
        className="prs-root"
        min={min}
        max={max}
        step={Math.max(1, Math.round((max - min) / 200))}
        value={[low, high]}
        onValueChange={([l, h]) => onChange(l, h)}
        minStepsBetweenThumbs={1}
      >
        <Slider.Track className="prs-track">
          <Slider.Range className="prs-range" />
        </Slider.Track>
        <Slider.Thumb className="prs-thumb" aria-label="Precio minimo" />
        <Slider.Thumb className="prs-thumb" aria-label="Precio maximo" />
      </Slider.Root>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1208' }}>{fmt(low)}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1208' }}>{fmt(high)}</span>
      </div>
    </>
  )
}
