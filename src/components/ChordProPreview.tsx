import { useDeferredValue, useMemo } from 'react'

import { parseChordPro } from '#/lib/songbook'
import { SongSheet } from './SongSheet'

type Props = {
  source: string
  /** Form metadata when ChordPro body omits title/key. */
  fallbackTitle?: string
  fallbackArtist?: string
  fallbackKey?: string
}

export function ChordProPreview({
  source,
  fallbackTitle = '',
  fallbackArtist = '',
  fallbackKey = '',
}: Props) {
  const deferred = useDeferredValue(source)
  const parsed = useMemo(() => parseChordPro(deferred), [deferred])

  const title = parsed.title || fallbackTitle
  const artist = parsed.artist || fallbackArtist
  const key = parsed.key || fallbackKey
  const hasBlocks = parsed.blocks.some((block) => {
    if (block.kind === 'section' || block.kind === 'comment') return true
    return block.tokens.some((t) =>
      t.kind === 'chord' ? true : t.text.trim().length > 0,
    )
  })

  if (!deferred.trim()) {
    return (
      <div className="chordpro-preview chordpro-preview--empty">
        <p className="chordpro-preview__hint">
          Live preview appears here as you type ChordPro. See{' '}
          <code>samples/adonai.chordpro</code> for a full example.
        </p>
      </div>
    )
  }

  return (
    <div className="chordpro-preview">
      {title || artist || key ? (
        <header className="chordpro-preview__meta">
          {title ? <h3 className="chordpro-preview__title">{title}</h3> : null}
          <p className="chordpro-preview__sub">
            {[artist, key ? `Key ${key}` : ''].filter(Boolean).join(' · ')}
          </p>
        </header>
      ) : null}
      {hasBlocks ? (
        <SongSheet blocks={parsed.blocks} mode="chords" columns={1} />
      ) : (
        <p className="chordpro-preview__hint">
          No lyric or chord lines yet — add a section or a line with{' '}
          <code>[C]</code> chords.
        </p>
      )}
    </div>
  )
}
