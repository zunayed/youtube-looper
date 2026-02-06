import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"

import type { YouTubePlayerHandle } from "@/components/youtube-player"
import {
  SEGMENTS_PARAM,
  VIDEO_PARAM,
  buildVideoLink,
  extractSegmentsFromInput,
  formatTimestampInput,
  generateSegmentId,
  getInitialAppState,
  parseTimestampInput,
  serializeSegments,
  type LoopSegment,
} from "@/lib/segments"
import { extractYouTubeId } from "@/lib/youtube"

export function useLooperState() {
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

  const loopRange = selectedSegment
    ? { start: selectedSegment.start, end: selectedSegment.end }
    : null

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  const canAddSegment = draftStart !== null && draftEnd !== null && draftEnd - draftStart >= 0.2

  const resetDraft = useCallback(() => {
    setDraftStart(null)
    setDraftEnd(null)
    setDraftLabel("")
    setDraftStartInput("")
    setDraftEndInput("")
  }, [])

  const setPlayerRef = useCallback((handle: YouTubePlayerHandle | null) => {
    playerRef.current = handle
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !selectedSegment) {
      return
    }

    player.seekTo(selectedSegment.start, true)
    player.play()
  }, [selectedSegment])

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

    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
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
      resetDraft()
      setCurrentTime(0)
      setDuration(0)
      setIsPlaying(false)
      setIsInputDirty(false)
    },
    [inputValue, resetDraft],
  )

  const handleInputChange = useCallback((value: string) => {
    setIsInputDirty(true)
    setInputValue(value)
  }, [])

  const handleInputBlur = useCallback(
    (value: string) => {
      if (!videoId) {
        setIsInputDirty(false)
        return
      }

      const canonicalLink = buildVideoLink(videoId, loopSegments)
      if (value === canonicalLink) {
        setIsInputDirty(false)
      }
    },
    [videoId, loopSegments],
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

  const handlePlayerReady = useCallback(({ duration: total }: { duration: number }) => {
    setDuration(total)
  }, [])

  const handleStateChange = useCallback((state: number) => {
    setIsPlaying(state === 1 || state === 3)
  }, [])

  const handleTogglePlay = useCallback(() => {
    const player = playerRef.current
    if (!player) {
      return
    }

    if (isPlaying) {
      player.pause()
      return
    }

    if (selectedSegment) {
      player.seekTo(selectedSegment.start, true)
    }
    player.play()
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

  const handleDraftStartInputChange = useCallback((value: string) => {
    setDraftStartInput(value)
    setDraftStart(parseTimestampInput(value))
  }, [])

  const handleDraftEndInputChange = useCallback((value: string) => {
    setDraftEndInput(value)
    setDraftEnd(parseTimestampInput(value))
  }, [])

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

  const handleAddSegment = useCallback(() => {
    if (!canAddSegment) {
      return
    }

    const boundedStart =
      duration > 0 ? Math.min(Math.max(0, draftStart ?? 0), duration) : draftStart ?? 0
    const boundedEnd = duration > 0 ? Math.min(Math.max(0, draftEnd ?? 0), duration) : draftEnd ?? 0
    const id = generateSegmentId()

    const newSegment: LoopSegment = {
      id,
      label: draftLabel.trim() || `Loop ${loopSegments.length + 1}`,
      start: Math.min(boundedStart, boundedEnd),
      end: Math.max(boundedStart, boundedEnd),
    }

    setLoopSegments((previous) => [...previous, newSegment].sort((a, b) => a.start - b.start))
    setSelectedSegmentId(id)
    resetDraft()
  }, [canAddSegment, draftStart, draftEnd, draftLabel, duration, loopSegments.length, resetDraft])

  const handleSegmentPlay = useCallback((segment: LoopSegment) => {
    setSelectedSegmentId(segment.id)
    const player = playerRef.current
    if (!player) {
      return
    }

    player.seekTo(segment.start, true)
    player.play()
  }, [])

  const handleRemoveSegment = useCallback((id: string) => {
    setLoopSegments((previous) => previous.filter((segment) => segment.id !== id))
    setSelectedSegmentId((current) => (current === id ? null : current))
  }, [])

  const handleClearSegments = useCallback(() => {
    setLoopSegments([])
    setSelectedSegmentId(null)
  }, [])

  const handleRemoveSelected = useCallback(() => {
    if (!selectedSegment) {
      return
    }

    handleRemoveSegment(selectedSegment.id)
  }, [selectedSegment, handleRemoveSegment])

  const handlePlaybackRateChange = useCallback((value: string) => {
    const rate = Number(value)
    if (!Number.isNaN(rate)) {
      setPlaybackRate(rate)
    }
  }, [])

  const handleToggleLooping = useCallback(() => {
    setLoopingEnabled((value) => !value)
  }, [])

  return {
    inputValue,
    inputError,
    videoId,
    loopSegments,
    selectedSegment,
    currentTime,
    duration,
    isPlaying,
    loopingEnabled,
    playbackRate,
    draftLabel,
    draftStart,
    draftEnd,
    draftStartInput,
    draftEndInput,
    progressPercent,
    loopRange,
    canAddSegment,
    canNavigateSegments: loopSegments.length > 0,
    canLoop: Boolean(selectedSegment),
    hasVideo: Boolean(videoId),
    setPlayerRef,
    setDraftLabel,
    setSelectedSegmentId,
    resetDraft,
    handleSubmit,
    handleInputChange,
    handleInputBlur,
    handleTimeUpdate,
    handlePlayerReady,
    handleStateChange,
    handleTogglePlay,
    handlePrevSegment,
    handleNextSegment,
    handleDraftStartInputChange,
    handleDraftEndInputChange,
    handleMarkStart,
    handleMarkEnd,
    handleAddSegment,
    handleSegmentPlay,
    handleRemoveSelected,
    handleClearSegments,
    handlePlaybackRateChange,
    handleToggleLooping,
  }
}
