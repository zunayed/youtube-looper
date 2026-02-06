import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import {
  Pause,
  Play,
  Plus,
  Repeat,
  RotateCcw,
  SkipBack,
  SkipForward,
  Trash2,
} from "lucide-react"

import { YouTubePlayer, type YouTubePlayerHandle } from "@/components/youtube-player"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { extractYouTubeId } from "@/lib/youtube"
import { cn } from "@/lib/utils"

type LoopSegment = {
  id: string
  label: string
  start: number
  end: number
}

type SerializableSegment = {
  label: string
  start: number
  end: number
}

const VIDEO_PARAM = "video"
const SEGMENTS_PARAM = "segments"

function generateSegmentId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `seg-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeTimestamp(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return Math.max(0, Number(numeric.toFixed(2)))
}

function parseSegmentsParam(value: string | null): LoopSegment[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    const segments = parsed
      .map((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return null
        }

        const label =
          typeof (entry as SerializableSegment).label === "string"
            ? (entry as SerializableSegment).label
            : `Loop ${index + 1}`
        const start = sanitizeTimestamp((entry as SerializableSegment).start)
        const end = sanitizeTimestamp((entry as SerializableSegment).end)

        if (start === null || end === null) {
          return null
        }

        const min = Math.min(start, end)
        const max = Math.max(start, end)

        return {
          id: generateSegmentId(),
          label: label.trim() || `Loop ${index + 1}`,
          start: min,
          end: max,
        }
      })
      .filter((segment): segment is LoopSegment => segment !== null)
      .sort((a, b) => a.start - b.start)

    return segments
  } catch (error) {
    console.error("Failed to parse segments from query string", error)
    return []
  }
}

function serializeSegments(segments: LoopSegment[]) {
  if (segments.length === 0) {
    return null
  }

  const payload: SerializableSegment[] = segments.map((segment) => ({
    label: segment.label,
    start: Number(segment.start.toFixed(2)),
    end: Number(segment.end.toFixed(2)),
  }))

  try {
    return JSON.stringify(payload)
  } catch (error) {
    console.error("Failed to serialize segments", error)
    return null
  }
}

function buildVideoLink(videoId: string, segments: LoopSegment[]) {
  const searchParams = new URLSearchParams({ v: videoId })
  const serialized = serializeSegments(segments)
  if (serialized) {
    searchParams.set(SEGMENTS_PARAM, serialized)
  }
  return `https://www.youtube.com/watch?${searchParams.toString()}`
}

function extractSegmentsFromInput(value: string) {
  try {
    const url = new URL(value)
    const serialized = url.searchParams.get(SEGMENTS_PARAM)
    return parseSegmentsParam(serialized)
  } catch {
    return []
  }
}

function getInitialAppState() {
  if (typeof window === "undefined") {
    return {
      videoId: null as string | null,
      segments: [] as LoopSegment[],
      inputValue: "",
      selectedSegmentId: null as string | null,
    }
  }

  const currentUrl = new URL(window.location.href)
  const videoParam = currentUrl.searchParams.get(VIDEO_PARAM)
  const segmentsFromUrl = parseSegmentsParam(currentUrl.searchParams.get(SEGMENTS_PARAM))

  const basicIdPattern = /^[a-zA-Z0-9_-]{11}$/
  const validVideoId =
    typeof videoParam === "string" && basicIdPattern.test(videoParam)
      ? videoParam
      : null

  const inputValue =
    validVideoId !== null ? buildVideoLink(validVideoId, segmentsFromUrl) : ""

  return {
    videoId: validVideoId,
    segments: segmentsFromUrl,
    inputValue,
    selectedSegmentId: segmentsFromUrl[0]?.id ?? null,
  }
}

function formatTime(value: number | null) {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return "00:00"
  }

  const totalSeconds = Math.max(0, Math.floor(value))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${remainingMinutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  return `${remainingMinutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`
}

function formatTimestampInput(value: number | null) {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return ""
  }

  const clamped = Math.max(0, Number(value.toFixed(2)))
  let minutes = Math.floor(clamped / 60)
  let seconds = Number((clamped - minutes * 60).toFixed(2))

  if (seconds >= 60) {
    minutes += Math.floor(seconds / 60)
    seconds = Number((seconds % 60).toFixed(2))
  }

  const minuteString = minutes.toString().padStart(2, "0")
  const secondsInteger = Math.floor(seconds)
  const fractional = Number((seconds - secondsInteger).toFixed(2))

  let secondsString = secondsInteger.toString().padStart(2, "0")
  if (fractional > 0) {
    const fractionAsInt = Math.round(fractional * 100)
    secondsString = `${secondsString}.${fractionAsInt.toString().padStart(2, "0")}`
  }

  return `${minuteString}:${secondsString}`
}

function parseTimestampInput(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (!trimmed.includes(":")) {
    const asNumber = Number(trimmed)
    return Number.isNaN(asNumber) ? null : Math.max(0, asNumber)
  }

  const parts = trimmed.split(":")
  let totalSeconds = 0
  let multiplier = 1

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
    if (part === "") {
      return null
    }

    if (index === parts.length - 1) {
      const numeric = Number(part)
      if (Number.isNaN(numeric)) {
        return null
      }
      totalSeconds += numeric * multiplier
    } else {
      if (!/^\d+$/.test(part)) {
        return null
      }
      const numeric = Number.parseInt(part, 10)
      totalSeconds += numeric * multiplier
    }
    multiplier *= 60
  }

  return Math.max(0, Number(totalSeconds.toFixed(2)))
}

const playbackRateOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function App() {
  const initialState = useMemo(() => getInitialAppState(), [])
  const playerRef = useRef<YouTubePlayerHandle | null>(null)
  const [inputValue, setInputValue] = useState(initialState.inputValue)
  const [videoId, setVideoId] = useState<string | null>(initialState.videoId)
  const [inputError, setInputError] = useState<string | null>(null)
  const [loopSegments, setLoopSegments] = useState<LoopSegment[]>(initialState.segments)
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
    initialState.selectedSegmentId,
  )
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loopingEnabled, setLoopingEnabled] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [draftLabel, setDraftLabel] = useState("")
  const [draftStart, setDraftStart] = useState<number | null>(null)
  const [draftEnd, setDraftEnd] = useState<number | null>(null)
  const [draftStartInput, setDraftStartInput] = useState("")
  const [draftEndInput, setDraftEndInput] = useState("")
  const [isInputDirty, setIsInputDirty] = useState(false)

  const selectedSegment = useMemo(
    () => loopSegments.find((segment) => segment.id === selectedSegmentId) ?? null,
    [loopSegments, selectedSegmentId],
  )

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  useEffect(() => {
    const player = playerRef.current
    if (!player || !selectedSegment) {
      return
    }

    player.seekTo(selectedSegment.start, true)
    player.play()
  }, [selectedSegment])

  const setPlayerRef = useCallback((handle: YouTubePlayerHandle | null) => {
    playerRef.current = handle
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const url = new URL(window.location.href)

    if (videoId) {
      url.searchParams.set(VIDEO_PARAM, videoId)
    } else {
      url.searchParams.delete(VIDEO_PARAM)
    }

    const serialized = serializeSegments(loopSegments)
    if (serialized) {
      url.searchParams.set(SEGMENTS_PARAM, serialized)
    } else {
      url.searchParams.delete(SEGMENTS_PARAM)
    }

    const newUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState(null, "", newUrl)
  }, [videoId, loopSegments])

  useEffect(() => {
    if (!videoId || isInputDirty) {
      return
    }

    const link = buildVideoLink(videoId, loopSegments)
    setInputValue((previous) => (previous === link ? previous : link))
  }, [videoId, loopSegments, isInputDirty])

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const candidateId = extractYouTubeId(inputValue)

      if (!candidateId) {
        setInputError("Please enter a valid YouTube URL or ID.")
        return
      }

      const parsedSegments = extractSegmentsFromInput(inputValue)

      setInputError(null)
      setVideoId(candidateId)
      setLoopSegments(parsedSegments)
      setSelectedSegmentId(parsedSegments[0]?.id ?? null)
      setDraftStart(null)
      setDraftEnd(null)
      setDraftStartInput("")
      setDraftEndInput("")
      setDraftLabel("")
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      setIsInputDirty(false)
    },
    [inputValue],
  )

  const handleTimeUpdate = useCallback(
    ({ currentTime: time, duration: total }: { currentTime: number; duration: number }) => {
      setCurrentTime(time)
      if (total > 0) {
        setDuration(total)
      }
    },
    [],
  )

  const handleStateChange = useCallback((state: number) => {
    const playingStates = new Set([1, 3])
    setIsPlaying(playingStates.has(state))
  }, [])

  const handleTogglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player) {
      return
    }

    if (isPlaying) {
      player.pause()
    } else {
      if (selectedSegment) {
        player.seekTo(selectedSegment.start, true)
      }
      player.play()
    }
  }, [isPlaying, selectedSegment])

  const handlePrevSegment = useCallback(() => {
    if (loopSegments.length === 0) {
      return
    }

    if (!selectedSegment) {
      setSelectedSegmentId(loopSegments[loopSegments.length - 1].id)
      return
    }

    const currentIndex = loopSegments.findIndex((segment) => segment.id === selectedSegment.id)
    const targetIndex =
      currentIndex > 0 ? currentIndex - 1 : Math.max(0, loopSegments.length - 1)

    setSelectedSegmentId(loopSegments[targetIndex]?.id ?? null)
  }, [loopSegments, selectedSegment])

  const handleNextSegment = useCallback(() => {
    if (loopSegments.length === 0) {
      return
    }

    if (!selectedSegment) {
      setSelectedSegmentId(loopSegments[0].id)
      return
    }

    const currentIndex = loopSegments.findIndex((segment) => segment.id === selectedSegment.id)
    const targetIndex = currentIndex < loopSegments.length - 1 ? currentIndex + 1 : 0

    setSelectedSegmentId(loopSegments[targetIndex]?.id ?? null)
  }, [loopSegments, selectedSegment])

  const handleMarkStart = useCallback(() => {
    const precise = Number(currentTime.toFixed(2))
    setDraftStart(precise)
    setDraftStartInput(formatTimestampInput(precise))
  }, [currentTime])

  const handleMarkEnd = useCallback(() => {
    const precise = Number(currentTime.toFixed(2))
    setDraftEnd(precise)
    setDraftEndInput(formatTimestampInput(precise))
  }, [currentTime])

  const handleDraftStartInput = useCallback((value: string) => {
    setDraftStartInput(value)
    const parsed = parseTimestampInput(value)
    setDraftStart(parsed)
  }, [])

  const handleDraftEndInput = useCallback((value: string) => {
    setDraftEndInput(value)
    const parsed = parseTimestampInput(value)
    setDraftEnd(parsed)
  }, [])

  const canAddSegment =
    draftStart !== null && draftEnd !== null && draftEnd - draftStart >= 0.2

  const handleAddSegment = useCallback(() => {
    if (!canAddSegment) {
      return
    }

    const id = generateSegmentId()

    const boundedStart =
      duration > 0 ? Math.min(Math.max(0, draftStart ?? 0), duration) : draftStart ?? 0
    const boundedEnd =
      duration > 0 ? Math.min(Math.max(0, draftEnd ?? 0), duration) : draftEnd ?? 0

    const newSegment: LoopSegment = {
      id,
      label: draftLabel.trim() || `Loop ${loopSegments.length + 1}`,
      start: Math.min(boundedStart, boundedEnd),
      end: Math.max(boundedStart, boundedEnd),
    }

    setLoopSegments((previous) =>
      [...previous, newSegment].sort((a, b) => a.start - b.start),
    )
    setSelectedSegmentId(id)
    setDraftStart(null)
    setDraftEnd(null)
    setDraftLabel("")
    setDraftStartInput("")
    setDraftEndInput("")
  }, [canAddSegment, draftStart, draftEnd, draftLabel, duration, loopSegments.length])

  const handleRemoveSegment = useCallback((id: string) => {
    setLoopSegments((previous) => previous.filter((segment) => segment.id !== id))
    setSelectedSegmentId((current) => (current === id ? null : current))
  }, [])

  const handleClearSegments = useCallback(() => {
    setLoopSegments([])
    setSelectedSegmentId(null)
  }, [])

  const handleSegmentSelect = useCallback((id: string) => {
    setSelectedSegmentId(id)
  }, [])

  const handleResetDraft = useCallback(() => {
    setDraftStart(null)
    setDraftEnd(null)
    setDraftLabel("")
    setDraftStartInput("")
    setDraftEndInput("")
  }, [])

  const handlePlaybackRateChange = useCallback((value: string) => {
    const rate = Number(value)
    if (!Number.isNaN(rate)) {
      setPlaybackRate(rate)
    }
  }, [])

  const loopRange = selectedSegment
    ? { start: selectedSegment.start, end: selectedSegment.end }
    : null

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Loop your favorite YouTube moments
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Paste a YouTube link, add loop segments, and jump between the beats you are working on.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex w-full flex-col gap-3 rounded-2xl border bg-card/60 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:gap-4 sm:p-5"
        >
          <div className="flex-1">
            <label htmlFor="video-input" className="sr-only">
              YouTube URL or ID
            </label>
            <Input
              id="video-input"
              placeholder="https://youtube.com/watch?v=..."
              value={inputValue}
              onChange={(event) => {
                setIsInputDirty(true)
                setInputValue(event.target.value)
              }}
              aria-invalid={Boolean(inputError)}
              onBlur={(event) => {
                if (!videoId) {
                  setIsInputDirty(false)
                  return
                }
                const canonicalLink = buildVideoLink(videoId, loopSegments)
                if (event.target.value === canonicalLink) {
                  setIsInputDirty(false)
                }
              }}
            />
            {inputError ? (
              <p className="mt-2 text-xs font-medium text-destructive">{inputError}</p>
            ) : null}
          </div>
          <Button type="submit" className="sm:w-auto">
            Load video
          </Button>
        </form>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="flex flex-col gap-6 md:col-span-2">
            <div className="rounded-2xl border bg-card/70 p-4 shadow-sm backdrop-blur">
              <YouTubePlayer
                ref={setPlayerRef}
                videoId={videoId}
                loopRange={loopRange}
                isLooping={loopingEnabled && Boolean(loopRange)}
                playbackRate={playbackRate}
                onReady={({ duration: total }) => setDuration(total)}
                onStateChange={handleStateChange}
                onTimeUpdate={handleTimeUpdate}
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
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={handlePrevSegment}
                      disabled={loopSegments.length === 0}
                    >
                      <SkipBack />
                    </Button>
                    <Button
                      type="button"
                      size="icon-lg"
                      variant="outline"
                      onClick={handleTogglePlay}
                      disabled={!videoId}
                    >
                      {isPlaying ? <Pause /> : <Play />}
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      onClick={handleNextSegment}
                      disabled={loopSegments.length === 0}
                    >
                      <SkipForward />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      aria-pressed={loopingEnabled}
                      onClick={() => setLoopingEnabled((value) => !value)}
                      className={cn(
                        "transition",
                        loopingEnabled && "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                      disabled={!selectedSegment}
                    >
                      <Repeat />
                    </Button>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      Speed
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        value={playbackRate}
                        onChange={(event) => handlePlaybackRateChange(event.target.value)}
                      >
                        {playbackRateOptions.map((rate) => (
                          <option key={rate} value={rate}>
                            {rate.toFixed(2).replace(/\.?0+$/, "")}×
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">Build a loop segment</h2>
                    <p className="text-sm text-muted-foreground">
                      Mark the start and end while the video plays, then fine-tune below.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDraft}
                    disabled={!draftLabel && draftStart === null && draftEnd === null}
                  >
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Segment label
                    </label>
                    <Input
                      placeholder="Intro groove"
                      value={draftLabel}
                      onChange={(event) => setDraftLabel(event.target.value)}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Start (mm:ss)
                      </label>
                      <Input
                        inputMode="text"
                        placeholder="00:00"
                        value={draftStartInput}
                        onChange={(event) => handleDraftStartInput(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        End (mm:ss)
                      </label>
                      <Input
                        inputMode="text"
                        placeholder="00:00"
                        value={draftEndInput}
                        onChange={(event) => handleDraftEndInput(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleMarkStart} disabled={!videoId}>
                    Mark start ({formatTimestampInput(draftStart) || "00:00"})
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={handleMarkEnd} disabled={!videoId}>
                    Mark end ({formatTimestampInput(draftEnd) || "00:00"})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSegment}
                    disabled={!canAddSegment}
                  >
                    <Plus className="size-4" />
                    Add segment
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Current time: {formatTime(currentTime)} · Duration:{" "}
                  {duration > 0 ? formatTime(duration) : "—"}
                </p>
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-5 rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur md:col-span-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Segments</h2>
                <p className="text-sm text-muted-foreground">
                  Click a segment to jump right into the loop.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSegments}
                disabled={loopSegments.length === 0}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>

            <div className="flex-1 space-y-3">
              {loopSegments.length === 0 ? (
                <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 p-4 text-center text-sm text-muted-foreground">
                  No segments yet. Create one from the left panel to get started.
                </div>
              ) : (
                loopSegments.map((segment) => {
                  const isActive = selectedSegment?.id === segment.id
                  return (
                    <div
                      key={segment.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSegmentSelect(segment.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          handleSegmentSelect(segment.id)
                        }
                      }}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                        isActive
                          ? "border-primary bg-primary/10 shadow-sm hover:bg-primary/15"
                          : "border-border bg-background/70 hover:bg-muted/60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold leading-none">{segment.label}</p>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {formatTime(segment.start)} → {formatTime(segment.end)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedSegmentId(segment.id)
                          }}
                        >
                          <Play />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {selectedSegment ? (
              <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
                <p>
                  Selected segment: <span className="font-semibold">{selectedSegment.label}</span>{" "}
                  ({formatTime(selectedSegment.start)} – {formatTime(selectedSegment.end)})
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => handleRemoveSegment(selectedSegment.id)}
                >
                  <Trash2 className="size-4" />
                  Remove selected
                </Button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default App
