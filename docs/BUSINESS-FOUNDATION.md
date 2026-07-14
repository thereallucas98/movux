# Movux — Business Foundation

**Status:** Phase 0 — Foundation defined, pre-implementation
**Last updated:** 2026-07-14
**Owner:** David Lucas

---

## 1. Executive Summary

**Movux** is a scheduled freight and moving marketplace for Brazil, built on a foundation of **progressive trust and safety** — starting with honest recommendations ("we suggest someone goes with your belongings") and evolving toward full protection layers comparable to ride-hailing platforms.

Starting targets: **individual customers and small businesses** needing freight, moving, and delivery services, matched with **verified independent carriers**.

Core value proposition: move your belongings with someone you can trust — not just someone who showed up in a WhatsApp group.

---

## 2. Vision & Mission

### Vision
Become the de-facto platform for scheduled freight and moving in Brazil, differentiated not by price but by **trust infrastructure**.

### Mission
> Make every move safe. Not just physically — but emotionally. People entrust strangers with everything they own. Movux earns that trust one shipment at a time.

### Brand essence
- **Movux** = *mover* + *ux* (movement + experience)
- Tone: brasileiro, direto, confiável, moderno
- Tagline: *"Chama um Movux."*

---

## 3. Target Market

### Primary users (v1)

| Role | Description | Core needs |
|---|---|---|
| **Customer** | Individual or small business needing freight/moving | Find a reliable carrier, track the job, feel safe |
| **Carrier** | Independent driver with truck/van/motorcycle | Get jobs, manage earnings, build reputation |

### Geography
- **Phase 1:** Single city (hyperlocal launch — validate full cycle)
- **Phase 2:** Expand to neighboring cities with traction
- **Phase 3:** Regional → national

### Verticals
- **Residential moving** — apartments, houses, furniture
- **Small freight** — marketplace goods, business deliveries
- **Mototransport** — documents, small packages (future)

---

## 4. The Safety Differentiator

The Brazilian freight/moving market runs on WhatsApp and word-of-mouth because **no one trusts a stranger with their belongings**. Movux solves this with progressive trust layers:

| Phase | Layer | What it delivers |
|---|---|---|
| **1** | Recommendation: "we suggest someone accompanies the move" | Honest transparency → platform trust |
| **2** | Verified carrier profile + ratings + job history | Reputation as a filter |
| **3** | Real-time route sharing with emergency contact | Traceability without mandatory GPS |
| **4** | Optional per-shipment insurance (insurer partnership) | Real financial protection |
| **5** | SOS button, biometric driver verification, optional camera | Parity with Uber Safety |

**Phase 1 and 2 are the MVP.** Phases 3–5 are the moat.

---

## 5. Business Model

### Revenue streams
- **Commission per shipment** — % of the carrier's earnings (primary)
- **Featured carrier slots** — paid visibility in search results (future)
- **Insurance add-on** — margin on optional per-trip insurance (Phase 4)
- **B2B subscriptions** — businesses with recurring freight needs (future)

### Pricing philosophy
- Transparent to both sides
- Carrier sees full job value before accepting
- Customer sees total price upfront (no surge surprises)

---

## 6. Core Domain

### Entities

| Entity | Description |
|---|---|
| `Customer` | Person/business requesting a shipment |
| `Carrier` | Independent driver offering freight services |
| `Shipment` | A freight or moving request (the core transaction) |
| `Proposal` | A carrier's bid on a shipment |
| `Route` | Origin → destination with estimated distance/duration |
| `Review` | Post-job rating from customer about carrier |
| `SafetyContact` | Emergency contact for a shipment (Phase 3) |

### Shipment lifecycle

```
DRAFT → OPEN → PROPOSALS_RECEIVED → CARRIER_SELECTED → IN_TRANSIT → DELIVERED → REVIEWED
                                                                    ↓
                                                               CANCELLED
```

### Roles & access
- `CUSTOMER` — creates shipments, reviews proposals, tracks jobs
- `CARRIER` — lists services, submits proposals, manages jobs
- `ADMIN` — platform management, carrier verification, dispute resolution

---

## 7. Tech Stack

Built on the Turnora monorepo foundation:

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Prisma |
| Auth | JWT (httpOnly cookie) + CASL RBAC |
| API | GraphQL (graphql-yoga + Pothos) + REST |
| Validation | Zod |
| Forms | React Hook Form + zodResolver |
| Data fetching | React Query |
| UI | shadcn/ui (Radix) + TailwindCSS |
| PWA | service worker + web manifest |

**PWA first** — no App Store friction for MVP. Native app when real-time tracking (Phase 3) demands background GPS.

---

## 8. Roadmap

### Phase 0 — Foundation (current)
- [ ] Domain model defined
- [ ] Prisma schema for core entities
- [ ] Auth flow (register/login — customer and carrier roles)
- [ ] Basic UI shell

### Phase 1 — MVP
- [ ] Customer: create shipment (origin, destination, description, date)
- [ ] Carrier: browse open shipments, submit proposals
- [ ] Customer: view proposals, select carrier
- [ ] Shipment status flow
- [ ] Post-job review
- [ ] Safety recommendation ("accompany your move") displayed prominently

### Phase 2 — Trust Layer
- [ ] Carrier verification flow (document upload, manual review)
- [ ] Rating/review system visible on carrier profile
- [ ] Job history on carrier public profile

### Phase 3 — Real-time Safety
- [ ] Route sharing with emergency contact via link
- [ ] In-transit status updates
- [ ] Push notifications (Web Push + SMS fallback)

### Phase 4+ — Protection
- [ ] Per-shipment insurance add-on
- [ ] SOS button
- [ ] Dispute resolution system

---

## 9. Petitions (Growth Channel)

City-specific petitions created by admin, signed via Google OAuth (LGPD-compliant minimal consent). After signing, users are invited to the platform with context from their city's data.

**Flow:** petition page → Google sign-in → signature recorded → onboarding invite with `source: 'petition'` flag → differentiated onboarding.

---

## 10. Decisions Log

See [`docs/decisions.md`](decisions.md) for architectural decisions.
