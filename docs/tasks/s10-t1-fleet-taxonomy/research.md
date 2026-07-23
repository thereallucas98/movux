# S10-T1 — Research

**Date**: 2026-07-22
**Status**: Complete

---

## Technical Analysis

### Modelo de dados escolhido

Dois models novos, hierárquicos (mesmo padrão estrutural de `SpecialtyGroup → SpecialtyItem` do build-track), mais duas mudanças de FK nos models existentes:

```prisma
model VehicleCategory {
  id          String   @id @default(uuid())
  name        String   @unique   // "Moto", "Van", "Caminhão"
  description String?
  isActive    Boolean  @default(true) @map("is_active")

  specs VehicleSpec[]

  @@map("vehicleCategory")
}

model VehicleSpec {
  id            String   @id @default(uuid())
  categoryId    String   @map("category_id")
  name          String   // "Caminhão 3/4", "Caminhão Toco", "Caminhão Truck"
  maxWeightKg   Decimal  @map("max_weight_kg") @db.Decimal(8, 2)
  maxVolumeM3   Decimal  @map("max_volume_m3") @db.Decimal(8, 2)
  isActive      Boolean  @default(true) @map("is_active")

  category VehicleCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  vehicles Vehicle[]

  @@unique([categoryId, name])
  @@map("vehicleSpec")
}
```

- `Vehicle.type VehicleType` → `Vehicle.specId String` (FK pra `VehicleSpec`, obrigatório). Um veículo físico (uma placa) tem exatamente **uma** especificação real — não é many-to-many. Frota mista continua possível do mesmo jeito que já é hoje: um carrier/company tem várias linhas de `Vehicle`, cada uma com seu próprio `specId` (a estrutura `ownerId`/`companyId` já suporta isso, só faltava o CRUD).
- `Shipment.vehicleTypeRequired VehicleType` → `Shipment.requiredCategoryId String` (FK pra `VehicleCategory`, obrigatório). O cliente continua escolhendo uma categoria (mesma UX de hoje — "Moto/Van/Caminhão", só que puxando de tabela em vez de enum), mas a elegibilidade real (S10-T2) vai comparar `estimatedWeightKg`/`estimatedVolumeM3` (já existem, sempre existiram, nunca foram lidos) contra `VehicleSpec.maxWeightKg`/`maxVolumeM3` dos specs daquela categoria — não contra um único spec fixo escolhido no momento da criação do frete.
- `PricingTemplate.vehicleType VehicleType` **não muda** — confirmado em `exploration.md` que o pricing engine hardcoda `'ANY'` e nunca lê o valor real; o enum `VehicleType` continua existindo no schema só por causa desse campo, sem qualquer outro consumidor.

### Por que categoria no Shipment, não spec exato

Duas opções descartadas:
- **Spec exato no Shipment** (troca 1:1 do enum por uma FK de spec) — mais simples de implementar, mas fecha a porta pro match numérico real: viraria só uma comparação de igualdade mais rica, sem usar `estimatedWeightKg`/`estimatedVolumeM3` (que já existem e nunca foram aproveitados). Não atende o pedido explícito do usuário de desenhar isso pensando em "outros tipos de filtros que podem se encaixar" no match futuro.
- **Sem nenhuma FK no Shipment** (só os números de peso/volume, categoria vira um rótulo calculado, não armazenado) — mais flexível, mas descontinua a UX atual do cliente escolher uma categoria familiar (Moto/Van/Caminhão) na criação do frete, e complica a busca pública (S9-T3) que hoje filtra por essa escolha explícita do cliente.

**Escolhida:** categoria (não spec exato) no `Shipment`, com os números de capacidade (`estimatedWeightKg`/`estimatedVolumeM3`) virando a chave real de elegibilidade em S10-T2 — mantém a UX atual do cliente e destrava o match numérico de verdade, que é exatamente o gap que motivou essa rodada inteira.

### Escopo do CRUD de veículo (FR2)

Segue o padrão de autorização já estabelecido em todo o domínio de shipment (`ctx.principal.userId` comparado contra o dono do recurso — mesmo espírito de `resolveSafetyParticipant`, adaptado pra `Vehicle.ownerId`). Sem gate de CASL novo (`packages/auth` não tem nada granular por recurso, confirmado em `exploration.md`). Endpoints:
- `myVehicles` (query) — lista os veículos do carrier logado
- `createVehicle` (mutation) — placa, marca, modelo, ano, `specId`
- `updateVehicle` (mutation) — mesmos campos, só o dono
- `deactivateVehicle` (mutation) — soft-delete via `isActive: false`, só o dono (nenhuma exclusão física — mesmo padrão já usado em `CarrierProfile.isActive`/`Vehicle.isActive`, que já existe no schema)

Não há mutation de verificação/aprovação de veículo nesta rodada (`crlvApproved` já existe e continua fora de escopo, como o brief definiu).

---

## Edge Cases

| Caso | Decisão |
|---|---|
| `Vehicle.plate` duplicada entre carriers diferentes | Adiciona `@unique` em `plate` — comportamento atual (sem constraint) é uma lacuna, não um requisito; nenhum consumidor depende de placas duplicadas existirem |
| Migração dos dados existentes (`Vehicle.type`, `Shipment.vehicleTypeRequired`) | **Wipe + reseed**, não migração de dados — confirmado em `exploration.md` que a única fonte de linhas de `Vehicle` hoje é um seed de dev (`dev-public-search-fixture.ts`), e os fretes com `vehicleTypeRequired` no ambiente local são todos dados de QA/fixture desta fase de desenvolvimento (pré-lançamento, sem usuário real). Reseed direto é mais simples e seguro que escrever um script de migração de dados que não precisa existir |
| Carrier sem verificação aprovada tenta cadastrar veículo | Permite cadastrar — o gate de verificação já existe em outro lugar (`CarrierDocument`/`verificationStatus`) e não bloqueia hoje o carrier de entrar na fila de propostas; ser consistente, não introduzir um bloqueio novo que não existe em nenhum outro fluxo do carrier |
| `VehicleCategory`/`VehicleSpec` sem nenhuma linha ativa (categoria desativada com specs órfãos) | `onDelete: Restrict` na FK — nunca permite deletar uma categoria com specs dependentes; desativação é sempre via `isActive`, nunca exclusão física (mesmo padrão do resto do schema) |
| Cliente cria frete e a categoria escolhida não tem nenhum spec com capacidade suficiente pro peso/volume estimado | Fora de escopo desta task — vira responsabilidade do S10-T2 (algoritmo de match), que é quem vai de fato comparar capacidade; `S10-T1` só grava os dados, não valida elegibilidade em tempo de criação |

---

## Decision Log

1. **Dois níveis (categoria → spec), não três** — mesma profundidade do par `SpecialtyGroup`/`SpecialtyItem` do build-track; não há necessidade de um terceiro nível pra esse domínio (frete não tem uma variação tão grande de porte quanto especialidades de serviço doméstico).
2. **`Vehicle → VehicleSpec` é uma FK simples (um-para-muitos), não many-to-many** — um veículo físico só tem uma capacidade real; frota mista já é resolvida por múltiplas linhas de `Vehicle` por dono, estrutura que já existe.
3. **`Shipment → VehicleCategory` (não `VehicleSpec` exato, não puramente numérico)** — decisão central desta rodada, ver seção acima; equilibra UX atual do cliente com o objetivo de habilitar match numérico real em S10-T2.
4. **`PricingTemplate`/enum `VehicleType` ficam intocados** — de-riscado pela descoberta da Exploration (pricing sempre usa `'ANY'`, nunca lê o valor real).
5. **Wipe + reseed, não migração de dados** — ambiente é pré-lançamento, único dado real de `Vehicle` é fixture de dev; escrever uma migração de dados pra histórico que não existe seria trabalho sem valor.
6. **`plate` ganha `@unique`** — fecha uma lacuna real encontrada na Exploration, sem tradeoff (nenhum consumidor depende de duplicata).
7. **CRUD de veículo sem gate de verificação** — consistente com o resto do fluxo de carrier hoje (fila de propostas não bloqueia por verificação pendente).

Nenhuma decisão acima ficou em aberto — todas resolvidas com base na direção já definida em chat (S9-T3... corrigindo, na decisão de escopo/abordagem de 2026-07-22, `docs/decisions.md` D-010) e nas descobertas da Exploration. Nenhum Fast/Good/Ideal novo precisou ser levantado nesta fase — os pontos que teriam gerado ambiguidade real (categoria vs. spec exato no Shipment) foram resolvidos por decisão técnica direta, com o raciocínio registrado acima pro usuário revisar.

---

## Next Steps

Seguir para `plan.md`/`todo.md` — ordenar os sub-passos (migration primeiro, depois repository/use-case/GraphQL de veículo, depois migração dos 4 consumidores existentes, depois seed, depois UI).
