import { Play, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatTime, type LoopSegment } from "@/lib/segments"

type SegmentsPanelProps = {
  loopSegments: LoopSegment[]
  selectedSegment: LoopSegment | null
  onClearSegments: () => void
  onSegmentSelect: (id: string) => void
  onSegmentPlay: (segment: LoopSegment) => void
  onRemoveSelected: () => void
}

export function SegmentsPanel({
  loopSegments,
  selectedSegment,
  onClearSegments,
  onSegmentSelect,
  onSegmentPlay,
  onRemoveSelected,
}: SegmentsPanelProps) {
  return (
    <aside className="flex flex-col gap-5 rounded-2xl border bg-card/70 p-5 shadow-sm backdrop-blur md:col-span-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Segments</h2>
          <p className="text-sm text-muted-foreground">Click a segment to jump right into the loop.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSegments}
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
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition",
                  isActive
                    ? "border-primary bg-primary/10 shadow-sm hover:bg-primary/15"
                    : "border-border bg-background/70 hover:bg-muted/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSegmentSelect(segment.id)}
                  className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                >
                  <p className="truncate text-sm font-semibold leading-none">{segment.label}</p>
                  <p className="mt-1 text-xs font-mono text-muted-foreground">
                    {formatTime(segment.start)} {"->"} {formatTime(segment.end)}
                  </p>
                </button>
                <Button type="button" size="icon-sm" variant="outline" onClick={() => onSegmentPlay(segment)}>
                  <Play />
                </Button>
              </div>
            )
          })
        )}
      </div>

      {selectedSegment ? (
        <div className="rounded-xl bg-muted/30 p-3 text-xs text-muted-foreground">
          <p>
            Selected segment: <span className="font-semibold">{selectedSegment.label}</span> (
            {formatTime(selectedSegment.start)} {"-"} {formatTime(selectedSegment.end)})
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onRemoveSelected}
          >
            <Trash2 className="size-4" />
            Remove selected
          </Button>
        </div>
      ) : null}
    </aside>
  )
}
