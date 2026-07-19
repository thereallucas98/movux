# S0-T3 — QA Roteiro

**Ambiente:** `http://localhost:3000`
**Pré-requisito:** S0-T1 + S0-T2 concluídos, `pnpm dev` ativo

---

## 1. Acesso sem token → redirect para login

Abrir `http://localhost:3000/customer/dashboard` sem estar logado.

**Esperado:** redirect automático para `/login`.

---

## 2. Register como Customer

1. Ir para `/register`
2. Preencher nome, email, senha, selecionar role `Customer`
3. Submeter

**Esperado:** redireciona para `/customer/dashboard`. Navbar exibe nome do usuário.

---

## 3. Register como Carrier

1. Logout (se logado)
2. Ir para `/register`, role `Carrier`
3. Submeter

**Esperado:** redireciona para `/carrier/dashboard`.

---

## 4. Isolamento de role

Com usuário customer logado, tentar acessar `/carrier/dashboard` diretamente na URL.

**Esperado:** redirect para `/customer/dashboard` (ou 403 page).

---

## 5. Login

1. Logout
2. Ir para `/login`
3. Inserir credenciais do customer criado no passo 2

**Esperado:** redireciona para `/customer/dashboard`.

---

## 6. Login com senha errada

1. Ir para `/login`
2. Inserir email válido + senha errada

**Esperado:** mensagem de erro na página (não redireciona).

---

## 7. Logout

1. Estar logado como qualquer role
2. Clicar no botão logout na Navbar

**Esperado:** cookie limpo, redireciona para `/login`. Tentar volcar para `/customer/dashboard` → redireciona para `/login`.

---

## 8. Placeholder pages — sem 404

Verificar cada rota:

| Rota | Status esperado |
|---|---|
| `/customer/dashboard` | 200 + título placeholder |
| `/customer/shipments` | 200 + título placeholder |
| `/customer/shipments/new` | 200 + título placeholder |
| `/carrier/dashboard` | 200 + título placeholder |
| `/carrier/shipments` | 200 + título placeholder |
| `/carrier/proposals` | 200 + título placeholder |
| `/admin/dashboard` | 200 + título placeholder |
| `/admin/verifications` | 200 + título placeholder |

---

## Result table

| # | Caso | Esperado | Status |
|---|---|---|---|
| 1 | Sem token → `/login` | redirect | ○ |
| 2 | Register customer | dashboard customer | ○ |
| 3 | Register carrier | dashboard carrier | ○ |
| 4 | Customer acessa rota carrier | redirect/403 | ○ |
| 5 | Login válido | dashboard por role | ○ |
| 6 | Login senha errada | erro na página | ○ |
| 7 | Logout | cookie limpo + `/login` | ○ |
| 8 | 8 placeholders sem 404 | todos 200 | ○ |
