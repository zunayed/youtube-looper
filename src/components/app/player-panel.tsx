import { Pause, Play, Repeat, SkipBack, SkipForward } from "lucide-react"

import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/youtube-player"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/segments"

type LoopRange = {
  start: number
  end: number
}

type PlayerPanelProps = {
  videoId: string | null
  loopRange: LoopRange | null
  playbackRate: number
  playbackRateOptions: number[]
  currentTime: number
  duration: number
  progressPercent: number
  isPlaying: boolean
  loopingEnabled: boolean
  canNavigateSegments: boolean
  canLoop: boolean
  onPlayerRef: (handle: YouTubePlayerHandle | null) => void
  onReady: (meta: { duration: number }) => void
  onStateChange: (state: number) => void
  onTimeUpdate: (time: { currentTime: number; duration: number }) => void
  onPrevSegment: () => void
  onTogglePlay: () => void
  onNextSegment: () => void
  onToggleLooping: () => void
  onPlaybackRateChange: (value: string) => void
}

export function PlayerPanel({
  videoId,
  loopRange,
  playbackRate,
  playbackRateOptions,
  currentTime,
  duration,
  progressPercent,
  isPlaying,
  loopingEnabled,
  canNavigateSegments,
  canLoop,
  onPlayerRef,
  onReady,
  onStateChange,
  onTimeUpdate,
  onPrevSegment,
  onTogglePlay,
  onNextSegment,
  onToggleLooping,
  onPlaybackRateChange,
}: PlayerPanelProps) {
  return (
    <div className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
      <YouTubePlayer
        ref={onPlayerRef}
        videoId={videoId}
        loopRange={loopRange}
        isLooping={loopingEnabled && Boolean(loopRange)}
        playbackRate={playbackRate}
        onReady={onReady}
        onStateChange={onStateChange}
        onTimeUpdate={onTimeUpdate}
        className="w-full"
      />

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <div className="h-2 rounded-full bg-muted/60">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Button type="button" size="icon-sm" variant="outline" onClick={onPrevSegment} disabled={!canNavigateSegments}>
              <SkipBack />
            </Button>
            <Button type="button" size="icon-lg" variant="outline" onClick={onTogglePlay} disabled={!videoId}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Button type="button" size="icon-sm" variant="outline" onClick={onNextSegment} disabled={!canNavigateSegments}>
              <SkipForward />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              aria-pressed={loopingEnabled}
              onClick={onToggleLooping}
              className={cn(
                "transition",
                loopingEnabled && "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
              disabled={!canLoop}
            >
              <Repeat />
            </Button>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Speed
              <select
                className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                value={playbackRate}
                onChange={(event) => onPlaybackRateChange(event.target.value)}
              >
                {playbackRateOptions.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate.toFixed(2).replace(/\.?0+$/, "")}x
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
