# S6-T3 — Exploration

## Current code state

- `NotificationLogRepository` (S6-T1) só tem `create` — sem `findById`, `findByStatus`, `updateStatus`.
- `sendEmailNotification` (S6-T1) grava `metadata: {providerMessageId}` (sucesso) ou `{error}` (falha) — nunca o conteúdo do email.
- `EmailClient.send()` (`lib/email/client.ts`) só aceita `{to, subject, react: ReactElement}` — **não tem opção de enviar HTML puro**. Isso é relevante porque um `ReactElement` não é serializável em JSON (não dá pra guardar em `NotificationLog.metadata` e "reidratar" depois) — só o HTML já renderizado é persistível.
- `ConsoleClient` já faz `render(react)` internamente (via `@react-email/components`) antes de logar — confirma que renderizar pra HTML é uma operação já usada no projeto, não uma novidade.
- A SDK do Resend aceita `html` como alternativa a `react` no `emails.send()` (é assim que o `react` é processado por baixo dos panos) — estender `EmailClient` pra aceitar `html` como alternativa é compatível com a API real, não uma invenção.

## Key files (patterns to mirror)

- `lib/email/client.ts` — precisa de uma pequena extensão: `SendEmailInput` vira uma união (`{react} | {html}`), ambos os clients (`ResendClient`/`ConsoleClient`) tratando os dois casos.
- `server/notifications/send-email-notification.ts` — ponto único de disparo (todos os 8 use-cases da S6-T1 passam por aqui) — o retrofit pra capturar o HTML entra só aqui, não precisa tocar nenhuma das 8 use-cases de novo.

## Integration points

- **Renderizar o HTML no momento do envio, sempre** (não só quando falha) — é a única forma de garantir que o retry tenha o conteúdo exato, já que não dá pra reconstruir o `ReactElement` depois sem re-executar a lógica de negócio original (que pode já refletir um estado diferente do frete/documento/etc. no momento do retry).
- Custo aceito: 1 chamada extra de `render()` por email enviado (operação síncrona, já usada pelo `ConsoleClient` hoje) — não é uma chamada de rede, custo desprezível.

## Risks

- Sem essa captura, "retry" teria que re-executar a use-case de negócio original inteira — arriscado (estado pode ter mudado) e complexo (cada retry precisaria saber qual use-case/parâmetros originaram aquela notificação, informação que também não é guardada hoje). Capturar o HTML pronto evita esse problema por completo.
