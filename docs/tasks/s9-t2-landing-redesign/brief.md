# Task Brief: Landing Pública — Reescrita de Conteúdo e Estrutura

**Created**: 2026-07-21
**Status**: Approved
**Complexity**: Medium
**Type**: UI Change
**Estimated Effort**: 5-7 hours

---

## Feature Overview

### User Story
Como visitante anônimo chegando na home do Movux, quero entender em segundos o que é o produto (marketplace de fretes/mudanças com segurança progressiva), ver prova de confiança e ser guiado a criar conta (customer ou carrier) — hoje a home mostra conteúdo de outro domínio (escala hospitalar) que não representa o Movux.

### Problem Statement
`apps/web/src/app/page.tsx` + `_landing/*` (8 arquivos) já existem e são visualmente ricos (parallax, sticky cards, spring cards, accordion, FAQ, pricing, `framer-motion` em toda seção), mas o conteúdo (`PARALLAX_BLOCKS`, headings, ícones como `Hospital`/`HeartPulse`) é herdado do Turnora (workforce/escala hospitalar, [D-002](../../decisions.md)) e nunca foi adaptado pro domínio real do Movux (frete, mudança, camadas de segurança). O usuário pediu redesign com referência em dois projetos irmãos: `copa-bolao-web-app` (Palpitou, gamificado) e `financial-driver-web-app` (stat blocks, prova social/trust).

### Scope

**In Scope:**
- Reescrita total do copy da landing pro domínio Movux: frete, mudança, segurança progressiva por camada, papéis (customer/carrier/admin), lifecycle do shipment — fonte de verdade: `docs/BUSINESS-FOUNDATION.md`
- Reestruturação de seções seguindo o padrão comum observado nos 2 repos irmãos: Hero (headline + CTA duplo "Sou cliente" / "Sou transportador") → TrustStrip (camadas de segurança/verificação, análogo ao selo de confiança do financial-driver) → HowItWorks (passos do fluxo real: pedir frete → receber propostas → acompanhar → avaliar) → Features/Showcase → FAQ → FinalCta
- Reaproveitamento de componentes/padrões já existentes no Movux em vez de recriar o gamificado/stat-block dos repos irmãos: ícone circular colorido por categoria (validado S8-T4/S8-T5/S8-T6) e padrão de `MetricCard` (S8-T7) para qualquer número de destaque na landing (ex. "quantidade de transportadores verificados")
- Uso exclusivo dos tokens de `DESIGN-SYSTEM.md`/`globals.css` — nenhuma cor hardcoded nova (diferente do anti-padrão observado nos 2 repos irmãos, que usam hex soltos no hero)
- `Logo iconOnly` (de `docs/tasks/s9-t1-brand-splash/`) no header da landing
- Manter `getServerPrincipal` + redirect de usuário já logado (comportamento atual de `page.tsx:18`) — não é escopo mexer na lógica de auth-gate da home

**Out of Scope:**
- Rota pública de busca de drivers — task separada ([`s9-t3-public-driver-search`](../s9-t3-public-driver-search/)), ainda que o CTA da landing possa linkar pra ela
- Blog, páginas institucionais (sobre/termos/privacidade) — não pedido
- A/B testing ou analytics de conversão na landing — fora de escopo desta rodada
- Pricing real (`landing-pricing.tsx` existe mas Sprint 7/Billing ainda não está implementado) — a seção de pricing, se mantida, mostra planos como informação estática (sem integração de checkout), não é vitrine funcional de assinatura

---

## Current State

**Key Files:**
- `apps/web/src/app/page.tsx` — monta a landing: `LandingHeroPreview`, `LandingSpringCards`, `LandingTextParallax` (com `PARALLAX_BLOCKS` hardcoded, domínio errado), `LandingStickyCards`, `LandingRolesAccordion`, `LandingPricing`, `LandingFAQ`
- `apps/web/src/app/_landing/` (8 arquivos, ~50KB de JSX/copy) — cada seção é um client component separado, todas já usando `framer-motion`/`MotionSection`
- `apps/web/src/app/_landing/motion-section.tsx` — wrapper reutilizável de fade-up (`whileInView`), já documentado, reaproveitar sem alteração
- `docs/BUSINESS-FOUNDATION.md` — fonte de verdade do domínio (tagline "Chama um Movux", camadas de segurança progressiva, roles)
- Referências de estrutura: `copa-bolao-web-app/apps/web/src/pages/landing/landing-page.tsx`, `financial-driver-web-app/apps/web/src/screens/landing/index.tsx` — ver `docs/design-references-notes.md` §"Fonte: landing de projetos irmãos" para o levantamento completo

**Current Behavior:**
Home pública renderiza uma landing completa e animada, mas com todo o conteúdo de texto/ícone falando de escala de plantão hospitalar — nada sobre frete, mudança, ou os papéis do Movux.

**Gaps/Issues:**
- Todo o array `PARALLAX_BLOCKS` (imagens do Unsplash de equipe hospitalar, headings de "escala"/"plantão") precisa ser substituído — não é ajuste pontual, é reescrita de conteúdo de cada seção
- Não há copy de segurança progressiva ainda escrito em lugar nenhum do código — precisa ser extraído/adaptado de `BUSINESS-FOUNDATION.md`
- `LandingPricing` mostra planos — mas Sprint 7 (Billing) ainda não rodou; decisão: manter como vitrine estática informativa (ver Out of Scope)

---

## Requirements

### Functional Requirements

**FR1: Hero com identidade real do Movux**
- **Description**: Headline + subheadline sobre "marketplace de fretes e mudanças com segurança progressiva", CTA duplo ("Sou cliente, quero mudar" → `/register?role=CUSTOMER`, "Sou transportador" → `/register?role=CARRIER`), `Logo iconOnly` no header sticky
- **Trigger**: Renderização da home (`/`) pra visitante anônimo
- **Expected Outcome**: Mensagem central do produto compreensível em 1 tela, sem scroll
- **Edge Cases**: Nenhum (seção estática de conteúdo)

**FR2: TrustStrip — camadas de segurança progressiva**
- **Description**: Seção logo após o Hero listando as camadas de confiança já definidas no negócio (ex.: verificação de documento, avaliação mútua, contato de segurança/`SafetyContact`) — análoga ao `TrustStrip` do financial-driver, mas com conteúdo de segurança real do Movux em vez de logos de plataforma parceira
- **Trigger**: Scroll até a seção
- **Expected Outcome**: Visitante entende que confiança é o diferencial do produto (alinhado à tagline de `BUSINESS-FOUNDATION.md`)
- **Edge Cases**: Nenhum

**FR3: HowItWorks — fluxo real do shipment**
- **Description**: 3-4 passos numerados (círculo colorido, padrão já usado no Palpitou e replicável com o token de ícone circular do Movux) cobrindo o lifecycle real: criar frete → receber propostas → acompanhar em trânsito → avaliar
- **Trigger**: Scroll até a seção
- **Expected Outcome**: Visitante entende o fluxo antes de se cadastrar
- **Edge Cases**: Nenhum

**FR4: FAQ com perguntas reais do domínio**
- **Description**: `LandingFAQ` (componente já existe) recebe novo conteúdo de perguntas (ex.: "como funciona a verificação de transportador?", "o que é segurança progressiva?", "posso ser transportador autônomo ou só empresa?") em vez do conteúdo atual (se também for do domínio errado — confirmar no Exploration)
- **Trigger**: Scroll até a seção
- **Expected Outcome**: Perguntas reais reduzem fricção de cadastro
- **Edge Cases**: Nenhum

**FR5: FinalCta**
- **Description**: CTA de fechamento repetindo a ação dupla do Hero (customer/carrier), reaproveitando `LandingStickyCards`/seção equivalente já existente
- **Trigger**: Fim do scroll da landing
- **Expected Outcome**: Última chance de conversão antes do footer
- **Edge Cases**: Nenhum

---

## Technical Approach

**Chosen Approach:**
Manter a árvore de componentes existente em `_landing/` (não recriar do zero) — cada arquivo já resolve uma seção com animação; o trabalho é substituir os dados/copy internos (arrays de conteúdo, headings, ícones do `lucide-react`) por conteúdo do domínio Movux, e trocar os poucos ícones do domínio errado (`Hospital`, `HeartPulse`) por ícones de frete/mudança/segurança (`Truck`, `ShieldCheck`, `MapPin`, `PackageCheck` — já disponíveis em `lucide-react`, sem lib nova). Onde o padrão dos repos irmãos pede um elemento visual que o Movux não tem ainda (badge circular colorido de passo, stat block), reaproveitar os padrões já validados nos dashboards (S8-T4-T7) em vez de inventar um novo.

**Alternatives Considered:**
1. **Reescrever a landing do zero, sem reaproveitar `_landing/*`** — descartado; o trabalho de animação/estrutura já está pronto e validado, reescrever destruiria valor sem necessidade
2. **Copiar literalmente a estrutura de seções do Palpitou ou do financial-driver (1:1)** — descartado; nenhum dos dois é 100% aplicável sozinho (Palpitou é hiper-gamificado demais pro tom do Movux; financial-driver é sóbrio demais) — a escolha é uma síntese dos dois, com peso maior em conteúdo real do negócio

**Rationale:**
Menor risco (reaproveita animação/estrutura testada), maior retorno (resolve o problema real: conteúdo errado), consistente com o padrão de reaproveitamento de componentes já estabelecido no Sprint 8 (ícone circular, `MetricCard`).

---

## Files to Change

### New Files
- Nenhum arquivo novo esperado (a menos que o `plan.md` identifique necessidade de um componente de ícone-de-passo reutilizável — decisão de implementação, não de escopo)

### Modified Files
- [ ] `apps/web/src/app/page.tsx` — header com `Logo iconOnly`, CTAs do Hero
- [ ] `apps/web/src/app/_landing/landing-hero-preview.tsx` — copy do Hero
- [ ] `apps/web/src/app/_landing/landing-text-parallax.tsx` — substituição de `PARALLAX_BLOCKS`
- [ ] `apps/web/src/app/_landing/landing-spring-cards.tsx`, `landing-sticky-cards.tsx`, `landing-roles-accordion.tsx` — copy/ícones
- [ ] `apps/web/src/app/_landing/landing-faq.tsx` — perguntas reais
- [ ] `apps/web/src/app/_landing/landing-pricing.tsx` — copy alinhado a "em breve"/vitrine estática (sem checkout ainda)

---

## Acceptance Criteria

### Must Have (P0)
- [ ] **AC1**: Nenhum texto/ícone remanescente do domínio hospitalar/escala na home (`Hospital`, `HeartPulse`, "plantão", "escala" removidos)
- [ ] **AC2**: Hero comunica claramente o produto (marketplace de frete/mudança) e tem CTA duplo funcional (customer/carrier) linkando pro registro
- [ ] **AC3**: Seção de segurança progressiva presente e alinhada a `BUSINESS-FOUNDATION.md`
- [ ] **AC4**: `Logo iconOnly` visível no header da landing
- [ ] **AC5**: `pnpm lint`/`pnpm build` passam

### Should Have (P1)
- [ ] **AC6**: Responsivo confirmado em 375px/720px/1024px/1440px, sem scroll horizontal
- [ ] **AC7**: Usuário já logado continua sendo redirecionado pro dashboard do seu role ao acessar `/` (comportamento existente preservado)

---

## Test Strategy

**UI components:**
- Renderização anônima da home (sem cookie de sessão) mostra a landing completa
- Renderização com sessão ativa (customer/carrier/admin) redireciona pro dashboard correto — regressão do comportamento já existente
- Scroll completo em mobile (375px) sem quebra de layout ou overflow horizontal
- Links de CTA (`/register?role=CUSTOMER`, `/register?role=CARRIER`) levam pro formulário certo com o role pré-selecionado (`RegisterForm` já lê o valor via `defaultValues`/`role`, confirmar leitura de query param no `plan.md`)

---

## Dependencies

**Blocks:** Nenhum
**Blocked By:** `docs/tasks/s9-t1-brand-splash/` (soft — `Logo iconOnly` idealmente pronto antes, mas a landing pode nascer com o texto e trocar depois sem retrabalho estrutural)
**Related Work:** `docs/tasks/s9-t3-public-driver-search/` (CTA da landing pode linkar pra busca pública em vez de direto pro registro — decisão de copy, não estrutural)
**New Libraries:** None

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Volume de copy novo (8 arquivos, ~50KB) tornar a task mais lenta que o estimado | Média | Baixo | Escopo já reaproveita estrutura/animação existente — só o conteúdo textual muda, não a lógica de componente |
| `LandingPricing` confundir visitante mostrando planos que ainda não têm checkout funcional (Sprint 7 pendente) | Média | Médio | Copy explícito de "em breve"/sem preço fechado nesta seção, conforme Out of Scope |

---

## Complexity Estimate

**Overall**: Medium
- Backend: None
- Frontend: Medium (7 arquivos de conteúdo a revisar, sem lógica nova de componente)

**Estimated Effort**: 5-7 hours
**Confidence**: Alta

---

## Approval

**Approved By**: David Lucas
**Approval Date**: 2026-07-21

- [x] Requirements clear and complete
- [x] Technical approach sound
- [x] Acceptance criteria testable
- [x] Risks understood

**Notes:** Referências de design = repos irmãos `copa-bolao-web-app` (Palpitou) e `financial-driver-web-app`, não prints externos — decisão do usuário em chat, ver `docs/design-references-notes.md`.

---

## References

- `docs/BUSINESS-FOUNDATION.md` — fonte de verdade de domínio/copy
- `docs/design-references-notes.md` §"Fonte: landing de projetos irmãos"
- `docs/tasks/s8-t4-shipment-visual-refresh/`, `s8-t7-metrics-dashboard/` — padrões visuais reaproveitados (ícone circular, stat block)
