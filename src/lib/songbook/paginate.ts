import type { ParsedBlock, ViewMode } from './types'
import type { SheetColumnsPref } from './view-prefs'
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

/**
 * Remove blank lines that only create dead vertical space: blanks right
 * before or after a section header (the header already carries spacing),
 * repeated blanks, and blanks at the start/end of the song.
 * Idempotent, so it is safe to apply at both pagination and render time.
 */
export function tidyBlocks(blocks: ParsedBlock[]): ParsedBlock[] {
  const isBlank = (block: ParsedBlock | undefined) =>
    block?.kind === 'line' && !lineHasContent(block)

  const out: ParsedBlock[] = []
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]!
    if (isBlank(block)) {
      const prev = out[out.length - 1]
      // Leading, repeated, or directly after a header
      if (!prev || isBlank(prev) || prev.kind === 'section') continue
      // Directly before the next header (or end of song)
      let j = i + 1
      while (j < blocks.length && isBlank(blocks[j])) j++
      const next = blocks[j]
      if (!next || next.kind === 'section') continue
    }
    out.push(block)
  }
  return out
}

/**
 * Group blocks into sections. A new group starts at each section header;
 * leading content before the first header is its own group.
 */
export function groupIntoSections(blocks: ParsedBlock[]): ParsedBlock[][] {
  const groups: ParsedBlock[][] = []
  let current: ParsedBlock[] = []

  for (const block of blocks) {
    if (block.kind === 'section' && current.length > 0) {
      groups.push(current)
      current = []
    }
    current.push(block)
  }

  if (current.length > 0) groups.push(current)
  return groups
}

/** Wide enough for two readable lyric columns inside the page card. */
export const TWO_COLUMN_MIN_WIDTH = 700

export function sheetColumnCount(scrollerWidthPx: number): 1 | 2 {
  return scrollerWidthPx >= TWO_COLUMN_MIN_WIDTH ? 2 : 1
}

/** Auto uses width. Explicit 1 or 2 overrides it. */
export function resolveSheetColumns(
  pref: SheetColumnsPref,
  scrollerWidthPx: number,
): 1 | 2 {
  if (pref === '1') return 1
  if (pref === '2') return 2
  return sheetColumnCount(scrollerWidthPx)
}

type PageBudgetOptions = {
  /** Available height of the page scroller (excludes toolbar/charts). */
  scrollerHeightPx: number
  scrollerWidthPx: number
  mode: ViewMode
  columns?: 1 | 2
  /** Reader text size multiplier (1 = 100%). */
  fontScale?: number
}

export type PageBudget = {
  linesPerPage: number
  /** Max lines that fit in one column (or the full page when single-column). */
  columnCapacity: number
  columns: 1 | 2
}

/**
 * Estimate how many song blocks fit on one snap page.
 * Uses the measured scroller size so toolbar/charts wrapping is included.
 * Stays conservative on narrow screens where chord lines wrap and grow taller.
 * Two-column layouts roughly double capacity (CSS columns fill top→bottom, left→right).
 */
export function linesPerPageForHeight(options: PageBudgetOptions): PageBudget {
  const { scrollerHeightPx, scrollerWidthPx, mode } = options
  const columns = options.columns ?? sheetColumnCount(scrollerWidthPx)

  // Page + inner padding (use continued-page top padding as worst case)
  const chromeY = scrollerWidthPx >= 768 ? 28 + 28 + 34 + 40 : 12 + 28 + 28 + 36
  const usable = Math.max(140, scrollerHeightPx - chromeY)

  // Per-column width is tighter in 2-col mode, so lines wrap a bit more
  const columnWidthApprox =
    columns === 2 ? (scrollerWidthPx - 80) / 2 : scrollerWidthPx

  // Chord+lyric pairs ~40px; wrapped pairs on narrow widths run taller
  const baseLinePx = mode === 'lyrics' ? 26 : 40
  const narrowPenalty =
    columnWidthApprox < 300 ? 6 : columnWidthApprox < 400 ? 3 : 0
  const fontScale = Math.min(2, Math.max(0.5, options.fontScale ?? 1))
  const linePx = (baseLinePx + narrowPenalty) * fontScale

  // Extra slack in 2-col mode — both columns need clear bottom breathing room
  const slack = columns === 2 ? 36 : 20
  const columnCapacity = Math.max(4, Math.floor((usable - slack) / linePx))
  const linesPerPage = Math.min(
    Math.round((columns === 2 ? 28 : 16) / fontScale),
    columnCapacity * columns,
  )

  return {
    linesPerPage: Math.max(4, linesPerPage),
    columnCapacity,
    columns,
  }
}

function blockWeight(block: ParsedBlock): number {
  if (block.kind === 'line') {
    return lineHasContent(block) || block.tokens.length === 0 ? 1 : 0.5
  }
  return 1.2
}

function sectionWeight(section: ParsedBlock[]): number {
  return section.reduce((sum, block) => sum + blockWeight(block), 0)
}

/**
 * Pack song blocks into horizontal pages.
 * Keeps each section together when it fits in one column (or page).
 * Oversized sections fall back to block-level packing.
 */
export function paginateBlocks(
  blocks: ParsedBlock[],
  budget: PageBudget | number,
): ParsedBlock[][] {
  const linesPerPage =
    typeof budget === 'number' ? budget : budget.linesPerPage
  const columnCapacity =
    typeof budget === 'number'
      ? budget
      : budget.columnCapacity

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

  const pushBlock = (block: ParsedBlock) => {
    if (
      current.length === 0 &&
      block.kind === 'line' &&
      !lineHasContent(block)
    ) {
      return
    }

    const weight = blockWeight(block)
    if (count + weight > linesPerPage && current.length > 0) {
      flush()
      if (block.kind === 'line' && !lineHasContent(block)) return
    }
    current.push(block)
    count += weight
  }

  const pushSectionTogether = (section: ParsedBlock[]) => {
    const weight = sectionWeight(section)
    if (count + weight > linesPerPage && current.length > 0) {
      flush()
    }
    for (const block of section) {
      if (
        current.length === 0 &&
        block.kind === 'line' &&
        !lineHasContent(block)
      ) {
        continue
      }
      current.push(block)
      count += blockWeight(block)
    }
  }

  const sections = groupIntoSections(blocks)

  for (const section of sections) {
    const weight = sectionWeight(section)

    // Fits in one column/page → never split across column or page
    if (weight <= columnCapacity) {
      pushSectionTogether(section)
      continue
    }

    // Too tall for one column: start fresh, then pack block-by-block
    if (current.length > 0) flush()
    for (const block of section) {
      pushBlock(block)
    }
  }

  flush()
  return pages.length > 0 ? pages : [[]]
}

/** Smallest text scale "fit to one page" is allowed to apply. */
export const FIT_TO_PAGE_MIN_SCALE = 0.85

export type MeasuredPackOptions = {
  /** Usable height of one column, in px. */
  columnHeight: number
  columns: 1 | 2
  /** Keep a section intact when the whole section fits in one column. */
  keepSectionsTogether: boolean
}

type PackUnit = {
  indices: number[]
  height: number
}

function isStickyBlock(block: ParsedBlock): boolean {
  return block.kind === 'section' || block.kind === 'comment'
}

/** Labels and comments stay with the following content line. */
function unitsFromLines(
  blocks: ParsedBlock[],
  heights: number[],
  offset: number,
): PackUnit[] {
  const units: PackUnit[] = []
  let i = 0
  while (i < blocks.length) {
    if (isStickyBlock(blocks[i]!)) {
      const indices: number[] = []
      let height = 0
      while (i < blocks.length && isStickyBlock(blocks[i]!)) {
        indices.push(offset + i)
        height += heights[offset + i] ?? 0
        i += 1
      }
      if (i < blocks.length) {
        indices.push(offset + i)
        height += heights[offset + i] ?? 0
        i += 1
      }
      if (indices.length > 0) units.push({ indices, height })
      continue
    }
    units.push({
      indices: [offset + i],
      height: heights[offset + i] ?? 0,
    })
    i += 1
  }
  return units
}

function unitsForPacking(
  blocks: ParsedBlock[],
  heights: number[],
  columnHeight: number,
  keepSectionsTogether: boolean,
): PackUnit[] {
  if (!keepSectionsTogether) return unitsFromLines(blocks, heights, 0)

  const sections = groupIntoSections(blocks)
  const units: PackUnit[] = []
  let offset = 0
  for (const section of sections) {
    let total = 0
    for (let i = 0; i < section.length; i += 1) {
      total += heights[offset + i] ?? 0
    }
    if (total <= columnHeight) {
      units.push({
        indices: section.map((_, i) => offset + i),
        height: total,
      })
    } else {
      units.push(...unitsFromLines(section, heights, offset))
    }
    offset += section.length
  }
  return units
}

/**
 * Pack measured block heights into pages of columns.
 * Returns block indices. A section may split between lines unless
 * `keepSectionsTogether` is set and the section fits in one column.
 * A section label or comment stays with the next content line.
 * A block taller than the column occupies that column by itself.
 */
export function packMeasuredBlocks(
  blocks: ParsedBlock[],
  heights: number[],
  options: MeasuredPackOptions,
): number[][][] {
  const columnHeight = Math.max(0, options.columnHeight)
  const columnCount = options.columns
  const units = unitsForPacking(
    blocks,
    heights,
    columnHeight,
    options.keepSectionsTogether,
  )

  const pages: number[][][] = []
  let page: number[][] = []
  let column: number[] = []
  let used = 0

  const flushColumn = () => {
    if (column.length === 0) return
    page.push(column)
    column = []
    used = 0
    if (page.length === columnCount) {
      pages.push(page)
      page = []
    }
  }

  for (const unit of units) {
    const fits =
      used === 0 || used + unit.height <= columnHeight + 0.5
    if (!fits) flushColumn()
    column.push(...unit.indices)
    used += unit.height
    if (used > columnHeight + 0.5) flushColumn()
  }

  if (column.length > 0) page.push(column)
  if (page.length > 0) pages.push(page)
  return pages.length > 0 ? pages : [[[]]]
}

/**
 * Scale that would fit `totalHeight` into one page, not below
 * FIT_TO_PAGE_MIN_SCALE and not above the reader's current scale.
 * Returns null when no shrink is worth applying.
 */
export function fitScaleForOverflow(
  textScale: number,
  totalHeight: number,
  pageCapacity: number,
): number | null {
  if (!(pageCapacity > 0) || !(totalHeight > pageCapacity)) return null
  const raw = textScale * (pageCapacity / totalHeight)
  const target =
    Math.round(
      Math.max(FIT_TO_PAGE_MIN_SCALE, Math.min(textScale, raw)) * 100,
    ) / 100
  if (target >= textScale - 0.005) return null
  return target
}
