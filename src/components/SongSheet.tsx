import {
  groupIntoSections,
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

function renderBlock(block: ParsedBlock, key: number, mode: ViewMode) {
  if (block.kind === 'section') {
    return (
      <div key={key} className="song-section-label">
        {block.label}
      </div>
    )
  }
  if (block.kind === 'comment') {
    return (
      <div key={key} className="song-comment">
        {block.text}
      </div>
    )
  }
  return <ChordLine key={key} line={block} mode={mode} />
}

export function SongSheet({ blocks, mode, columns = 1 }: Props) {
  const sections = groupIntoSections(trimLeadingEmptyBlocks(blocks))

  return (
    <div
      className={
        columns === 2 ? 'song-sheet song-sheet--columns' : 'song-sheet'
      }
    >
      {sections.map((section, si) => (
        <div key={si} className="song-section">
          {section.map((block, bi) => renderBlock(block, bi, mode))}
        </div>
      ))}
    </div>
  )
}
