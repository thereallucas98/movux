# S5-T3 — External Validation

**Sprint:** 5 — Carrier Verification
**Status:** pending
**Depends on:** S5-T2 (Admin verification)

---

## User story

Como admin, quero registrar o resultado de uma checagem de CPF/CNH de um carrier (hoje feita manualmente, sem custo), pra ter esse registro junto do documento — com a estrutura pronta pra, no futuro, plugar uma validação automática paga (BigDataCorp) sem mudar o formato dos dados nem o contrato da API.

## Contexto — manual agora, automatizável depois

BigDataCorp e Serpro são serviços **pagos**. Neste momento o produto não tem caixa pra isso, então a validação externa começa **100% manual**: o admin confere CPF/CNH por fora (ex. consulta gratuita da Receita) e registra o resultado no sistema. O campo `CarrierDocument.externalValidation` (`jsonb`, já existe no schema desde a S0-T1) é desenhado exatamente pra guardar esse tipo de resultado — hoje um registro manual, no futuro a resposta bruta de uma API paga, **no mesmo campo, mesmo formato de envelope**, sem migration nem mudança de contrato quando a automação for ligada.

## Escopo — só BigDataCorp (CPF/CNH); Serpro (CNPJ) fica de fora

Igual decidido na S5-T1/S5-T2: não existe CRUD de `Company` no projeto, logo não existe nenhum CNPJ pra validar. Serpro fica inteiramente fora do horizonte desta task — a estrutura genérica (envelope `provider`/`result`) é desenhada de forma que adicionar Serpro depois seja só mais um `provider` possível, não um redesenho.

## Endpoint

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/admin/carrier-documents/:id/external-validation` | ADMIN | Registra o resultado de uma checagem (manual, por enquanto) |

Ação **separada** de `approve`/`reject` (S5-T2) — só documenta a checagem externa, não decide sozinha o `status` do documento. O admin continua usando `approve`/`reject` pra decisão final, agora com essa evidência disponível.

## Regras

1. Body: `{ result: 'MATCH' | 'MISMATCH' | 'INCONCLUSIVE', notes?: string }`
2. Envelope salvo em `externalValidation`: `{ provider: 'MANUAL', result, notes, checkedBy: adminId, checkedAt: timestamp }` — o campo `provider` é o que muda quando a automação for ligada (`'BIGDATACORP'`, com `raw` contendo a resposta crua da API, no lugar de `notes`)
3. Pode ser chamado em qualquer documento, independente do `status` atual (`PENDING`, `APPROVED` ou `REJECTED`) — é só um registro de evidência, não uma transição de estado
4. Sobrescreve o registro anterior se chamado de novo no mesmo documento (não é histórico de múltiplas checagens — 1 registro vigente por documento, como o próprio campo `jsonb` único no schema já implica)

## Out of scope

- Qualquer chamada de API paga de verdade (BigDataCorp/Serpro) — fica pronta a estrutura, não a integração
- Serpro/CNPJ — sem `Company` CRUD, sem CNPJ, sem o que validar
- `externalValidation` gatear automaticamente `approve`/`reject` — o admin decide, a checagem é só suporte
- Cobrança/faturamento do uso da API paga futura — não é o objetivo desta task

## Acceptance criteria

- [ ] `POST /external-validation` grava o envelope `{ provider: 'MANUAL', result, notes, checkedBy, checkedAt }` em `CarrierDocument.externalValidation`
- [ ] Funciona em documento `PENDING`, `APPROVED` ou `REJECTED`
- [ ] Chamar de novo no mesmo documento sobrescreve o registro anterior
- [ ] `result` fora dos 3 valores válidos → 400
- [ ] Acessível só por `ADMIN` — 403 pra outros papéis
- [ ] Swagger documenta o endpoint, incluindo o formato do envelope (pra já deixar registrado o contrato que a automação futura vai seguir)
- [ ] Collection Insomnia atualizada

## Complexity

Low — é um endpoint simples de anotação. O cuidado está em desenhar o envelope (`provider`/`result`/`notes` vs `provider`/`result`/`raw`) de um jeito que sirva pros dois casos sem redesenho depois — decisão a confirmar na Research.
