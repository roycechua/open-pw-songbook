import type { ChartInstrument } from '#/lib/songbook'
import { GuitarChart } from './GuitarChart'
import { PianoChart } from './PianoChart'

type Props = {
  chords: string[]
  instrument: ChartInstrument
}

export function ChordChartsStrip({ chords, instrument }: Props) {
  if (instrument === 'off' || chords.length === 0) return null

  const showGuitar = instrument === 'guitar' || instrument === 'both'
  const showPiano = instrument === 'piano' || instrument === 'both'

  return (
    <div className="charts-strip no-print-break">
      {chords.map((chord) => (
        <div key={chord} className="charts-strip__item">
          {showGuitar && <GuitarChart chord={chord} />}
          {showPiano && <PianoChart chord={chord} />}
        </div>
      ))}
    </div>
  )
}
