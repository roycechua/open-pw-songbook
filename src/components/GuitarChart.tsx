import { guitarShapeFor } from '#/lib/songbook'

type Props = {
  chord: string
}

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e']

export function GuitarChart({ chord }: Props) {
  const shape = guitarShapeFor(chord)
  const frets = shape?.frets ?? [-1, -1, -1, -1, -1, -1]
  const base = shape?.baseFret ?? 1
  const showBase = base > 1

  const width = 72
  const height = 88
  const left = 14
  const top = 18
  const nutH = 3
  const fretH = 14
  const stringGap = 10

  return (
    <div className="chord-chart guitar-chart">
      <div className="chord-chart__name">{chord}</div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Guitar chord ${chord}`}
      >
        {showBase && (
          <text x={2} y={top + fretH * 0.7} className="chart-base-fret">
            {base}
          </text>
        )}
        {/* Nut or top bar */}
        <rect
          x={left}
          y={top}
          width={stringGap * 5}
          height={nutH}
          fill={showBase ? '#8a8580' : '#1a1a1a'}
        />
        {/* Frets */}
        {[1, 2, 3, 4].map((f) => (
          <line
            key={f}
            x1={left}
            y1={top + nutH + f * fretH}
            x2={left + stringGap * 5}
            y2={top + nutH + f * fretH}
            stroke="#8a8580"
            strokeWidth={1}
          />
        ))}
        {/* Strings */}
        {STRING_LABELS.map((_, i) => (
          <line
            key={i}
            x1={left + i * stringGap}
            y1={top}
            x2={left + i * stringGap}
            y2={top + nutH + 4 * fretH}
            stroke="#3d3a36"
            strokeWidth={1.2}
          />
        ))}
        {/* Finger markers / open / mute */}
        {frets.map((fret, i) => {
          const x = left + i * stringGap
          if (fret < 0) {
            return (
              <text
                key={i}
                x={x}
                y={top - 6}
                textAnchor="middle"
                className="chart-mute"
              >
                ×
              </text>
            )
          }
          if (fret === 0) {
            return (
              <circle
                key={i}
                cx={x}
                cy={top - 7}
                r={3.5}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth={1.2}
              />
            )
          }
          const displayFret = showBase ? fret - base + 1 : fret
          const y = top + nutH + (displayFret - 0.5) * fretH
          return <circle key={i} cx={x} cy={y} r={4.5} fill="#1a1a1a" />
        })}
      </svg>
    </div>
  )
}
