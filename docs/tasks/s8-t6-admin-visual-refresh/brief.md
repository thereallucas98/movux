# Task Brief: Verificação de Documentos (Admin) — Generalização do Redesign Visual

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Small
**Type**: UI Change
**Estimated Effort**: 1-2 hours

---

## Feature Overview

### User Story
Como admin, quero identificar visualmente o tipo de cada documento na fila de verificação (ícone por categoria, igual ao padrão já usado nos fretes), pra escanear a lista mais rápido sem depender só do texto do label.

### Problem Statement
S8-T4 e S8-T5 já provaram e generalizaram o padrão visual (ícone circular por categoria) em 2 fluxos reais (customer, carrier). O admin (verificação de documentos, S5-T2) é o terceiro e último fluxo mapeado em `docs/design-references-notes.md`. Diferente dos dois anteriores, esse fluxo **não tem gap de página de detalhe** — `DocumentCard` já mostra tudo (dados do carrier, ações de aprovar/rejeitar/checagem externa, link pro arquivo) inline, sem nada faltando. Decisão de escopo tomada em chat: fechar só o gap real (falta de ícone por tipo), sem inventar uma página de detalhe ou trocar o link "Ver arquivo" por preview inline — isso mexeria num fluxo de compliance que já funciona (S5-T2), fora do que foi pedido.

### Scope

**In Scope:**
- Novo componente `DocumentTypeIcon` — mesmo padrão do `ShipmentTypeIcon` (ícone circular colorido por categoria), mapeando os 7 `CarrierDocumentType` pra ícone+cor
- Aplicar `DocumentTypeIcon` no `DocumentCard` (ao lado do label do tipo, mesma posição do `ShipmentTypeIcon` nos cards de frete)

**Out of Scope:**
- Página de detalhe nova — não existe gap aqui, todas as ações já estão no card
- Preview inline do arquivo (imagem/PDF) — "Ver arquivo" continua abrindo em aba nova, sem mudança
- Mudança no filtro (`AdaptiveSelect` por status) — já funciona, trocar pro padrão bottom-sheet do S8-T4 seria redesenhar algo que não tem problema
- Qualquer mudança em `reject-document-dialog.tsx`/`external-validation-dialog.tsx`/lógica de aprovação/rejeição — reaproveitados como estão

---

## Current State

**Key Files:**
- `apps/web/src/components/features/admin/document-card.tsx` — card com label de tipo (`CARRIER_DOCUMENT_TYPE_LABELS[document.type]`), sem ícone, ações inline (Aprovar/Rejeitar/Checagem externa), link "Ver arquivo"
- `apps/web/src/components/features/admin/document-list.tsx` — grid de `DocumentCard`, filtro por status via `AdaptiveSelect`, usado em `/admin/verifications` e `/admin/dashboard` (`limit={3}`)
- `apps/web/src/components/features/admin/carrier-document-labels.ts` — `CARRIER_DOCUMENT_TYPE_LABELS: Record<CarrierDocumentType, string>`, 7 valores (CPF, CNH_FRONT, CNH_BACK, ADDRESS_PROOF, SELFIE, CNPJ, SOCIAL_CONTRACT)
- `apps/web/src/components/features/shipments/shipment-type-icon.tsx` — componente de referência (S8-T4), mesmo padrão a replicar

**Current Behavior:**
Cards mostram só o label textual do tipo de documento, sem ícone. Dashboard do admin (`limit={3}`) e página de verificações completa reaproveitam o mesmo `DocumentList`/`DocumentCard`.

**Gaps/Issues:**
- Nenhum componente de ícone por tipo de documento existe — precisa ser criado (análogo ao `ShipmentTypeIcon`).

---

## Requirements

### Functional Requirements

**FR1: Ícone por tipo de documento**
- **Description**: Cada `DocumentCard` ganha um ícone circular colorido por `CarrierDocumentType`
- **Trigger**: Renderização de `/admin/verifications` e `/admin/dashboard`
- **Expected Outcome**: Visual consistente com o padrão já aprovado nos fretes (customer e carrier)
- **Edge Cases**: Nenhum — os 7 tipos são um enum fechado, sem valor nulo possível vindo do backend

---

## Technical Approach

**Chosen Approach:**
Réplica direta do padrão `ShipmentTypeIcon`: `Record<CarrierDocumentType, { icon, classes }>` usando a mesma paleta de cor por categoria (`{cor}-light`/`{cor}-dark`) já em `globals.css`. Mapeamento definido na Research (7 tipos → 7 cores, todas distintas).

**Alternatives Considered:**
1. **Preview inline do arquivo** — descartado em chat, fora do escopo (mexeria num fluxo de compliance já validado sem necessidade).
2. **Pular admin, ir pro Sprint 7** — descartado em chat; task é pequena e fecha o redesign visual dos 3 fluxos mapeados antes de mudar de frente.

**Rationale:**
Menor risco, fecha exatamente o gap identificado (falta de ícone), sem tocar em nada que já funciona.

---

## Files to Change

### New Files
- `apps/web/src/components/features/admin/document-type-icon.tsx`

### Modified Files
- `apps/web/src/components/features/admin/document-card.tsx` — adiciona `DocumentTypeIcon` no header

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: `/admin/verifications` mostra ícone por tipo de documento em cada card
- [ ] **AC2**: `/admin/dashboard` reflete o mesmo visual automaticamente (reaproveita `DocumentList`)
- [ ] **AC3**: `pnpm lint`/`pnpm typecheck` passam no escopo isolado desta task

### Should Have (P1)
- [ ] **AC4**: Responsivo confirmado em 375px e desktop
- [ ] **AC5**: Nenhuma regressão nas ações existentes (Aprovar/Rejeitar/Checagem externa/Ver arquivo)

---

## Test Strategy

**UI**: renderização com dado real (todos os 7 tipos de documento, se existirem no seed/dados de teste), responsivo 375px/desktop, confirmar que as ações existentes continuam funcionando sem alteração.

---

## Dependencies

**Blocks:** Nenhum — última rodada mapeada do redesign visual (S8-T4 customer, S8-T5 carrier, S8-T6 admin)
**Blocked By:** S8-T4 (padrão visual validado)
**Related Work:** `docs/design-references-notes.md`, `docs/tasks/s8-t4-shipment-visual-refresh/`, `docs/tasks/s8-t5-carrier-visual-refresh/`
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Task pequena demais pra justificar o ciclo completo de 5 fases | Baixa | Baixo | Mesmo pequena, é UI-visível de um fluxo de compliance (S5-T2) — vale manter o mesmo rigor de QA |

---

## Complexity Estimate

**Overall**: Small
- Backend: None
- Frontend: Small (1 componente novo + 1 arquivo modificado)

**Estimated Effort**: 1-2 hours
**Confidence**: Alta

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Escopo decidido em chat: só ícone por tipo de documento, sem página de detalhe nova nem preview de arquivo inline — fluxo já não tem gap além da falta de ícone.

---

## References

- [`docs/design-references-notes.md`](../../design-references-notes.md) — anotações de referências visuais (mesmo padrão do S8-T4)
- `docs/tasks/s8-t4-shipment-visual-refresh/` — origem do padrão `TypeIcon` sendo replicado
- `docs/tasks/s8-t5-carrier-visual-refresh/` — segunda generalização do padrão
- `docs/tasks/s5-t2-admin-verify/` — task original do fluxo de verificação de documentos
