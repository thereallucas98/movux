import { type ReactNode } from 'react'

import { cn } from '~/lib/utils'

interface StatusPageProps {
  /** Big number/glyph displayed at the top — e.g. "404" or "500". */
  code?: string
  /** Alternative to `code` — pass a ready-to-render icon block (e.g. an
   * iconography circle for non-numeric statuses). Ignored when `code` is set. */
  glyph?: ReactNode
  /** Bold heading shown beneath the code. */
  title: string
  /** Supporting copy under the heading. */
  description: string
  /** Action buttons row (Link / Button). */
  actions?: ReactNode
  /** Optional bottom helper card content (tips, follow-up steps). */
  tip?: ReactNode
  /** Override the wrapping container className. */
  className?: string
}

/**
 * The Movux "status / placeholder" page layout — extracted from the
 * existing 404 design so 4xx / 5xx / empty-route placeholders all share
 * the same vertical rhythm, colors and copy treatment.
 *
 * Usage:
 *   <StatusPage
 *     code="404"
 *     title="Página não encontrada"
 *     description="A página que você está procurando não existe ou foi movida."
 *     actions={<>...</>}
 *     tip={<p>...</p>}
 *   />
 */
export function StatusPage({
  code,
  glyph,
  title,
  description,
  actions,
  tip,
  className,
}: StatusPageProps) {
  return (
    <div
      className={cn(
        'bg-background flex min-h-screen flex-col items-center justify-center',
        className,
      )}
    >
      <section className="container mx-auto px-4 py-20">
        <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
          {/* Top glyph slot — either a giant code (404, 500…) OR a custom icon. */}
          <div className="mb-8">
            {code ? (
              <h1 className="text-primary text-9xl font-bold md:text-[12rem]">
                {code}
              </h1>
            ) : (
              glyph
            )}
          </div>

          {/* Heading + description */}
          <div className="mb-8 space-y-4">
            <h2 className="text-foreground text-3xl font-bold md:text-4xl">
              {title}
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl">
              {description}
            </p>
          </div>

          {/* Action buttons row */}
          {actions ? (
            <div className="flex flex-col gap-4 sm:flex-row">{actions}</div>
          ) : null}

          {/* Optional bottom tip card */}
          {tip ? (
            <div className="border-border bg-card mt-12 w-full rounded-lg border p-6 text-left">
              {tip}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
