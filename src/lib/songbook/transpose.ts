const SHARP_NOTES = [
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

const FLAT_NOTES = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
] as const

const ENHARMONIC: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const FLAT_KEYS = new Set([
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
  'Abm',
])

export function noteIndex(note: string): number | null {
  const normalized = note.trim()
  if (normalized in ENHARMONIC) return ENHARMONIC[normalized]!
  return null
}

export function preferFlats(key: string): boolean {
  const root = key.replace(/m$/, '')
  return FLAT_KEYS.has(key) || FLAT_KEYS.has(root)
}

export function transposeNote(
  note: string,
  semitones: number,
  useFlats: boolean,
): string {
  const idx = noteIndex(note)
  if (idx === null) return note
  const next = ((idx + semitones) % 12 + 12) % 12
  return useFlats ? FLAT_NOTES[next]! : SHARP_NOTES[next]!
}

export function keySemitoneDelta(fromKey: string, toKey: string): number {
  const fromRoot = fromKey.replace(/m$/, '')
  const toRoot = toKey.replace(/m$/, '')
  const fromIdx = noteIndex(fromRoot)
  const toIdx = noteIndex(toRoot)
  if (fromIdx === null || toIdx === null) return 0
  return toIdx - fromIdx
}

/** Parse a chord like Am7, F#m7b5, G/B into parts. */
export function splitChord(raw: string): {
  root: string
  suffix: string
  bass: string | null
} {
  const trimmed = raw.trim()
  const bassSplit = trimmed.split('/')
  const main = bassSplit[0] ?? trimmed
  const bass = bassSplit[1] ?? null

  const match = main.match(/^([A-G](?:#|b)?)(.*)$/)
  if (!match) {
    return { root: main, suffix: '', bass }
  }
  return { root: match[1]!, suffix: match[2] ?? '', bass }
}

export function transposeChordSymbol(
  raw: string,
  semitones: number,
  useFlats: boolean,
): string {
  if (semitones === 0) return raw
  const { root, suffix, bass } = splitChord(raw)
  const nextRoot = transposeNote(root, semitones, useFlats)
  const nextBass =
    bass !== null ? transposeNote(bass, semitones, useFlats) : null
  return nextBass ? `${nextRoot}${suffix}/${nextBass}` : `${nextRoot}${suffix}`
}

export const COMMON_KEYS = [
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
  'Am',
  'Bbm',
  'Bm',
  'Cm',
  'C#m',
  'Dm',
  'Ebm',
  'Em',
  'Fm',
  'F#m',
  'Gm',
  'G#m',
] as const
