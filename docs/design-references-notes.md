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

## Fonte: assets de marca (`Downloads/Splash/*`) — mark oficial + splash mobile

- `Logotipo.svg` (viewBox 80×88): mark isolado, 2 paths — outline branco + preenchimento amarelo `#FFBE00`, formando uma asa/seta angular apontando canto superior-direito. Sem wordmark de texto no arquivo (apesar do nome) — é só o ícone.
- `Loading.svg` (viewBox 375×812, tela iPhone completa): mockup de status bar + home indicator sobre fundo `#4C33CC` — não contém os paths do mark, é só chrome de tela.
- 4 PNGs de referência (`Loading.png`, `Loading-1/2/3.png`): sequência de estados de splash — tela cheia `#4C33CC`, mark centralizado. `Loading-1` mostra o canvas vazio (sem mark); as outras 3 mostram o mark já composto em 2 tamanhos (`Loading.png` maior; `Loading-2`/`Loading-3` menor e idênticos entre si) — sugere um mark que entra por fade/scale a partir do centro, não uma animação de trajetória complexa.
- Paleta = tokens já existentes (`--brand-base #4C33CC`); o amarelo do mark (`#FFBE00`) é um tom levemente mais escuro que `--yellow-base` (`#FFC042`, `DESIGN-SYSTEM.md` §1.4) — normalizar pro token existente em vez de introduzir um hex novo solto.

**Aplica pra Movux**: o mark serve tanto de favicon (convenção nativa `app/icon.svg` do Next 16 App Router — zero código) quanto de splash de entrada (overlay full-screen client-side sobre `bg-brand-base`, montado no `layout.tsx`, reaproveitando `framer-motion` — já é dependência do projeto, `apps/web/package.json:69`, usado em `_landing/motion-section.tsx`). `Logo` (`components/ui/logo.tsx:4-7`) já reserva um prop `iconOnly` não implementado ("Reserved for parity with template callers; logo is text-only by default") — ponto de extensão pronto pra receber o mark.

---

## Fonte: landing de projetos irmãos (`copa-bolao-web-app` "Palpitou" + `financial-driver-web-app`)

Ambos compartilham uma estrutura de landing comum (mesmo template-base: H1 `text-4xl md:text-6xl font-extrabold tracking-tight`, H2 de seção `text-3xl md:text-4xl font-bold tracking-tight`, eyebrow uppercase acima do H2) — variando conteúdo/paleta/tom:

- **Palpitou** (`copa-bolao-web-app/apps/web/src/pages/landing/landing-page.tsx`): Header sticky c/ blur → Hero (badge + headline + CTA duplo + countdown) → Features (grid 2col) → HowItWorks (3 passos, screenshots reais) → Showcase (galeria) → FinalCta → Footer. Gamificado: ícone em badge circular colorido, número de passo em círculo sólido, countdown `tabular-nums`. Anima com `framer-motion` inline (`whileInView`, delay escalonado `i*0.1`).
- **Financial-driver** (`financial-driver-web-app/apps/web/src/screens/landing/index.tsx`): Header → Hero (`AppMock` construído com tokens próprios, não screenshot) → **TrustStrip** (selos de plataformas parceiras, prova social textual) → ProblemSection (2 colunas problema×solução) → HowItWorks (4 passos numerados) → Features (grid 6) → FAQ (accordion) → FinalCta → Footer. Stat block: número grande + barra de progresso. Anima via componente `Reveal` reutilizável (mesmo padrão `whileInView`, abstraído).
- Ambos usam **cores hardcoded no componente** pro hero (`#FFD600`, gradiente `#00875f`), não tokens CSS var — anti-padrão a **não repetir**: a landing nova do Movux usa só os tokens já mapeados em `DESIGN-SYSTEM.md` (`--brand-base`, `--yellow-base` etc.).
- O `app/page.tsx` atual do Movux (`PARALLAX_BLOCKS` etc.) é conteúdo do domínio errado — fala de escala hospitalar/plantão (herdado do Turnora, [D-002](decisions.md)), não de frete/mudança. Precisa reescrita total de copy, não só reestilo.

**Aplica pra Movux**: estrutura (Hero c/ CTA duplo → TrustStrip de segurança progressiva → HowItWorks do fluxo de frete → Features/Showcase → FAQ → FinalCta) é reaproveitável 1:1, com copy 100% do domínio Movux. A gamificação do Palpitou (badge circular colorido, círculo numerado) e o stat block do Financial já têm equivalente pronto no Movux — ícone circular por categoria (validado em S8-T4/S8-T5/S8-T6) e `MetricCard` (S8-T7) — reaproveitar em vez de criar padrão novo.

---

## Próximos passos

Levantamento fechado — vira a base de `docs/tasks/s9-t1-brand-splash/`, `docs/tasks/s9-t2-landing-redesign/` e `docs/tasks/s9-t3-public-driver-search/` (Sprint 9, ver `ROADMAP.md`).
