import {
  autocompletion,
  completionKeymap,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
  type StreamParser,
} from '@codemirror/language'
import { linter, type Diagnostic } from '@codemirror/lint'
import { EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  keymap,
  lineNumbers,
  placeholder,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'

/** Directives understood by parseChordPro (warn on others). */
export const KNOWN_DIRECTIVES = [
  'title',
  't',
  'artist',
  'subtitle',
  'st',
  'key',
  'k',
  'comment',
  'c',
  'start_of_verse',
  'start_of_chorus',
  'start_of_bridge',
  'start_of_intro',
  'start_of_outro',
  'start_of_tag',
  'end_of_verse',
  'end_of_chorus',
  'end_of_bridge',
  'end_of_intro',
  'end_of_outro',
  'end_of_tag',
  'soc',
  'sov',
  'sob',
  'soi',
  'eoc',
  'eov',
  'eob',
  'eoi',
  'x_chord_color',
  'x_label_color',
] as const

const KNOWN_SET = new Set<string>(KNOWN_DIRECTIVES)

const CHORD_ROOTS = [
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
]

const CHORD_SUFFIXES = [
  '',
  'm',
  'maj7',
  'm7',
  '7',
  'sus2',
  'sus4',
  'add9',
  'dim',
  'aug',
  '2',
  '6',
  '9',
  'm9',
]

const chordproParser: StreamParser<unknown> = {
  name: 'chordpro',
  token(stream) {
    if (stream.sol() && stream.match(/^\{[^}]*\}/)) {
      const text = stream.current()
      if (/^\{c(omment)?([:\s]|$)/i.test(text)) {
        return 'comment'
      }
      return 'keyword'
    }
    if (stream.match(/\[[^\]]*\]/)) {
      return 'string'
    }
    stream.next()
    return null
  },
  tokenTable: {
    keyword: t.keyword,
    string: t.string,
    comment: t.comment,
  },
  languageData: {
    commentTokens: { line: '#' },
  },
}

export const chordproLanguage = StreamLanguage.define(chordproParser)

const chordproHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, class: 'cm-chordpro-directive' },
    { tag: t.string, class: 'cm-chordpro-chord' },
    { tag: t.comment, class: 'cm-chordpro-comment' },
  ]),
)

function directiveCompletions(): Completion[] {
  return KNOWN_DIRECTIVES.map((name) => ({
    label: name,
    type: 'keyword',
    apply: name.includes('start_of_')
      ? `${name}}\n\n{end_of_${name.replace('start_of_', '')}}`
      : name.includes(':')
        ? name
        : `${name}: `,
    detail: 'directive',
  }))
}

function chordCompletions(partial: string): Completion[] {
  const lower = partial.toLowerCase()
  const out: Completion[] = []
  for (const root of CHORD_ROOTS) {
    for (const suffix of CHORD_SUFFIXES) {
      const label = `${root}${suffix}`
      if (!lower || label.toLowerCase().startsWith(lower)) {
        out.push({ label, type: 'variable', detail: 'chord' })
      }
      if (out.length >= 40) return out
    }
  }
  return out
}

export function chordproCompletionSource(context: CompletionContext) {
  const before = context.matchBefore(/\{[a-zA-Z0-9_]*$/)
  if (before) {
    const typed = before.text.slice(1)
    const options = directiveCompletions().filter((c) =>
      c.label.toLowerCase().startsWith(typed.toLowerCase()),
    )
    return {
      from: before.from + 1,
      options,
      validFor: /^[a-zA-Z0-9_]*$/,
    }
  }

  const chord = context.matchBefore(/\[[^\]]*$/)
  if (chord) {
    const inner = chord.text.slice(1)
    return {
      from: chord.from + 1,
      options: chordCompletions(inner),
      validFor: /^[A-Ga-g#b/0-9a-zA-Z]*$/,
    }
  }

  return null
}

export function chordproLinter() {
  return linter((view) => {
    const diagnostics: Diagnostic[] = []
    const text = view.state.doc.toString()
    const lines = text.split('\n')
    let offset = 0

    for (const line of lines) {
      const trimmed = line.trim()
      const dir = trimmed.match(/^\{([^}:]+)(?::\s*(.*))?\}$/)
      if (dir) {
        const name = dir[1]!.trim().toLowerCase()
        if (!KNOWN_SET.has(name) && !name.startsWith('start_of_') && !name.startsWith('end_of_')) {
          const startInLine = line.indexOf('{')
          diagnostics.push({
            from: offset + startInLine,
            to: offset + line.length,
            severity: 'warning',
            message: `Unknown directive “${name}” (preview may ignore it)`,
          })
        }
      }

      let i = 0
      while (i < line.length) {
        if (line[i] === '[') {
          const close = line.indexOf(']', i)
          if (close === -1) {
            diagnostics.push({
              from: offset + i,
              to: offset + line.length,
              severity: 'warning',
              message: 'Unclosed chord bracket “[”',
            })
            break
          }
          i = close + 1
          continue
        }
        if (line[i] === '{') {
          const close = line.indexOf('}', i)
          if (close === -1) {
            diagnostics.push({
              from: offset + i,
              to: offset + line.length,
              severity: 'warning',
              message: 'Unclosed directive “{”',
            })
            break
          }
          i = close + 1
          continue
        }
        i += 1
      }

      offset += line.length + 1
    }

    return diagnostics
  })
}

export const SNIPPETS = {
  verse: `{start_of_verse}\n\n{end_of_verse}\n`,
  chorus: `{start_of_chorus}\n\n{end_of_chorus}\n`,
  bridge: `{start_of_bridge}\n\n{end_of_bridge}\n`,
  intro: `{start_of_intro}\n\n{end_of_intro}\n`,
  chord: `[C]`,
} as const

export type SnippetId = keyof typeof SNIPPETS

export function chordproExtensions(options?: {
  placeholderText?: string
}): Extension[] {
  return [
    chordproLanguage,
    chordproHighlight,
    lineNumbers(),
    highlightActiveLine(),
    drawSelection(),
    history(),
    EditorState.tabSize.of(2),
    EditorView.lineWrapping,
    autocompletion({ override: [chordproCompletionSource] }),
    chordproLinter(),
    keymap.of([
      ...completionKeymap,
      ...historyKeymap,
      ...defaultKeymap,
      indentWithTab,
    ]),
    placeholder(options?.placeholderText ?? 'Paste or write ChordPro…'),
  ]
}
