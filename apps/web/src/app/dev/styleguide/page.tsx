import { Mail, Plus, SquarePen, Trash2 } from 'lucide-react'

import { Button } from '~/components/ui/button'
import { IconButton } from '~/components/ui/icon-button'
import { Input } from '~/components/ui/input'
import { PaginationButton } from '~/components/ui/pagination-button'
import { Tag } from '~/components/ui/tag'
import { Type } from '~/components/ui/type'

/**
 * Live preview of the Financy design system primitives.
 * Visit `http://localhost:3001/dev/styleguide` in development.
 */
export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-12 px-6 py-12">
      <header>
        <h1 className="text-h1">Movux Style Guide</h1>
        <p className="text-body-lg text-muted-foreground mt-2">
          Adopted from the Financy (Community) Figma — see{' '}
          <code className="bg-muted rounded px-1.5 py-0.5 text-sm">
            docs/DESIGN-SYSTEM.md
          </code>
        </p>
      </header>

      {/* ── Colors ──────────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Brand & semantic colors</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { name: 'primary', cls: 'bg-primary text-primary-foreground' },
            { name: 'foreground', cls: 'bg-foreground text-background' },
            { name: 'muted', cls: 'bg-muted text-foreground' },
            { name: 'accent', cls: 'bg-accent text-foreground' },
            {
              name: 'destructive',
              cls: 'bg-destructive text-destructive-foreground',
            },
            { name: 'success', cls: 'bg-success text-white' },
            { name: 'warning', cls: 'bg-warning text-white' },
            { name: 'border', cls: 'bg-border text-foreground' },
          ].map((c) => (
            <div
              key={c.name}
              className={`${c.cls} rounded-card flex h-16 items-center justify-center text-xs font-semibold`}
            >
              {c.name}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-h2 mb-4">Categorical (3 tones each)</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              'blue',
              'purple',
              'pink',
              'red',
              'orange',
              'yellow',
              'green',
            ] as const
          ).map((c) => (
            <div key={c} className="flex gap-2">
              <div
                className={`bg-${c}-dark flex h-12 flex-1 items-center justify-center rounded-sm text-xs font-semibold text-white`}
              >
                {c}-dark
              </div>
              <div
                className={`bg-${c}-base flex h-12 flex-1 items-center justify-center rounded-sm text-xs font-semibold text-white`}
              >
                {c}-base
              </div>
              <div
                className={`bg-${c}-light flex h-12 flex-1 items-center justify-center rounded-sm text-xs font-semibold text-${c}-dark`}
              >
                {c}-light
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Typography ──────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Typography (Inter)</h2>
        <div className="space-y-3">
          <p className="text-display">Display 56/36 — Tá na Movux</p>
          <p className="text-h1">H1 40/28</p>
          <p className="text-h2">H2 32/24</p>
          <p className="text-h3">H3 24</p>
          <p className="text-h4">H4 20</p>
          <p className="text-body-lg">Body LG 18 — corpo de texto destacado</p>
          <p className="text-body">Body 16 — corpo de texto padrão</p>
          <p className="text-body-sm">Body SM 14 — secundário, captions</p>
          <p className="text-caption">Caption 12 — metadados, footnotes</p>
        </div>
      </section>

      {/* ── Buttons ─────────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Label Button</h2>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid" size="md">
              Solid Md
            </Button>
            <Button variant="outline" size="md">
              Outline Md
            </Button>
            <Button variant="ghost" size="md">
              Ghost Md
            </Button>
            <Button variant="destructive" size="md">
              Destructive
            </Button>
            <Button variant="link" size="md">
              Link
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="solid" size="sm">
              Solid Sm
            </Button>
            <Button variant="outline" size="sm">
              Outline Sm
            </Button>
            <Button variant="solid" size="md" disabled>
              Disabled
            </Button>
            <Button variant="solid" size="md">
              <Plus /> Com ícone
            </Button>
          </div>
        </div>
      </section>

      {/* ── Icon Buttons ────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Icon Button</h2>
        <div className="flex flex-wrap items-center gap-3">
          <IconButton variant="outline" aria-label="Editar">
            <SquarePen />
          </IconButton>
          <IconButton variant="danger" aria-label="Remover">
            <Trash2 />
          </IconButton>
          <IconButton variant="outline" size="sm" aria-label="Editar (sm)">
            <SquarePen />
          </IconButton>
          <IconButton variant="outline" disabled aria-label="Disabled">
            <SquarePen />
          </IconButton>
        </div>
      </section>

      {/* ── Pagination ──────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Pagination Button</h2>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <PaginationButton
              key={n}
              aria-current={n === 2 ? 'page' : undefined}
            >
              {n}
            </PaginationButton>
          ))}
          <PaginationButton disabled>4</PaginationButton>
        </div>
      </section>

      {/* ── Tags ────────────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Tag (8 categories)</h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              'gray',
              'blue',
              'purple',
              'pink',
              'red',
              'orange',
              'yellow',
              'green',
            ] as const
          ).map((c) => (
            <Tag key={c} category={c}>
              {c}
            </Tag>
          ))}
        </div>
      </section>

      {/* ── Inputs ──────────────────────────────── */}
      <section>
        <h2 className="text-h2 mb-4">Input (6 states)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">Empty</span>
            <Input placeholder="Digite seu email" />
          </label>
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">Filled</span>
            <Input defaultValue="maria@hospital.com" />
          </label>
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">Error</span>
            <Input defaultValue="email-inválido" error />
            <Type variant="danger">Email inválido</Type>
          </label>
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">Disabled</span>
            <Input defaultValue="Não editável" disabled />
          </label>
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">
              Com ícone (composto)
            </span>
            <div className="relative">
              <Mail className="text-input-placeholder absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input className="pl-10" placeholder="email@empresa.com" />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-body-sm font-medium">Success</span>
            <Input defaultValue="ok@valido.com" />
            <Type variant="success">Email confirmado</Type>
          </label>
        </div>
      </section>
    </main>
  )
}
