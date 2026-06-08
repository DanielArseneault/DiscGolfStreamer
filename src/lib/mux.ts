const MUX_API = 'https://api.mux.com'

// Called server-side (Supabase Edge Function) — this file is just for type/constant sharing
export const MUX_STREAM_SWITCH_ENDPOINT = `${MUX_API}/video/v1/live-streams`

export function muxHlsUrl(playbackId: string) {
  return `https://stream.mux.com/${playbackId}.m3u8`
}

export function muxThumbnailUrl(playbackId: string, time = 0) {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${time}`
}
