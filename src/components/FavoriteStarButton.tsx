import { useState } from 'react'
import { Spinner } from '#/components/loading'
import { addFavorite, removeFavorite } from '#/lib/songbook'
import { createClient } from '#/lib/supabase/client'

type Props = {
  userId: string
  songId: string
  songTitle: string
  favorited: boolean
  onChange: (favorited: boolean) => void
  onError?: (message: string) => void
}

/** Compact star toggle for list rows (published songs only). */
export function FavoriteStarButton({
  userId,
  songId,
  songTitle,
  favorited,
  onChange,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false)

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      const supabase = createClient()
      const result = favorited
        ? await removeFavorite(supabase, userId, songId)
        : await addFavorite(supabase, userId, songId)
      if (result.error && result.error.code !== 'already_favorited') {
        onError?.(result.error.message)
        return
      }
      onChange(!favorited)
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Favorite update failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={
        favorited ? 'icon-btn icon-btn--star is-active' : 'icon-btn icon-btn--star'
      }
      aria-pressed={favorited}
      aria-busy={busy || undefined}
      aria-label={
        favorited
          ? `Remove ${songTitle} from favorites`
          : `Add ${songTitle} to favorites`
      }
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
      disabled={busy}
      onClick={() => void onClick()}
    >
      {busy ? (
        <Spinner size="sm" label="" />
      ) : (
        <span className="icon-btn__star" aria-hidden="true">
          {favorited ? '★' : '☆'}
        </span>
      )}
    </button>
  )
}
