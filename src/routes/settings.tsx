import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { BusyButton } from '#/components/loading'
import { APP_NAME } from '#/lib/brand'
import {
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_SCALE_STEP,
  clampTextScale,
  updateUserSettings,
  type SwipeDirection,
  type UserSettingsRow,
} from '#/lib/songbook'
import { loadUserSettingsClient } from '#/lib/songbook/song-client'
import { loadUserSettings } from '#/lib/songbook/song-server'
import { createClient } from '#/lib/supabase/client'

export const Route = createFileRoute('/settings')({
  loader: async () => {
    const data =
      typeof window === 'undefined'
        ? await loadUserSettings()
        : await loadUserSettingsClient()
    if (!data.session || !data.settings) {
      throw redirect({ to: '/login' })
    }
    return { session: data.session, settings: data.settings }
  },
  component: SettingsPage,
  head: () => ({
    meta: [{ title: `Settings · ${APP_NAME}` }],
  }),
})

function SettingsPage() {
  const { session, settings: initial } = Route.useLoaderData()
  const [textScale, setTextScale] = useState(initial.textScale)
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(
    initial.swipeDirection,
  )
  const [rememberPerSong, setRememberPerSong] = useState(
    initial.rememberPerSong,
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  const scalePercent = Math.round(textScale * 100)
  const canShrink = textScale > TEXT_SCALE_MIN + 0.001
  const canGrow = textScale < TEXT_SCALE_MAX - 0.001

  const applyRow = (row: UserSettingsRow) => {
    setTextScale(row.textScale)
    setSwipeDirection(row.swipeDirection)
    setRememberPerSong(row.rememberPerSong)
  }

  const onSave = async () => {
    setBusy(true)
    setError(null)
    setSavedNote(null)
    try {
      const supabase = createClient()
      const result = await updateUserSettings(supabase, session.userId, {
        textScale: clampTextScale(textScale),
        swipeDirection,
        rememberPerSong,
      })
      if (result.error || !result.data) {
        setError(result.error?.message ?? 'Could not save settings')
        return
      }
      applyRow(result.data)
      setSavedNote('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="settings-page">
      <header className="settings-page__header">
        <h1>Settings</h1>
        <p className="lede">
          Defaults for reading chord sheets. Signed-in preferences sync across
          devices.
        </p>
      </header>

      {error ? (
        <p className="song-form__error" role="alert">
          {error}
        </p>
      ) : null}
      {savedNote ? (
        <p className="settings-page__flash" role="status">
          {savedNote}
        </p>
      ) : null}

      <form
        className="settings-card"
        onSubmit={(e) => {
          e.preventDefault()
          void onSave()
        }}
      >
        <fieldset className="settings-fieldset">
          <legend>Swipe direction</legend>
          <div
            className="control segment segment--swipe"
            role="group"
            aria-label="Swipe direction"
          >
            <button
              type="button"
              className={swipeDirection === 'horizontal' ? 'is-active' : undefined}
              aria-pressed={swipeDirection === 'horizontal'}
              aria-label="Swipe horizontally"
              title="Swipe horizontally"
              onClick={() => setSwipeDirection('horizontal')}
            >
              <span className="swipe-dir-glyph" aria-hidden="true">
                ‹ ›
              </span>
            </button>
            <button
              type="button"
              className={swipeDirection === 'vertical' ? 'is-active' : undefined}
              aria-pressed={swipeDirection === 'vertical'}
              aria-label="Swipe vertically"
              title="Swipe vertically"
              onClick={() => setSwipeDirection('vertical')}
            >
              <span
                className="swipe-dir-glyph swipe-dir-glyph--vertical"
                aria-hidden="true"
              >
                ‹ ›
              </span>
            </button>
          </div>
        </fieldset>

        <fieldset className="settings-fieldset">
          <legend>Text size</legend>
          <div className="control text-size" role="group" aria-label="Text size">
            <button
              type="button"
              className="text-size__btn"
              aria-label="Decrease text size"
              disabled={!canShrink}
              onClick={() =>
                setTextScale(clampTextScale(textScale - TEXT_SCALE_STEP))
              }
            >
              <span className="text-size__a text-size__a--sm" aria-hidden="true">
                A
              </span>
            </button>
            <span className="text-size__value" aria-live="polite">
              {scalePercent}%
            </span>
            <button
              type="button"
              className="text-size__btn"
              aria-label="Increase text size"
              disabled={!canGrow}
              onClick={() =>
                setTextScale(clampTextScale(textScale + TEXT_SCALE_STEP))
              }
            >
              <span className="text-size__a text-size__a--lg" aria-hidden="true">
                A
              </span>
            </button>
          </div>
        </fieldset>

        <label className="settings-check">
          <input
            type="checkbox"
            checked={rememberPerSong}
            onChange={(e) => setRememberPerSong(e.target.checked)}
          />
          <span>
            <span className="settings-check__title">Remember settings per song</span>
            <span className="settings-check__help">
              When on, changes in the song viewer apply only to that song.
              Defaults above are used for songs without their own settings.
            </span>
          </span>
        </label>

        <div className="settings-page__actions">
          <BusyButton
            type="submit"
            className="btn btn--primary"
            busy={busy}
            busyLabel="Saving…"
          >
            Save settings
          </BusyButton>
        </div>
      </form>
    </main>
  )
}
