export type SongStatus = 'draft' | 'published'

export type Profile = {
  id: string
  username: string
  email: string
  created_at: string
}

export type Song = {
  id: string
  owner_id: string
  slug: string
  title: string
  artist: string
  original_key: string
  chord_pro: string
  status: SongStatus
  created_at: string
  updated_at: string
}

export type PlaylistItem = {
  id: string
  user_id: string
  song_id: string
  position: number
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: {
          id: string
          username: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      songs: {
        Row: Song
        Insert: {
          id?: string
          owner_id: string
          slug: string
          title: string
          artist?: string
          original_key?: string
          chord_pro?: string
          status?: SongStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          slug?: string
          title?: string
          artist?: string
          original_key?: string
          chord_pro?: string
          status?: SongStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'songs_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      playlist_items: {
        Row: PlaylistItem
        Insert: {
          id?: string
          user_id: string
          song_id: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          song_id?: string
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'playlist_items_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'playlist_items_song_id_fkey'
            columns: ['song_id']
            isOneToOne: false
            referencedRelation: 'songs'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
