import type { Player } from '../../types/database'

type Props = {
  players: Player[]
  scoreOf: (p: Player) => number
}

function scoreLabel(score: number) {
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : String(score)
}

export default function LeaderboardOverlay({ players, scoreOf }: Props) {
  return (
    <div className="absolute top-8 left-1/2 -translate-x-1/2">
      <div className="bg-black/80 backdrop-blur-sm rounded-xl px-6 py-4 min-w-64">
        <div className="text-gray-400 text-xs uppercase tracking-widest mb-3 text-center">Leaderboard</div>
        <div className="space-y-2">
          {players.map((p, i) => {
            const score = scoreOf(p)
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-4">{i + 1}</span>
                <span className="text-white font-medium flex-1">{p.name}</span>
                <span className={`font-bold text-sm ${score < 0 ? 'text-red-400' : score > 0 ? 'text-yellow-300' : 'text-gray-300'}`}>
                  {scoreLabel(score)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
