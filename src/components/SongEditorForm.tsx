import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { BusyButton } from '#/components/loading'
import {
  COMMON_KEYS,
  createSong,
  downloadChordPro,
  parseChordPro,
  readChordProMeta,
  slugifyTitle,
  updateSong,
  upsertChordProMeta,
  type SongMeta,
  type SongStatus,
  type SongWriteInput,
  type SnippetId,
} from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'
import {
  ChordProEditor,
  type ChordProEditorHandle,
} from './ChordProEditor'
import { ChordProPreview } from './ChordProPreview'

const CHORDPRO_FILE_EXT = /\.(chordpro|cho|crd|txt)$/i

export type SongEditorInitial = {
  id?: string
  title: string
  artist: string
  originalKey: string
  slug: string
  chordPro: string
  status: SongStatus
}

type Props = {
  mode: 'create' | 'edit'
  ownerId: string
  initial: SongEditorInitial
  onSaved: (song: SongMeta) => void
  onCancel?: () => void
}

type PaneMode = 'split' | 'source' | 'preview'

const SNIPPET_BUTTONS: { id: SnippetId; label: string }[] = [
  { id: 'verse', label: 'Verse' },
  { id: 'chorus', label: 'Chorus' },
  { id: 'bridge', label: 'Bridge' },
  { id: 'intro', label: 'Intro' },
  { id: 'chord', label: '[C]' },
]

function seedChordProFromForm(source: string, meta: SongEditorInitial): string {
  const parsed = parseChordPro(source)
  return upsertChordProMeta(source, {
    title: parsed.title || meta.title,
    artist: parsed.artist || meta.artist,
    key: parsed.key || meta.originalKey || 'C',
  })
}

export function SongEditorForm({
  mode,
  ownerId,
  initial,
  onSaved,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial.title)
  const [artist, setArtist] = useState(initial.artist)
  const [originalKey, setOriginalKey] = useState(initial.originalKey || 'C')
  const [slug, setSlug] = useState(initial.slug)
  const [chordPro, setChordPro] = useState(() =>
    seedChordProFromForm(initial.chordPro, initial),
  )
  const [status, setStatus] = useState<SongStatus>(initial.status)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pane, setPane] = useState<PaneMode>('split')
  const editorRef = useRef<ChordProEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slugTouchedRef = useRef(mode === 'edit')
  // Prevent form→ChordPro writes from bouncing back through the parser.
  const metaSyncFromFormRef = useRef(false)

  const syncFormFromChordPro = (source: string, fileName?: string) => {
    const meta = readChordProMeta(source)

    if (meta.title !== undefined) {
      setTitle(meta.title)
      if (meta.title && !slugTouchedRef.current) {
        setSlug(slugifyTitle(meta.title))
      }
    } else if (fileName && mode === 'create' && !slugTouchedRef.current) {
      const base = fileName.replace(CHORDPRO_FILE_EXT, '').trim()
      const fromFile = slugifyTitle(base)
      if (fromFile) {
        const fallbackTitle = base.replace(/[-_]+/g, ' ').trim()
        setTitle(fallbackTitle)
        setSlug(fromFile)
        metaSyncFromFormRef.current = true
        setChordPro(upsertChordProMeta(source, { title: fallbackTitle }))
      }
    }

    if (meta.artist !== undefined) setArtist(meta.artist)
    if (meta.key) setOriginalKey(meta.key)
  }

  useEffect(() => {
    if (metaSyncFromFormRef.current) {
      metaSyncFromFormRef.current = false
      return
    }
    syncFormFromChordPro(chordPro)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- ChordPro is the meta source of truth
  }, [chordPro])

  const updateMetaField = (
    field: 'title' | 'artist' | 'key',
    value: string,
  ) => {
    if (field === 'title') {
      setTitle(value)
      if (!slugTouchedRef.current) setSlug(slugifyTitle(value))
    } else if (field === 'artist') {
      setArtist(value)
    } else {
      setOriginalKey(value)
    }

    metaSyncFromFormRef.current = true
    setChordPro((prev) =>
      upsertChordProMeta(prev, {
        [field]: value,
      }),
    )
  }

  const applyImportedChordPro = (source: string, fileName: string) => {
    const text = source.replace(/^\uFEFF/, '')
    if (!text.trim()) {
      setError('That file is empty')
      return
    }

    setError(null)
    setChordPro(text)
    syncFormFromChordPro(text, fileName)
    if (pane === 'preview') setPane('split')
  }

  const onImportClick = () => {
    fileInputRef.current?.click()
  }

  const onImportFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    void file
      .text()
      .then((text) => applyImportedChordPro(text, file.name))
      .catch(() => setError('Could not read that file'))
  }

  const buildInput = (): SongWriteInput => ({
    title,
    artist,
    originalKey,
    slug,
    chordPro,
    status,
  })

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (!chordPro.trim()) {
      setError('ChordPro body is required')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const input = buildInput()
      const result =
        mode === 'create' || !initial.id
          ? await createSong(supabase, ownerId, input)
          : await updateSong(supabase, initial.id, input)

      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Save failed')
        return
      }
      onSaved(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const insertSnippet = (id: SnippetId) => {
    editorRef.current?.insertSnippet(id)
    if (pane === 'preview') setPane('source')
  }

  return (
    <form className="song-form" onSubmit={(e) => void onSubmit(e)}>
      {error ? (
        <p className="song-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="song-form__grid">
        <label className="song-form__field">
          <span>Title</span>
          <input
            value={title}
            onChange={(e) => updateMetaField('title', e.target.value)}
            required
            autoComplete="off"
          />
        </label>

        <label className="song-form__field">
          <span>Artist</span>
          <input
            value={artist}
            onChange={(e) => updateMetaField('artist', e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="song-form__field">
          <span>Key</span>
          <select
            value={originalKey}
            onChange={(e) => updateMetaField('key', e.target.value)}
            aria-label="Original key"
          >
            {(COMMON_KEYS as readonly string[]).includes(originalKey) ? null : (
              <option value={originalKey}>{originalKey}</option>
            )}
            {COMMON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label className="song-form__field">
          <span>Slug</span>
          <input
            value={slug}
            onChange={(e) => {
              slugTouchedRef.current = true
              setSlug(e.target.value.trim().toLowerCase())
            }}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens"
            autoComplete="off"
          />
        </label>

        <label className="song-form__field">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as SongStatus)}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
      </div>

      <div className="chordpro-workspace">
        <div className="chordpro-workspace__toolbar">
          <span className="chordpro-workspace__label">ChordPro</span>
          <div
            className="chordpro-workspace__snippets"
            role="group"
            aria-label="Insert ChordPro snippets"
          >
            {SNIPPET_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                type="button"
                className="toolbar-btn"
                onClick={() => insertSnippet(btn.id)}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <div
            className="chordpro-workspace__panes"
            role="tablist"
            aria-label="Editor layout"
          >
            {(
              [
                { id: 'split', label: 'Split' },
                { id: 'source', label: 'Source' },
                { id: 'preview', label: 'Preview' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={pane === tab.id}
                className={
                  pane === tab.id
                    ? 'toolbar-btn is-active'
                    : 'toolbar-btn'
                }
                onClick={() => setPane(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={
            pane === 'split'
              ? 'chordpro-workspace__body chordpro-workspace__body--split'
              : 'chordpro-workspace__body'
          }
        >
          {pane !== 'preview' ? (
            <div className="chordpro-workspace__source">
              <ChordProEditor
                ref={editorRef}
                value={chordPro}
                onChange={setChordPro}
                aria-label="ChordPro source"
              />
            </div>
          ) : null}
          {pane !== 'source' ? (
            <div className="chordpro-workspace__preview" aria-live="polite">
              <ChordProPreview
                source={chordPro}
                fallbackTitle={title}
                fallbackArtist={artist}
                fallbackKey={originalKey}
              />
            </div>
          ) : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".chordpro,.cho,.crd,.txt,text/plain"
        className="visually-hidden"
        aria-label="Import ChordPro file"
        onChange={onImportFile}
      />

      <div className="song-form__actions">
        <BusyButton
          type="submit"
          className="toolbar-btn toolbar-btn--primary"
          busy={saving}
          busyLabel="Saving…"
        >
          {mode === 'create' ? 'Create song' : 'Save changes'}
        </BusyButton>
        <button
          type="button"
          className="toolbar-btn"
          onClick={onImportClick}
        >
          Import .chordpro
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!chordPro.trim()}
          onClick={() =>
            downloadChordPro(slug || slugifyTitle(title), chordPro)
          }
        >
          Export .chordpro
        </button>
        {onCancel ? (
          <button type="button" className="toolbar-btn" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
