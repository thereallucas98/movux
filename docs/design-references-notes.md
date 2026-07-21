# Notas de referência visual (pré-Brief)

Anotações acumuladas durante o levantamento de referências pro redesign visual do Movux. Não é um brief nem um plano — é registro de padrões observados, pra consultar quando a task de redesign for formalmente iniciada (Fase 0). Navegação está resolvida ([D-005](decisions.md)): sidebar lateral fixa, sempre. As entradas abaixo focam só na experiência de corpo/conteúdo de cada referência, não na chrome de navegação.

---

## Decisão já tomada

- **Navegação desktop = sidebar lateral fixa** (~280px), nunca nav horizontal no topo. Ver [D-005](decisions.md).

---

## Fonte: mobile Movux (Splash/Login/Entregas/Filtrar bairro/Confirmar entrega/Detalhes)

Confirmado via leitura do `Login.svg`: cores já são os tokens do Movux (`#4C33CC` primário, `#FFBE00`/`#FFC042` acento, `#BEBCCC` texto complemento, `#DAD7E0` linhas) — não é uma paleta nova, é a marca já definida, com muito mais trabalho de composição do que o que existe hoje.

Padrões de corpo observados:
- **Header colorido de contexto**: barra sólida roxa com seta de voltar + título centralizado (Login, Confirmar, Detalhes) — em mobile. Não decidido ainda se isso se traduz pra desktop ou vira só o header de página neutro (ver seção Financy).
- **Cards com selo de seção**: ícone circular colorido + título de seção (📋 "Dados", ℹ️ "Situação" nas telas de Detalhes). Nosso `Card` hoje não tem esse cabeçalho com ícone.
- **Estado de sucesso como overlay full-screen**: fundo escurecido + ícone 3D (caixa com check) + texto grande centralizado, não um toast discreto ("Foto enviada!", "Pacote retirado. Só falta entregar :)").
- **CTA fixo no rodapé**: botão de ação sempre ancorado embaixo da tela, não solto no fluxo do conteúdo.
- **Bottom sheet pra seleção** (Filtrar por bairro, Bairro escolhido): já é o padrão que usamos (`AdaptiveSelect`/`AdaptiveDialog`), sem gap aparente aqui.

---

## Fonte: `Desktop.svg` (referência estrutural genérica, paleta shadcn violet/zinc — NÃO é a paleta a copiar)

Medidas extraídas do SVG (viewBox 1440×1688):

| Região | Medidas | Padrão |
|---|---|---|
| Header de página | `y:94-204` | 2 badges pequenos à esquerda do título, 2 botões de ação à direita (secundário outline + primário sólido) |
| Formulário | `x:656-1168` | Campos lado a lado em grid 2 colunas (`244px` cada) quando curtos; largura cheia (`512px`) quando é 1 campo só |
| Lista de opções selecionável | cards `511×95-128px`, ícone circular `32-64px`, borda colorida no item ativo (`#8B5CF6` na referência) | Padrão "radio-card", não dropdown |

A parte de sidebar dessa referência bate estruturalmente com a nossa (`sidebar.tsx` já tem logo/nav/avatar+sair) — só falta tratamento visual (item ativo com fundo tintado mais forte, não `bg-accent` genérico).

**Aplica pra Movux**: o padrão de formulário 2 colunas e radio-card selecionável são candidatos diretos pros nossos forms de frete/proposta (hoje 1 coluna até em desktop) e pras seleções de tipo de veículo/turno/resultado de checagem (hoje sempre dropdown).

---

## Fonte: "Financy" (Dashboard, Categorias, Transações — provável origem do `docs/DESIGN-SYSTEM.md`)

Ignorar a nav horizontal do topo (decidido: sidebar sempre). Padrões de corpo:

- **Dashboard**: 3 cards de resumo lado a lado (ícone colorido + label caixa-alta + valor grande), seguidos de 2 painéis de conteúdo (lista recente + lista secundária), cada painel com cabeçalho "TÍTULO CAIXA-ALTA" + link de ação à direita ("Ver todas", "Gerenciar").
- **Lista com filtros** (Transações): barra de filtros com 4 campos lado a lado (busca + 3 selects), tabela com ícone colorido por linha + badge de categoria (pílula colorida) + valor com cor semântica (verde entrada / vermelho saída) + ícones de ação (lixeira/editar) + paginação numérica.
- **Grid de cards** (Categorias): header de página (título + subtítulo + botão primário à direita), 3 cards de resumo, grid de cards com ícone circular colorido no canto superior esquerdo, ícones de ação (editar/excluir) no canto superior direito, pílula colorida no rodapé do card.
- **Modais**: título + subtítulo, toggle segmentado (ex. Despesa/Receita), campos com label acima do input, grid de seleção de ícone + grid de seleção de cor ("Nova categoria").

**Aplica pra Movux** (mapeamento direto pros gaps atuais):
- Nossos cards de frete/proposta/documento (`browse-shipment-card.tsx`, `document-card.tsx`, `my-proposals-list.tsx`) não têm ícone circular colorido nem pílula de categoria — hoje é só texto + badge de status.
- Nossos dashboards (`/customer/dashboard`, `/carrier/dashboard`, `/admin/dashboard`) não têm cards de resumo numérico — só atalho + lista.
- Nossas listas não têm o tratamento de linha com ícone + ações à direita.

---

## Fonte: "Be The Hero" (Perfil — app de adoção de pets, paleta coral/vermelha, NÃO é a paleta a copiar)

Padrão de **página de detalhe**, não de listagem/dashboard:
- Imagem hero grande no topo + carrossel de thumbnails abaixo (borda ativa no thumbnail selecionado).
- Cards de estatística com ícone (ex. "muita energia", "ambiente amplo", "pequenino") em grid 3 colunas.
- Lista de "requisitos"/alertas como linhas com borda colorida fina + ícone de info à esquerda — não bullet simples.
- CTA grande arredondado no rodapé.

**Aplica pra Movux**: candidato direto pra quando construirmos a página de detalhe do frete (follow-up pendente desde o `S8-T1` — hoje não existe). Não é prioridade imediata; registrado pra quando essa tela entrar em pauta.

---

## Fonte: "Orçamentos" (Criação/Listagem, Filtro, Detalhe, Edição — app de orçamentos, paleta roxa próxima do Movux)

Paleta roxo/branco/cinza muito próxima da nossa (`#4C33CC`-like primário, pílulas de status coloridas pastel). 4 telas do mesmo fluxo CRUD — mapeiam quase 1:1 num fluxo de frete/documento do Movux.

### Filtro (o pedido específico desta rodada) — bottom sheet "Filtrar e ordenar"

- **Header do sheet**: título à esquerda + botão fechar (X) à direita, divisor abaixo.
- **Seção "Status"**: label pequeno cinza acima; cada opção é **checkbox + pílula colorida** (não texto solto) — a mesma pílula usada na listagem (Rascunho=cinza, Enviado=azul, Aprovado=verde, Recusado=vermelho). Isso é mais rico que nosso padrão atual (texto puro em `AdaptiveSelect`/checkbox).
- **Seção "Ordenação"**: label + 4 radio buttons em texto simples (Mais recente/Mais antigo/Maior valor/Menor valor), radio ativo preenchido na cor primária.
- **Rodapé do sheet**: 2 botões lado a lado — "Resetar filtros" (link/ghost, cor primária, sem fundo) + "Aplicar" (sólido primário, com ícone de check).
- **Handle de arraste**: barra escura arredondada centralizada, bem no fim do sheet.

**Aplica pra Movux**: nosso filtro de status (browse de fretes, verificações do admin) hoje é 1 dropdown de valor único. Esse padrão sugere um **painel de filtro com múltiplos critérios de uma vez** (status multi-select com pílula + ordenação), com "Aplicar"/"Resetar" explícitos em vez de aplicar filtro a cada clique — mudança de interação, não só visual, então é decisão de Research quando essa task entrar em pauta, não só reestilo.

### Listagem
Header (título+subtítulo+CTA "Novo" primário arredondado) → busca + botão de filtro circular (ícone sliders) lado a lado → lista de cards: título (até 2 linhas) + pílula de status no canto superior direito, subtítulo (cliente) + valor em destaque embaixo.

### Detalhe
Header (voltar + título + pílula de status) → card "info geral" (ícone+título, cliente, datas em 2 colunas) → card "itens" (ícone+título de seção, linhas com nome+descrição+preço+quantidade) → card "resumo financeiro" (ícone+título, subtotal riscado quando tem desconto, badge de % de desconto, total em negrito) → barra de ação flutuante no rodapé: 3 botões-ícone (excluir/duplicar/editar) + 1 botão primário largo ("Compartilhar").

### Edição
Mesma estrutura do Detalhe, mas: campos viram inputs editáveis; "Status" vira grid 2×2 de radio+pílula (em vez de badge fixo); cada item da lista ganha um ícone de editar inline; existe uma linha final tracejada/ghost "+ Adicionar item"; desconto vira um input numérico inline (não só exibição); rodapé fixo com "Cancelar" (ghost) + "Salvar" (sólido) em vez da barra de ações do Detalhe.

**Aplica pra Movux**: esse é o conjunto mais completo de referência pra um fluxo CRUD nosso (ex. frete: listar → detalhe → editar, ou documento do admin: listar → detalhe → revisar). Os pontos que mais faltam hoje:
- Pílula de status **dentro** do checkbox de filtro (não só no card)
- Barra de ação flutuante no detalhe (delete/duplicate/edit como ícones + 1 CTA primário largo) — hoje nossos "Detalhes" (quando existirem) não têm esse padrão
- Resumo financeiro com desconto riscado + badge de % — direto aplicável ao resumo de preço de um frete (`suggestedPriceInCents`/`finalPriceInCents`)

---

## Próximos passos

Aguardando mais referências do usuário antes de propor o alcance formal (Fast/Good/Ideal) de execução. Quando o levantamento fechar, isso vira a base do `brief.md`/`research.md` de uma task de redesign visual (nome de slug ainda não decidido).
