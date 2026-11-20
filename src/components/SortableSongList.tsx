import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { PlaylistSong } from '#/lib/songbook'

type Props = {
  playlistId: string
  songs: PlaylistSong[]
  onReorder: (next: PlaylistSong[]) => void
  onRemove: (song: PlaylistSong) => void
  busySongId?: string | null
}

export function SortableSongList({
  playlistId,
  songs,
  onReorder,
  onRemove,
  busySongId = null,
}: Props) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const moveTo = (song: PlaylistSong, index: number) => {
    const from = songs.findIndex((s) => s.songId === song.songId)
    if (from < 0 || from === index) return
    onReorder(arrayMove(songs, from, index))
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = songs.findIndex((s) => s.songId === active.id)
    const to = songs.findIndex((s) => s.songId === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(songs, from, to))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Picked up ${titleFor(songs, active.id)}.`,
          onDragOver: ({ active, over }) =>
            over
              ? `${titleFor(songs, active.id)} moved to position ${
                  songs.findIndex((s) => s.songId === over.id) + 1
                } of ${songs.length}.`
              : undefined,
          onDragEnd: ({ active, over }) =>
            over
              ? `${titleFor(songs, active.id)} dropped at position ${
                  songs.findIndex((s) => s.songId === over.id) + 1
                }.`
              : `${titleFor(songs, active.id)} dropped.`,
          onDragCancel: ({ active }) =>
            `Reorder cancelled. ${titleFor(songs, active.id)} returned.`,
        },
      }}
    >
      <SortableContext
        items={songs.map((s) => s.songId)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="sortable-list">
          {songs.map((song, index) => (
            <SortableRow
              key={song.songId}
              playlistId={playlistId}
              song={song}
              index={index}
              count={songs.length}
              busy={busySongId === song.songId}
              onMoveTop={() => moveTo(song, 0)}
              onMoveBottom={() => moveTo(song, songs.length - 1)}
              onRemove={() => onRemove(song)}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function titleFor(songs: PlaylistSong[], id: string | number): string {
  return songs.find((s) => s.songId === id)?.title ?? 'Song'
}

type RowProps = {
  playlistId: string
  song: PlaylistSong
  index: number
  count: number
  busy: boolean
  onMoveTop: () => void
  onMoveBottom: () => void
  onRemove: () => void
}

function SortableRow({
  playlistId,
  song,
  index,
  count,
  busy,
  onMoveTop,
  onMoveBottom,
  onRemove,
}: RowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.songId })

  return (
    <li
      ref={setNodeRef}
      className={isDragging ? 'sortable-row is-dragging' : 'sortable-row'}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        className="sortable-row__handle"
        aria-label={`Reorder ${song.title}`}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <span className="sortable-row__index" aria-hidden="true">
        {index + 1}
      </span>
      <Link
        to="/songs/$username/$slug"
        params={{ username: song.username, slug: song.slug }}
        search={{ playlist: playlistId }}
        className="sortable-row__main"
      >
        <span className="song-list__title">{song.title}</span>
        <span className="song-list__meta">
          {song.artist || 'Unknown artist'}
          <span className="song-list__author"> · @{song.username}</span>
          <span className="song-list__key"> · {song.originalKey}</span>
        </span>
      </Link>
      <div className="sortable-row__actions">
        <RowMenu
          title={song.title}
          canMoveUp={index > 0}
          canMoveDown={index < count - 1}
          disabled={busy}
          onMoveTop={onMoveTop}
          onMoveBottom={onMoveBottom}
        />
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          aria-label={`Remove ${song.title} from playlist`}
          title="Remove from playlist"
          disabled={busy}
          onClick={onRemove}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
            />
          </svg>
        </button>
      </div>
    </li>
  )
}

function RowMenu({
  title,
  canMoveUp,
  canMoveDown,
  disabled,
  onMoveTop,
  onMoveBottom,
}: {
  title: string
  canMoveUp: boolean
  canMoveDown: boolean
  disabled: boolean
  onMoveTop: () => void
  onMoveBottom: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  return (
    <div className="row-menu" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || (!canMoveUp && !canMoveDown)}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="5" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="19" cy="12" r="2" fill="currentColor" />
        </svg>
      </button>
      {open ? (
        <div className="row-menu__popover" role="menu">
          <button
            type="button"
            role="menuitem"
            disabled={!canMoveUp}
            onClick={run(onMoveTop)}
          >
            Move to top
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canMoveDown}
            onClick={run(onMoveBottom)}
          >
            Move to bottom
          </button>
        </div>
      ) : null}
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      {[6, 12, 18].map((y) => (
        <g key={y}>
          <circle cx="9" cy={y} r="1.6" fill="currentColor" />
          <circle cx="15" cy={y} r="1.6" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
