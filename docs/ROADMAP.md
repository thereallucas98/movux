# Movux — Roadmap

**Status:** Sprint 6 ✅ concluído (S6-T2 pulada — sem conta Meta Business) — Sprint 8 (UI) ✅ concluído (S8-T1–S8-T7 — redesign visual + dashboard de métricas nos 3 fluxos)
**Ordem combinada:** Sprint 6 → Sprint 8 (UI) → Sprint 7 (Plans & Billing) — invertendo a ordem numérica original; Billing fica por último porque depende de conta Mercado Pago configurada, mesmo padrão do Supabase/BigDataCorp/Resend
**Approach:** API-first (Swagger + Insomnia) → UI por feature
**QA:** local com Docker + Prisma Studio
**Deploy:** Vercel (web) + Supabase (PostgreSQL)
**Companion:** [`BUSINESS-FOUNDATION.md`](BUSINESS-FOUNDATION.md) · [`DATABASE-DESIGN.md`](DATABASE-DESIGN.md)

---

## Como funciona

Cada task segue o pipeline:

```
brief → plan → todo → [implementação] → validation → QA roteiro → deploy check
```

Pastas em `docs/tasks/<sprint>-<id>-<slug>/`. Tasks são marcadas aqui quando `validation.md` existe e QA passou.

**Legenda:** ○ pending · ▶ in progress · ✅ done

---

## Sprint 0 — Foundation

> Objetivo: schema Prisma completo rodando localmente + auth API documentada no Swagger + shell Next.js com rotas e roles definidos.

| ID | Task | Status | Doc |
|---|---|---|---|
| S0-T1 | Prisma schema — todas as entidades do DATABASE-DESIGN.md | ✅ | [→](tasks/s0-t1-prisma-schema/) |
| S0-T2 | Auth API — register + login (customer e carrier) + Swagger + Insomnia | ✅ | [→](tasks/s0-t2-auth-api/) |
| S0-T3 | Next.js app shell — layout, rotas por role, middleware de auth | ✅ | [→](tasks/s0-t3-app-shell/) |

---

## Sprint 1 — Shipment API

> Objetivo: customer consegue criar um frete via API; carrier consegue listar fretes abertos. Fluxo documentado no Swagger, testado no Insomnia.

| ID | Task | Status | Doc |
|---|---|---|---|
| S1-T1 | Geography seed — state, city, neighborhood, cluster (João Pessoa) | ✅ | [→](tasks/s1-t1-geography-seed/) |
| S1-T2 | Pricing seed — templates, modifiers, snapshot inicial | ✅ | [→](tasks/s1-t2-pricing-seed/) |
| S1-T3 | Shipment API — create, get, list (customer) | ✅ | [→](tasks/s1-t3-shipment-api/) |
| S1-T4 | Shipment browse API — list open (carrier), filter por cidade/tipo | ✅ | [→](tasks/s1-t4-shipment-browse/) |

---

## Sprint 2 — Proposals & Queue

> Objetivo: carrier pode entrar na fila e enviar proposta; customer pode aceitar; SLA calculado automaticamente.

| ID | Task | Status | Doc |
|---|---|---|---|
| S2-T1 | Proposal queue API — join, status, hybrid call group | ✅ | [→](tasks/s2-t1-proposal-queue/) |
| S2-T2 | Proposal attempt API — submit (até 5), counter-offer, withdraw | ✅ | [→](tasks/s2-t2-proposal-attempt/) |
| S2-T3 | SLA engine — cálculo `(customer + carrier) / 2`, expiração automática | ✅ | [→](tasks/s2-t3-sla-engine/) |
| S2-T4 | Customer accept API — aceitar proposta, atualizar status do shipment | ✅ | [→](tasks/s2-t4-customer-accept/) |

---

## Sprint 3 — Transit Flow

> Objetivo: shipment avança pelo lifecycle completo (COLLECTED → IN_TRANSIT → DELIVERED) com safety check-in e confirmação do customer.

| ID | Task | Status | Doc |
|---|---|---|---|
| S3-T1 | Safety check-in API — customer e carrier confirmam termo | ✅ | [→](tasks/s3-t1-safety-checkin/) |
| S3-T2 | Transit status API — collected, in_transit, delivered (carrier) | ✅ | [→](tasks/s3-t2-transit-status/) |
| S3-T3 | Delivery confirmation API — double-confirm do customer + auto-confirm 24h | ✅ | [→](tasks/s3-t3-delivery-confirm/) |
| S3-T4 | Shipment event log — audit trail de todas as transições | ✅ | [→](tasks/s3-t4-event-log/) |

---

## Sprint 4 — Reviews & Ratings

> Objetivo: customer e carrier deixam review mútuo; rating é recalculado; tags pré-definidas.

| ID | Task | Status | Doc |
|---|---|---|---|
| S4-T1 | Review API — submit (rating + tags), validações de janela | ✅ | [→](tasks/s4-t1-review-api/) |
| S4-T2 | Rating recalculation — atualiza avgRating em carrierProfile e customerProfile | ✅ | [→](tasks/s4-t2-rating-calc/) |
| S4-T3 | Review tags seed — carrier tags + customer tags | ✅ | [→](tasks/s4-t3-review-tags-seed/) |

---

## Sprint 5 — Carrier Verification

> Objetivo: carrier faz upload de documentos; admin aprova/rejeita; badge de verificado liberado.

| ID | Task | Status | Doc |
|---|---|---|---|
| S5-T1 | Document upload API — Supabase Storage, tipos de doc por role | ✅ | [→](tasks/s5-t1-document-upload/) |
| S5-T2 | Admin verification API — approve/reject doc, atualizar verificationStatus | ✅ | [→](tasks/s5-t2-admin-verify/) |
| S5-T3 | External validation — manual por enquanto (estrutura pronta pra BigDataCorp/Serpro) | ✅ | [→](tasks/s5-t3-external-validation/) |

---

## Sprint 6 — Notifications

> Objetivo: email (Resend) + WhatsApp (Meta Cloud API) disparados nos eventos críticos do shipment lifecycle.

| ID | Task | Status | Doc |
|---|---|---|---|
| S6-T1 | Email notifications — Resend, templates por evento | ✅ | [→](tasks/s6-t1-email-notifications/) |
| S6-T2 | WhatsApp notifications — Meta Cloud API, templates aprovados | ⏭️ pulada — sem conta Meta Business configurada | [→](tasks/s6-t2-whatsapp-notifications/) |
| S6-T3 | Notification log — registro de envios, retry em falha | ✅ | [→](tasks/s6-t3-notification-log/) |

---

## Sprint 7 — Plans & Billing

> Objetivo: carrier/company assina plano via Mercado Pago PreApproval; limites aplicados por plano.

| ID | Task | Status | Doc |
|---|---|---|---|
| S7-T1 | Plan seed + subscription model | ○ | [→](tasks/s7-t1-plan-seed/) |
| S7-T2 | Mercado Pago PreApproval — checkout + webhook | ○ | [→](tasks/s7-t2-mp-preapproval/) |
| S7-T3 | Plan enforcement — limite de proposals ativas, features por plano | ○ | [→](tasks/s7-t3-plan-enforcement/) |

---

## Sprint 8 — UI (feature by feature)

> Construir a interface por fluxo. Decisão (D-004, 2026-07-20): consome GraphQL, não a REST já testada — cada task expõe o domínio via Pothos antes das telas.

| ID | Task | Status | Doc |
|---|---|---|---|
| S8-T1 | Customer: fretes — GraphQL (myShipments, shipment, createShipment) + dashboard/lista/criação | ✅ | [→](tasks/s8-t1-customer-shipments-ui/) |
| S8-T2 | Carrier: buscar fretes abertos + enviar proposta | ✅ | [→](tasks/s8-t2-carrier-shipments-ui/) |
| S8-T3 | Admin: verificação de documentos | ✅ | [→](tasks/s8-t3-admin-document-verification-ui/) |
| S8-T4 | Fretes do customer — prova de conceito visual (listagem + detalhe) | ✅ | [→](tasks/s8-t4-shipment-visual-refresh/) |
| S8-T5 | Fretes do carrier — generalização do redesign visual (browse + propostas + detalhe novo) | ✅ | [→](tasks/s8-t5-carrier-visual-refresh/) |
| S8-T6 | Verificação de documentos (admin) — generalização do redesign visual (ícone por tipo) | ✅ | [→](tasks/s8-t6-admin-visual-refresh/) |
| S8-T7 | Dashboard de métricas — cards de KPI pra customer, carrier e admin | ✅ | [→](tasks/s8-t7-metrics-dashboard/) |

S8-T4 é a primeira rodada do redesign visual (ver [`docs/design-references-notes.md`](design-references-notes.md)) — piloto em 1 fluxo antes de generalizar pras demais telas. S8-T5 generalizou o padrão pro carrier; S8-T6 fechou a última rodada mapeada (admin). S8-T7 é uma nova frente — dashboards com métricas agregadas, pedido explícito do usuário ("está muito seco").

---

## Deploy checklist (por sprint)

Ao final de cada sprint:

- [ ] `pnpm lint` — 0 warnings
- [ ] `pnpm build` — sem erros
- [ ] Migrations rodando no Docker local
- [ ] Insomnia collection atualizada e exportada em `docs/insomnia/`
- [ ] Swagger acessível em `/api-docs`
- [ ] Deploy na Vercel (preview ou main)
- [ ] Migration no Supabase (produção)
- [ ] Smoke test nos endpoints críticos do sprint via Insomnia

---

## Fase Map (macro)

```
Phase 0 — Foundation     Sprint 0
Phase 1 — Core API       Sprints 1–4
Phase 2 — Trust Layer    Sprints 5–6
Phase 3 — Monetization   Sprint 7
Phase 4 — UI             Sprint 8+
Phase 5 — Safety Layer   (pós-MVP)
```
