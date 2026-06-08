import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { useStreamState } from '../../lib/useStreamState'
import { supabase } from '../../lib/supabase'
import { muxHlsUrl } from '../../lib/mux'
import type { Player, Hole, Score } from '../../types/database'
import LiveOverlay from './LiveOverlay'
import TransitionOverlay from './TransitionOverlay'
import LeaderboardOverlay from './LeaderboardOverlay'

export default function ViewerPage() {
  const { state } = useStreamState()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  const [players, setPlayers] = useState<Player[]>([])
  const [holes, setHoles] = useState<Hole[]>([])
  const [scores, setScores] = useState<Score[]>([])

  // Load round data when round changes
  useEffect(() => {
    if (!state?.round_id) return
    supabase.from('players').select('*').eq('round_id', state.round_id).order('position').then(({ data }) => {
      if (data) setPlayers(data)
    })
    supabase
      .from('rounds').select('layout_id').eq('id', state.round_id).single()
      .then(({ data }) => {
        if (!data) return
        supabase.from('holes').select('*').eq('layout_id', data.layout_id).order('hole_number').then(({ data: hs }) => {
          if (hs) setHoles(hs)
        })
      })
  }, [state?.round_id])

  // Subscribe to live score updates
  useEffect(() => {
    if (!state?.round_id) return
    const playerIds = players.map(p => p.id)
    if (playerIds.length === 0) return

    supabase.from('scores').select('*').in('player_id', playerIds).then(({ data }) => {
      if (data) setScores(data)
    })

    const channel = supabase
      .channel('scores_viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' },
        () => {
          supabase.from('scores').select('*').in('player_id', playerIds).then(({ data }) => {
            if (data) setScores(data)
          })
        })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [state?.round_id, players])

  // HLS playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let url: string | null = null

    if (state?.mode === 'live' && state.active_mux_input_id) {
      // Find the operator's Mux playback ID
      supabase
        .from('operators')
        .select('mux_playback_id')
        .eq('mux_stream_id', state.active_mux_input_id)
        .single()
        .then(({ data }) => {
          if (data?.mux_playback_id) loadHls(muxHlsUrl(data.mux_playback_id))
        })
    } else if (state?.mode === 'hole_media') {
      const nextHole = holes.find(h => h.hole_number === (state.current_hole ?? 1))
      if (nextHole?.mux_playback_id) {
        url = muxHlsUrl(nextHole.mux_playback_id)
        loadHls(url)
      }
    } else {
      // idle — stop any playing stream
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.src = ''
    }

    function loadHls(src: string) {
      if (!video) return
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
        hlsRef.current = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari)
        video.src = src
        video.play().catch(() => {})
      }
    }
  }, [state?.mode, state?.active_mux_input_id, state?.current_hole, holes])

  const currentHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1))
  const nextHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1) + 1)
  const currentPlayer = players.find(p => p.id === state?.current_player_id)

  const playerScore = (p: Player) => {
    const playerScores = scores.filter(s => s.player_id === p.id && s.strokes !== null)
    const totalStrokes = playerScores.reduce((acc, s) => acc + (s.strokes ?? 0), 0)
    const totalPar = playerScores.reduce((acc, s) => {
      const h = holes.find(h => h.hole_number === s.hole_number)
      return acc + (h?.par ?? 0)
    }, 0)
    return totalStrokes - totalPar
  }

  const leaderboard = [...players].sort((a, b) => playerScore(a) - playerScore(b))

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video layer */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {/* Idle placeholder */}
      {(!state || state.mode === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950">
          <div className="text-8xl mb-6 animate-bounce">🥏</div>
          <h1 className="text-white text-4xl font-bold">Disc Golf Pilot</h1>
          <p className="text-gray-400 mt-2 text-lg">Stream starting soon…</p>
        </div>
      )}

      {/* Live overlay: player name + score + shot + hole info */}
      {state?.mode === 'live' && currentHole && currentPlayer && (
        <LiveOverlay
          player={currentPlayer}
          score={playerScore(currentPlayer)}
          shotCount={state.shot_count}
          hole={currentHole}
        />
      )}

      {/* Leaderboard */}
      {state?.show_leaderboard && leaderboard.length > 0 && (
        <LeaderboardOverlay players={leaderboard} scoreOf={playerScore} />
      )}

      {/* Hole transition overlay */}
      {state?.mode === 'hole_media' && nextHole && (
        <TransitionOverlay
          currentHole={currentHole ?? null}
          nextHole={nextHole}
          leaderboard={leaderboard}
          scoreOf={playerScore}
        />
      )}
    </div>
  )
}
