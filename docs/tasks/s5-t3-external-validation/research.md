# S5-T3 — Research

## Decision Log

### Formato do envelope `externalValidation`

**Decision:** union discriminada por `provider`, com só a variante `MANUAL` implementada agora:

```ts
export type ExternalValidationEnvelope =
  | {
      provider: 'MANUAL'
      result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE'
      notes?: string
      checkedBy: string
      checkedAt: string
    }
  // Futuro (não implementado nesta task):
  // | { provider: 'BIGDATACORP'; result: ...; raw: unknown; checkedAt: string }
```

**Reason:** o pedido explícito foi "ter a estrutura de como fosse para ambos" — uma union discriminada por `provider` documenta o contrato futuro em código (não só em comentário solto) sem construir uma camada de abstração/provider pattern que não tem nenhum consumidor real ainda (isso violaria a regra do projeto contra desenhar pra requisito hipotético). Quando o BigDataCorp for ligado de verdade, a variante nova entra na union e o código que já lê `envelope.provider === 'MANUAL'` continua funcionando sem mudança.

## Technical Analysis

- **`carrier-document.repository.ts` — método novo:**
  ```ts
  recordExternalValidation(id: string, envelope: ExternalValidationEnvelope): Promise<void>
  // prisma.carrierDocument.update({ where: { id }, data: { externalValidation: envelope } })
  ```
- **Schema Zod:** `ExternalValidationBodySchema = z.object({ result: z.enum(['MATCH','MISMATCH','INCONCLUSIVE']), notes: z.string().optional() })` — `provider`, `checkedBy`, `checkedAt` são preenchidos pelo use-case, não vêm do client.
- **Use-case `record-external-validation.use-case.ts`:**
  1. `carrierDocumentRepo.findById(id)` → `NOT_FOUND`
  2. Monta o envelope `{ provider: 'MANUAL', result, notes, checkedBy: adminUserId, checkedAt: new Date().toISOString() }`
  3. `carrierDocumentRepo.recordExternalValidation(id, envelope)`
- **Sem gate de status** — funciona em `PENDING`/`APPROVED`/`REJECTED`, conforme `brief.md`.

## Edge Cases

| Case | Behavior |
|---|---|
| Documento não existe | 404 |
| `result` fora dos 3 valores | 400 |
| Chamar 2x no mesmo documento | 2ª chamada sobrescreve o envelope (sem histórico — 1 registro vigente) |
| Documento já `APPROVED`/`REJECTED` | permitido — é só evidência, não muda o `status` |
| `notes` omitido | válido — campo opcional |
| `CUSTOMER`/`CARRIER` chamando | 403 |

## Blockers

✅ No blockers.

## Next Steps

1. Write `plan.md` + `todo.md` + `qa-roteiro.md` (Phase 3).
