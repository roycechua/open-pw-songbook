import { useState, type FormEvent } from 'react'
import {
  COMMON_KEYS,
  createSong,
  downloadChordPro,
  slugifyTitle,
  updateSong,
  type SongMeta,
  type SongStatus,
  type SongWriteInput,
} from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'

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
  const [slugTouched, setSlugTouched] = useState(mode === 'edit')
  const [chordPro, setChordPro] = useState(initial.chordPro)
  const [status, setStatus] = useState<SongStatus>(initial.status)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const onTitleChange = (value: string) => {
    setTitle(value)
    if (!slugTouched) {
      setSlug(slugifyTitle(value))
    }
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

  return (
    <form className="song-form" onSubmit={onSubmit}>
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
            onChange={(e) => onTitleChange(e.target.value)}
            required
            autoComplete="off"
          />
        </label>

        <label className="song-form__field">
          <span>Artist</span>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            autoComplete="off"
          />
        </label>

        <label className="song-form__field">
          <span>Key</span>
          <select
            value={originalKey}
            onChange={(e) => setOriginalKey(e.target.value)}
            aria-label="Original key"
          >
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
              setSlugTouched(true)
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

      <label className="song-form__field song-form__field--full">
        <span>ChordPro</span>
        <textarea
          value={chordPro}
          onChange={(e) => setChordPro(e.target.value)}
          rows={18}
          spellCheck={false}
          required
          className="song-form__chordpro"
        />
      </label>

      <div className="song-form__actions">
        <button type="submit" className="toolbar-btn toolbar-btn--primary" disabled={saving}>
          {saving ? 'Saving…' : mode === 'create' ? 'Create song' : 'Save changes'}
        </button>
        <button
          type="button"
          className="toolbar-btn"
          disabled={!chordPro.trim()}
          onClick={() => downloadChordPro(slug || slugifyTitle(title), chordPro)}
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
