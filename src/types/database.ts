// ─── Domain types ───────────────────────────────────────────────────────────

export type Course = {
  id: string
  name: string
  location: string | null
  created_at: string
}

export type Layout = {
  id: string
  course_id: string
  name: string
  created_at: string
}

export type Hole = {
  id: string
  layout_id: string
  hole_number: number
  par: number
  distance_meters: number | null
  mux_asset_id: string | null
  mux_playback_id: string | null
  created_at: string
}

export type Round = {
  id: string
  layout_id: string
  name: string | null
  status: 'pending' | 'active' | 'completed'
  created_at: string
}

export type Player = {
  id: string
  round_id: string
  name: string
  pdga_number: string | null
  position: 1 | 2 | 3 | 4
  created_at: string
}

export type Score = {
  id: string
  player_id: string
  hole_number: number
  strokes: number | null
  created_at: string
}

export type StreamMode = 'idle' | 'live' | 'transition' | 'hole_media'

export type StreamState = {
  id: string
  round_id: string | null
  mode: StreamMode
  active_mux_input_id: string | null
  current_hole: number
  current_player_id: string | null
  shot_count: number
  show_player_overlay: boolean
  show_leaderboard: boolean
  updated_at: string
}

export type Operator = {
  id: string
  name: string
  mux_stream_key: string | null
  mux_stream_id: string | null
  mux_playback_id: string | null
  last_seen_at: string | null
  created_at: string
}

export type VoteType = 'take_feed' | 'hole_done' | 'ready_to_stream'
export type VoteStatus = 'pending' | 'approved' | 'rejected'

export type Vote = {
  id: string
  type: VoteType
  requested_by: string | null
  target_operator_id: string | null
  status: VoteStatus
  expires_at: string
  created_at: string
}

export type VoteObjection = {
  id: string
  vote_id: string
  operator_id: string
  created_at: string
}

// ─── Supabase Database generic ──────────────────────────────────────────────

type R = { Relationships: [] }

// Make nullable fields optional for inserts (DB defaults handle them)
type Insertable<T, Required extends keyof T> = Pick<T, Required> & Partial<Omit<T, Required>>

export type Database = {
  public: {
    Tables: {
      courses: {
        Row: Course
        Insert: Insertable<Course, 'name'>
        Update: Partial<Course>
      } & R
      layouts: {
        Row: Layout
        Insert: Insertable<Layout, 'course_id' | 'name'>
        Update: Partial<Layout>
      } & R
      holes: {
        Row: Hole
        Insert: Insertable<Hole, 'layout_id' | 'hole_number' | 'par'>
        Update: Partial<Hole>
      } & R
      rounds: {
        Row: Round
        Insert: Insertable<Round, 'layout_id'>
        Update: Partial<Round>
      } & R
      players: {
        Row: Player
        Insert: Insertable<Player, 'round_id' | 'name' | 'position'>
        Update: Partial<Player>
      } & R
      scores: {
        Row: Score
        Insert: Insertable<Score, 'player_id' | 'hole_number'>
        Update: Partial<Score>
      } & R
      stream_state: {
        Row: StreamState
        Insert: Partial<StreamState>
        Update: Partial<StreamState>
      } & R
      operators: {
        Row: Operator
        Insert: Insertable<Operator, 'name'>
        Update: Partial<Operator>
      } & R
      votes: {
        Row: Vote
        Insert: Insertable<Vote, 'type' | 'status' | 'expires_at'>
        Update: Partial<Vote>
      } & R
      vote_objections: {
        Row: VoteObjection
        Insert: Insertable<VoteObjection, 'vote_id' | 'operator_id'>
        Update: Partial<VoteObjection>
      } & R
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
