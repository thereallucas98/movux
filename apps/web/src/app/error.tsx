'use client'

import { AlertCircle, Home, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '~/components/ui/button'
import { StatusPage } from '~/components/ui/status-page'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', error)
    }
  }, [error])

  return (
    <StatusPage
      glyph={
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="text-feedback-danger h-12 w-12" />
        </div>
      }
      title="Ops! Algo deu errado"
      description="Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema."
      actions={
        <>
          <Button size="md" variant="solid" onClick={reset} className="gap-2">
            <RefreshCw className="h-5 w-5" />
            Tentar novamente
          </Button>
          <a href="/">
            <Button size="md" variant="outline" className="gap-2">
              <Home className="h-5 w-5" />
              Voltar para o início
            </Button>
          </a>
        </>
      }
      tip={
        <>
          <p className="text-muted-foreground text-sm">
            <strong className="text-foreground">O que fazer:</strong>
          </p>
          <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Tente recarregar a página</li>
            <li>Verifique sua conexão com a internet</li>
            <li>Se o problema persistir, entre em contato com o suporte</li>
          </ul>
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="bg-muted mt-4 rounded-lg p-3 text-left">
              <p className="text-foreground font-mono text-xs">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </>
      }
    />
  )
}
