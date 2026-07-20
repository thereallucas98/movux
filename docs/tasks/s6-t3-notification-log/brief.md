# S6-T3 — Notification Log (retry em falha)

**Sprint:** 6 — Notifications
**Status:** pending
**Depends on:** S6-T1 (Email notifications) — `NotificationLog` e `sendEmailNotification` já existem

---

## User story

Como admin, quero ver quais notificações falharam e poder reenviá-las manualmente, pra garantir que um customer/carrier não perca um email importante por causa de uma falha temporária do provedor.

## Contexto — "registro de envios" já existe, falta só o retry

A S6-T1 já implementou o registro completo: `NotificationLog` grava toda tentativa (sucesso ou falha) via `sendEmailNotification`. O que falta desta task, conforme o `ROADMAP.md`, é especificamente **retry em falha**.

## Gap encontrado — `NotificationLog` não guarda o suficiente pra reenviar

Hoje `NotificationLog.metadata` só grava `{providerMessageId}` (sucesso) ou `{error}` (falha) — **não guarda o conteúdo do email** (destinatário, assunto, corpo). Retry precisa de uma dessas duas abordagens:

1. **Re-renderizar do zero**, re-buscando o estado atual da entidade de negócio (ex.: buscar o shipment de novo, montar o template de novo) — risco: o estado pode ter mudado desde a tentativa original (ex. o frete já foi cancelado, o preço mudou), fazendo o retry enviar informação desatualizada ou incorreta
2. **Guardar o email já renderizado no momento do envio** (destinatário, assunto, HTML) e o retry só reenvia esse conteúdo exato — sem re-executar nenhuma lógica de negócio, sem risco de estado desatualizado

Decisão de qual abordagem seguir registrada na Research.

## Escopo

1. Retrofit em `sendEmailNotification` (S6-T1) — passa a gravar o suficiente em `NotificationLog` pra permitir retry (conforme decisão da Research)
2. `GET /api/admin/notifications?status=FAILED` — lista notificações falhas (fila de retry do admin)
3. `POST /api/admin/notifications/:id/retry` — reenvia

## Regras

1. Só notificações `FAILED` podem ser reenviadas — `SENT` já teve sucesso, retry não se aplica
2. Retry sem limite de tentativas — sem cron, é sempre ação manual do admin; não modela contador de tentativas nem cap
3. Retry bem-sucedido atualiza a mesma linha pra `SENT` (não cria uma linha nova) — mantém o registro como "estado atual dessa notificação", não histórico de tentativas

## Out of scope

- Retry automático agendado — sem cron neste projeto (mesma limitação de sempre)
- WhatsApp — S6-T2 foi pulada, sem canal pra reenviar
- Histórico de múltiplas tentativas por notificação (quantas vezes foi tentado, quando) — só o estado atual (`SENT`/`FAILED`) é mantido
- Retry de notificações antigas da S6-T1 que já foram gravadas **antes** desta task (não vão ter o conteúdo necessário pro retry, já que o retrofit só passa a gravar daqui pra frente) — ver Follow-up

## Acceptance criteria

- [ ] `sendEmailNotification` passa a gravar o necessário pro retry funcionar
- [ ] `GET /admin/notifications?status=FAILED` lista as notificações falhas
- [ ] `POST /admin/notifications/:id/retry` reenvia com sucesso quando o provedor aceita, atualiza `status: SENT`
- [ ] `POST /admin/notifications/:id/retry` numa notificação `SENT` → 409
- [ ] `POST /admin/notifications/:id/retry` numa notificação inexistente → 404
- [ ] Endpoints acessíveis só por `ADMIN`
- [ ] Swagger + Insomnia atualizados

## Complexity

Low-Medium — a parte de API é simples (list + retry), mas o retrofit de `sendEmailNotification` pra guardar conteúdo suficiente precisa de decisão de design antes do Plan.
