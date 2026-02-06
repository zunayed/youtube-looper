import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type VideoLoaderFormProps = {
  inputValue: string
  inputError: string | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onInputChange: (value: string) => void
  onInputBlur: (value: string) => void
}

export function VideoLoaderForm({
  inputValue,
  inputError,
  onSubmit,
  onInputChange,
  onInputBlur,
}: VideoLoaderFormProps) {
  return (
    <form
      onSubmit={onSubmit}
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
          onChange={(event) => onInputChange(event.target.value)}
          aria-invalid={Boolean(inputError)}
          onBlur={(event) => onInputBlur(event.target.value)}
        />
        {inputError ? <p className="mt-2 text-xs font-medium text-destructive">{inputError}</p> : null}
      </div>
      <Button type="submit" className="sm:w-auto">
        Load video
      </Button>
    </form>
  )
}
