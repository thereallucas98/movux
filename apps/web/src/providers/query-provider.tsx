'use client'

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { toast } from 'sonner'

// Instância única do QueryClient exportada para uso em hooks
let queryClientInstance: QueryClient | null = null

function createQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      // Mostra toast apenas se o erro não for "silencioso"
      if (query.meta?.silent) return
      // Em produção, considerar usar serviço de monitoramento
      if (process.env.NODE_ENV === 'development') {
        console.error(error)
      }
      toast.error(`Erro ao carregar dados: ${(error as Error).message}`)
    },
  })

  const mutationCache = new MutationCache({
    onError: (error, _, __, mutation) => {
      if (mutation.meta?.silent) return
      // Em produção, considerar usar serviço de monitoramento
      if (process.env.NODE_ENV === 'development') {
        console.error(error)
      }
      toast.error(`Erro na operação: ${(error as Error).message}`)
    },
    onSuccess: (_, __, ___, mutation) => {
      // permite configurar mensagens de sucesso customizadas
      if (mutation.meta?.successMessage) {
        toast.success(mutation.meta.successMessage as string)
      }
    },
  })

  return new QueryClient({
    queryCache,
    mutationCache,
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        meta: { silent: false },
      },
      mutations: {
        retry: 0,
        meta: { silent: false },
      },
    },
  })
}

// Exporta a instância única do QueryClient
export function getQueryClient(): QueryClient {
  if (!queryClientInstance) {
    queryClientInstance = createQueryClient()
  }
  return queryClientInstance
}

// Exporta diretamente para compatibilidade
export const queryClient = getQueryClient()

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
