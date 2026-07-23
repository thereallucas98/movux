'use client'

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { toast } from 'sonner'

import { getGraphQLErrorCode } from '~/lib/graphql-client'
import '~/lib/zod-locale'

// Instância única do QueryClient exportada para uso em hooks
let queryClientInstance: QueryClient | null = null

// Fallback pra qualquer query/mutation que não tenha mapeamento de erro
// próprio — ClientError.message do graphql-request despeja o JSON cru da
// requisição/resposta, então nunca deve ir direto pro toast (ver
// getGraphQLErrorCode em ~/lib/graphql-client.ts). Hooks que já lançam um
// Error com mensagem amigável (padrão ERROR_MESSAGES) passam por aqui sem
// alteração, já que não são ClientError.
function toFriendlyMessage(error: unknown, fallback: string): string {
  const code = getGraphQLErrorCode(error)
  if (code) return fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function createQueryClient(): QueryClient {
  const queryCache = new QueryCache({
    onError: (error, query) => {
      // Mostra toast apenas se o erro não for "silencioso"
      if (query.meta?.silent) return
      // Em produção, considerar usar serviço de monitoramento
      if (process.env.NODE_ENV === 'development') {
        console.error(error)
      }
      toast.error(
        toFriendlyMessage(error, 'Não foi possível carregar os dados.'),
      )
    },
  })

  const mutationCache = new MutationCache({
    onError: (error, _, __, mutation) => {
      if (mutation.meta?.silent) return
      // Em produção, considerar usar serviço de monitoramento
      if (process.env.NODE_ENV === 'development') {
        console.error(error)
      }
      toast.error(
        toFriendlyMessage(error, 'Não foi possível completar a operação.'),
      )
    },
    onSuccess: (data, variables, _context, mutation) => {
      // permite configurar mensagens de sucesso customizadas — string fixa
      // ou função (data, variables) => string, pra mutations cujo resultado
      // depende do que foi enviado (ex. achado #20: confirmar entrega vs.
      // reportar problema usam a mesma mutation, mensagens diferentes)
      const successMessage = mutation.meta?.successMessage
      if (typeof successMessage === 'function') {
        toast.success(
          (successMessage as (data: unknown, variables: unknown) => string)(
            data,
            variables,
          ),
        )
      } else if (successMessage) {
        toast.success(successMessage as string)
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
