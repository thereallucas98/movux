# S0-T1 — Prisma Schema

**Sprint:** 0 — Foundation
**Status:** pending
**Depends on:** DATABASE-DESIGN.md (fonte: `/docs/DATABASE-DESIGN.md`)

---

## User story

Como desenvolvedor, quero o schema Prisma completo com todas as entidades do domain model, migrations rodando no Docker local e o Prisma client gerado, para que o restante do Sprint 0 possa começar a persistir dados.

## Scope

- Traduzir todas as entidades do `DATABASE-DESIGN.md` para modelos Prisma
- Criar a migration inicial (`0001_init`)
- Gerar o Prisma client
- Configurar Docker Compose para PostgreSQL local
- Verificar via Prisma Studio que todas as tabelas foram criadas

## Out of scope

- Seed de dados (feito em S1-T1 e S1-T2)
- Triggers ou stored procedures
- Indexes além dos definidos no DATABASE-DESIGN.md §13

## Acceptance criteria

- [ ] `pnpm prisma migrate dev` passa sem erros no Docker local
- [ ] `pnpm prisma studio` abre e exibe todas as tabelas esperadas (30+ entidades)
- [ ] `pnpm prisma generate` gera client sem erros de tipo
- [ ] Enums definidos: `Role`, `VerificationStatus`, `ShipmentStatus`, `ShipmentType`, `VehicleType`, `ProposalStatus`, `SignalType`, `PlanCode`, `SubscriptionStatus`, `NotificationChannel`, `ReviewerRole`, `ModifierCode`, `NeighborhoodClassification`, `TimeWindow`, `AddressType`, `ModifierValueType`, `SubscriberType`, `QueueEntryStatus`, `ResponseType`, `EventType`, `CompanyMemberRole`, `CarrierDocumentType`, `BillingCycle`, `LastTrigger`

## Complexity

Medium — volume de entidades alto (30+), mas sem lógica; é mapeamento direto do DATABASE-DESIGN.md.
