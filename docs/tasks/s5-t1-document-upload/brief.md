# S5-T1 — Document Upload API

**Sprint:** 5 — Carrier Verification
**Status:** pending
**Depends on:** nenhuma task de shipment — domínio novo (verificação de carrier)

---

## User story

Como carrier autônomo, quero enviar meus documentos de verificação (CPF, CNH frente/verso, comprovante de endereço, selfie), pra que um admin possa aprovar meu cadastro depois (S5-T2).

## Contexto — Supabase ainda não configurado

O projeto já tem a abstração de storage pronta, herdada do Turnora: `apps/web/src/lib/storage/supabase.ts` (`uploadFile`/`deleteFile`/`fileExists`) + `packages/env` já declara as variáveis do Supabase como **opcionais no build** (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`) — a validação só acontece em runtime, dentro de `getSupabaseAdmin()`, na hora de um upload real. Ou seja: **a API inteira pode ser construída e commitada agora**, sem precisar de credenciais Supabase reais; só o upload de arquivo de verdade vai falhar (com erro claro) até você configurar `.env`. Essa é a mesma abstração que vou reaproveitar aqui.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/me/documents` | CARRIER | Envia um documento (`multipart/form-data`: `type` + `file`) |
| `GET` | `/api/me/documents` | CARRIER | Lista os documentos já enviados pelo carrier autenticado |

## Regras

1. `type` precisa ser um dos 5 tipos de carrier autônomo: `CPF`, `CNH_FRONT`, `CNH_BACK`, `ADDRESS_PROOF`, `SELFIE` — outros valores do enum (`CNPJ`, `SOCIAL_CONTRACT`, documentos de company) ficam fora do escopo (ver abaixo)
2. `carrierId` = `userId` de quem chama; `companyId` sempre `null` nesta task
3. Documento novo do mesmo `type` **não substitui** o anterior — cria uma linha nova (`carrierId`+`type` não é `UNIQUE` no schema; preserva histórico de reenvios após rejeição, que é decisão da S5-T2)
4. `status` sempre `PENDING` na criação — aprovação/rejeição é S5-T2
5. Upload vai pro bucket `SUPABASE_STORAGE_BUCKET` (env, default herdado `request-attachments` — provavelmente precisa de um bucket próprio do Movux, ex. `carrier-documents`; decisão de nome registrada no Plan, não muda a lógica)
6. Tamanho/formato de arquivo: limite razoável (ex. 10MB, `image/*` + `application/pdf`) — validado antes de chamar o Supabase

## Out of scope

- **Documentos de company** (`CNPJ`, `SOCIAL_CONTRACT`) — não existe nenhum CRUD de `Company` construído ainda neste projeto (nem repositório, nem use-case, nem rota); não modelado aqui
- **CRLV de veículo** (`Vehicle.crlvUrl`) — também não existe CRUD de `Vehicle` ainda; é um upload de arquivo, mas pra uma entidade e fluxo totalmente diferentes do `carrierDocument`; fora do horizonte desta task
- Aprovar/rejeitar documento (`status`, `reviewedBy`, `reviewedAt`, `rejectionReason`) — S5-T2
- Validação externa (BigDataCorp/Serpro, campo `externalValidation`) — S5-T3
- Bloquear o carrier de propor fretes até documentos completos/aprovados — regra de negócio real (`DATABASE-DESIGN.md §12`: "Cannot propose until verificationStatus = APPROVED"), mas não é o objetivo desta task — é enforcement em `submit-proposal`, candidato a task própria depois da S5-T2

## Limitação de QA conhecida

Sem credenciais Supabase reais configuradas, o teste manual via curl consegue validar toda a API (auth, validação de `type`, tamanho de arquivo, criação do registro) até o ponto da chamada real de upload — que vai falhar com o erro claro já existente em `getSupabaseAdmin()` ("Missing Supabase environment variable..."). Isso **é o comportamento esperado e correto** enquanto o Supabase não estiver configurado. QA completa (upload de verdade funcionando) fica registrada como follow-up pra quando você configurar as credenciais.

## Acceptance criteria

- [ ] `POST /me/documents` com `type` válido e arquivo válido → tenta o upload real (sucesso se Supabase configurado; erro claro e esperado se não)
- [ ] `POST /me/documents` com `type` fora dos 5 permitidos → 400
- [ ] `POST /me/documents` com arquivo além do limite de tamanho ou tipo MIME não aceito → 400
- [ ] `POST /me/documents` de quem não é `CARRIER` → 403
- [ ] `GET /me/documents` retorna todos os documentos do carrier autenticado, incluindo reenvios do mesmo `type`
- [ ] Swagger documenta os 2 endpoints
- [ ] Collection Insomnia atualizada

## Complexity

Medium — reaproveita a abstração de storage já existente, mas é a primeira rota do projeto lidando com `multipart/form-data` (todas as anteriores são JSON) — precisa confirmar o padrão de parsing no App Router do Next.js 16.
