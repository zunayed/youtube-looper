import { Plus, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTime, formatTimestampInput } from "@/lib/segments"

type SegmentBuilderProps = {
  draftLabel: string
  draftStart: number | null
  draftEnd: number | null
  draftStartInput: string
  draftEndInput: string
  currentTime: number
  duration: number
  hasVideo: boolean
  canAddSegment: boolean
  onDraftLabelChange: (value: string) => void
  onDraftStartInputChange: (value: string) => void
  onDraftEndInputChange: (value: string) => void
  onMarkStart: () => void
  onMarkEnd: () => void
  onAddSegment: () => void
  onResetDraft: () => void
}

export function SegmentBuilder({
  draftLabel,
  draftStart,
  draftEnd,
  draftStartInput,
  draftEndInput,
  currentTime,
  duration,
  hasVideo,
  canAddSegment,
  onDraftLabelChange,
  onDraftStartInputChange,
  onDraftEndInputChange,
  onMarkStart,
  onMarkEnd,
  onAddSegment,
  onResetDraft,
}: SegmentBuilderProps) {
  return (
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
            onClick={onResetDraft}
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
              onChange={(event) => onDraftLabelChange(event.target.value)}
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
                onChange={(event) => onDraftStartInputChange(event.target.value)}
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
                onChange={(event) => onDraftEndInputChange(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onMarkStart} disabled={!hasVideo}>
            Mark start ({formatTimestampInput(draftStart) || "00:00"})
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onMarkEnd} disabled={!hasVideo}>
            Mark end ({formatTimestampInput(draftEnd) || "00:00"})
          </Button>
          <Button type="button" size="sm" onClick={onAddSegment} disabled={!canAddSegment}>
            <Plus className="size-4" />
            Add segment
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Current time: {formatTime(currentTime)} · Duration: {duration > 0 ? formatTime(duration) : "-"}
        </p>
      </div>
    </div>
  )
}
