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

  useEffect(() => {
    if (!state?.round_id || players.length === 0) return
    const playerIds = players.map(p => p.id)
    supabase.from('scores').select('*').in('player_id', playerIds).then(({ data }) => {
      if (data) setScores(data)
    })
    const channel = supabase
      .channel('scores_viewer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => {
        supabase.from('scores').select('*').in('player_id', playerIds).then(({ data }) => {
          if (data) setScores(data)
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [state?.round_id, players])

  // HLS playback — only during live mode
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const shouldPlay = state?.mode === 'live'

    if (!shouldPlay) {
      stopHls()
      return
    }

    // override_hls_url takes priority during live mode (testing)
    if (state.override_hls_url) {
      loadHls(state.override_hls_url)
      return
    }

    if (state.active_mux_input_id) {
      supabase
        .from('operators')
        .select('mux_playback_id')
        .eq('mux_stream_id', state.active_mux_input_id)
        .single()
        .then(({ data }) => {
          if (data?.mux_playback_id) loadHls(muxHlsUrl(data.mux_playback_id))
        })
    }

    function stopHls() {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
      if (video) video.src = ''
    }

    function loadHls(src: string) {
      if (!video) return
      stopHls()
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true })
        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
        hlsRef.current = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.play().catch(() => {})
      }
    }
  }, [state?.mode, state?.override_hls_url, state?.active_mux_input_id])

  // Helpers
  const holeScoreOf = (p: Player, holeNumber: number): number | null => {
    const s = scores.find(s => s.player_id === p.id && s.hole_number === holeNumber)
    return s?.strokes ?? null
  }

  const totalScoreOf = (p: Player) => {
    const playerScores = scores.filter(s => s.player_id === p.id && s.strokes !== null)
    const totalStrokes = playerScores.reduce((acc, s) => acc + (s.strokes ?? 0), 0)
    const totalPar = playerScores.reduce((acc, s) => {
      const h = holes.find(h => h.hole_number === s.hole_number)
      return acc + (h?.par ?? 0)
    }, 0)
    return totalStrokes - totalPar
  }

  const currentHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1))
  const nextHole = holes.find(h => h.hole_number === (state?.current_hole ?? 1) + 1)
  const currentPlayer = players.find(p => p.id === state?.current_player_id)
  const leaderboard = [...players].sort((a, b) => totalScoreOf(a) - totalScoreOf(b))

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video — only visible during live mode */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-opacity duration-500 ${state?.mode === 'live' ? 'opacity-100' : 'opacity-0'}`}
        muted
        playsInline
        autoPlay
      />

      {/* Idle */}
      {(!state || state.mode === 'idle') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950">
          <div className="text-8xl mb-6 animate-bounce">🥏</div>
          <h1 className="text-white text-4xl font-bold">Disc Golf Pilot</h1>
          <p className="text-gray-400 mt-2 text-lg">Stream starting soon…</p>
        </div>
      )}

      {/* Hole transition — full overlay with card summary */}
      {state?.mode === 'hole_media' && (
        <TransitionOverlay
          completedHole={currentHole ?? null}
          nextHole={nextHole ?? null}
          players={leaderboard}
          holeScoreOf={holeScoreOf}
          totalScoreOf={totalScoreOf}
        />
      )}

      {/* Live overlays */}
      {state?.mode === 'live' && currentHole && currentPlayer && (
        <LiveOverlay
          player={currentPlayer}
          score={totalScoreOf(currentPlayer)}
          shotCount={state.shot_count}
          hole={currentHole}
        />
      )}

      {state?.show_leaderboard && state.mode === 'live' && leaderboard.length > 0 && (
        <LeaderboardOverlay players={leaderboard} scoreOf={totalScoreOf} />
      )}
    </div>
  )
}
