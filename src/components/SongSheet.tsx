import type { ParsedBlock, ViewMode } from '#/lib/songbook'
import { ChordLine } from './ChordLine'

type Props = {
  blocks: ParsedBlock[]
  mode: ViewMode
}

export function SongSheet({ blocks, mode }: Props) {
  return (
    <div className="song-sheet">
      {blocks.map((block, i) => {
        if (block.kind === 'section') {
          return (
            <div key={i} className="song-section-label">
              {block.label}
            </div>
          )
        }
        if (block.kind === 'comment') {
          return (
            <div key={i} className="song-comment">
              {block.text}
            </div>
          )
        }
        return <ChordLine key={i} line={block} mode={mode} />
      })}
    </div>
  )
}
