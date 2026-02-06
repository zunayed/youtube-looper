import { PlayerPanel } from "@/components/app/player-panel"
import { SegmentBuilder } from "@/components/app/segment-builder"
import { SegmentsPanel } from "@/components/app/segments-panel"
import { VideoLoaderForm } from "@/components/app/video-loader-form"
import { useLooperState } from "@/hooks/use-looper-state"

const playbackRateOptions = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

function App() {
  const {
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
    canNavigateSegments,
    canLoop,
    hasVideo,
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
  } = useLooperState()

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

        <VideoLoaderForm
          inputValue={inputValue}
          inputError={inputError}
          onSubmit={handleSubmit}
          onInputChange={handleInputChange}
          onInputBlur={handleInputBlur}
        />

        <div className="grid gap-8 md:grid-cols-5">
          <div className="flex flex-col gap-6 md:col-span-2">
            <PlayerPanel
              videoId={videoId}
              loopRange={loopRange}
              playbackRate={playbackRate}
              playbackRateOptions={playbackRateOptions}
              currentTime={currentTime}
              duration={duration}
              progressPercent={progressPercent}
              isPlaying={isPlaying}
              loopingEnabled={loopingEnabled}
              canNavigateSegments={canNavigateSegments}
              canLoop={canLoop}
              onPlayerRef={setPlayerRef}
              onReady={handlePlayerReady}
              onStateChange={handleStateChange}
              onTimeUpdate={handleTimeUpdate}
              onPrevSegment={handlePrevSegment}
              onTogglePlay={handleTogglePlay}
              onNextSegment={handleNextSegment}
              onToggleLooping={handleToggleLooping}
              onPlaybackRateChange={handlePlaybackRateChange}
            />

            <SegmentBuilder
              draftLabel={draftLabel}
              draftStart={draftStart}
              draftEnd={draftEnd}
              draftStartInput={draftStartInput}
              draftEndInput={draftEndInput}
              currentTime={currentTime}
              duration={duration}
              hasVideo={hasVideo}
              canAddSegment={canAddSegment}
              onDraftLabelChange={setDraftLabel}
              onDraftStartInputChange={handleDraftStartInputChange}
              onDraftEndInputChange={handleDraftEndInputChange}
              onMarkStart={handleMarkStart}
              onMarkEnd={handleMarkEnd}
              onAddSegment={handleAddSegment}
              onResetDraft={resetDraft}
            />
          </div>

          <SegmentsPanel
            loopSegments={loopSegments}
            selectedSegment={selectedSegment}
            onClearSegments={handleClearSegments}
            onSegmentSelect={setSelectedSegmentId}
            onSegmentPlay={handleSegmentPlay}
            onRemoveSelected={handleRemoveSelected}
          />
        </div>
      </div>
    </div>
  )
}

export default App
