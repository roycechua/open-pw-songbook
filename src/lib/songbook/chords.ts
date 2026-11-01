import { noteIndex, splitChord } from './transpose'

/** Frets: -1 = muted, 0 = open, 1–4 = fret. Order E A D G B e. */
export type GuitarShape = {
  frets: [number, number, number, number, number, number]
  baseFret?: number
}

/**
 * Common open/barre shapes keyed by normalized chord name (no slash bass).
 * Falls back to a simple triad shape when missing.
 */
const GUITAR_SHAPES: Record<string, GuitarShape> = {
  C: { frets: [-1, 3, 2, 0, 1, 0] },
  Cm: { frets: [-1, 3, 5, 5, 4, 3], baseFret: 3 },
  'C7': { frets: [-1, 3, 2, 3, 1, 0] },
  D: { frets: [-1, -1, 0, 2, 3, 2] },
  Dm: { frets: [-1, -1, 0, 2, 3, 1] },
  'D7': { frets: [-1, -1, 0, 2, 1, 2] },
  E: { frets: [0, 2, 2, 1, 0, 0] },
  Em: { frets: [0, 2, 2, 0, 0, 0] },
  'E7': { frets: [0, 2, 0, 1, 0, 0] },
  F: { frets: [1, 3, 3, 2, 1, 1] },
  Fm: { frets: [1, 3, 3, 1, 1, 1] },
  G: { frets: [3, 2, 0, 0, 0, 3] },
  Gm: { frets: [3, 5, 5, 3, 3, 3], baseFret: 3 },
  'G7': { frets: [3, 2, 0, 0, 0, 1] },
  A: { frets: [-1, 0, 2, 2, 2, 0] },
  Am: { frets: [-1, 0, 2, 2, 1, 0] },
  'A7': { frets: [-1, 0, 2, 0, 2, 0] },
  B: { frets: [-1, 2, 4, 4, 4, 2], baseFret: 2 },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], baseFret: 2 },
  'B7': { frets: [-1, 2, 1, 2, 0, 2] },
  Bb: { frets: [-1, 1, 3, 3, 3, 1], baseFret: 1 },
  Bbm: { frets: [-1, 1, 3, 3, 2, 1], baseFret: 1 },
  'F#': { frets: [2, 4, 4, 3, 2, 2], baseFret: 2 },
  'F#m': { frets: [2, 4, 4, 2, 2, 2], baseFret: 2 },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], baseFret: 4 },
  'G#m': { frets: [4, 6, 6, 4, 4, 4], baseFret: 4 },
  Ab: { frets: [4, 6, 6, 5, 4, 4], baseFret: 4 },
  Eb: { frets: [-1, 6, 5, 3, 4, 3], baseFret: 3 },
  Db: { frets: [-1, 4, 6, 6, 6, 4], baseFret: 4 },
}

const MAJOR_INTERVALS = [0, 4, 7]
const MINOR_INTERVALS = [0, 3, 7]
const DOM7_INTERVALS = [0, 4, 7, 10]
const MAJ7_INTERVALS = [0, 4, 7, 11]
const MIN7_INTERVALS = [0, 3, 7, 10]

function intervalsForSuffix(suffix: string): number[] {
  const s = suffix.toLowerCase()
  if (s.startsWith('maj7') || s.startsWith('M7')) return MAJ7_INTERVALS
  if (s.startsWith('m7') || s.startsWith('min7')) return MIN7_INTERVALS
  if (s.startsWith('7')) return DOM7_INTERVALS
  if (s.startsWith('m') || s.startsWith('min')) return MINOR_INTERVALS
  return MAJOR_INTERVALS
}

export function guitarShapeFor(chord: string): GuitarShape | null {
  const { root, suffix } = splitChord(chord)
  const key = `${root}${suffix}`
  if (GUITAR_SHAPES[key]) return GUITAR_SHAPES[key]!
  if (GUITAR_SHAPES[root]) return GUITAR_SHAPES[root]!
  // Try enharmonic flat/sharp siblings via common aliases
  const aliases: Record<string, string> = {
    'C#': 'Db',
    Db: 'C#',
    'D#': 'Eb',
    Eb: 'D#',
    'F#': 'Gb',
    Gb: 'F#',
    'G#': 'Ab',
    Ab: 'G#',
    'A#': 'Bb',
    Bb: 'A#',
  }
  const alt = aliases[root]
  if (alt) {
    const altKey = `${alt}${suffix}`
    if (GUITAR_SHAPES[altKey]) return GUITAR_SHAPES[altKey]!
    if (GUITAR_SHAPES[alt]) return GUITAR_SHAPES[alt]!
  }
  return null
}

/** Piano pitch classes (0–11) for a chord symbol. */
export function pianoNotesFor(chord: string): number[] {
  const { root, suffix } = splitChord(chord)
  const rootIdx = noteIndex(root)
  if (rootIdx === null) return []
  return intervalsForSuffix(suffix).map((i) => (rootIdx + i) % 12)
}

export const PIANO_NOTE_NAMES_SHARP = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const
