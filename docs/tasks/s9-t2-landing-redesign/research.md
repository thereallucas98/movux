# S9-T2 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decisão: destino do CTA duplo do Hero (liga com S9-T3)

- **"Sou cliente, quero mudar"** → `/buscar-transportadores` (não direto pro `/register`). Motivo: o produto agora tem um funil público (S9-T3) que deixa o visitante ver prova social (transportadores reais, rating, volume) antes de se cadastrar — usar esse funil como destino do CTA principal aproveita o trabalho de S9-T3 em vez de competir com ele por atenção. Reversível/barato de trocar (é só um `href`), então não é uma decisão de alto risco.
- **"Sou transportador"** → `/register?role=CARRIER` direto. Motivo: não existe (nem está no escopo do Sprint 9) um funil público equivalente pro lado carrier — o caminho direto pro cadastro continua sendo o mais curto disponível.
- Botão secundário no `FinalCta` (fim da página) replica os mesmos 2 destinos do Hero.

---

## Decisão: conteúdo real por seção

**Hero** — Headline: *"Chama um Movux."* / Subheadline: *"Marketplace de fretes e mudanças com segurança progressiva — do primeiro contato até a entrega."* Ícones trocados: `Hospital`→`Truck`, `HeartPulse`→`ShieldCheck` (todos já em `lucide-react`, sem lib nova).

**TrustStrip** (`page.tsx:242-247`, array `verticals`) — substituir "Hospitais/Clínicas/Academias/Conformidade CLT" pelas camadas de segurança progressiva reais de `BUSINESS-FOUNDATION.md`: **Verificação de documento** (CNH/CRLV/CPF conferidos pelo admin), **Avaliação mútua** (cliente e transportador se avaliam), **Contato de segurança** (`SafetyContact` — alguém de confiança acompanha o trajeto), **Checagem externa** (estrutura pronta pra BigDataCorp/Serpro, S5-T3).

**ProblemSection** (`page.tsx:285-353`) — "antes" = contratar frete informal por indicação/grupo de WhatsApp sem nenhuma garantia; "depois" = Movux com transportador verificado, preço justo (pricing engine já existe, S1-T2), acompanhamento em tempo real (S3-T2).

**WorkflowSection** (`page.tsx:364-389`, já existe estruturalmente — só domínio errado) — vira o `HowItWorks` do brief (FR3), com o lifecycle real: **1. Peça seu frete** (cria shipment) → **2. Receba propostas** (fila de carriers, S2-T1/T2) → **3. Acompanhe em trânsito** (safety check-in, S3-T1/T2) → **4. Avalie** (review mútuo, S4-T1).

**`landing-hero-preview.tsx`** (mock interativo) — tabs viram: "Fretes" (lista de shipments do customer) / "Propostas" (propostas recebidas) / "Em trânsito" (status/safety check-in) / "Avaliações". Nomes mock trocam de "Hospital Acme — Centro" pra algo tipo "João Pessoa — Mudança residencial".

**`landing-spring-cards.tsx`** (grid 6 "sistemas") e **`landing-sticky-cards.tsx`** (4 cards "Recursos") — convergem pro mesmo conjunto de diferenciais reais: **Preço justo automático** (pricing engine), **Fila de propostas** (até 5 tentativas, SLA calculado), **Segurança em trânsito** (safety check-in + audit trail de evento), **Verificação de documento**, **Avaliação bidirecional**, **Notificação por e-mail** (S6-T1). Ícones: `Truck`, `ShieldCheck`, `MapPin`, `PackageCheck`, `Star`, `Mail` (todos `lucide-react`).

**`landing-roles-accordion.tsx`** ("Para quem") — roles viram `CUSTOMER`/`CARRIER`/`ADMIN`: Customer (pede frete, acompanha, avalia), Carrier (entra na fila, propõe, recebe pagamento), Admin (verifica documento, modera avaliação).

**`landing-faq.tsx`** — 6 perguntas reais: *"Como funciona a verificação de transportador?"*, *"O que é segurança progressiva?"*, *"Posso ser transportador autônomo ou preciso de empresa?"* (Company/Vehicle já suportam os dois, `schema.prisma:417-434`), *"Como é calculado o preço do frete?"*, *"O que acontece se o transportador não aparecer?"* (SLA/expiração, S2-T3), *"Como funciona a avaliação?"*.

**`landing-pricing.tsx`** — mantém 3 cards de plano (estrutura), copy explícito de *"Planos em breve — cadastro e uso hoje são gratuitos"*, sem preço fechado nem CTA de checkout (Sprint 7/Billing ainda não implementado, conforme Out of Scope do brief).

---

## Edge cases confirmados

- Visitante já logado acessando `/` continua redirecionado pro dashboard do próprio role (comportamento existente, `page.tsx` não muda essa lógica) — sem interação com o conteúdo novo da landing.
- CTA do Hero linkando pra `/buscar-transportadores` (rota ainda não existente até S9-T3 rodar) — risco de ordem de execução: se S9-T2 rodar antes de S9-T3, o link fica quebrado temporariamente. Mitigação: `plan.md` de S9-T2 marca esse `href` como o último sub-step, e a QA de S9-T2 só valida o link fim-a-fim depois que S9-T3 também estiver mergeado (registrar dependência em `validation.md` se as tasks forem executadas fora de ordem).

## Next Steps

Seguir para `plan.md` — ordenar sub-steps por arquivo (page.tsx primeiro, por concentrar mais conteúdo; hero-preview depois; demais arquivos de `_landing/` em qualquer ordem).
