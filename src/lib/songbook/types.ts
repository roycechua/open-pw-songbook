export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'

export type SongMeta = {
  slug: string
  title: string
  artist: string
  originalKey: string
  chordPro: string
}

export type ChordToken = {
  kind: 'chord'
  raw: string
  root: string
  suffix: string
  bass: string | null
}

export type LyricToken = {
  kind: 'lyric'
  text: string
}

export type LineToken = ChordToken | LyricToken

export type SongLine = {
  kind: 'line'
  tokens: LineToken[]
}

export type SectionHeader = {
  kind: 'section'
  label: string
}

export type CommentLine = {
  kind: 'comment'
  text: string
}

export type ParsedBlock = SongLine | SectionHeader | CommentLine

export type ParsedSong = {
  title: string
  artist: string
  key: string
  blocks: ParsedBlock[]
}

export type ViewMode = 'chords' | 'lyrics'

export type ChartInstrument = 'guitar' | 'piano' | 'both' | 'off'
