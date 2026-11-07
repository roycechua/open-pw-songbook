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

export type SongStatus = 'draft' | 'published'

/** Catalog / list row (no ChordPro body). */
export type SongListItem = {
  id: string
  ownerId: string
  username: string
  slug: string
  title: string
  artist: string
  originalKey: string
  status: SongStatus
}

/** Full song including ChordPro source. */
export type SongMeta = SongListItem & {
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
  /** Author default from `{x_chord_color: #rrggbb}`. */
  chordColor?: string
  /** Author default from `{x_label_color: #rrggbb}`. */
  labelColor?: string
  blocks: ParsedBlock[]
}

export type ViewMode = 'chords' | 'lyrics'

export type ChartInstrument = 'guitar' | 'piano' | 'both' | 'off'
