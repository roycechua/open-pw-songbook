import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import {
  SNIPPETS,
  chordproExtensions,
  type SnippetId,
} from '#/lib/songbook/chordpro-language'

export type ChordProEditorHandle = {
  insertSnippet: (id: SnippetId) => void
  focus: () => void
}

type Props = {
  value: string
  onChange: (value: string) => void
  id?: string
  'aria-label'?: string
}

export const ChordProEditor = forwardRef<ChordProEditorHandle, Props>(
  function ChordProEditor(
    { value, onChange, id, 'aria-label': ariaLabel = 'ChordPro source' },
    ref,
  ) {
    const parentRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useImperativeHandle(ref, () => ({
      insertSnippet(snippetId) {
        const view = viewRef.current
        if (!view) return
        const text = SNIPPETS[snippetId]
        const { from, to } = view.state.selection.main
        view.dispatch({
          changes: { from, to, insert: text },
          selection: {
            anchor: from + text.length,
          },
        })
        view.focus()
      },
      focus() {
        viewRef.current?.focus()
      },
    }))

    useEffect(() => {
      if (!parentRef.current) return

      const state = EditorState.create({
        doc: value,
        extensions: [
          ...chordproExtensions({
            placeholderText:
              '{title: My Song}\n{key: C}\n\n{start_of_verse}\n[C]Lyrics here\n{end_of_verse}\n',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString())
            }
          }),
          EditorView.theme({
            '&': {
              height: '100%',
              fontSize: '1rem',
            },
            '.cm-scroller': {
              fontFamily: 'var(--font-chord), ui-monospace, monospace',
              lineHeight: '1.45',
            },
            '.cm-content': {
              padding: '0.75rem 0',
              caretColor: 'var(--ink)',
            },
            '.cm-gutters': {
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
            },
            '&.cm-focused': {
              outline: '2px solid var(--accent)',
              outlineOffset: '1px',
            },
            '.cm-activeLine': {
              backgroundColor: 'color-mix(in srgb, var(--accent-soft) 55%, transparent)',
            },
            '.cm-activeLineGutter': {
              backgroundColor: 'transparent',
            },
          }),
          EditorView.contentAttributes.of({
            'aria-label': ariaLabel,
            ...(id ? { id } : {}),
          }),
        ],
      })

      const view = new EditorView({
        state,
        parent: parentRef.current,
      })
      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
      // Mount once; value sync handled below.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const view = viewRef.current
      if (!view) return
      const current = view.state.doc.toString()
      if (current === value) return

      // Replace only the changed span so cursor/scroll map cleanly when
      // form fields update `{title}` / `{artist}` / `{key}` at the top.
      let start = 0
      const minLen = Math.min(current.length, value.length)
      while (start < minLen && current[start] === value[start]) start++

      let endOld = current.length
      let endNew = value.length
      while (
        endOld > start &&
        endNew > start &&
        current[endOld - 1] === value[endNew - 1]
      ) {
        endOld--
        endNew--
      }

      view.dispatch({
        changes: {
          from: start,
          to: endOld,
          insert: value.slice(start, endNew),
        },
      })
    }, [value])

    return (
      <div
        ref={parentRef}
        className="chordpro-editor"
        data-chordpro-editor
      />
    )
  },
)
