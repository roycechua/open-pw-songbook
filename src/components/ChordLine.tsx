import type { SongLine, ViewMode } from '#/lib/songbook'

type Props = {
  line: SongLine
  mode: ViewMode
}

export function ChordLine({ line, mode }: Props) {
  const chordsOnly: string[] = []
  const lyricsParts: Array<{ chord?: string; lyric: string }> = []

  let pendingChord: string | undefined
  for (const token of line.tokens) {
    if (token.kind === 'chord') {
      if (pendingChord) {
        lyricsParts.push({ chord: pendingChord, lyric: '' })
      }
      pendingChord = token.raw
      chordsOnly.push(token.raw)
    } else {
      lyricsParts.push({ chord: pendingChord, lyric: token.text })
      pendingChord = undefined
    }
  }
  if (pendingChord) {
    lyricsParts.push({ chord: pendingChord, lyric: '' })
  }

  if (mode === 'lyrics') {
    const text = line.tokens
      .filter((t) => t.kind === 'lyric')
      .map((t) => (t.kind === 'lyric' ? t.text : ''))
      .join('')
    return (
      <div className="song-line song-line--lyrics">
        <span className="lyric-text">{text || '\u00a0'}</span>
      </div>
    )
  }

  return (
    <div className="song-line song-line--chords">
      {lyricsParts.map((part, i) => (
        <span key={i} className="chord-lyric-pair">
          <span className="chord-text" aria-hidden={!part.chord}>
            {part.chord || '\u00a0'}
          </span>
          <span className="lyric-text">{part.lyric || '\u00a0'}</span>
        </span>
      ))}
    </div>
  )
}
