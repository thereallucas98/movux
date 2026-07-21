# S8-T6 — Research

**Date**: 2026-07-21
**Status**: Complete

---

## Decision Log

| Decisão | Escolha | Motivo |
|---|---|---|
| Mapeamento ícone/cor por tipo de documento | Ver tabela abaixo — 7 tipos, 7 cores distintas | Coincidência exata entre nº de tipos e nº de cores de categoria já existentes; usar todas evita repetir cor entre tipos diferentes no mesmo grid |
| Onde colocar o componente | `components/features/admin/document-type-icon.tsx` | Mesma pasta de feature do `document-card.tsx`, mesmo padrão de escopo do `shipment-type-icon.tsx` (dentro de `features/shipments/`) |
| Ícones (lucide-react) | Ver tabela abaixo | Sem biblioteca nova — mesmo set já usado no projeto |

### Mapeamento

| `CarrierDocumentType` | Ícone | Cor |
|---|---|---|
| `CPF` | `IdCard` | `blue` |
| `CNH_FRONT` | `CreditCard` | `purple` |
| `CNH_BACK` | `CreditCard` | `pink` |
| `ADDRESS_PROOF` | `Home` | `orange` |
| `SELFIE` | `UserRound` | `yellow` |
| `CNPJ` | `Building2` | `green` |
| `SOCIAL_CONTRACT` | `FileText` | `red` |

`CNH_FRONT`/`CNH_BACK` usam o mesmo ícone (mesmo documento físico, frente e verso) mas cores diferentes — permite diferenciar os dois num grid sem inventar 2 ícones pra uma coisa só.

## Arquitetura (sem mudança em relação ao brief)

Réplica direta do padrão `ShipmentTypeIcon`: `Record<CarrierDocumentType, { icon: ComponentType; classes: string }>`, `size-10 rounded-full` + `size-5` no ícone, classes de cor escritas por extenso (mesma regra do S8-T4: Tailwind precisa ver a classe literal, não montada por template string).

Nenhuma decisão pendente — pronto pra Plan.
