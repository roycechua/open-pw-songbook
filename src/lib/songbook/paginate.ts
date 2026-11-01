import type { ParsedBlock, ViewMode } from './types'
import { lineHasContent } from './parse'

/** Drop blank lines at the start of a page so section labels sit nearer the top. */
export function trimLeadingEmptyBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
  let start = 0
  while (start < blocks.length) {
    const block = blocks[start]!
    if (block.kind === 'line' && !lineHasContent(block)) {
      start += 1
      continue
    }
    break
  }
  return start === 0 ? blocks : blocks.slice(start)
}

/** Wide enough for two readable lyric columns inside the page card. */
export const TWO_COLUMN_MIN_WIDTH = 700

export function sheetColumnCount(scrollerWidthPx: number): 1 | 2 {
  return scrollerWidthPx >= TWO_COLUMN_MIN_WIDTH ? 2 : 1
}

type PageBudgetOptions = {
  /** Available height of the page scroller (excludes toolbar/charts). */
  scrollerHeightPx: number
  scrollerWidthPx: number
  mode: ViewMode
  columns?: 1 | 2
}

/**
 * Estimate how many song blocks fit on one snap page.
 * Uses the measured scroller size so toolbar/charts wrapping is included.
 * Stays conservative on narrow screens where chord lines wrap and grow taller.
 * Two-column layouts roughly double capacity (CSS columns fill top→bottom, left→right).
 */
export function linesPerPageForHeight(options: PageBudgetOptions): number {
  const { scrollerHeightPx, scrollerWidthPx, mode } = options
  const columns = options.columns ?? sheetColumnCount(scrollerWidthPx)

  // Page + inner padding (use continued-page top padding as worst case)
  const chromeY = scrollerWidthPx >= 768 ? 28 + 28 + 34 + 40 : 12 + 28 + 28 + 36
  const usable = Math.max(140, scrollerHeightPx - chromeY)

  // Per-column width is tighter in 2-col mode, so lines wrap a bit more
  const columnWidthApprox =
    columns === 2
      ? (scrollerWidthPx - 80) / 2
      : scrollerWidthPx

  // Chord+lyric pairs ~40px; wrapped pairs on narrow widths run taller
  const baseLinePx = mode === 'lyrics' ? 26 : 40
  const narrowPenalty =
    columnWidthApprox < 300 ? 6 : columnWidthApprox < 400 ? 3 : 0
  const linePx = baseLinePx + narrowPenalty

  // Extra slack in 2-col mode — both columns need clear bottom breathing room
  const slack = columns === 2 ? 36 : 20
  const perColumn = Math.floor((usable - slack) / linePx)
  const estimated = perColumn * columns

  return Math.max(4, Math.min(columns === 2 ? 28 : 16, estimated))
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
      pages.push(trimLeadingEmptyBlocks(current))
      current = []
      count = 0
    }
  }

  const weightOf = (block: ParsedBlock): number =>
    block.kind === 'line'
      ? lineHasContent(block) || block.tokens.length === 0
        ? 1
        : 0.5
      : 1.2

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!

    // Don't burn page budget on blank lines at the top of a page
    if (
      current.length === 0 &&
      block.kind === 'line' &&
      !lineHasContent(block)
    ) {
      continue
    }

    const weight = weightOf(block)

    if (count + weight > linesPerPage && current.length > 0) {
      flush()
      if (block.kind === 'line' && !lineHasContent(block)) {
        continue
      }
    }

    // Keep section headers with at least one following content block
    if (
      block.kind === 'section' &&
      current.length > 0 &&
      count + weight + 1 > linesPerPage
    ) {
      flush()
    }

    current.push(block)
    count += weight
  }

  flush()
  return pages.length > 0 ? pages : [[]]
}
