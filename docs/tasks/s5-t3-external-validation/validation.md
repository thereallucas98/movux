# S5-T3 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | Registrar `MATCH` com `notes` num documento já `APPROVED` | 200, envelope `{provider:"MANUAL", result:"MATCH", notes, checkedBy, checkedAt}` | ✅ |
| 2 | Chamar de novo no mesmo documento (`MISMATCH`) | 200, sobrescreve o registro anterior | ✅ |
| 3 | `result` fora dos 3 valores válidos | 400 | ✅ |
| 4 | Documento inexistente | 404 | ✅ |
| 5 | `CUSTOMER` tentando chamar | 403 | ✅ |
| 6 | Swagger — endpoint sob `Carrier Documents` | presente | ✅ |

Todos os 6 casos passaram de primeira. O envelope gravado no banco bateu exatamente com o formato desenhado na Research. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S5-T2, todos pré-existentes no código legado do Turnora. Zero erros novos em `carrier-document`/`external-validation`.

## Desvios encontrados durante execução

Um ajuste de local do tipo `ExternalValidationEnvelope`: o `plan.md` previa um arquivo novo `server/types/external-validation.ts`, mas não existe nenhuma convenção de pasta `server/types/` no projeto — o tipo foi definido direto em `carrier-document.repository.ts` (junto da interface `CarrierDocumentRepository` que o consome), evitando criar uma estrutura nova pra um único tipo.

## Acceptance criteria (brief.md)

- [x] `POST /external-validation` grava o envelope `{ provider: 'MANUAL', result, notes, checkedBy, checkedAt }`
- [x] Funciona em documento `PENDING`, `APPROVED` ou `REJECTED` (testado em `APPROVED`)
- [x] Chamar de novo sobrescreve o registro anterior
- [x] `result` fora dos 3 valores válidos → 400
- [x] Acessível só por `ADMIN`
- [x] Swagger documenta o endpoint e o formato do envelope
- [x] Collection Insomnia atualizada

## Follow-ups

- Quando o orçamento permitir contratar BigDataCorp, adicionar a variante `provider: 'BIGDATACORP'` à union `ExternalValidationEnvelope` e um novo caminho de use-case que chama a API paga — sem migration, sem mudar o contrato do endpoint pro admin (o `result`/`notes` manuais continuam válidos em paralelo, já que é 1 registro vigente por documento, não histórico).
- Serpro/CNPJ permanece bloqueado até existir CRUD de `Company` — não é parte desta task nem de nenhuma outra no `ROADMAP.md` ainda.
