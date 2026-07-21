# S9-T2 — Exploration

**Date**: 2026-07-21
**Status**: Complete

---

## Correção ao brief: a landing tem mais seções inline do que os 8 arquivos de `_landing/`

O brief listava as seções como vindas de `_landing/*`. Na prática, **`app/page.tsx` também define seções completas inline** (não são componentes separados): `SiteHeader`, `Hero`, `TrustStrip`, `ProblemSection`, `WorkflowSection`, `FinalCta`, `SiteFooter` — todas dentro do próprio `page.tsx`, ao lado dos imports de `_landing/*`. Isso é uma boa notícia pro escopo: **`TrustStrip` e `WorkflowSection` já existem estruturalmente** com o nome certo (FR2/FR3 do brief pedem exatamente isso) — só o conteúdo está no domínio errado, não falta criar seção nova nenhuma.

---

## Mapa completo de conteúdo a substituir

| Local | Seção | Conteúdo atual (domínio errado) | Ícones | Dado hardcoded |
|---|---|---|---|---|
| `page.tsx:31-54` | dados do `LandingTextParallax` | `PARALLAX_BLOCKS` — "Escala, decisão, ponto e prova", imagens Unsplash de equipe hospitalar | — | Array completo |
| `page.tsx:178` | `Hero` | "Escalas para hospitais, clínicas e academias" | `Hospital`, `HeartPulse`, `Shield`, `MapPin`, `Sparkles`, `Users` | Headline/subheadline |
| `page.tsx:242-247` | `TrustStrip` | "Feito para Hospitais/Clínicas/Academias/Conformidade CLT" | `Hospital` | Array `verticals` |
| `page.tsx:285-353` | `ProblemSection` | "Planilha + WhatsApp não dá conta de plantão" + bullets antes/depois | `CheckCircle2`, `FileCheck2` | Bullets de problema/solução |
| `page.tsx:364-389` | `WorkflowSection` | Passos Rascunho → Publicada → Em operação → Fechada | `CalendarCheck`, `GitBranch` | Array `steps` |
| `landing-hero-preview.tsx:28-48,120-137,180-433` | mock interativo no Hero | Tabs "Escalas/Solicitações/Notificações/Ponto", "Hospital Acme — Centro", painéis de plantão UTI/ponto | `CalendarDays`, `Inbox`, `BellRing`, `Timer`, `LayoutDashboard`, `Clock`, `Users`, `CheckCircle2` | `TABS`, `items`, dados mock de 4 painéis |
| `landing-spring-cards.tsx:27-64` | grid "6 sistemas" | "Escalas Vivas", "Trocas e Folgas", "Ponto Geolocalizado" etc. | `BellRing`, `CalendarRange`, `Clock`, `ListChecks`, `Repeat`, `Users` | Array `CARDS` |
| `landing-sticky-cards.tsx:21-50` | 4 cards sticky "Recursos" | "A pessoa certa no turno certo", "Ponto que respeita a tolerância" | `BellRing`, `Clock`, `Repeat`, `Users` | Array `CARDS` |
| `landing-roles-accordion.tsx:33-88` | accordion "Para quem" | Roles `ADMIN`/`COORDENADOR`/`COLABORADOR`, "Tolerância CLT" | `HeartPulse`, `ListChecks`, `Shield`, `ArrowRight` | Array `ROLES` |
| `landing-faq.tsx:15-40` | FAQ | 6 perguntas sobre ponto/setor/RH/convite | `ChevronDown` | Array `FAQ` |
| `landing-pricing.tsx:26-80` | Pricing 3 planos | Free/Small Team/Business com features de escala hospitalar | `Check`, `Clock`, `Sparkles` | Array `TIERS` |
| `landing-text-parallax.tsx`, `motion-section.tsx` | wrappers genéricos | Sem copy embutido — **reaproveitáveis como estão**, só recebem props novas | `ArrowUpRight` | Nenhum |

Estrutura confirmada e mapeada 1:1 com as FRs do brief: FR1 (Hero) = `page.tsx:178`+`Hero preview`; FR2 (TrustStrip) = `page.tsx:242-247`; FR3 (HowItWorks) = `WorkflowSection` (`page.tsx:364-389`, já existe com esse propósito — só precisa virar o fluxo real do shipment); FR4 (FAQ) = `landing-faq.tsx`; FR5 (FinalCta) = seção `FinalCta` já em `page.tsx`.

---

## Prefill de `role` — ajuste real necessário (não é refactor grande)

- `register-form.tsx` **não lê query string hoje** — `role` vem hardcoded em `defaultValues.role: 'CUSTOMER'` (`register-form.tsx:67`), sem import de `useSearchParams`.
- Redirect pós-cadastro: `router.push(user.role === 'CARRIER' ? '/carrier/dashboard' : '/customer/dashboard')` (`register-form.tsx:94`), dentro do `onSubmit`.
- `(auth)/register/page.tsx` é Server Component, não recebe `searchParams` como prop hoje.
- Ajuste necessário pro CTA duplo da landing funcionar (`/register?role=CUSTOMER`/`?role=CARRIER`): `RegisterForm` precisa ler `useSearchParams()` no mount e inicializar o toggle de role — pequeno, isolado, sem tocar em `page.tsx` do register.

---

## Riscos confirmados / atualizados

- Volume de conteúdo a substituir é maior do que os "8 arquivos" do brief sugeriam (page.tsx sozinho tem ~5 blocos de conteúdo hardcoded) — não muda a estimativa de esforço (já era Medium/5-7h contando isso), só confirma que o trabalho está concentrado em `page.tsx` + `landing-hero-preview.tsx` (os dois com mais dado mock).
- `landing-pricing.tsx` confirmado 100% hardcoded, sem fonte externa — copy de "em breve" (Out of Scope do brief) é seguro de aplicar sem tocar em nenhuma integração.

## Next Steps

Seguir para `research.md` — decisão de conteúdo real por seção (copy final de cada headline/bullet/FAQ, baseado em `BUSINESS-FOUNDATION.md`) e confirmação de quais ícones `lucide-react` substituem `Hospital`/`HeartPulse`/`CalendarDays` etc.
