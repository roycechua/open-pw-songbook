import {
  trimLeadingEmptyBlocks,
  type ParsedBlock,
  type ViewMode,
} from '#/lib/songbook'
import { ChordLine } from './ChordLine'

type Props = {
  blocks: ParsedBlock[]
  mode: ViewMode
  columns?: 1 | 2
}

export function SongSheet({ blocks, mode, columns = 1 }: Props) {
  const visible = trimLeadingEmptyBlocks(blocks)

  return (
    <div
      className={
        columns === 2 ? 'song-sheet song-sheet--columns' : 'song-sheet'
      }
    >
      {visible.map((block, i) => {
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
