# Fretes do Customer — Prova de Conceito Visual — RESEARCH

**Date**: 2026-07-21
**Phase**: RESEARCH
**Status**: COMPLETE

---

## Context

A Exploration confirmou que o backend está 100% pronto e que já existe uma paleta de cor por categoria não utilizada. Restavam 3 decisões de desenho antes do Plan — todas de UI/interação, resolvidas nesta Research sem precisar de nova pergunta em chat (não são trade-off de produto, são escolhas de implementação dentro do que já foi decidido no brief).

---

## Goals

- Fechar o mapeamento ícone/cor por `ShipmentType`
- Desenhar o card de detalhe campo a campo
- Desenhar o comportamento exato do painel de filtro (single-select com visual de checkbox+pílula)

---

## Technical Analysis

### Ícone + cor por `ShipmentType`

| Tipo | Label | Ícone (`lucide-react`) | Cor |
|---|---|---|---|
| `RESIDENTIAL_MOVING` | Mudança residencial | `Home` | `blue` |
| `COMMERCIAL_FREIGHT` | Frete comercial | `Truck` | `purple` |
| `DELIVERY` | Entrega | `Package` | `orange` |
| `OTHER` | Outro | `MoreHorizontal` | `pink` |

Cada ícone renderiza dentro de um círculo `bg-{cor}-light` com o ícone em `text-{cor}-dark` (mesmo padrão de contraste pastel-fundo/escuro-ícone da referência Financy) — reaproveita a paleta já existente em `globals.css`, sem token novo.

### Card de detalhe — campos e ordem

Sem endereço/CEP completo por enquanto (o dado exato mora em `street`/`number`, mas a página é só leitura de resumo — mostrar endereço completo é decisão de UX pra quando existir uma necessidade real de conferência, não o objetivo desta prova de conceito). Cidade não é mostrada — hoje 100% dos dados de geografia são de João Pessoa (seed único), então repetir "João Pessoa" em todo card não agrega; mostra só bairro + UF.

**Card 1 — "Informações gerais"** (ícone do tipo no círculo colorido + `SHIPMENT_TYPE_LABELS[type]` como título):
- Descrição (texto)
- Origem: `{neighborhoodName}, {state}`
- Destino: `{neighborhoodName}, {state}`
- Data agendada (formatada UTC-anchored, mesmo padrão de `formatScheduledDate` já usado) + janela de horário (`TIME_WINDOW_LABELS`); se `timeWindow === 'SPECIFIC'`, mostra `specificTime` formatado em vez do label genérico

**Card 2 — "Resumo de preço"**:
- Se `finalPriceInCents` existe: `suggestedPriceInCents` riscado (small, muted) acima + `finalPriceInCents` em destaque como total (mesmo padrão "Subtotal riscado → Total" do `Detalhe.svg`)
- Se não existe: só `suggestedPriceInCents`, label "Preço estimado" (sem sugerir que é final)

**Header da página**: link "← Voltar" pra `/customer/shipments` + título (`SHIPMENT_TYPE_LABELS[type]`) + `ShipmentStatusBadge` ao lado — mesma composição do `Detalhe.svg` (voltar + título + pílula de status), sem a barra de ação flutuante (não há ações no domínio ainda, já registrado como fora de escopo no brief).

### Painel de filtro — comportamento exato

Visual: lista de opções, cada uma `checkbox + ShipmentStatusBadge` (reaproveita o componente existente, não recria a pílula). Comportamento: **seleção única** — marcar uma opção desmarca a anterior (mesmo dado que `myShipments(status)` só aceita 1 valor). Rodapé com 2 botões, replicando o `Filtro.svg`:
- **"Limpar filtro"** (ghost/link) — desmarca tudo, fecha o painel, lista volta a mostrar todos os status
- **"Aplicar"** (sólido, ícone de check) — fecha o painel, lista refiltra pelo status marcado

Sem seção "Ordenação" (fora de escopo, já registrado no brief — `myShipments` não suporta ordenação customizada).

Componente novo (`shipment-filter-sheet.tsx`) usa `AdaptiveDialog` como base (mesmo padrão de `reject-document-dialog.tsx`/`proposal-form-dialog.tsx` — dialog desktop / sheet mobile), com estado local de "status pendente" só commitado no `onValueChange`/query ao clicar "Aplicar" (mesmo padrão de `pending` já usado em `AdaptiveDatePicker`).

---

## Edge Cases

- **Frete sem `finalPriceInCents`** (a maioria hoje — só é setado quando um carrier é selecionado, fora do escopo construído até agora): card de preço mostra só o valor sugerido, sem riscado/desconto.
- **`shipmentId` de outro customer ou inexistente**: `getShipment` use-case já retorna `NOT_FOUND`/`FORBIDDEN` (validado no `S8-T1`) — página de detalhe trata isso como estado de erro amigável (mesmo padrão de `EmptyState`), não expõe stack trace nem redireciona silenciosamente.
- **Filtro aplicado sem nenhum frete no status escolhido**: `EmptyState` já existente, sem necessidade de estado novo.
- **`timeWindow === 'SPECIFIC'` sem `specificTime`**: não deveria acontecer (validado na criação, `S8-T1`), mas o card trata como o label genérico "Horário específico" se o campo vier vazio, em vez de quebrar a formatação de hora.

---

## Decision Log

| Decisão | Escolha | Razão |
|---|---|---|
| Ícone/cor por tipo | `Home`/blue, `Truck`/purple, `Package`/orange, `MoreHorizontal`/pink | Paleta já existente no design system, nunca usada; 4 tipos, cores de sobra |
| Cidade no endereço do card | Omitida (só bairro + UF) | Hoje 100% dos dados são de João Pessoa (seed único) — repetir em todo card não agrega informação |
| Endereço completo (rua/número) no detalhe | Fora do card — só bairro/UF | Prova de conceito é sobre tratamento visual, não sobre expor dado novo; endereço completo já está disponível via GraphQL se uma necessidade real aparecer depois |
| Filtro: interação | Seleção única com "Limpar"/"Aplicar" no rodapé, visual de checkbox+pílula | Reflete a limitação real da API (`status` é 1 valor) mas mantém o visual da referência; "Aplicar" explícito evita refiltrar a cada clique |
| Barra de ação flutuante no detalhe | Não incluída | Sem ações de domínio ainda (cancelar frete não existe) — já registrado como fora de escopo no brief |

---

## Blockers

✅ Nenhum — as 3 decisões de desenho resolvidas nesta Research.

---

## Next Steps

1. Plan + Todo: sub-steps ordenados (hook → ícone/cor → card de detalhe → painel de filtro → páginas → design system doc)
2. Execution
