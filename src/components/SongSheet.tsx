import {
  groupIntoSections,
  tidyBlocks,
  trimLeadingEmptyBlocks,
  type LayoutDensity,
  type ParsedBlock,
  type ViewMode,
} from '#/lib/songbook'
import { ChordLine } from './ChordLine'

type Props = {
  blocks: ParsedBlock[]
  mode: ViewMode
  columns?: 1 | 2
  density?: LayoutDensity
  /** Blocks are already tidied. Skip a second pass so indices stay aligned. */
  prepared?: boolean
}

function renderBlock(block: ParsedBlock, index: number, mode: ViewMode) {
  if (block.kind === 'section') {
    return (
      <div key={index} data-block-index={index} className="song-section-label">
        {block.label}
      </div>
    )
  }
  if (block.kind === 'comment') {
    return (
      <div key={index} data-block-index={index} className="song-comment">
        {block.text}
      </div>
    )
  }
  return <ChordLine key={index} line={block} mode={mode} blockIndex={index} />
}

export function SongSheet({
  blocks,
  mode,
  columns = 1,
  density = 'compact',
  prepared = false,
}: Props) {
  const sections = groupIntoSections(
    prepared ? blocks : trimLeadingEmptyBlocks(tidyBlocks(blocks)),
  )
  let blockIndex = 0

  return (
    <div
      className={
        columns === 2 ? 'song-sheet song-sheet--columns' : 'song-sheet'
      }
      data-density={density}
    >
      {sections.map((section, si) => (
        <div key={si} className="song-section">
          {section.map((block) => {
            const index = blockIndex
            blockIndex += 1
            return renderBlock(block, index, mode)
          })}
        </div>
      ))}
    </div>
  )
}
