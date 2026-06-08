import { useState, useEffect, useRef } from 'react'

type Props = {
  holeNumber: number
  playerName: string | undefined
  shotCount: number
}

export default function CameraPreview({ holeNumber, playerName, shotCount }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function startCamera() {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setStream(s)
    } catch {
      setError('Camera access denied. Check permissions in Settings.')
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach(t => t.stop())
    setStream(null)
    setFullscreen(false)
    setOpen(false)
  }

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  useEffect(() => {
    return () => { stream?.getTracks().forEach(t => t.stop()) }
  }, [stream])

  useEffect(() => {
    document.body.style.overflow = fullscreen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [fullscreen])

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); startCamera() }}
        className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl py-3 text-sm text-gray-300 transition-colors"
      >
        <CameraIcon />
        Show Camera Preview
      </button>
    )
  }

  return (
    // Single video element; outer div toggles between card and fullscreen overlay
    <div className={fullscreen
      ? 'fixed inset-0 z-50 bg-black flex flex-col'
      : 'bg-gray-800 rounded-xl overflow-hidden border border-gray-700'
    }>

      {/* Video — fills available space in both modes */}
      <div className={fullscreen ? 'flex-1 relative overflow-hidden' : 'relative aspect-video bg-black'}>
        {stream
          ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )
          : (
            <div className="absolute inset-0 flex items-center justify-center">
              {error
                ? <p className="text-red-400 text-sm text-center px-4">{error}</p>
                : <p className="text-gray-500 text-sm">Starting camera…</p>
              }
            </div>
          )
        }

        {/* Fullscreen HUD */}
        {fullscreen && (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <div>
              {playerName && (
                <div className="text-white font-bold text-lg leading-tight">{playerName}</div>
              )}
              <div className="text-gray-300 text-sm">
                Hole {holeNumber} · Shot {shotCount}
              </div>
            </div>
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mt-1" />
          </div>
        )}
      </div>

      {/* Controls bar — thumbnail mode */}
      {!fullscreen && (
        <div className="flex items-center gap-2 px-3 py-2">
          <button
            onClick={() => setFullscreen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg py-2 text-sm transition-colors"
          >
            <ExpandIcon />
            Fullscreen
          </button>
          <button
            onClick={stopCamera}
            className="px-3 py-2 text-gray-500 hover:text-red-400 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Controls bar — fullscreen mode */}
      {fullscreen && (
        <div className="absolute inset-x-0 bottom-0 p-6 flex justify-center bg-gradient-to-t from-black/60 to-transparent">
          <button
            onClick={() => setFullscreen(false)}
            className="bg-black/60 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-full text-sm font-medium"
          >
            Exit Fullscreen
          </button>
        </div>
      )}
    </div>
  )
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function ExpandIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  )
}
