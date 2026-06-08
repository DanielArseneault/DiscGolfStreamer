import type { Player, Hole } from '../../types/database'

type Props = {
  completedHole: Hole | null
  nextHole: Hole | null
  players: Player[]
  holeScoreOf: (p: Player, holeNumber: number) => number | null
  totalScoreOf: (p: Player) => number
}

function scoreLabel(score: number) {
  if (score === 0) return { text: 'E', cls: 'text-gray-300' }
  if (score < 0) return { text: String(score), cls: 'text-red-400' }
  return { text: `+${score}`, cls: 'text-yellow-300' }
}

function holeResultLabel(strokes: number | null, par: number) {
  if (strokes === null) return { text: '—', cls: 'text-gray-500', bg: '' }
  const diff = strokes - par
  if (diff <= -2) return { text: String(strokes), cls: 'text-yellow-300 font-bold', bg: 'bg-yellow-900/40 border border-yellow-600' }
  if (diff === -1) return { text: String(strokes), cls: 'text-green-400 font-bold', bg: 'bg-green-900/40 border border-green-600 rounded-full' }
  if (diff === 0)  return { text: String(strokes), cls: 'text-gray-200', bg: '' }
  if (diff === 1)  return { text: String(strokes), cls: 'text-orange-400', bg: 'bg-orange-900/30 border border-orange-700' }
  return { text: String(strokes), cls: 'text-red-400 font-bold', bg: 'bg-red-900/40 border border-red-700' }
}

export default function TransitionOverlay({ completedHole, nextHole, players, holeScoreOf, totalScoreOf }: Props) {
  return (
    <div className="absolute inset-0 bg-gray-950/90 flex flex-col items-center justify-center p-8 gap-8">

      {/* Next hole — hero */}
      {nextHole ? (
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-widest mb-1">Up Next</div>
          <div className="text-green-400 font-black" style={{ fontSize: 'clamp(5rem, 15vw, 10rem)', lineHeight: 1 }}>
            {nextHole.hole_number}
          </div>
          <div className="text-white text-2xl mt-1">Par {nextHole.par}</div>
          {nextHole.distance_meters && (
            <div className="text-gray-400 text-lg">{nextHole.distance_meters}m</div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Hole Complete</div>
          <div className="text-white font-black" style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1 }}>
            {completedHole?.hole_number ?? '—'}
          </div>
        </div>
      )}

      {/* Card summary + standings */}
      {players.length > 0 && (
        <div className="w-full max-w-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-800">
                <th className="text-left pb-2 font-medium w-6">#</th>
                <th className="text-left pb-2 font-medium pl-2">Player</th>
                {completedHole && (
                  <th className="pb-2 font-medium text-center w-20">
                    Hole {completedHole.hole_number}
                    <span className="text-gray-600 ml-1">(P{completedHole.par})</span>
                  </th>
                )}
                <th className="pb-2 font-medium text-right w-20">Total</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => {
                const holeStrokes = completedHole ? holeScoreOf(p, completedHole.hole_number) : null
                const result = completedHole ? holeResultLabel(holeStrokes, completedHole.par) : null
                const total = totalScoreOf(p)
                const { text: totalText, cls: totalCls } = scoreLabel(total)

                return (
                  <tr key={p.id} className={`border-b border-gray-800/50 ${i === 0 ? 'text-base' : ''}`}>
                    <td className="py-2 text-gray-600 text-xs">{i + 1}</td>
                    <td className={`py-2 pl-2 font-medium ${i === 0 ? 'text-white' : 'text-gray-300'}`}>
                      {p.name}
                    </td>
                    {completedHole && result && (
                      <td className="py-2 text-center">
                        <span className={`inline-block w-8 h-8 flex items-center justify-center rounded ${result.bg} ${result.cls}`}>
                          {result.text}
                        </span>
                      </td>
                    )}
                    <td className={`py-2 text-right font-bold text-lg ${totalCls}`}>
                      {totalText}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Waiting indicator */}
      <div className="flex items-center gap-2 text-gray-600 text-sm">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        Waiting for operators to reach next tee…
      </div>
    </div>
  )
}
