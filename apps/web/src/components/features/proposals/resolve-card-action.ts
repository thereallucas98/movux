import type {
  ProposalStatus,
  QueueEntryStatus,
  ResponseType,
} from '~/graphql/generated/types'

export interface CardActionInput {
  /** `null` = carrier ainda não entrou na fila desse frete */
  queueStatus: QueueEntryStatus | null
  /** `null` = carrier ainda não enviou proposta */
  proposalStatus: ProposalStatus | null
  currentAttempt: number | null
  /** `responseType` da tentativa atual (`attempts[currentAttempt]`) */
  currentAttemptResponseType: ResponseType | null
}

export type CardActionKind =
  | 'join'
  | 'submit-proposal'
  | 'counter-offer'
  | 'withdraw-queue'
  | 'withdraw-proposal'

export interface ResolvedCardAction {
  actions: CardActionKind[]
  readOnlyLabel: string | null
}

const MAX_ATTEMPTS = 5

/**
 * Única fonte de verdade pra "qual ação o card mostra" — a combinação de
 * QueueEntryStatus × ProposalStatus tem 9 casos relevantes (matriz definida
 * na Research do S8-T2); manter isso espalhado por componente é o que gera
 * inconsistência entre a tela de browse e a de propostas.
 */
export function resolveCardAction({
  queueStatus,
  proposalStatus,
  currentAttempt,
  currentAttemptResponseType,
}: CardActionInput): ResolvedCardAction {
  if (proposalStatus === 'ACCEPTED') {
    return { actions: [], readOnlyLabel: 'Proposta aceita' }
  }
  if (proposalStatus === 'REJECTED') {
    return { actions: [], readOnlyLabel: 'Proposta recusada' }
  }
  if (proposalStatus === 'EXPIRED') {
    return { actions: [], readOnlyLabel: 'Proposta expirada' }
  }

  if (queueStatus === null) {
    return { actions: ['join'], readOnlyLabel: null }
  }
  if (queueStatus === 'EXHAUSTED') {
    return { actions: [], readOnlyLabel: 'Vaga encerrada' }
  }
  if (queueStatus === 'WITHDRAWN') {
    if (proposalStatus === 'WITHDRAWN') {
      return { actions: [], readOnlyLabel: 'Você desistiu da proposta' }
    }
    // Achado #18: saiu da fila antes de propor — pode reentrar enquanto o
    // frete continuar aberto (mesmo tratamento de quem nunca entrou).
    return { actions: ['join'], readOnlyLabel: null }
  }
  if (queueStatus === 'WAITING') {
    return { actions: ['withdraw-queue'], readOnlyLabel: null }
  }
  if (queueStatus === 'CALLED') {
    return {
      actions: ['submit-proposal', 'withdraw-queue'],
      readOnlyLabel: null,
    }
  }
  if (queueStatus === 'ACTIVE') {
    if ((currentAttempt ?? 1) >= MAX_ATTEMPTS) {
      return { actions: ['withdraw-proposal'], readOnlyLabel: null }
    }
    // Achado #6: só libera nova tentativa depois que o cliente recusar a
    // atual — enquanto `PENDING`, carrier só pode desistir, não reenviar.
    if (currentAttemptResponseType === 'PENDING') {
      return { actions: ['withdraw-proposal'], readOnlyLabel: null }
    }
    return {
      actions: ['counter-offer', 'withdraw-proposal'],
      readOnlyLabel: null,
    }
  }

  return { actions: [], readOnlyLabel: null }
}
