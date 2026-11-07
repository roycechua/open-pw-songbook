import { Link, useNavigate } from '@tanstack/react-router'
import {
  useCallback,
  useEffect,
  useMemo,
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
import type { SessionProfile } from '#/lib/songbook/song-server'
import { createClient } from '#/lib/supabase/client'
import {
  ChordProEditor,
  type ChordProEditorHandle,
} from './ChordProEditor'
import { ChordProPreview } from './ChordProPreview'

const CHORDPRO_FILE_EXT = /\.(chordpro|cho|crd|txt)$/i

const NEW_SONG_TEMPLATE = '{title: }\n{artist: }\n{key: C}\n\n'

type Props = {
  session: SessionProfile
  /** Present when editing an existing song; absent when creating. */
  song?: SongMeta
}

type PaneMode = 'write' | 'preview'
type SaveIntent = 'stay' | 'view'

type SavedRef = {
  id: string
  username: string
  slug: string
  status: SongStatus
}

const SNIPPET_BUTTONS: { id: SnippetId; label: string }[] = [
  { id: 'verse', label: 'Verse +' },
  { id: 'chorus', label: 'Chorus +' },
  { id: 'bridge', label: 'Bridge +' },
  { id: 'intro', label: 'Intro +' },
  { id: 'chord', label: '[ ] Chord' },
]

function seedChordProFromForm(
  source: string,
  meta: { title: string; artist: string; originalKey: string },
): string {
  const parsed = parseChordPro(source)
  return upsertChordProMeta(source, {
    title: parsed.title || meta.title,
    artist: parsed.artist || meta.artist,
    key: parsed.key || meta.originalKey || 'C',
  })
}

function IconBack() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 18l-6-6 6-6"
      />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14"
      />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v12m0 0 5-5m-5 5-5-5M5 20h14"
      />
    </svg>
  )
}

/**
 * One editor for both `/songs/new` and `/songs/:user/:slug/edit`.
 * Mode is derived from whether a song was provided by the route.
 */
export function SongEditor({ session, song }: Props) {
  const navigate = useNavigate()
  const mode: 'create' | 'edit' = song ? 'edit' : 'create'

  const initialMeta = useMemo(
    () => ({
      title: song?.title ?? '',
      artist: song?.artist ?? '',
      originalKey: song?.originalKey ?? 'C',
      slug: song?.slug ?? '',
    }),
    [song],
  )

  const [title, setTitle] = useState(initialMeta.title)
  const [artist, setArtist] = useState(initialMeta.artist)
  const [originalKey, setOriginalKey] = useState(
    initialMeta.originalKey || 'C',
  )
  const [slug, setSlug] = useState(initialMeta.slug)
  const [chordPro, setChordPro] = useState(() =>
    seedChordProFromForm(song?.chordPro ?? NEW_SONG_TEMPLATE, initialMeta),
  )
  const [saved, setSaved] = useState<SavedRef | null>(
    song
      ? {
          id: song.id,
          username: song.username,
          slug: song.slug,
          status: song.status,
        }
      : null,
  )
  const [baseline, setBaseline] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyIntent, setBusyIntent] = useState<SaveIntent | null>(null)
  const [pane, setPane] = useState<PaneMode>('write')
  const [detailsOpen, setDetailsOpen] = useState(mode === 'create')
  const [justSaved, setJustSaved] = useState(false)

  const formRef = useRef<HTMLFormElement>(null)
  const editorRef = useRef<ChordProEditorHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slugTouchedRef = useRef(mode === 'edit')
  // Prevent form→ChordPro writes from bouncing back through the parser.
  const metaSyncFromFormRef = useRef(false)

  const snapshot = useMemo(
    () => JSON.stringify({ title, artist, originalKey, slug, chordPro }),
    [title, artist, originalKey, slug, chordPro],
  )

  // Establish the "clean" baseline after the first render settles (the
  // ChordPro/meta sync effect can normalise fields once on mount).
  const snapshotRef = useRef(snapshot)
  snapshotRef.current = snapshot
  useEffect(() => {
    const id = window.setTimeout(() => {
      setBaseline((prev) => prev ?? snapshotRef.current)
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  const dirty = baseline !== null && snapshot !== baseline
  const saving = busyIntent !== null

  useEffect(() => {
    if (dirty) setJustSaved(false)
  }, [dirty])

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

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
    setPane('write')
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

  const insertSnippet = (id: SnippetId) => {
    setPane('write')
    // Wait a frame so the write pane is visible before focusing CodeMirror.
    requestAnimationFrame(() => editorRef.current?.insertSnippet(id))
  }

  const buildInput = (): SongWriteInput => ({
    title,
    artist,
    originalKey,
    slug,
    chordPro,
    status: saved?.status ?? 'draft',
  })

  const save = useCallback(
    async (intent: SaveIntent) => {
      setError(null)
      if (!formRef.current?.reportValidity()) {
        setDetailsOpen(true)
        return
      }
      if (!chordPro.trim()) {
        setError('ChordPro body is required')
        return
      }

      setBusyIntent(intent)
      try {
        const supabase = createClient()
        const input = buildInput()
        const result = saved
          ? await updateSong(supabase, saved.id, input)
          : await createSong(supabase, session.userId, input)

        if (result.error || !result.data) {
          setError(result.error?.message ?? 'Save failed')
          return
        }

        const next = result.data
        const previous = saved
        setSaved({
          id: next.id,
          username: next.username,
          slug: next.slug,
          status: next.status,
        })
        setBaseline(snapshot)
        setJustSaved(true)

        if (intent === 'view') {
          void navigate({
            to: '/songs/$username/$slug',
            params: { username: next.username, slug: next.slug },
          })
          return
        }

        // Stay in the editor. Only the URL moves: new → edit route after the
        // first save, or when the slug changed on an existing song.
        if (!previous || previous.slug !== next.slug) {
          void navigate({
            to: '/songs/$username/$slug/edit',
            params: { username: next.username, slug: next.slug },
            replace: true,
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      } finally {
        setBusyIntent(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildInput reads current form state
    [chordPro, saved, session.userId, snapshot, navigate, title, artist, originalKey, slug],
  )

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    void save('stay')
  }

  const onBack = () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    if (saved) {
      void navigate({
        to: '/songs/$username/$slug',
        params: { username: saved.username, slug: saved.slug },
      })
    } else {
      void navigate({ to: '/my/songs' })
    }
  }

  const statusLabel = saved
    ? saved.status === 'published'
      ? 'Published'
      : 'Draft'
    : 'New'

  const stayLabel = saved ? 'Save changes' : 'Save draft'

  const dockNote = saving
    ? 'Saving…'
    : dirty
      ? 'Unsaved changes'
      : justSaved
        ? saved?.status === 'published'
          ? 'All changes saved · Published'
          : 'All changes saved · Only you can see this draft'
        : saved?.status === 'published'
          ? 'Published song'
          : 'Draft · Only you can see this'

  return (
    <main className="editor">
      <header className="editor__header">
        <button
          type="button"
          className="editor__back"
          onClick={onBack}
          aria-label={saved ? 'Back to song' : 'Back to my songs'}
        >
          <IconBack />
        </button>
        <div className="editor__heading">
          <h1 className="editor__title">
            {mode === 'create' && !saved ? 'Add new song' : 'Edit song'}
          </h1>
          <p className="editor__sub">@{session.username}</p>
        </div>
        <span
          className={
            statusLabel === 'Published'
              ? 'status-badge status-badge--published'
              : 'status-badge'
          }
        >
          {statusLabel}
        </span>
        <nav className="editor__links" aria-label="Editor navigation">
          <Link to="/my/songs" className="back-link">
            My songs
          </Link>
          <Link to="/" className="back-link">
            Discover
          </Link>
        </nav>
      </header>

      <form
        ref={formRef}
        className="editor__form"
        onSubmit={onSubmit}
      >
        {error ? (
          <p className="song-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <section className="editor__details" data-open={detailsOpen}>
          <button
            type="button"
            className="editor__details-toggle"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <span className="editor__details-summary">
              <span className="editor__details-title">
                {title.trim() || 'Untitled song'}
              </span>
              <span className="editor__details-meta">
                {[artist.trim(), `Key ${originalKey}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
            <span className="editor__details-chevron" aria-hidden="true">
              {detailsOpen ? 'Hide' : 'Edit'}
            </span>
          </button>

          <div className="editor__details-body">
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
                {(COMMON_KEYS as readonly string[]).includes(
                  originalKey,
                ) ? null : (
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
          </div>
        </section>

        <section className="editor__workspace" data-pane={pane}>
          <div className="editor__toolbar">
            <div
              className="editor__tabs"
              role="tablist"
              aria-label="Editor view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={pane === 'write'}
                className={
                  pane === 'write' ? 'tab-btn is-active' : 'tab-btn'
                }
                onClick={() => setPane('write')}
              >
                Write
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={pane === 'preview'}
                className={
                  pane === 'preview' ? 'tab-btn is-active' : 'tab-btn'
                }
                onClick={() => setPane('preview')}
              >
                Preview
              </button>
            </div>

            <div className="editor__file-actions">
              <button
                type="button"
                className="toolbar-btn toolbar-btn--icon-text"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload />
                <span>Import</span>
              </button>
              <button
                type="button"
                className="toolbar-btn toolbar-btn--icon-text"
                disabled={!chordPro.trim()}
                onClick={() =>
                  downloadChordPro(slug || slugifyTitle(title), chordPro)
                }
              >
                <IconDownload />
                <span>Export</span>
              </button>
            </div>
          </div>

          <div
            className="editor__snippets"
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

          <p className="editor__hint">
            Put chords in [brackets] before the lyric. Switch to Preview to
            check your sheet.
          </p>

          <div className="editor__panes">
            <div className="editor__pane editor__pane--write">
              <ChordProEditor
                ref={editorRef}
                value={chordPro}
                onChange={setChordPro}
                aria-label="ChordPro source"
              />
            </div>
            <div
              className="editor__pane editor__pane--preview"
              aria-live="polite"
            >
              <ChordProPreview
                source={chordPro}
                fallbackTitle={title}
                fallbackArtist={artist}
                fallbackKey={originalKey}
              />
            </div>
          </div>
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept=".chordpro,.cho,.crd,.txt,text/plain"
          className="visually-hidden"
          aria-label="Import ChordPro file"
          onChange={onImportFile}
        />

        <div className="editor__dock">
          <div className="editor__dock-actions">
            <BusyButton
              type="submit"
              className="btn btn--secondary"
              busy={busyIntent === 'stay'}
              busyLabel="Saving…"
              disabled={saving}
            >
              {stayLabel}
            </BusyButton>
            <BusyButton
              type="button"
              className="btn btn--primary"
              busy={busyIntent === 'view'}
              busyLabel="Saving…"
              disabled={saving}
              onClick={() => void save('view')}
            >
              Save &amp; view
            </BusyButton>
          </div>
          <p
            className={
              dirty ? 'editor__dock-note is-dirty' : 'editor__dock-note'
            }
            role="status"
          >
            {dockNote}
          </p>
        </div>
      </form>
    </main>
  )
}
