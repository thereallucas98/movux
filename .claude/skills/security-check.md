---
name: security-check
description: Use when the user asks for a security audit, security score, or "nota de segurança" of the Movux codebase, or wants to check secrets/input validation/auth/dependency vulnerabilities/security headers mechanically instead of by manual code review.
---

# Security Check — Movux

Auditoria de segurança **mecânica**: um script Node.js roda comandos reais
(grep, `pnpm audit`, `pnpm outdated`, leitura de arquivos de config) e conta
problemas encontrados. Não é uma opinião do modelo — é a mesma nota toda vez
que o código não muda.

## Como rodar

```bash
node .claude/skills/security-check/scripts/check.js
```

- **stdout**: só a nota final (ex: `76`) — este é o verify command estável
  para automação/autoresearch.
- **stderr**: relatório completo (breakdown por categoria + problemas em
  ordem de prioridade). Ao rodar no terminal normal, ambos aparecem —
  mostre o conteúdo do stderr para o usuário como resposta.

Não edite o script para "melhorar a nota" sem mudar o código real que ele
audita — isso invalidaria o propósito da checagem mecânica.

## Critérios (100 pontos)

| Categoria | Pontos | O que verifica |
|---|---|---|
| SECRETS | 20 | `.env` no `.gitignore` (5) · `.env.example` existe (5) · grep por API keys/tokens/senhas hardcoded no código (10) |
| INPUTS | 25 | rotas mutantes (POST/PUT/PATCH/DELETE) usam `.safeParse(` do Zod (10) · zero `eval(`/`innerHTML`/`dangerouslySetInnerHTML` (8) · zero `queryRawUnsafe`/`executeRawUnsafe` (7) |
| AUTH | 25 | rotas não-públicas chamam `getPrincipal()` (12) · senha passa por `bcrypt.hash`/`bcrypt.compare`, nunca comparação em texto plano no backend (8) · cookie de sessão com `sameSite`/`httpOnly`/`secure` (5) |
| DEPS | 15 | `pnpm audit --json` — desconta por severidade: critical -5, high -3, moderate -1.5, low -0.5 (10) · `pnpm outdated` — desconta por volume de pacotes desatualizados (5) |
| HEADERS | 15 | headers de segurança em `next.config.js`/`middleware.ts` — CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS (10) · HTTPS forçado em produção (5) |

Escopo de código verificado: `apps/web/src`, `packages/auth/src`,
`packages/env` — código-fonte real, excluindo `node_modules`, `.next`,
`generated/` (client Prisma), `playwright-report`, `test-results`,
`coverage`.

## Depois de rodar

1. Mostre a nota total e o breakdown por categoria.
2. Liste os problemas em ordem de prioridade (crítico → alto → médio →
   baixo), como o script já ordena.
3. **Não corrija nada automaticamente.** Isso é uma auditoria — perguntar
   ao usuário quais problemas ele quer que sejam corrigidos, e tratar cada
   correção como uma mudança normal de código (segue o fluxo do
   `CLAUDE.md`: se for algo não-trivial, isso é uma feature/fix nova, não
   uma continuação automática da auditoria).

## Limitações conhecidas (mecânico ≠ perfeito)

- A checagem de segredos hardcoded e de `password ===` é heurística — pode
  ter falso positivo/negativo. Se o relatório apontar algo, confirme lendo
  o arquivo antes de tratar como problema real.
- `pnpm audit`/`pnpm outdated` exigem rede; se falharem, o script trata
  como inconclusivo (pontuação neutra) em vez de zerar a categoria.
- A rota `graphql/route.ts` está na whitelist de AUTH porque a
  autenticação é resolvida no contexto do Pothos, não em `getPrincipal()`
  na própria rota — não é uma exceção real de segurança.
