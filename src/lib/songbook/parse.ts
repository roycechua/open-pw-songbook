import type {
  ChordToken,
  LineToken,
  ParsedBlock,
  ParsedSong,
  SongLine,
} from './types'
import {
  preferFlats,
  splitChord,
  transposeChordSymbol,
  keySemitoneDelta,
} from './transpose'

const DIRECTIVE_RE = /^\{([^}:]+)(?::\s*(.*))?\}$/
const CHORD_SPLIT_RE = /(\[[^\]]+\])/

function sectionLabelFromDirective(name: string, value: string | undefined): string | null {
  const n = name.toLowerCase().trim()
  if (n === 'comment' || n === 'c') return value?.trim() || null
  if (n.startsWith('start_of_')) {
    const kind = n.replace('start_of_', '').replace(/_/g, ' ')
    return value?.trim() || kind.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  if (n === 'soc') return value?.trim() || 'Chorus'
  if (n === 'sov') return value?.trim() || 'Verse'
  if (n === 'sob') return value?.trim() || 'Bridge'
  if (n === 'soi') return value?.trim() || 'Intro'
  return null
}

function isEndDirective(name: string): boolean {
  const n = name.toLowerCase().trim()
  return (
    n.startsWith('end_of_') ||
    n === 'eoc' ||
    n === 'eov' ||
    n === 'eob' ||
    n === 'eoi'
  )
}

function parseLineTokens(line: string): LineToken[] {
  const parts = line.split(CHORD_SPLIT_RE)
  const tokens: LineToken[] = []
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('[') && part.endsWith(']')) {
      const raw = part.slice(1, -1)
      const { root, suffix, bass } = splitChord(raw)
      tokens.push({
        kind: 'chord',
        raw,
        root,
        suffix,
        bass,
      })
    } else {
      tokens.push({ kind: 'lyric', text: part })
    }
  }
  return tokens
}

export function parseChordPro(source: string): ParsedSong {
  let title = ''
  let artist = ''
  let key = ''
  const blocks: ParsedBlock[] = []

  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      blocks.push({ kind: 'line', tokens: [{ kind: 'lyric', text: '' }] })
      continue
    }

    const directiveMatch = trimmed.match(DIRECTIVE_RE)
    if (directiveMatch) {
      const name = directiveMatch[1]!.trim()
      const value = directiveMatch[2]?.trim()
      const lower = name.toLowerCase()

      if (lower === 'title' || lower === 't') {
        title = value ?? title
        continue
      }
      if (lower === 'artist' || lower === 'subtitle' || lower === 'st') {
        artist = value ?? artist
        continue
      }
      if (lower === 'key' || lower === 'k') {
        key = value ?? key
        continue
      }
      if (isEndDirective(lower)) continue

      const section = sectionLabelFromDirective(lower, value)
      if (section) {
        if (lower === 'comment' || lower === 'c') {
          blocks.push({ kind: 'comment', text: section })
        } else {
          blocks.push({ kind: 'section', label: section })
        }
        continue
      }
      continue
    }

    blocks.push({ kind: 'line', tokens: parseLineTokens(line) })
  }

  return { title, artist, key, blocks }
}

export function transposeParsedSong(
  song: ParsedSong,
  targetKey: string,
): ParsedSong {
  const fromKey = song.key || 'C'
  const semitones = keySemitoneDelta(fromKey, targetKey)
  const useFlats = preferFlats(targetKey)

  const blocks = song.blocks.map((block): ParsedBlock => {
    if (block.kind !== 'line') return block
    const tokens = block.tokens.map((token): LineToken => {
      if (token.kind !== 'chord') return token
      const next: ChordToken = {
        ...token,
        raw: transposeChordSymbol(token.raw, semitones, useFlats),
      }
      const parts = splitChord(next.raw)
      next.root = parts.root
      next.suffix = parts.suffix
      next.bass = parts.bass
      return next
    })
    return { kind: 'line', tokens }
  })

  return { ...song, key: targetKey, blocks }
}

export function collectChords(blocks: ParsedBlock[]): string[] {
  const seen = new Set<string>()
  const order: string[] = []
  for (const block of blocks) {
    if (block.kind !== 'line') continue
    for (const token of block.tokens) {
      if (token.kind !== 'chord') continue
      if (!seen.has(token.raw)) {
        seen.add(token.raw)
        order.push(token.raw)
      }
    }
  }
  return order
}

export function lineHasContent(line: SongLine): boolean {
  return line.tokens.some((t) =>
    t.kind === 'chord' ? true : t.text.trim().length > 0,
  )
}

const META_ALIASES = {
  title: ['title', 't'],
  artist: ['artist', 'subtitle', 'st'],
  key: ['key', 'k'],
} as const

const TITLE_ALIASES = new Set<string>(META_ALIASES.title)
const ARTIST_ALIASES = new Set<string>(META_ALIASES.artist)
const KEY_ALIASES = new Set<string>(META_ALIASES.key)

export type ChordProMetaFields = {
  title?: string
  artist?: string
  key?: string
}

export type ChordProMetaRead = {
  /** Present when a complete `{title}` / `{t}` directive exists (value may be ""). */
  title?: string
  /** Present when a complete artist/subtitle directive exists. */
  artist?: string
  /** Present when a complete `{key}` / `{k}` directive exists. */
  key?: string
}

/**
 * Read meta directives without treating “missing” the same as “empty”.
 * Incomplete lines like `{title: Foo` (no closing `}`) are ignored so live
 * editing does not clear the form mid-keystroke.
 */
export function readChordProMeta(source: string): ChordProMetaRead {
  const meta: ChordProMetaRead = {}
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (const rawLine of lines) {
    const match = rawLine.trim().match(DIRECTIVE_RE)
    if (!match) continue
    const name = match[1]!.trim().toLowerCase()
    const value = match[2]?.trim() ?? ''

    if (TITLE_ALIASES.has(name)) meta.title = value
    else if (ARTIST_ALIASES.has(name)) meta.artist = value
    else if (KEY_ALIASES.has(name)) meta.key = value
  }

  return meta
}

/**
 * Update or insert a ChordPro meta directive, preserving the existing
 * directive name/alias and indentation when present.
 */
export function upsertChordProDirective(
  source: string,
  aliases: readonly string[],
  primaryName: string,
  value: string,
): string {
  const normalized = source.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const aliasSet = new Set(aliases.map((name) => name.toLowerCase()))

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()
    const match = trimmed.match(DIRECTIVE_RE)
    if (!match) continue

    const name = match[1]!.trim()
    if (!aliasSet.has(name.toLowerCase())) continue

    const indent = line.match(/^\s*/)?.[0] ?? ''
    lines[i] = `${indent}{${name}: ${value}}`
    return lines.join('\n')
  }

  const directive = `{${primaryName}: ${value}}`
  if (!normalized.trim()) return `${directive}\n`
  return `${directive}\n${normalized.replace(/^\n+/, '')}`
}

/** Keep `{title}` / `{artist}` / `{key}` in sync with form metadata. */
export function upsertChordProMeta(
  source: string,
  meta: ChordProMetaFields,
): string {
  let next = source
  if (meta.title !== undefined) {
    next = upsertChordProDirective(
      next,
      META_ALIASES.title,
      'title',
      meta.title,
    )
  }
  if (meta.artist !== undefined) {
    next = upsertChordProDirective(
      next,
      META_ALIASES.artist,
      'artist',
      meta.artist,
    )
  }
  if (meta.key !== undefined) {
    next = upsertChordProDirective(next, META_ALIASES.key, 'key', meta.key)
  }
  return next
}
