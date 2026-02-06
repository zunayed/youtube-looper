export type LoopSegment = {
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

export const VIDEO_PARAM = "video"
export const SEGMENTS_PARAM = "segments"

export function generateSegmentId() {
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

export function parseSegmentsParam(value: string | null): LoopSegment[] {
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

export function serializeSegments(segments: LoopSegment[]) {
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

export function buildVideoLink(videoId: string, segments: LoopSegment[]) {
  const searchParams = new URLSearchParams({ v: videoId })
  const serialized = serializeSegments(segments)
  if (serialized) {
    searchParams.set(SEGMENTS_PARAM, serialized)
  }
  return `https://www.youtube.com/watch?${searchParams.toString()}`
}

export function extractSegmentsFromInput(value: string) {
  try {
    const url = new URL(value)
    const serialized = url.searchParams.get(SEGMENTS_PARAM)
    return parseSegmentsParam(serialized)
  } catch {
    return []
  }
}

export type InitialAppState = {
  videoId: string | null
  segments: LoopSegment[]
  inputValue: string
  selectedSegmentId: string | null
}

export function getInitialAppState(): InitialAppState {
  if (typeof window === "undefined") {
    return {
      videoId: null,
      segments: [],
      inputValue: "",
      selectedSegmentId: null,
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

export function formatTime(value: number | null) {
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

export function formatTimestampInput(value: number | null) {
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

export function parseTimestampInput(value: string) {
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
