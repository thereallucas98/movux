# Admin — Verificação de Documentos (UI) — RESEARCH

**Date**: 2026-07-20
**Phase**: RESEARCH
**Status**: COMPLETE

---

## Context

A Exploration confirmou que toda a regra de negócio (aprovar/rejeitar, auto-completar `verificationStatus`, checagem externa manual) já está pronta em use-cases isolados. Só restavam 2 decisões de desenho da camada GraphQL antes do Plan — resolvidas nesta Research sem precisar de decisão de escopo em chat (são escolhas de API, não trade-off de produto).

---

## Goals

- Fechar o nome e o shape exato da query/mutations GraphQL
- Decidir como expor nome/e-mail do carrier no type do documento
- Decidir o retorno das mutations de ação (aprovar/rejeitar/checagem externa)

---

## Technical Analysis

### Nome da query — `carrierDocuments`, não `pendingDocuments`

O brief inicial usava `pendingDocuments`, mas a REST route (`GET /admin/carrier-documents?status=PENDING`) já mostra que o filtro por status é **opcional** — sem o param, retorna todos os documentos, não só pendentes. Renomeado pra `carrierDocuments(status?, cursor?, limit?): CarrierDocumentConnection`, mais preciso; o filtro `PENDING` fica como **default do client** (estado inicial do hook/página), não do nome da query.

### Nome/e-mail do carrier — campos flat no type, não objeto aninhado

`CarrierDocumentType` ganha `carrierName`/`carrierEmail` direto (mesma escolha já usada em `BrowseShipmentType`, que achata dados de endereço em vez de aninhar um sub-tipo) — evita um `CarrierType` novo só pra 2 campos, e mantém a query do client mais simples (`carrierName` em vez de `carrier { fullName }`).

**Repo**: `carrier-document.repository.ts` → `findByStatus` ganha `include: { carrier: { select: { fullName: true, email: true } } }`; o resolver GraphQL achata `document.carrier?.fullName`/`document.carrier?.email` pro type.

### Retorno das mutations — `Boolean`, não o documento atualizado

`approveCarrierDocument`/`rejectCarrierDocument`/`recordExternalValidation` retornam `Boolean` (mesmo padrão de `withdrawFromQueue`/`withdrawProposal` no `S8-T2`) — a lista é invalidada e refeita via React Query no `onSuccess` de cada hook; não precisa duplicar o objeto atualizado na resposta da mutation pra isso.

### GraphQL — queries e mutations finais

| Nome | Tipo | Args | Retorno | Espelha |
|---|---|---|---|---|
| `carrierDocuments` | query | `status?, cursor?, limit?` | `CarrierDocumentConnection` | `GET /admin/carrier-documents` |
| `approveCarrierDocument` | mutation | `documentId!` | `Boolean` | `POST .../approve` |
| `rejectCarrierDocument` | mutation | `documentId!, rejectionReason!` | `Boolean` | `POST .../reject` |
| `recordExternalValidation` | mutation | `documentId!, input!` | `Boolean` | `POST .../external-validation` |

Todo resolver abre com o mesmo guard já estabelecido no `S8-T2` (use-cases não validam role sozinhos):
```ts
if (!ctx.principal) throw gqlError('UNAUTHENTICATED')
if (ctx.principal.role !== 'ADMIN') throw gqlError('FORBIDDEN')
```

### `ExternalValidationType` — exposto só como parte de `CarrierDocumentType`

`externalValidation` é `Json?` no schema — vira um `simpleObject` nullable (`result`, `notes`, `checkedBy`, `checkedAt`; `provider` fixo em `'MANUAL'` nesta fase, mas exposto como `string` já pensando na automação futura, não como enum de 1 valor só). Não tem query própria — só aparece embutido no documento.

---

## Edge Cases

- **Documento sem `carrierId`** (`companyId` preenchido em vez disso) — fora de escopo (só documentos de company, que não existem no projeto hoje, teriam isso), mas o resolver trata `carrierName`/`carrierEmail` como nullable por segurança, não assume `carrier` sempre presente.
- **Aprovar/rejeitar documento já revisado** — `INVALID_STATE_TRANSITION`, botão não deveria estar disponível pela UI nesse estado (mesma lógica de `resolveCardAction`-like: card só mostra ações válidas pro `status` atual — aqui é mais simples que o `S8-T2`, só 1 dimensão de estado, então uma função pura dedicada não é necessária, um `switch`/`if` direto no componente resolve).
- **Registrar checagem externa em documento já `APPROVED`/`REJECTED`** — sempre permitido (não é transição de estado), botão sempre visível independente do status.
- **Rejeitar sem motivo** — client-side, `RejectCarrierDocumentSchema` (agora com mensagem humana) via `zodResolver`, botão desabilitado até preencher.

---

## Decision Log

| Decisão | Escolha | Razão |
|---|---|---|
| Nome da query | `carrierDocuments` (não `pendingDocuments`) | Filtro por status é opcional na REST original; nome genérico é mais preciso, `PENDING` fica como default do client |
| Nome/e-mail do carrier no type | Campos flat (`carrierName`/`carrierEmail`) | Mesmo padrão de `BrowseShipmentType` (S8-T2) — evita tipo aninhado só pra 2 campos |
| Retorno das mutations de ação | `Boolean` | Mesmo padrão de `withdrawFromQueue`/`withdrawProposal` (S8-T2) — lista já é invalidada/refeita no client |
| Estados → ação (aprovar/rejeitar/checagem) | Lógica direta no componente, sem função pura dedicada | Só 1 dimensão de estado (`status` do documento) e 3 ações no máximo — o `resolveCardAction` do S8-T2 se justificava pelas 9 combinações de fila×proposta; aqui não há combinação equivalente |

---

## Blockers

✅ Nenhum — as 2 decisões de desenho resolvidas nesta Research, sem pendência de escopo.

---

## Next Steps

1. Plan + Todo: sub-steps ordenados (context.ts → repo include → enums → types → query/mutation → codegen → hooks → componentes → páginas)
2. Execution
