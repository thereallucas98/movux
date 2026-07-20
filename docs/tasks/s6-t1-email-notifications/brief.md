# S6-T1 — Email Notifications

**Sprint:** 6 — Notifications
**Status:** pending
**Depends on:** nenhuma task específica — retrofit espalhado, como a S3-T4 (event log)

---

## User story

Como customer ou carrier, quero receber email nos momentos importantes do ciclo do frete (proposta recebida, carrier selecionado, entrega pra confirmar, documento aprovado/rejeitado etc.), pra não precisar ficar checando o app.

## Contexto — Resend não configurado, mas já existe abstração pronta

`apps/web/src/lib/email/client.ts` (herdado do Turnora) já resolve exatamente o problema "preparado mas não configurado": `getEmailClient()` retorna um `ResendClient` se `RESEND_API_KEY` existir, ou um `ConsoleClient` (loga o email formatado no console em vez de enviar) caso contrário — decidido em runtime, sem exigir mudança de código depois. **Reaproveito essa abstração tal como está.** Só existe 1 template hoje (`verify-email.tsx`), não usado por nenhum código do domínio Movux ainda.

## Escopo — quais eventos têm produtor real hoje

`DATABASE-DESIGN.md §11.1` lista 13 eventos com "Email" marcado ✅, mas nem todos têm uma use-case que os produz hoje (mesma checagem que a S3-T4 fez pro event log). Essa auditoria evento-a-evento vai pra Exploration, não pro Brief — aqui só o recorte de alto nível:

**Prováveis candidatos com produtor real** (use-cases já commitadas que correspondem a um evento da tabela): registro de usuário, carrier chamado pra fila, proposta recebida, proposta aceita/carrier selecionado, termo de segurança necessário, confirmação de entrega solicitada, documento aprovado/rejeitado.

**Prováveis fora de escopo** (sem produtor, mesma razão da S3-T4/S3-T2): SLA expirando (exige job agendado — não existe cron neste projeto), alerta de janela ETA (depende de Google Maps, não implementado), lembrete de review (exige job agendado, diferente do lazy-sweep — ninguém chama um endpoint pra "lembrar"), lembrete de pagamento de assinatura (não existe nenhum CRUD de `Subscription`/billing construído ainda).

## Regras gerais

1. Envio é best-effort — falha ao enviar email **nunca** deve quebrar o fluxo principal (ex.: se o email de "proposta recebida" falhar, a proposta ainda é criada com sucesso). Mesmo padrão de isolamento de erro já usado pra upload de documento (S5-T1: falha de storage vira código de erro específico, não deixa o resto da requisição inconsistente) — aqui o cuidado é o oposto: o email **não pode** ser bloqueante.
2. Cada envio registra uma linha em `NotificationLog` (`channel: EMAIL`, `templateCode`, `status`) — schema já existe (`DATABASE-DESIGN.md §11.1`), nunca usado. Trilha de auditoria de notificações, paralela ao `shipmentEvent` (S3-T4).
3. Templates em PT-BR (`.tsx`, `@react-email/components`, mesmo padrão do `verify-email.tsx` existente)

## Out of scope

- WhatsApp — S6-T2, task separada
- Configuração real do Resend (`RESEND_API_KEY`) — infraestrutura, não código
- Retry automático em caso de falha — S6-T3 (`Notification log — registro de envios, retry em falha`)
- Eventos que dependem de job agendado (SLA expirando, review reminder) — sem cron neste projeto
- Alerta de ETA — sem integração Google Maps
- Lembrete de pagamento de assinatura — sem `Subscription` CRUD

## Acceptance criteria

- [ ] Cada evento identificado na Exploration como "produtor real existe" dispara o email correspondente, sem quebrar o fluxo principal se o envio falhar
- [ ] Cada envio (sucesso ou falha) grava uma linha em `NotificationLog`
- [ ] Templates em PT-BR, um por `templateCode`
- [ ] `pnpm dev` sem `RESEND_API_KEY` — QA confirma que os emails aparecem no console (`ConsoleClient`) em vez de travar ou lançar erro
- [ ] Não quebra nenhuma QA anterior (retrofit aditivo, mesmo espírito da S3-T4)

## Complexity

High — maior retrofit do projeto até agora, espalhado por potencialmente 6-8 use-cases já commitadas de sprints diferentes. Precisa da mesma auditoria detalhada que a S3-T4 fez antes do Plan.
