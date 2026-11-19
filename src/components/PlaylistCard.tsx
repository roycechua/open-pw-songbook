import { Link } from '@tanstack/react-router'
import type { PlaylistSummary } from '#/lib/songbook'

export function songCountLabel(count: number): string {
  return count === 1 ? '1 song' : `${count} songs`
}

export function PlaylistCard({
  playlist,
  compact = false,
}: {
  playlist: PlaylistSummary
  compact?: boolean
}) {
  return (
    <Link
      to="/playlists/$playlistId"
      params={{ playlistId: playlist.id }}
      className={compact ? 'playlist-card playlist-card--compact' : 'playlist-card'}
    >
      <span className="playlist-card__name">{playlist.name}</span>
      {!compact && playlist.description ? (
        <span className="playlist-card__description">
          {playlist.description}
        </span>
      ) : null}
      <span className="playlist-card__count">
        {songCountLabel(playlist.songCount)}
      </span>
    </Link>
  )
}
