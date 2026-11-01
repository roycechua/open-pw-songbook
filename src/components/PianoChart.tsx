import { pianoNotesFor } from '#/lib/songbook'

type Props = {
  chord: string
}

/** One octave starting at C (white: C D E F G A B, black: C# D# F# G# A#). */
const WHITE = [0, 2, 4, 5, 7, 9, 11] as const
const BLACK = [
  { note: 1, afterWhite: 0 },
  { note: 3, afterWhite: 1 },
  { note: 6, afterWhite: 3 },
  { note: 8, afterWhite: 4 },
  { note: 10, afterWhite: 5 },
] as const

export function PianoChart({ chord }: Props) {
  const active = new Set(pianoNotesFor(chord))
  const whiteW = 10
  const whiteH = 36
  const blackW = 6
  const blackH = 22
  const width = whiteW * 7
  const height = whiteH + 4

  return (
    <div className="chord-chart piano-chart">
      <div className="chord-chart__name">{chord}</div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Piano chord ${chord}`}
      >
        {WHITE.map((note, i) => {
          const on = active.has(note)
          return (
            <rect
              key={`w-${note}`}
              x={i * whiteW}
              y={2}
              width={whiteW - 1}
              height={whiteH}
              fill={on ? '#2f6fed' : '#f7f4ef'}
              stroke="#3d3a36"
              strokeWidth={0.8}
              rx={1}
            />
          )
        })}
        {BLACK.map(({ note, afterWhite }) => {
          const on = active.has(note)
          const x = (afterWhite + 1) * whiteW - blackW / 2 - 0.5
          return (
            <rect
              key={`b-${note}`}
              x={x}
              y={2}
              width={blackW}
              height={blackH}
              fill={on ? '#2f6fed' : '#1a1a1a'}
              stroke="#1a1a1a"
              strokeWidth={0.5}
              rx={1}
            />
          )
        })}
      </svg>
    </div>
  )
}
