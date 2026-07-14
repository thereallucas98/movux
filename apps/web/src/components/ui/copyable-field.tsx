'use client'

import { Check, Copy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { cn } from '~/lib/utils'

import { Button } from './button'

interface CopyableFieldProps {
  value: string | null | undefined
  label?: string
  className?: string
  cleanValue?: string // Valor limpo para copiar (sem formatação)
}

export function CopyableField({
  value,
  label,
  className,
  cleanValue,
}: CopyableFieldProps) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup do timeout quando o componente desmontar
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (!value) return null

  const handleCopy = async () => {
    const textToCopy = cleanValue || value.replace(/\D/g, '') || value
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success('Copiado para a área de transferência')
      // Limpa timeout anterior se existir
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false)
        timeoutRef.current = null
      }, 2000)
    } catch (error) {
      toast.error('Erro ao copiar')
      // Apenas log em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('Erro ao copiar:', error)
      }
    }
  }

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex-1">
        {label && (
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
        )}
        <p className="text-sm">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={handleCopy}
        title="Copiar"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  )
}
