import type { Vote } from '../../types/database'

type Props = {
  vote: Vote
  countdown: number
  myOperatorId: string | undefined
  onObject: () => void
}

const voteLabels: Record<string, string> = {
  take_feed: 'wants to take the live feed',
  hole_done: 'marked hole as done',
  ready_to_stream: 'is ready to stream',
}

export default function VoteBanner({ vote, countdown, myOperatorId, onObject }: Props) {
  const isMyVote = vote.requested_by === myOperatorId
  const label = voteLabels[vote.type] ?? vote.type

  return (
    <div className="bg-yellow-900/80 border-b border-yellow-700 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-yellow-200 text-sm font-medium">
            {isMyVote ? 'Your request' : 'Vote request'}: {label}
          </p>
          <p className="text-yellow-400 text-xs mt-0.5">
            {countdown > 0 ? `Auto-approves in ${countdown}s` : 'Approving…'}
          </p>
        </div>

        {/* Countdown ring */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="16"
              fill="none" stroke="#78350f" strokeWidth="3"
            />
            <circle
              cx="18" cy="18" r="16"
              fill="none" stroke="#fbbf24" strokeWidth="3"
              strokeDasharray={`${(countdown / 5) * 100} 100`}
              pathLength="100"
            />
          </svg>
          <span className="text-yellow-300 text-sm font-bold">{countdown}</span>
        </div>

        {!isMyVote && (
          <button
            onClick={onObject}
            className="bg-red-700 hover:bg-red-800 text-white text-sm font-bold px-4 py-2 rounded-lg"
          >
            Object
          </button>
        )}
      </div>
    </div>
  )
}
