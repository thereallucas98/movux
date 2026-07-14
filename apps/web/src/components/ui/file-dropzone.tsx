'use client'

import { Paperclip, Upload, X } from 'lucide-react'
import * as React from 'react'

import { Button } from '~/components/ui/button'
import { IconButton } from '~/components/ui/icon-button'
import { cn } from '~/lib/utils'

interface Props {
  value: File | null
  onChange: (file: File | null) => void
  accept: string
  maxSizeBytes: number
  acceptLabel?: string
  disabled?: boolean
  ariaInvalid?: boolean
  className?: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileDropzone({
  value,
  onChange,
  accept,
  maxSizeBytes,
  acceptLabel,
  disabled = false,
  ariaInvalid,
  className,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const acceptList = React.useMemo(
    () =>
      accept
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [accept],
  )

  function validate(file: File): string | null {
    if (!acceptList.includes(file.type)) {
      return `Tipo não permitido. Use ${acceptLabel ?? acceptList.join(', ')}.`
    }
    if (file.size > maxSizeBytes) {
      return `Tamanho máximo: ${formatBytes(maxSizeBytes)}.`
    }
    return null
  }

  function handlePick(file: File | null) {
    if (!file) {
      setError(null)
      onChange(null)
      return
    }
    const err = validate(file)
    if (err) {
      setError(err)
      onChange(null)
      return
    }
    setError(null)
    onChange(file)
  }

  function handleClickArea() {
    if (disabled) return
    inputRef.current?.click()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0] ?? null
    handlePick(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    if (disabled) return
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleRemove() {
    handlePick(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (value) {
    return (
      <div
        className={cn(
          'border-input bg-background flex items-center gap-3 rounded-[10px] border p-3',
          className,
        )}
      >
        <Paperclip
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-foreground truncate text-[14px] font-medium">
            {value.name}
          </span>
          <span className="text-muted-foreground text-[12px]">
            {formatBytes(value.size)}
          </span>
        </div>
        <IconButton
          type="button"
          variant="outline"
          size="sm"
          aria-label="Remover anexo"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X />
        </IconButton>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClickArea}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClickArea()
          }
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        data-invalid={ariaInvalid || error ? true : undefined}
        className={cn(
          'border-input flex min-h-[8rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed p-4 text-center transition-colors',
          isDragging && 'border-primary bg-primary/5',
          (ariaInvalid || error) && 'border-destructive',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Upload className="text-muted-foreground size-6" aria-hidden />
        <div className="flex flex-col gap-1">
          <span className="text-foreground text-[14px] font-medium">
            Arraste e solte ou clique para selecionar
          </span>
          {acceptLabel && (
            <span className="text-muted-foreground text-[12px]">
              {acceptLabel} · até {formatBytes(maxSizeBytes)}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            handleClickArea()
          }}
        >
          Selecionar arquivo
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={accept}
        disabled={disabled}
        onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
      />
      {error && (
        <span className="text-destructive text-[13px] font-medium">
          {error}
        </span>
      )}
    </div>
  )
}
