'use client'

import { Home, Search } from 'lucide-react'
import Link from 'next/link'

import { Button } from '~/components/ui/button'
import { StatusPage } from '~/components/ui/status-page'

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      title="Página não encontrada"
      description="A página que você está procurando não existe ou foi movida."
      actions={
        <>
          <Link href="/">
            <Button size="md" variant="solid" className="gap-2">
              <Home className="h-5 w-5" />
              Voltar para o início
            </Button>
          </Link>
          <Button
            size="md"
            variant="outline"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <Search className="h-5 w-5" />
            Voltar
          </Button>
        </>
      }
      tip={
        <p className="text-muted-foreground text-sm">
          <strong className="text-foreground">Dica:</strong> Verifique se o
          endereço está correto ou tente acessar a página inicial.
        </p>
      }
    />
  )
}
