# Movux Design System

**Source:** Financy (Community) Figma file — `node-id=1085-710` (Estilo + Componentes)
**Adopted:** 2026-04-28
**Palette updated:** 2026-07-20 (purple brand, replaces the original green — see §1.1)
**Tailwind:** v4 (CSS variables in `@theme inline`, no `tailwind.config.ts`)
**Implementation:** [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css)

This document is the canonical map between Figma tokens and the Tailwind utilities exposed to the codebase. When in doubt, the CSS file is the source of truth.

---

## 1. Color tokens

### 1.1 Brand (purple)

| Figma | CSS var | Tailwind utility | Hex |
|---|---|---|---|
| `Brand/brand-base` | `--brand-base` | `bg-brand-base`, `text-brand-base` | `#4C33CC` |
| `Brand/brand-dark` | `--brand-dark` | `bg-brand-dark`, `text-brand-dark` | `#3D2AA3` (derived — no explicit hover shade was given) |
| `Brand/brand-light` | `--brand-light` | `bg-brand-light`, `text-brand-light` | `#D4CCFF` |

### 1.2 Grayscale (8 levels)

| Figma | CSS var | Tailwind utility | Hex |
|---|---|---|---|
| `Grayscale/gray-100` | `--gray-100` | `bg-gray-100` etc. | `#F8F9FA` |
| `Grayscale/gray-200` | `--gray-200` | | `#E5E7EB` |
| `Grayscale/gray-300` | `--gray-300` | | `#D1D5DB` |
| `Grayscale/gray-400` | `--gray-400` | | `#9CA3AF` |
| `Grayscale/gray-500` | `--gray-500` | | `#6B7280` |
| `Grayscale/gray-600` | `--gray-600` | | `#4B5563` |
| `Grayscale/gray-700` | `--gray-700` | | `#374151` |
| `Grayscale/gray-800` | `--gray-800` | | `#111827` |

### 1.3 Feedback (semantic)

| Figma | CSS var | Tailwind utility | Hex |
|---|---|---|---|
| `Feedback/danger` | `--feedback-danger` | (use `text-destructive`/`bg-destructive`) | `#E52E2E` |
| `Feedback/success` | `--feedback-success` | (use `text-success`/`bg-success`) | `#00DA6D` |

### 1.3b Text tones

| Figma | CSS var | Use for |
|---|---|---|
| `Text/title` | `--text-title` | Headings, primary body text — mapped to `--foreground` |
| `Text/base` | `--text-base` | Secondary text — mapped to `--muted-foreground` |
| `Text/complement` | `--text-complement` | Placeholder, disabled text — mapped to `--input-placeholder` |

### 1.3c Surface

| Figma | CSS var | Hex | Use for |
|---|---|---|---|
| `Surface/background` | `--surface-bg` | `#F7F5FA` | Page background — mapped to `--background` |
| `Surface/lines` | `--surface-lines` | `#DAD7E0` | Borders — mapped to `--border`/`--input` |

### 1.4 Categorical (8 families × 3 tones)

Used for tags, charts, status badges. Each family ships `dark` (text on light bg), `base` (default), and `light` (background on light surface).

| Family | dark | base | light |
|---|---|---|---|
| Blue | `#1D4ED8` | `#2563EB` | `#DBEAFE` |
| Purple | `#7E22CE` | `#9333EA` | `#F3E8FF` |
| Pink | `#BE185D` | `#DB2777` | `#FCE7F3` |
| Red | `#B91C1C` | `#DC2626` | `#FEE2E2` |
| Orange | `#C2410C` | `#EA580C` | `#FFEDD5` |
| Yellow | `#A16207` | `#FFC042` (Figma "Secondary") | `#FFF1D6` (Figma "Secondary-light") |
| Green | `#15803D` | `#16A34A` | `#E0FAE9` |

Tailwind utilities: `bg-blue-base`, `text-blue-dark`, `bg-blue-light`, etc. for every family.

### 1.5 Semantic mapping (light theme)

The semantic layer is what app code should use. Don't reach for `bg-gray-200` from a component — use `bg-muted` so dark mode and theme overrides flow through.

| Token | Maps to | Use for |
|---|---|---|
| `--background` | `--surface-bg` | Page background |
| `--foreground` | `--text-title` | Body text |
| `--primary` | `--brand-base` | Primary CTA, brand surfaces |
| `--primary-hover` | `--brand-dark` | Primary CTA hover |
| `--primary-light` | `--brand-light` | Light primary tint (selected states, badges) |
| `--primary-foreground` | `--neutral-white` | Text on primary bg |
| `--secondary` | `--neutral-white` | Outline/secondary surfaces |
| `--secondary-foreground` | `--brand-base` | Text on secondary |
| `--secondary-border` | `--brand-base` | Outline button border |
| `--muted` | `--surface-bg` | Subtle backgrounds |
| `--muted-foreground` | `--text-base` | Subtle text |
| `--accent` | `--surface-bg` | Hover background |
| `--destructive` | `--feedback-danger` | Errors, destructive actions |
| `--success` | `--feedback-success` | Success states |
| `--success-light` | `--green-light` | Success badge bg |
| `--warning` | `--yellow-base` | Warning states (Figma "Secondary") |
| `--warning-light` | `--yellow-light` | Warning badge bg (Figma "Secondary-light") |
| `--border` | `--surface-lines` | Default border |
| `--input` | `--surface-lines` | Input border |
| `--input-foreground` | `--text-title` | Input typed text |
| `--input-placeholder` | `--text-complement` | Input placeholder |
| `--input-disabled-bg` | `--gray-100` | Input disabled background |
| `--ring` | `--brand-base` | Focus ring |

Dark theme overrides under `.dark` swap backgrounds and text to gray-700/800 base; foreground inverts to gray-100.

---

## 2. Typography

**Font family:** Inter (Google Fonts), loaded in `app/layout.tsx` as `--font-inter`. Exposed as `--font-sans` so `font-sans` resolves to Inter.

### 2.1 Scale

| Class | Size (mobile) | Size (≥768px) | Weight | Line-height |
|---|---|---|---|---|
| `text-display` | 36px | 56px | 700 | 1.2 |
| `text-h1` | 28px | 40px | 700 | 1.2 |
| `text-h2` | 24px | 32px | 700 | 1.35 |
| `text-h3` | 24px | 24px | 600 | 1.35 |
| `text-h4` | 20px | 20px | 600 | 1.35 |
| `text-body-lg` | 18px | 18px | 400 | 1.5 |
| `text-body` | 16px | 16px | 400 | 1.5 |
| `text-body-sm` | 14px | 14px | 400 | 1.5 |
| `text-caption` | 12px | 12px | 400 | 1.5 |

### 2.2 Letter-spacing

`-0.02em` on `text-display`, `-0.01em` on `text-h1`, default on the rest.

---

## 3. Border radius

| Token | Value | Tailwind utility | Use for |
|---|---|---|---|
| `--radius-sm` | 8px | `rounded-sm` | Small chips |
| `--radius-input` | 8px | `rounded-input` | Inputs, selects |
| `--radius-button` | 8px | `rounded-button`, `rounded-md` | Buttons (Md + Sm) |
| `--radius-card` | 12px | `rounded-card`, `rounded-lg` | Cards, modals |
| `--radius-badge` | 9999px | `rounded-badge` | Pills, tags |

---

## 4. Iconography

**Library:** Lucide (`lucide-react`, already in `apps/web/package.json`). The Figma file ships 39 specific icons under `Ícones`; use whichever Lucide name matches.

Common ones referenced in the guide: `Mail`, `Lock`, `UserRound`, `UserRoundPlus`, `LogIn`, `LogOut`, `Eye`, `EyeOff` (Lucide name for `eye-closed`), `PiggyBank`, `BriefcaseBusiness`, `Utensils`, `ShoppingCart`, `CarFront`, `HeartPulse`, `Ticket`, `Toolcase`, `Search`, `SquarePen`, `Trash2`, `X`, `Plus`, `Wallet`, `ChevronLeft`, `ChevronRight`, `ChevronDown`, `ChevronUp`, `CircleArrowDown`, `CircleArrowUp`, `ArrowUpDown`, `Tag`, `BookOpen`, `Gift`, `Dumbbell`, `House`, `PawPrint`, `BaggageClaim`, `Mailbox`, `ReceiptText`, `Check`.

Default icon size: `[&_svg]:size-4` on `Md` buttons, `[&_svg]:size-3.5` on `Sm` buttons (per CLAUDE.md `cva()` pattern).

---

## 5. Components defined in the Figma guide

Each component below has a Figma reference and a target Tailwind/shadcn implementation. **They are NOT implemented yet** — this document records the contract; the actual Tailwind/component code lands in Phase 1b (frontend) tasks.

### 5.1 Input (6 states)

`Empty | Active | Filled | Error | Disabled | Select`

- Border: `border-input` default; `border-primary` (focus-visible/Active); `border-destructive` (Error)
- BG: `bg-background` default; `bg-input-disabled-bg` (Disabled)
- Placeholder: `text-input-placeholder`
- Typed text: `text-input-foreground`
- Radius: `rounded-input`
- Padding: `px-4 py-3` (Md) / `px-3 py-2` (Sm)
- Min-height (touch target): `min-h-12` mobile

### 5.2 Label Button (12 variants)

Variants: `solid | outline` × `default | hover | disabled` × `md | sm`

- Solid Default → `bg-primary text-primary-foreground`
- Solid Hover → `bg-primary-hover`
- Solid Disabled → `opacity-50 pointer-events-none`
- Outline Default → `border border-secondary-border bg-secondary text-secondary-foreground`
- Outline Hover → `bg-accent`
- Outline Disabled → `opacity-50 pointer-events-none`
- Md size → `h-12 px-4 text-sm`
- Sm size → `h-9 px-3 text-xs`
- All: `rounded-button focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2`

### 5.3 Icon Button

Variants: `outline | danger` × `default | hover | disabled`

- Square `size-8` for Sm; `size-10` for Md
- `outline` → `border-input bg-background hover:bg-accent`
- `danger` → `text-destructive hover:bg-destructive/10`
- Always `aria-label` (CLAUDE.md rule)

### 5.4 Link

`default | hover` — `text-primary underline-offset-4 hover:underline`.

### 5.5 Pagination Button

States: `default | hover | active | disabled` — `size-8 rounded-sm`. Active = `bg-primary text-primary-foreground`. Hover = `bg-accent`.

### 5.6 Tag (8 categories)

Pill (`rounded-badge`) with category-specific bg/text:

```
gray   → bg-gray-200    text-gray-700
blue   → bg-blue-light  text-blue-dark
purple → bg-purple-light text-purple-dark
pink   → bg-pink-light  text-pink-dark
red    → bg-red-light   text-red-dark
orange → bg-orange-light text-orange-dark
yellow → bg-yellow-light text-yellow-dark
green  → bg-green-light text-green-dark
```

### 5.7 Type (semantic feedback line)

Two variants:
- `success` → `text-success` with leading `Check` icon
- `danger` → `text-destructive` with leading `X` icon

Used inline below inputs for validation feedback or in toasts.

---

## 6. CLAUDE.md alignment

This system inherits the project rules:

- **Mobile-first** (≤720px primary): typography scale ramps at `md:` breakpoints; touch targets ≥ 44px.
- **`cn()` from `~/lib/utils`** for class merging — never raw `twMerge`/`clsx`.
- **`cva()` from `class-variance-authority`** for component variants.
- **`focus-visible`** rings via `focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2`.
- **Colors via CSS variables only** — never hardcoded hex in JSX.
- **Drawer (not Dialog)** on mobile for modals/selects.
- **Typography**: never `text-xs` for body copy; default `text-base` (16px) on mobile.

---

## 7. What changed in this commit

- `apps/web/src/app/globals.css` — **complete rewrite** (red brand → green; navy/yellow accents removed; Nunito → Inter; new categorical palette + semantic tokens + radius scale)
- `apps/web/src/app/layout.tsx` — `Nunito` → `Inter` font import + variable rename
- 12 component/page files — bulk migration from old utility classes to new semantic ones (e.g. `text-accent-navy` → `text-foreground`, `bg-brand-primary` → `bg-primary`)

This was an Option A override — the old red+navy+nunito system was a template placeholder; the Financy guide is now the canonical brand for Movux's frontend (Phase 1b).

---

## 8. References

- Figma source: `5xIKNmt3UVAgt0oQzqduZj` node `1085-710`
- CLAUDE.md design rules: see `Frontend Coding Standards` and `Responsive Design Rules` sections
- Tailwind v4 theme syntax: <https://tailwindcss.com/docs/theme>
