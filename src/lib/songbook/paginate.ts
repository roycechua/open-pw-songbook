import type { ParsedBlock } from './types'
import { lineHasContent } from './parse'

/**
 * Pack song blocks into horizontal pages.
 * Uses a line budget that scales with viewport height (approx).
 */
export function linesPerPageForHeight(heightPx: number): number {
  // Toolbar ~56px, charts strip ~0–120, padding ~48, line ~28–32px
  const usable = Math.max(200, heightPx - 120)
  const estimated = Math.floor(usable / 30)
  return Math.max(6, Math.min(18, estimated))
}

export function paginateBlocks(
  blocks: ParsedBlock[],
  linesPerPage: number,
): ParsedBlock[][] {
  const pages: ParsedBlock[][] = []
  let current: ParsedBlock[] = []
  let count = 0

  const flush = () => {
    if (current.length > 0) {
      pages.push(current)
      current = []
      count = 0
    }
  }

  for (const block of blocks) {
    const weight =
      block.kind === 'line'
        ? lineHasContent(block) || block.tokens.length === 0
          ? 1
          : 0.5
        : 1.2

    if (count + weight > linesPerPage && current.length > 0) {
      flush()
    }

    // Keep section headers with following content when possible
    current.push(block)
    count += weight
  }

  flush()
  return pages.length > 0 ? pages : [[]]
}
