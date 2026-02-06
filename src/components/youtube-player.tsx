import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

import { cn } from "@/lib/utils"
import {
  loadYouTubeIframeApi,
  type YouTubePlayerEvent,
  type YouTubePlayerInstance,
  type YouTubePlayerOptions,
} from "@/lib/youtube"

type LoopRange = {
  start: number
  end: number
}

export type YouTubePlayerHandle = {
  play: () => void
  pause: () => void
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void
  setPlaybackRate: (rate: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayer: () => YouTubePlayerInstance | null
}

type YouTubePlayerProps = {
  videoId?: string | null
  loopRange?: LoopRange | null
  isLooping?: boolean
  playbackRate?: number
  onReady?: (meta: { duration: number }) => void
  onStateChange?: (state: number) => void
  onTimeUpdate?: (time: { currentTime: number; duration: number }) => void
  className?: string
}

const POLL_INTERVAL_MS = 250
const LOOP_THRESHOLD = 0.15

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  (
    {
      videoId,
      loopRange,
      isLooping = false,
      playbackRate = 1,
      onReady,
      onStateChange,
      onTimeUpdate,
      className,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YouTubePlayerInstance | null>(null)
    const readyRef = useRef(false)
    const pollTimerRef = useRef<number | null>(null)
    const onReadyRef = useRef(onReady)
    const onStateChangeRef = useRef(onStateChange)
    const loopStart = loopRange?.start ?? null
    const loopEnd = loopRange?.end ?? null

    useEffect(() => {
      onReadyRef.current = onReady
    }, [onReady])

    useEffect(() => {
      onStateChangeRef.current = onStateChange
    }, [onStateChange])

    useImperativeHandle<YouTubePlayerHandle, YouTubePlayerHandle>(
      ref,
      () => ({
        play: () => {
          playerRef.current?.playVideo()
        },
        pause: () => {
          playerRef.current?.pauseVideo()
        },
        seekTo: (seconds: number, allowSeekAhead = true) => {
          playerRef.current?.seekTo(seconds, allowSeekAhead)
        },
        setPlaybackRate: (rate: number) => {
          playerRef.current?.setPlaybackRate(rate)
        },
        getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
        getDuration: () => playerRef.current?.getDuration() ?? 0,
        getPlayer: () => playerRef.current,
      }),
      [],
    )

    useEffect(() => {
      let isMounted = true
      const containerElement = containerRef.current

      if (!containerElement) {
        return undefined
      }

      loadYouTubeIframeApi()
        .then((YT) => {
          if (!isMounted || !containerElement) {
            return
          }

          const options: YouTubePlayerOptions = {
            playerVars: {
              enablejsapi: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
            },
            events: {
              onReady: (event: YouTubePlayerEvent) => {
                readyRef.current = true
                onReadyRef.current?.({ duration: event.target.getDuration() })
              },
              onStateChange: (event: YouTubePlayerEvent) => {
                onStateChangeRef.current?.(event.data ?? 0)
              },
            },
          }

          playerRef.current = new YT.Player(containerElement, options)
        })
        .catch((error) => {
          console.error(error)
        })

      return () => {
        isMounted = false
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
        playerRef.current?.destroy()
        playerRef.current = null
        readyRef.current = false
        if (containerElement) {
          containerElement.innerHTML = ""
        }
      }
    }, [])

    useEffect(() => {
      if (!playerRef.current || !readyRef.current) {
        return
      }

      if (!videoId) {
        playerRef.current.stopVideo()
        return
      }

      const currentVideo = playerRef.current.getVideoData()?.video_id
      if (currentVideo === videoId) {
        return
      }

      playerRef.current.cueVideoById(videoId)
    }, [videoId])

    useEffect(() => {
      if (!playerRef.current || !readyRef.current) {
        return
      }

      playerRef.current.setPlaybackRate(playbackRate)
    }, [playbackRate])

    useEffect(() => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }

      if (!playerRef.current || !readyRef.current) {
        return
      }

      pollTimerRef.current = window.setInterval(() => {
        if (!playerRef.current) {
          return
        }

        const currentTime = playerRef.current.getCurrentTime()
        const duration = playerRef.current.getDuration()

        onTimeUpdate?.({ currentTime, duration })

        if (isLooping && loopStart !== null && loopEnd !== null && loopEnd > loopStart) {
          if (currentTime >= loopEnd - LOOP_THRESHOLD) {
            playerRef.current.seekTo(loopStart, true)
          }
        }
      }, POLL_INTERVAL_MS)

      return () => {
        if (pollTimerRef.current) {
          window.clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
        }
      }
    }, [isLooping, loopStart, loopEnd, onTimeUpdate])

    useEffect(() => {
      if (!playerRef.current || !readyRef.current || loopStart === null) {
        return
      }

      if (isLooping) {
        playerRef.current.seekTo(loopStart, true)
      }
    }, [loopStart, isLooping])

    return (
      <div
        ref={containerRef}
        className={cn("aspect-video w-full overflow-hidden rounded-xl bg-muted", className)}
      />
    )
  },
)

YouTubePlayer.displayName = "YouTubePlayer"
