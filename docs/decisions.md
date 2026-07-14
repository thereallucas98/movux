# Decisions (ADR enxuto)

Log das decisões de definição deste repositório. Formato: **contexto → decisão → motivo**. Mais recente no topo. IDs estáveis (`D-NNN`).

---

## 2026-07-14

### D-003 · Adotar Arché + decisions.md como governança de comportamento do assistente
**Contexto:** outros repos do usuário (financial-driver-web-app, painel-gestao-eventos) já adotam o modelo Arché. **Decisão:** trazer `docs/foundation/arche.md` como SSOT de comportamento, este `decisions.md` (ADR), e ajustar o `CLAUDE.md` para referenciar ambos. Modos cognitivos (EXPLORING→IMPLEMENTING), Anti-Babysitting e Correction-Integration incorporados. **Motivo:** padronizar comportamento entre repos; reduzir duplicação; gates mais claros.

### D-002 · Estrutura técnica baseada no Turnora; filosofia de produto baseada no Build-track
**Contexto:** o usuário possui dois repos de referência: `turnora` (monorepo Next.js App Router + GraphQL/Pothos + CASL RBAC + clean architecture) e `build-track` (marketplace bilateral de serviços: autônomo ↔ cliente, proposta, seleção, status de serviço). **Decisão:** clonar o Turnora como base técnica (stack, estrutura de pastas, guardrails, padrões de código) e usar o Build-track como referência de filosofia de produto (fluxo de marketplace, entidades, lifecycle). Domínio do Turnora (turnos, escalas, hospitais) removido; substituído pelo domínio Movux (fretes, mudanças, segurança progressiva). **Motivo:** aproveitar infraestrutura madura sem reescrever do zero; separar a escolha técnica da escolha de produto.

### D-001 · Nome do produto: Movux
**Contexto:** brainstorm de nomes para marketplace de fretes e mudanças. Candidatos avaliados: Levo, Levux, FastFee, Rutex, Bora, Corre, Ferrox, Knox, Junto. Critérios: vira verbo naturalmente em PT-BR, curto, sem acento, soa tech/startup, memorável. **Decisão:** **Movux** — *mover* + *ux* (movimento + experiência). Vira verbo: *"chama um Movux"*. Internacional sem perder o sentido. Visualmente forte como marca. **Motivo:** melhor equilíbrio entre os critérios; preferência do usuário após avaliação comparativa.
