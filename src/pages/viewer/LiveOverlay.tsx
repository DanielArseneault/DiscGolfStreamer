import type { Player, Hole } from '../../types/database'

type Props = {
  player: Player
  score: number
  shotCount: number
  hole: Hole
}

function scoreLabel(score: number) {
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : String(score)
}

export default function LiveOverlay({ player, score, shotCount, hole }: Props) {
  return (
    <>
      {/* Bottom-left: player + score */}
      <div className="absolute bottom-8 left-8">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-5 py-3 inline-block">
          <div className="text-white font-bold text-2xl leading-tight">{player.name}</div>
          <div className={`text-xl font-semibold mt-0.5 ${score < 0 ? 'text-red-400' : score > 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
            {scoreLabel(score)}
          </div>
        </div>
      </div>

      {/* Bottom-right: shot count */}
      <div className="absolute bottom-8 right-8">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Shot</div>
          <div className="text-white font-bold text-4xl leading-tight">{shotCount}</div>
        </div>
      </div>

      {/* Top-right: hole info */}
      <div className="absolute top-8 right-8">
        <div className="bg-black/70 backdrop-blur-sm rounded-xl px-5 py-3 text-right">
          <div className="text-gray-400 text-xs uppercase tracking-wide">Hole</div>
          <div className="text-white font-bold text-3xl leading-tight">{hole.hole_number}</div>
          <div className="text-gray-300 text-sm">
            Par {hole.par}
            {hole.distance_meters && <span className="ml-2 text-gray-400">{hole.distance_meters}m</span>}
          </div>
        </div>
      </div>

      {/* Live badge */}
      <div className="absolute top-8 left-8">
        <div className="bg-red-600 rounded px-3 py-1 flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-white font-bold text-sm tracking-wide">LIVE</span>
        </div>
      </div>
    </>
  )
}
