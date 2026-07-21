# S8-T6 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Estado atual do fluxo de verificação

### Rotas
| Rota | Componente | Estado hoje |
|---|---|---|
| `/admin/verifications` | `DocumentList` (sem `limit`) | Filtro por status (`AdaptiveSelect`, default `PENDING`), grid de `DocumentCard`, sem ícone |
| `/admin/dashboard` | `DocumentList limit={3}` | Mesmo componente, preview de 3 |

### `DocumentCard` — já completo, sem gap de "detalhe"
Todas as ações e informações já estão no card, inline:
- Header: label do tipo (`CARRIER_DOCUMENT_TYPE_LABELS`) + `DocumentStatusBadge`
- Conteúdo: nome/email do carrier, link "Ver arquivo" (`target="_blank"`, abre o arquivo real numa aba nova), motivo de rejeição (se `REJECTED`), resultado de checagem externa (se existir)
- Footer: "Aprovar"/"Rejeitar" (só se `PENDING`) + "Checagem externa" (sempre disponível), cada um abrindo dialog próprio (`RejectDocumentDialog`, `ExternalValidationDialog`) ou mutação direta (`approve.mutate`)

Diferente do fluxo de shipment (customer/carrier), aqui **não falta nenhuma tela** — não há decisão de "o que vai na página de detalhe que não cabe no card", porque o card já é o detalhe.

### `CarrierDocumentType` — enum confirmado (7 valores, `graphql/generated/types.ts:114`)
```
ADDRESS_PROOF | CNH_BACK | CNH_FRONT | CNPJ | CPF | SELFIE | SOCIAL_CONTRACT
```
Coincide exatamente com as 7 cores de categoria já definidas em `globals.css` (`blue`, `purple`, `pink`, `red`, `orange`, `yellow`, `green`) — mesma paleta reaproveitada por `ShipmentTypeIcon` (4 das 7 cores usadas lá). Nenhuma cor nova precisa ser criada.

## Integration points

- `shipment-type-icon.tsx` (S8-T4) — modelo de referência direto: `Record<Type, {icon, classes}>`, `size-10 rounded-full` + ícone `size-5`.
- `carrier-document-labels.ts` — já expõe `CARRIER_DOCUMENT_TYPE_LABELS`, reaproveitado como está (só o ícone é novo).
- `document-card.tsx` — único ponto de integração; `document-list.tsx` não precisa de alteração (não renderiza tipo diretamente).

## Riscos confirmados

Nenhum risco técnico relevante — task aditiva, sem tocar em mutations/dialogs existentes, sem novo dado do backend (o campo `type` já vem em `CarrierDocumentsQuery`).
