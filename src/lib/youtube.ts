type YouTubePlayerInstance = {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  loadVideoById: (videoId: string, startSeconds?: number, suggestedQuality?: string) => void
  cueVideoById: (videoId: string, startSeconds?: number, suggestedQuality?: string) => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getVideoUrl: () => string
  getVideoData: () => { video_id: string } | Record<string, never>
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  destroy: () => void
}

type YouTubePlayerEvent<T = YouTubePlayerInstance> = {
  target: T
  data?: number
}

type YouTubePlayerOptions = {
  width?: number
  height?: number
  videoId?: string
  playerVars?: Record<string, unknown>
  events?: {
    onReady?: (event: YouTubePlayerEvent) => void
    onStateChange?: (event: YouTubePlayerEvent) => void
    onError?: (event: YouTubePlayerEvent) => void
  }
}

type YouTubeGlobal = {
  Player: new (element: HTMLElement | string, options: YouTubePlayerOptions) => YouTubePlayerInstance
  PlayerState: Record<string, number>
}

declare global {
  interface Window {
    YT?: YouTubeGlobal
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiPromise: Promise<YouTubeGlobal> | null = null

export function loadYouTubeIframeApi() {
  if (apiPromise) {
    return apiPromise
  }

  apiPromise = new Promise<YouTubeGlobal>((resolve, reject) => {
    const existing = window.YT
    if (existing && existing.Player) {
      resolve(existing)
      return
    }

    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    script.onerror = () => reject(new Error("Failed to load YouTube iframe API"))

    window.onYouTubeIframeAPIReady = () => {
      if (window.YT) {
        resolve(window.YT)
      } else {
        reject(new Error("YouTube iframe API did not initialize"))
      }
    }

    document.head.appendChild(script)
  })

  return apiPromise
}

export function extractYouTubeId(input: string) {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const basicId = /^[a-zA-Z0-9_-]{11}$/
  if (basicId.test(trimmed)) {
    return trimmed
  }

  try {
    const url = new URL(trimmed)
    const host = url.hostname.replace(/^www\./, "")

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const idFromQuery = url.searchParams.get("v")
      if (idFromQuery) {
        return idFromQuery
      }

      const segments = url.pathname.split("/").filter(Boolean)
      const embedIndex = segments.indexOf("embed")
      if (embedIndex !== -1) {
        return segments[embedIndex + 1] ?? null
      }
    }

    if (host === "youtube-nocookie.com") {
      const segments = url.pathname.split("/").filter(Boolean)
      const embedIndex = segments.indexOf("embed")
      if (embedIndex !== -1) {
        return segments[embedIndex + 1] ?? null
      }
    }
  } catch {
    return null
  }

  return null
}

export type { YouTubePlayerEvent, YouTubePlayerInstance, YouTubePlayerOptions }
