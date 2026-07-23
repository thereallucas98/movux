# QA manual "momento zero" — ajustes anotados (não implementar ainda)

Lista viva, anotada durante o teste manual guiado pelo usuário em 2026-07-22.
Cada item só entra em execução quando o usuário disser explicitamente qual
ordem seguir — nenhum ajuste aqui foi implementado ainda.

## 1. Falta UI de upload de documento pro carrier — ✅ implementado
Só existia UI do admin (aprovar/rejeitar). O carrier não tinha tela nenhuma
pra enviar CPF/CNH/comprovante/selfie — o use-case `uploadCarrierDocument`
existia no backend, sem consumidor de UI do lado carrier.

**Feito**: `/carrier/documents` (nav "Meus documentos") lista os 5 tipos
obrigatórios, cada um com `FileDropzone` + botão de envio; permite reenvio
só se rejeitado. Storage viabilizado via `StorageAdapter` interface
(`~/lib/storage/types.ts`) com `localStorageAdapter` (grava em
`public/uploads/`, gitignored) como padrão e `supabaseStorageAdapter` pronto
pra trocar via `STORAGE_ADAPTER=supabase`. Testado end-to-end via upload
real no navegador — arquivo salvo, servido, registro `PENDING` no banco.

**Direção pedida pelo usuário pra quando for implementar:**
- Armazenamento inicial em pasta temporária dentro do projeto, **gitignored**
  (não sobe pro GitHub) — só pra testes por enquanto.
- Desenhar como **adapter/interface** de storage, não acoplado direto a um
  provider — pra trocar depois por Supabase/S3/outros sem reescrever o
  use-case (hoje `uploadCarrierDocument` já importa `~/lib/storage/supabase`
  direto, sem abstração).

## 2. Limite de 2 veículos por transportador + match tem que encaixar — ⚠️ parcial
- Cadastro de veículo deve permitir no máximo **2 veículos ativos** por
  carrier (hoje não há limite).
- Isso se conecta ao S10-T2 (algoritmo de match, ainda não construído): ao
  processar uma proposta/match, o veículo do carrier usado tem que
  efetivamente atender a exigência do frete (capacidade/categoria) — não
  aceitar qualquer veículo do carrier automaticamente.

**Feito**: limite de 2 veículos ativos implementado — `createVehicle`
use-case recusa com `VEHICLE_LIMIT_REACHED` (409) se o carrier já tem 2
ativos; UI desabilita "Cadastrar veículo" com aviso, testado end-to-end
(2º veículo cadastrado, botão bloqueado corretamente no 3º).
**Pendente**: a parte de "match tem que encaixar" depende do S10-T2 (motor
de match), que ainda não existe — nada a validar aqui até essa task existir.

## 3. Inputs numéricos sem formatação BR — ✅ implementado (era menor do que parecia)
- Campos numéricos (ex. Ano do veículo, peso/volume) precisam de formatação
  brasileira (separador de milhar `.`, decimal `,`).
- Valores monetários especificamente devem seguir o mesmo padrão já usado no
  repo irmão `financial-driver-web-app` (componente/máscara de moeda BRL) —
  conferir a implementação de lá antes de reinventar.

**Investigado**: conferi `financial-driver-web-app/apps/web/src/components/ui/money-input.tsx`
— o `MoneyInput` de lá já usa exatamente o mesmo padrão "dígitos = centavos"
que o `CurrencyInput` do Movux (`~/components/ui/masked-input.tsx`) já
implementava. Ou seja, o que anotei como bug (digitar "230" vira "R$ 2,30")
**não é bug — é o comportamento correto e intencional do padrão de máscara
de moeda**, idêntico ao repo de referência. Nenhuma mudança necessária ali.
- Peso/volume no form de frete são `<select>` de faixas, não inputs livres
  — nada a formatar.
- Único gap real: campo "Ano" do veículo usava `<Input type="number">`
  nativo (spinner de scroll, aceita `e`/`+`/`-`). **Feito**: criado
  `YearInput` em `masked-input.tsx` (máscara `0000`, só dígitos, sem
  separador — ano não agrupa em milhar) substituindo o `type="number"` em
  `vehicle-form.tsx`. Testado end-to-end (edição salva corretamente,
  caracteres não-numéricos filtrados).

## 4. Erros de formulário aparecem antes do usuário interagir — ✅ implementado
- No form de novo frete (e possivelmente outros), mensagens de erro
  ("Descreva o que será transportado", "Selecione uma data", "Selecione um
  bairro" etc.) aparecem assim que a página carrega, antes do usuário tocar
  no campo — não deveriam aparecer até o campo ser tocado/perder o foco.
- Suspeita: `create-shipment-form.tsx` tem um `useEffect` que dispara
  `form.trigger()` no mount só pra desabilitar o botão de submit (form vazio)
  — mas isso também está fazendo as mensagens de erro renderizarem cedo
  demais. Precisa desacoplar "botão desabilitado" de "mostrar erro
  visualmente" (ex. só mostrar erro se o campo já foi tocado — `isTouched`).

**Feito**: o mesmo padrão (`useEffect` + `form.trigger()` no mount) aparecia
em 4 arquivos (`create-shipment-form.tsx`, `proposal-form-dialog.tsx`,
`reject-document-dialog.tsx`, `external-validation-dialog.tsx`) — em vez de
corrigir um por um, resolvido na causa raiz **compartilhada**:
`~/components/ui/form.tsx` (`FormMessage`, `FormControl`, `FormLabel`) agora
só mostra erro/estado inválido quando `isTouched || isSubmitted`, gate
disponível via `useFormField()` (que já expõe `isTouched` do
`getFieldState`, e agora também `formState.isSubmitted`). `form.trigger()`
no mount continua funcionando pra desabilitar o botão de submit (isso usa
`formState.isValid`, não mexe no gate de exibição). Testado end-to-end no
form de novo frete: erros não aparecem no load, aparecem certo depois de
tocar um campo e sair vazio.

## 5. CEP deve vir primeiro e auto-selecionar o bairro — ✅ implementado
- Reordenar os campos de endereço (origem e destino): **CEP primeiro**, antes
  de Bairro/Rua/Número/Complemento.
- Depois de buscar o CEP, o bairro retornado pela API deve **auto-selecionar**
  a opção correspondente no select de Bairro — nos dois blocos (Origem e
  Destino). Hoje existe uma lógica parcial de autofill via CEP
  (`handleCepBlur` em `create-shipment-form.tsx`) que já tenta preencher rua/
  bairro se estiverem vazios, mas a ordem dos campos não reflete esse fluxo
  (bairro vem antes do CEP hoje) — replanejar a ordem e confirmar que a
  seleção do bairro really funciona nos dois blocos.

**Feito**: `AddressFieldset` reordenado para CEP → Bairro → Rua/Número →
Complemento nos dois blocos. A lógica de autofill (`handleCepBlur`) já
preenchia rua/bairro corretamente — só precisava da ordem certa. Testado
end-to-end nos dois blocos (Origem e Destino): CEP preenchido → bairro e
rua auto-selecionados corretamente em ambos.

## 6. Carrier não deveria poder enviar nova proposta enquanto a anterior está ativa — ✅ implementado
- Depois de enviar uma proposta, a UI já mostra "Nova proposta" disponível
  imediatamente — o carrier consegue mandar outra sem esperar o cliente
  aceitar/recusar a primeira.
- Deveria bloquear nova tentativa enquanto a proposta atual estiver
  ativa/aguardando resposta — só liberar depois que o cliente recusar (ou a
  proposta expirar), respeitando o limite de tentativas que já existe no
  domínio (`Proposal`/`ProposalAttempt`, até 5 tentativas).

**Feito**: bloqueio em duas camadas.
- **Backend**: `add-proposal-attempt.use-case.ts` agora verifica o
  `responseType` da tentativa atual (`attempts.find(attemptNumber ===
  currentAttempt)`) — se `PENDING`, recusa com o novo código
  `ATTEMPT_STILL_PENDING` (409). Registrado em `error-response.ts` e
  `graphql/errors.ts`.
- **UI**: `resolveCardAction` (única fonte de verdade pra "qual botão
  mostrar") ganhou o parâmetro `currentAttemptResponseType` — enquanto
  `PENDING`, só mostra "Desistir", sem "Nova proposta". `ShipmentActionButton`
  deriva isso de `proposal.attempts` (já vinha na query `myProposal`, só
  não era consumido).
- Testado end-to-end: proposta enviada → só "Desistir" aparece (sem "Nova
  proposta") → cliente recusa → "Nova proposta" reaparece corretamente.

## 7. Bug técnico: cache não invalida contraparte nem histórico em nenhuma mutation de transição — ✅ implementado
- Depois de clicar "Aceitar" numa proposta, o card de contraparte
  (`ShipmentCounterpartCard`) não aparece na hora — só depois de recarregar a
  página manualmente.
- **Confirmado também no histórico** (linha do tempo): os eventos
  COLLECTED/IN_TRANSIT/DELIVERED **são gravados corretamente** no backend
  (`mark-collected.use-case.ts`, `mark-in-transit.use-case.ts`,
  `mark-delivered.use-case.ts` todos chamam `shipmentEventRepo.create` — já
  confirmado por grep, não é limitação de produto) mas não aparecem na tela
  sem recarregar manualmente.
- Causa: **nenhuma mutation** (`use-accept-proposal.ts`,
  `use-confirm-safety-check-in.ts`, `use-mark-collected.ts`,
  `use-mark-in-transit.ts`, `use-mark-delivered.ts`, `use-confirm-delivery.ts`,
  `use-submit-review.ts`) invalida `['shipment-counterpart-info', shipmentId]`
  nem `['shipment-events', shipmentId]` no `onSuccess` — só o hook de leitura
  `use-shipment-events.ts` referencia essa key. Precisa adicionar essas duas
  invalidações em todas as mutations de transição de status do frete, não só
  em `use-accept-proposal.ts`.

**Feito**: adicionadas as duas invalidações (`shipment-counterpart-info` e
`shipment-events`) no `onSuccess` de todas as 7 mutations listadas
(`use-accept-proposal`, `use-confirm-safety-check-in`,
`use-mark-collected`, `use-mark-in-transit`, `use-mark-delivered`,
`use-confirm-delivery`, `use-submit-review`). Testado end-to-end na mesma
sessão do browser (sem reload): aceitar proposta → card de contraparte
aparece na hora; check-in → coletado → em trânsito → entregue — cada evento
apareceu no Histórico instantaneamente, sem precisar recarregar a página.

## 8. Propostas recebidas — cliente decide às cegas — ✅ implementado
- Hoje o card de "Propostas recebidas" só mostra nome do transportador +
  preço (`ProposalForCustomerType`: `carrierName`, `priceInCents`, sem nota
  nem telefone).
- Pelo menos abrir um **modal** (clicando na proposta) com nome, telefone e
  nota/avaliações de cada transportador que propôs, antes do cliente decidir
  aceitar ou recusar — hoje ele decide sem nenhuma informação sobre quem é o
  transportador.

**Feito**: `ProposalForCustomerType` ganhou `carrierPhone`/`carrierAvgRating`
(resolver reaproveita `carrierProfileRepo.findContactInfoByUserId`, mesma
fonte já usada no card de contraparte pós-aceite). Card da lista virou
clicável (sem botões inline) — abre `ProposalDetailDialog` com nome, valor,
nota e telefone atrás de "Mostrar telefone"; Aceitar/Recusar movidos pra
dentro do modal. Testado end-to-end: modal mostra nota 5.0 e revela telefone
real do carrier ao clicar.

## 9. Hora prevista de chegada no local — ✅ implementado
- Adicionar uma estimativa de horário previsto de chegada (ETA).
- **Decidido**: ETA aparece nas **duas etapas** do frete — uma estimativa
  para a coleta e outra, separada, para a entrega final. Não é um único ETA
  genérico; são dois valores distintos ao longo do ciclo de vida do frete.

**Feito**: schema ganhou `collectionEtaMinutes`/`deliveryEtaMinutes` no
`Shipment` (via `db push` — `prisma migrate dev` pediria reset total do
banco por causa do drift de schema já existente do S10-T1, não fiz isso).
Nova mutation `setShipmentEta(shipmentId, stage, etaMinutes)`, só o carrier
selecionado pode chamar — `COLLECTION` só enquanto `CARRIER_SELECTED`,
`DELIVERY` só enquanto `IN_TRANSIT`. UI: carrier vê o campo "Hora prevista
de chegada" no card certo (check-in de segurança pra coleta, card de
Entrega pra entrega), cliente vê "Chegada prevista" em Informações gerais
quando o valor existe. Testado end-to-end nas duas etapas: 25 min (coleta)
e 15 min (entrega), ambos refletidos corretamente pro cliente sem reload.

## 10. Avaliação muito seca — tags de complemento + badges por reputação (referência: build-track) — ✅ implementado
- O fluxo de avaliação hoje é só estrelas (1-5), sem nenhum complemento.
- O schema já suporta tags — existe `Review`/`ReviewTagSelection` no domínio
  (bidirecional, `reviewerRole` único por frete) — mas a UI (`ReviewCard` em
  `customer-shipment-actions.tsx`/`carrier-shipment-transit-actions.tsx`)
  nunca usa tags, só estrelas.
- Estudar como o `build-track` implementou isso (cada nota com tags de
  complemento) antes de desenhar a versão do Movux.
- Reforço do usuário: vale pros dois sentidos de avaliação — carrier avaliando
  customer e **customer avaliando o frete/carrier** também precisa do mesmo
  nível de detalhe (não só o lado do carrier).
- **Decidido (pedido original completo, não só tags)**: além das tags de
  complemento, o perfil de carrier/customer deve mostrar **dois elementos
  visuais distintos**:
  1. **Selo de reputação por faixa de nota** — ex. média 4.5–5.0 = "Excelente",
     3.5–4.4 = "Bom", etc. — resumindo a reputação geral no perfil/card.
  2. **Badge por tag mais votada** — ex. se "Pontual" foi a tag mais marcada
     nas avaliações recebidas, exibir um badge "Pontual" no perfil, derivado
     das tags, não da média numérica.
  Os dois convivem juntos — não é um ou outro. `Review`/`ReviewTagSelection`
  no schema já dá a base de dados pros dois (nota numérica + seleção de tags).

**Investigado**: `build-track-web-app`/`build-track-api` (repos irmãos) não
têm nenhum padrão de tags de avaliação — grep não encontrou nada reaproveitável,
então a implementação seguiu direto o pedido decidido acima. A camada de
repositório/use-case (`review.repository.ts`, `submit-review.use-case.ts`)
já vinha pronta pra tags de uma sessão anterior (`CreateReviewInput.tagIds`,
validação de `targetRole`) — só a camada GraphQL/UI nunca expunha isso.

**Feito**:
- **Backend**: `reviewTagRepo.findActiveByTargetRole(role)` (novo) lista as
  tags ativas pro picker; `reviewRepo.findTopTagByReviewee(userId)` (novo,
  `groupBy` em `ReviewTagSelection` via `Review.revieweeId`) resolve a tag
  mais votada. Nova query `reviewTagOptions(targetRole)` (leitura pública
  autenticada, sem use-case — mesmo padrão de `vehicleCategories`). Mutation
  `submitReview` ganhou o arg `tagIds`; `ReviewType` ganhou `tags: [String]`
  (mapeado de `tagSelections.tag.label` no resolver, já que `Review` puro do
  Prisma não carrega o label).
- **Selo de reputação**: `~/lib/reputation-tier.ts` — função pura
  `getReputationTier(avgRating)`, faixas ancoradas nos mesmos cortes já
  usados em `carrier-profile.repository.ts#updateRating` (3.5/4.0): `>=4.5`
  Excelente, `>=3.5` Bom, abaixo Regular.
- **UI**: novo `ReviewTagPicker` (chips `Toggle`, mesmo padrão de
  `DaysOfWeekPicker`) integrado nos dois `ReviewCard`s (customer avaliando
  carrier com tags `CARRIER`-target, carrier avaliando customer com tags
  `CUSTOMER`-target — direções corretas, é o papel de quem é avaliado, não
  de quem avalia). Os dois badges (reputação + tag mais votada) aparecem em
  `CarrierPortfolioView` (achado #15) e em `ShipmentCounterpartCard` (os
  dois sentidos — customer vê do carrier, carrier vê do customer).
- **Achado extra encontrado durante o teste**: banco tinha uma tag
  `PUNCTUAL` órfã (`targetRole=CUSTOMER`) duplicada com `PUNCTUAL_CUSTOMER`
  do seed atual — resquício de uma versão anterior do seed antes do split
  carrier/customer. Desativada via `UPDATE "reviewTag" SET is_active=false`
  (não deletada) pra não duplicar no picker.
- Testado end-to-end nos dois sentidos no mesmo frete: Fernanda avaliou
  Carlos (5 estrelas + "Pontual"/"Profissional") → badges "Excelente" e
  "Pontual" apareceram na hora no card de contraparte, sem reload; Carlos
  avaliou Fernanda (5 estrelas + "Acesso fácil") → badge "Acesso fácil"
  apareceu igual. Confirmado também na página de portfólio público do
  Carlos (`/buscar-transportadores/<id>`): "Verificado", "Excelente" e
  "Pontual" lado a lado.

## 11. Cards de documento (admin) — botões desalinhados entre si — ✅ implementado
- Na tela de verificação (`document-list.tsx`/`document-card.tsx`), quando um
  card tem descrição/texto de checagem externa mais longo que o vizinho, os
  botões "Aprovar"/"Rejeitar"/"Checagem externa" ficam em alturas diferentes
  entre os cards do grid.
- Botões sempre alinhados no rodapé do card (ex. `flex flex-col` + `mt-auto`
  no bloco de ações, ou grid com altura igual entre cards).

**Feito**: `document-card.tsx` — `Card` ganhou `flex h-full flex-col`,
`CardContent` ganhou `flex-1` (o grid já esticava a altura das células
igualmente; faltava o card interno preencher essa altura). `CardFooter`
(inalterado) fica automaticamente no rodapé. Testado visualmente no admin
com um card de descrição mais longa (checagem externa com texto) ao lado de
dois mais curtos — botões alinhados na mesma linha nos três.

## 12. Carrier sem verificação não deveria conseguir pegar frete nenhum — ✅ implementado
- Confirmado no teste: Carlos (carrier novo, verificação pulada/pendente)
  apareceu no dashboard da Fernanda, entrou na fila, propôs, teve a proposta
  aceita e completou o frete inteiro sem nenhum bloqueio.
- Hoje verificação só afeta a **busca pública** (`findEligiblePublicProfiles`
  filtra por `verificationStatus: 'APPROVED'`) — nenhuma checagem existe em
  `join-proposal-queue.use-case.ts`/`submit-proposal.use-case.ts` (confirmado
  por grep). Inconsistente: um carrier invisível numa busca pública porque
  não é confiável o suficiente ainda consegue operar fretes reais.
- **Decidido**: bloquear apenas o **envio de proposta** — carrier consegue
  entrar na fila normalmente (ver o frete, se preparar), mas o
  `submit-proposal.use-case.ts` deve recusar a submissão se
  `verificationStatus !== 'APPROVED'`. `join-proposal-queue.use-case.ts`
  continua sem checagem — a fila em si fica aberta pra qualquer carrier.
- **Fechado o loop via teste manual**: simulei os 5 documentos do Carlos via
  banco, aprovei todos pelo admin, confirmei que `markVerified` só dispara
  quando os 5 tipos (`CARRIER_DOCUMENT_TYPES`) estão aprovados (comportamento
  correto), e confirmei que ele passou a aparecer na busca pública com
  categoria e nota corretas depois de aprovado — a parte de negócio funciona,
  só falta o bloqueio de fila/proposta pra quem não está aprovado.

**Feito**: novo `carrierProfileRepo.findVerificationStatusByUserId(userId)`;
`submit-proposal.use-case.ts` agora recusa com o novo código
`CARRIER_NOT_VERIFIED` (403) se `verificationStatus !== 'APPROVED'`, checado
logo após validar o status do frete e antes de checar a entrada na fila —
`join-proposal-queue.use-case.ts` continua sem nenhuma checagem, de
propósito. Erro registrado em `error-response.ts`/`graphql/errors.ts` e
mapeado pro hook (`use-submit-proposal.ts`) com mensagem "Sua conta precisa
estar verificada pra enviar propostas. Envie seus documentos em 'Meus
documentos'.". Testado end-to-end com o Bruno (carrier fixture com
`verificationStatus = PENDING`): entrou na fila normalmente, foi chamado
automaticamente, mas ao tentar enviar proposta recebeu o toast de bloqueio
e a fila continuou intacta (nenhum efeito colateral no `queueEntry`).

## 13. Bug técnico: card "Documentos pendentes" do admin não atualiza sem reload — ✅ implementado
- Depois de aprovar/rejeitar um documento, o número no card "Documentos
  pendentes" no topo do dashboard admin não atualiza — só a lista abaixo
  atualiza. Precisou de reload manual pra refletir o número certo.
- Mesmo padrão do achado #7 (falta de invalidação de query no `onSuccess` da
  mutation de aprovar/rejeitar documento).

**Feito**: `use-approve-document.ts`/`use-reject-document.ts` agora também
invalidam `['admin-dashboard-metrics']` (cobre as 4 métricas do dashboard —
pendentes, sinalizados, verificados, ativos — não só a contagem de
pendentes). Testado end-to-end: aprovei um documento, "Documentos
pendentes" foi de 3 pra 2 instantaneamente, sem reload.

## 14. "Ver arquivo" (documento) deveria abrir modal, não link direto — ✅ implementado
- Hoje "Ver arquivo" no card de documento (`document-card.tsx`) é um link
  simples. Deveria abrir um **modal** mostrando o documento (imagem/PDF) com
  os botões de ação (Aprovar/Rejeitar/Checagem externa) também dentro do
  modal — só que como **ícones**, não texto.

**Feito**: novo `DocumentViewerDialog` (`AdaptiveDialog` + `IconButton`s —
Check/X vermelho/ShieldQuestion) substitui o link "Ver arquivo" em
`document-card.tsx`; Aprovar dispara a mutation direto do modal, Rejeitar e
Checagem externa fecham o viewer e abrem os diálogos já existentes
(`RejectDocumentDialog`/`ExternalValidationDialog`). Testado end-to-end no
admin: abri o modal do documento "CNH (frente)", cliquei Aprovar (toast
"Documento aprovado", card some da lista, contador cai instantaneamente);
abri o modal do documento "CPF", cliquei no ícone vermelho Rejeitar e
confirmei que fecha o viewer e abre corretamente o `RejectDocumentDialog`
("Rejeitar documento" com campo "Motivo da rejeição").

## 15. Busca pública — tela de "portfólio" por transportador — ✅ implementado
- Hoje a busca pública (`/buscar-transportadores`) só mostra cards inline com
  info resumida (nome, categoria, nota, total de fretes).
- Precisa de uma tela dedicada tipo "portfólio" pra cada transportador
  (clicar no card leva pra uma página de detalhe daquele carrier específico),
  com opção de **voltar** pra lista de resultados.

**Feito**: nova rota `/buscar-transportadores/[carrierId]` (mesmo grupo
`(public)`, sem middleware/auth — segue o mesmo padrão de rota pública
deliberada do `publicCarrierSearch`, S9-T3). Nova query `publicCarrierPortfolio(userId)`
(sem checagem de `ctx.principal`, elegibilidade garantida no próprio repo —
`findPublicProfileByUserId` só retorna carrier `APPROVED`/`isActive`/
`!isFlagged`, mesmo guard do `findEligiblePublicProfiles`) retornando nome
completo, bio, nota, total de fretes e lista de veículos (categoria/marca/
modelo/ano — placa fica de fora, é PII). `publicCarrierSearch` passou a
expor `userId` (não é PII, é a chave natural já usada em todo lugar) pra
linkar o card à nova página. Cards da busca viraram clicáveis (`onClick` +
`onKeyDown` pra acessibilidade via teclado), com "Quero contratar" fazendo
`stopPropagation` pra não disparar a navegação de portfólio junto. Testado
end-to-end: clicar no card do "Carlos" abre `/buscar-transportadores/<id>`
mostrando nome completo, badge "Verificado", nota 5.0, "1 fretes" e o
veículo cadastrado; "Voltar" retorna pra lista; "Quero contratar" segue
para `/register` normalmente, sem acionar a navegação do card.

## 16. Desativar veículo age sem confirmação — ✅ implementado
- Testado com o veículo do Carlos (`/carrier/vehicles`): clicar em "Desativar"
  desativa na hora, sem nenhum modal de confirmação — o card some
  imediatamente da lista.
- Deveria pedir confirmação antes (ex. `AlertDialog` "Tem certeza que deseja
  desativar este veículo?"), já que a ação tira o veículo de circulação para
  matches/propostas.

**Feito**: novo `DeactivateVehicleDialog` (`components/features/vehicles/`),
seguindo o mesmo padrão já usado no fluxo de "Sair da fila"
(`WithdrawConfirmDialog` — `AdaptiveDialog` controlado externamente por
`open`/`onOpenChange`, botão destrutivo + Cancelar no footer, mobile-aware).
"Desativar" no card agora só abre o diálogo (`setVehicleToDeactivate(vehicleId)`);
a mutation só dispara em "Confirmar". Testado end-to-end (Carlos,
`/carrier/vehicles`): "Cancelar" fecha sem desativar (veículo continua na
lista); "Desativar" no diálogo desativa de fato (toast "Veículo desativado",
lista fica vazia).

## 17. Placa de veículo desativado continua bloqueada para recadastro — ✅ implementado
- Testado: depois de desativar o veículo `CRL0Z02` do Carlos, tentei
  recadastrar um veículo novo usando a mesma placa `CRL0Z02` — a API recusou
  com "Essa placa já está cadastrada.", mesmo o veículo estando desativado e
  não aparecendo mais em `/carrier/vehicles`.
- A unique constraint de placa parece não ser escopada por
  `isActive`/status.
- **Decidido**: liberar o reuso — a unique constraint deve considerar só
  veículos **ativos** (ex. unique constraint parcial no Postgres, tipo
  `CREATE UNIQUE INDEX ... WHERE is_active`), não a tabela inteira. Desativar
  um veículo deve liberar a placa pra um novo cadastro (do mesmo carrier ou
  de outro).

**Feito**: `Vehicle.plate` perdeu o `@unique` do Prisma (schema não expressa
índice parcial na DSL); a constraint real agora é o índice parcial
`vehicle_plate_active_unique_idx` (`CREATE UNIQUE INDEX ... ON vehicle(plate)
WHERE is_active = true`), criado via SQL puro direto no Postgres (fora do
`db push`, que não sabe representar índice parcial). Reforço em camada de
app: `vehicleRepo.existsActiveByPlate(plate)` checado em `createVehicle`
antes do insert (`DUPLICATE_PLATE` antecipado), com o catch de `P2002`
existente como rede de segurança contra corrida. Testado end-to-end com o
veículo `CRL0Z03` do Carlos: desativado → recadastrado com sucesso (mesma
placa, toast "Veículo cadastrado com sucesso"); tentei cadastrar um segundo
veículo com a mesma placa **enquanto o primeiro estava ativo** → bloqueado
corretamente ("Essa placa já está cadastrada").

## 18. Sair da fila deixa o carrier sem como reentrar — ✅ implementado
- Testado: Carlos entrou na fila do frete "Mudança de escritório pequeno"
  (`/carrier/dashboard`), depois clicou "Sair da fila". O modal de
  confirmação avisa: "Pra participar de novo, precisa entrar na fila do
  zero — se o frete ainda estiver aberto."
- Só que depois de confirmar, o card do frete (tanto em `/carrier/dashboard`
  quanto em `/carrier/shipments`) passa a mostrar só o texto "Você saiu da
  fila", **sem nenhum botão "Entrar na fila"** — mesmo o frete continuando
  `OPEN`. Confirmado que não é cache stale (persiste após reload completo da
  página).
- Efeito prático: uma vez que o carrier sai da fila, ele fica permanentemente
  bloqueado de competir por aquele frete, contradizendo o próprio texto do
  modal de confirmação. Precisa restaurar o botão "Entrar na fila" pra
  fretes ainda `OPEN` mesmo depois de uma saída anterior.

**Feito**: raiz do bug em duas camadas.
- **Backend**: `joinProposalQueue` (`join-proposal-queue.use-case.ts`) só
  bloqueava com `ALREADY_IN_QUEUE` verificando se **existia** uma entrada de
  fila prévia, sem olhar o `status` dela — uma entrada `WITHDRAWN` bloqueava
  igual a uma ativa. Agora só bloqueia se `existing.status !== 'WITHDRAWN'`
  **e** adicionalmente checa se o carrier já chegou a enviar proposta (via
  `proposalRepo.findByShipmentAndCarrier`) — se sim, mantém o bloqueio (isso
  é "desistiu da proposta", não "saiu da fila antes de propor", fora do
  escopo desse achado). Como `ProposalQueueEntry` tem
  `@@unique([shipmentId, carrierId])`, reentrada não pode criar uma segunda
  linha — novo método `queueRepo.reactivate(id, position)` reativa a entrada
  `WITHDRAWN` existente (volta pra `WAITING`, limpa `calledAt`/`exhaustedAt`,
  posição nova) em vez de tentar `create()`.
- **UI**: `resolveCardAction` tratava `queueStatus === 'WITHDRAWN'` como
  estado terminal (`actions: []`) sempre. Agora, quando não houve proposta
  (`proposalStatus !== 'WITHDRAWN'`), retorna `actions: ['join']` — mesmo
  tratamento de quem nunca entrou.
- Testado end-to-end: criei um frete novo como Fernanda, publiquei; Carlos
  entrou na fila (chamado automaticamente), clicou "Sair da fila" e
  confirmou (toast "Você saiu da fila desse frete", botão "Entrar na fila"
  reapareceu no card); clicou "Entrar na fila" de novo → sucesso (toast
  "Você entrou na fila desse frete", voltou a "Chamado"), sem nenhum erro.

## 19. Recusar proposta não reflete em lugar nenhum da UI (não é cache) — ✅ implementado
- Testado: como Fernanda, cliquei "Recusar" na proposta de Carlos
  (`ProposalAttempt` confirmado no banco com `response_type = REJECTED` via
  SQL direto). Nenhuma confirmação foi pedida antes de recusar (mesmo padrão
  do achado #16 — ação sem `AlertDialog`).
- Depois do toast "Proposta recusada", o card da proposta continua mostrando
  "Aceitar"/"Recusar" ativos, como se nada tivesse acontecido — **e isso
  persiste mesmo depois de um reload completo da página**, então não é o
  padrão de cache stale do achado #7 (recarregar não resolve).
- O "Histórico" do frete também não registra nenhum evento de recusa — só
  aparece "Uma proposta foi recebida", nada de "proposta recusada".
- Suspeita: a query que busca "propostas recebidas" pro cliente não está
  filtrando/considerando o `response_type` do `ProposalAttempt` mais
  recente — precisa investigar o resolver correspondente (provavelmente em
  `server/graphql/queries` ou o use-case que monta `ProposalForCustomerType`)
  antes de decidir a correção. Risco prático: cliente pode clicar
  "Recusar" de novo achando que não funcionou, ou ficar sem noção do estado
  real da proposta.

**Feito**: causa raiz confirmada — `Proposal.status` **intencionalmente**
continua `ACTIVE` numa recusa que não esgotou as 5 tentativas (é assim que o
achado #6 permite o carrier reenviar); o bug real é que a UI do cliente só
olhava `proposal.status`, nunca o `responseType` da tentativa atual, então
não tinha como saber que aquela tentativa específica já foi decidida.
`ProposalForCustomerType`/`proposalsForShipment` ganhou
`currentAttemptResponseType` (mesmo padrão já usado do lado carrier,
achado #6). `ProposalsCard` (`customer-shipment-actions.tsx`) agora
desabilita o card quando `currentAttemptResponseType !== 'PENDING'`, com
rótulo "Recusada — aguardando nova oferta" enquanto o carrier não reenvia.
Histórico também tinha o mesmo gap do achado #7: `reject-proposal.use-case.ts`
nunca chamava `shipmentEventRepo.create` (nem tinha o repo injetado) — novo
`EventType.PROPOSAL_REJECTED` + `SHIPMENT_EVENT_DESCRIPTIONS` + chamada do
evento a cada recusa (não só quando esgota tentativas); `use-reject-proposal.ts`
ganhou a invalidação de `['shipment-events', shipmentId]` que faltava.
Testado end-to-end: Fernanda recusou a proposta de Carlos → card virou
"Recusada — aguardando nova oferta" (sem reload); reload confirmou que não
era cache; Histórico passou a mostrar "Uma proposta foi recusada"; do lado
do Carlos, "Nova proposta" reapareceu normalmente (achado #6 intacto).

## 20. Toast "Entrega confirmada" aparece mesmo ao reportar problema — ✅ implementado
- Testado: no card "Confirme a entrega" (`customer-shipment-actions.tsx`),
  cliquei "Reportar problema", descrevi o problema e enviei — o card
  corretamente passou a mostrar "Problema reportado: ...", mas o toast
  exibido foi "Entrega confirmada", a mesma mensagem de sucesso usada quando
  não há problema nenhum.
- Causa: `use-confirm-delivery.ts:49` tem `successMessage: 'Entrega
  confirmada'` fixo no hook, usado tanto pro fluxo de confirmação limpa
  quanto pro de reportar problema (mesma mutation, argumento diferente).
  Precisa de uma mensagem condicional (ex. "Problema reportado" quando
  `issueDescription` foi enviado).

**Feito**: causa raiz era estrutural — `meta.successMessage` no
`MutationCache` global (`providers/query-provider.tsx`) só aceitava string
fixa, sem jeito de calcular a mensagem a partir do resultado/variáveis da
mutation. Corrigido na raiz (não só nesse hook): `onSuccess` do
`MutationCache` agora aceita `successMessage` como string **ou** função
`(data, variables) => string`, chamando a função quando for o caso.
`use-confirm-delivery.ts` passou a usar a forma função:
`variables.input.issueDescription ? 'Problema reportado' : 'Entrega
confirmada'`. Testado end-to-end: completei o ciclo de vida inteiro do
frete de teste (aceitar → check-in → coletar → em trânsito → entregue) e
cliquei "Reportar problema" como cliente — toast mostrou "Problema
reportado" corretamente (não mais "Entrega confirmada"), card exibiu
"Problema reportado: Chegou com um vidro quebrado."
