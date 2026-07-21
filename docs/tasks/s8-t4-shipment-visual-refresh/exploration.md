# Fretes do Customer — Prova de Conceito Visual — EXPLORATION

**Date**: 2026-07-21
**Phase**: EXPLORATION
**Status**: COMPLETE

---

## Context

As referências visuais levantadas (`docs/design-references-notes.md`) mostraram padrões de card com ícone, painel de filtro com pílula e página de detalhe que o Movux ainda não tem. Esta task é o piloto: aplicar isso na listagem de fretes do customer + criar a página de detalhe que falta desde o `S8-T1`.

---

## Goals

- Confirmar que o backend GraphQL já cobre 100% do que a UI precisa (query de detalhe, filtro por status)
- Levantar os componentes de UI reaproveitáveis (`Card`, `Badge`, `AdaptiveDialog`) e suas limitações atuais
- Confirmar se existe uma paleta de cor por categoria já pronta no design system (pro ícone circular por tipo de frete)
- Mapear exatamente os 4 `ShipmentType` pros ícones/cores

---

## Current Architecture

### Backend — 100% pronto, nada a construir

| Peça | Arquivo | Status |
|---|---|---|
| Query de detalhe | `server/graphql/queries/shipments.query.ts` → `shipment(id!)` | ✅ pronta desde o `S8-T1`, retorna tudo (endereços incluídos) |
| Query de lista com filtro | `myShipments(status?, cursor?, limit?)` | ✅ pronta — **filtro por status já existe no backend**, só nunca foi exposto na UI |
| Operação `.graphql` de detalhe | `graphql/operations/shipments/shipment.graphql` | ✅ já existe, com todos os campos necessários (`addresses`, `suggestedPriceInCents`, `finalPriceInCents`, etc.) — **só falta o hook client** (`use-shipment.ts`) |
| Hook de lista | `graphql/hooks/use-my-shipments.ts` | ✅ já aceita `status` no filtro — `shipments-list.tsx` só nunca passou esse param adiante |
| Repo | `shipmentRepository.findByIdForOwner` | ✅ já inclui `addresses` e `modifiers` |

**Conclusão**: esta task é puramente de UI — zero trabalho de schema/resolver/repo novo. O único hook novo é `use-shipment.ts` (cópia direta do padrão de `use-my-shipments.ts`, sem filtro, com `id` obrigatório).

### Frontend — componentes reaproveitáveis e suas lacunas

| Componente | Arquivo | O que dá pra reaproveitar | O que falta |
|---|---|---|---|
| `Badge` | `components/ui/badge.tsx` | 6 variantes (`default/secondary/warning/destructive/outline/success`) — já usado em `ShipmentStatusBadge` | Não tem um "ícone circular colorido" — só o texto da pílula |
| `Card`/`CardHeader`/`CardContent`/`CardFooter` | `components/ui/card.tsx` | Estrutura básica pronta (usada em `S8-T2`/`S8-T3`) | Nenhum padrão de "selo de seção" (ícone + título) — sempre foi `CardTitle` texto puro |
| `AdaptiveDialog` | `components/ui/adaptive-dialog.tsx` | Dialog desktop / Sheet mobile pronto, já usado em `S8-T2`/`S8-T3` pros modais de proposta/rejeição | Não tem um padrão de "lista de opções com checkbox+pílula" — os usos até agora são formulário (inputs) ou confirmação (texto) |
| `AdaptiveSelect` | `components/ui/adaptive-select.tsx` | Select de valor único, usado em toda parte | É dropdown, não painel de filtro — não é o componente certo pro `Filtro.svg` (que é multi-linha com pílula por opção, não uma lista compacta) |

### Paleta de cor por categoria — já existe, nunca foi usada

`app/globals.css` já tem 6 famílias de cor completas (`dark`/`base`/`light`) expostas como classes Tailwind (`bg-blue-light`, `text-purple-dark`, etc.), além das já usadas (`brand`, `feedback-danger/success`):

```
blue, purple, pink, red, orange, yellow (+ green — 7 no total)
```

Nenhuma delas é usada hoje em nenhum componente de shipment/proposal/document — a paleta existe pronta pro padrão "ícone circular colorido por categoria" da referência Financy/Orçamentos, sem precisar criar token novo.

### `ShipmentType` (4 valores) — mapeamento de ícone/cor

```
RESIDENTIAL_MOVING  'Mudança residencial'
COMMERCIAL_FREIGHT  'Frete comercial'
DELIVERY            'Entrega'
OTHER                'Outro'
```

4 tipos, 6-7 cores disponíveis — sobra cor, não precisa reciclar. Ícones (`lucide-react`, já uma dependência do projeto): candidatos óbvios `Home`/`Boxes` (mudança), `Truck` (frete comercial), `Package` (entrega), `MoreHorizontal` (outro) — decisão final na Research, não é ambíguo o suficiente pra travar nela.

### Rotas atuais

```
/customer/shipments           (lista, existe)
/customer/shipments/new       (form de criação, existe)
/customer/shipments/[shipmentId]   (detalhe — NÃO EXISTE, é o que esta task cria)
```

---

## Blockers

✅ Nenhum blocker — backend 100% pronto, componentes-base existem (mesmo que sem o tratamento visual específico da referência).

---

## Next Steps

1. Research: decisão final de ícone por tipo, desenho exato do card de detalhe (quais campos, em que ordem), comportamento do filtro (single-select com visual de checkbox — já registrado como decisão no brief, só falta o desenho de interação exato: fecha o painel ao selecionar, ou precisa de "Aplicar"?)
2. Plan + Todo
3. Execution
