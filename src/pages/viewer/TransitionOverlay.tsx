import type { Player, Hole } from '../../types/database'

type Props = {
  currentHole: Hole | null
  nextHole: Hole
  leaderboard: Player[]
  scoreOf: (p: Player) => number
}

function scoreLabel(score: number) {
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : String(score)
}

export default function TransitionOverlay({ nextHole, leaderboard, scoreOf }: Props) {
  return (
    <>
      {/* Next hole info — centre */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="bg-black/75 backdrop-blur-sm rounded-2xl px-10 py-8 text-center">
          <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Up Next</div>
          <div className="text-green-400 font-bold text-7xl leading-none">{nextHole.hole_number}</div>
          <div className="text-white text-2xl mt-2">Par {nextHole.par}</div>
          {nextHole.distance_meters && (
            <div className="text-gray-400 text-lg mt-1">{nextHole.distance_meters}m</div>
          )}
        </div>
      </div>

      {/* Leaderboard — bottom */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="bg-black/80 backdrop-blur-sm rounded-xl px-8 py-4 flex gap-8">
          {leaderboard.map((p, i) => {
            const score = scoreOf(p)
            return (
              <div key={p.id} className="text-center min-w-20">
                <div className="text-gray-500 text-xs">{i + 1}</div>
                <div className="text-white font-medium text-sm truncate max-w-24">{p.name}</div>
                <div className={`font-bold ${score < 0 ? 'text-red-400' : score > 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
                  {scoreLabel(score)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
