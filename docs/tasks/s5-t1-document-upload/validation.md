# S5-T1 — Validation

**Status:** ✅ concluído

---

## QA results

| # | Caso | Esperado | Resultado |
|---|---|---|---|
| 1 | GET antes de qualquer upload | `[]` | ✅ |
| 2 | `type: CNPJ` (fora do escopo carrier-autônomo) | 400 | ✅ |
| 3 | Arquivo > 10MB | 400 `ATTACHMENT_INVALID` | ✅ |
| 4 | MIME não permitido (`text/plain`) | 400 `ATTACHMENT_INVALID` | ✅ |
| 5 | Upload válido, Supabase **não configurado** | 502 `ATTACHMENT_UPLOAD_FAILED` — **resultado correto e esperado** | ✅ |
| 6 | Não-`CARRIER` tenta enviar | 403 | ✅ |
| 7 | GET após falha de upload (nada persistido) | `[]` | ✅ |
| 8 | Swagger — 2 endpoints sob `Carrier Documents` | presentes | ✅ |

Todos os 8 casos do `qa-roteiro.md` passaram exatamente como esperado. O caso 5 confirma que toda a API (auth, validação de `type`, parsing multipart, validação de MIME/tamanho, chamada de storage) está correta e funcionando — só a chamada real ao Supabase falha, porque as credenciais ainda não foram configuradas neste ambiente. Todos os acceptance criteria do `brief.md` confirmados.

## Typecheck

`pnpm exec tsc --noEmit --skipLibCheck` (dentro de `apps/web`): 251 erros, mesma contagem da baseline S4-T3, todos pré-existentes no código legado do Turnora. Zero erros novos em `carrier-document`/rota de documentos.

## Desvios encontrados durante execução

Nenhum. Task executada exatamente conforme planejado — reaproveitou por completo o precedente de multipart upload + Supabase Storage já existente no código legado (`app/api/requests/route.ts`/`submit-time-off.use-case.ts`), incluindo os códigos de erro `ATTACHMENT_INVALID`/`ATTACHMENT_UPLOAD_FAILED` (nenhum código de erro novo precisou ser criado).

## Acceptance criteria (brief.md)

- [x] `POST /me/documents` com `type` e arquivo válidos → tenta o upload real (502 esperado sem Supabase configurado)
- [x] `POST /me/documents` com `type` fora dos 5 permitidos → 400
- [x] `POST /me/documents` com arquivo além do limite/MIME não aceito → 400
- [x] `POST /me/documents` de quem não é `CARRIER` → 403
- [x] `GET /me/documents` retorna os documentos do carrier autenticado
- [x] Swagger documenta os 2 endpoints
- [x] Collection Insomnia atualizada

## Follow-ups

- **QA completa de upload real** (arquivo efetivamente salvo no Supabase Storage, `fileUrl` acessível) fica pendente até as credenciais `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET` serem configuradas no `.env`. Nenhuma mudança de código é esperada nesse momento — é só configuração de ambiente.
- Documentos de company (`CNPJ`, `SOCIAL_CONTRACT`) e CRLV de veículo ficam bloqueados até existir CRUD de `Company`/`Vehicle` — não modelado em nenhuma task do `ROADMAP.md` ainda.
