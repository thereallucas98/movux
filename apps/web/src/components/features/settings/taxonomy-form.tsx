'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Type } from '~/components/ui/type'
import { ApiError } from '~/lib/api-error'
import { slugify } from '~/lib/format/slugify'
import { cn } from '~/lib/utils'

import type { TaxonomyAdapter } from './_adapters/types'
import { handlePlanLimitError } from '~/components/features/plan-limits/with-plan-limit-error-handler'

import { useCreateTaxonomy } from './_hooks/use-create-taxonomy'
import { useUpdateTaxonomy } from './_hooks/use-update-taxonomy'

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
  description: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
})

type Values = z.infer<typeof schema>

interface CommonProps {
  workspaceId: string
  adapter: TaxonomyAdapter
  onSuccess: () => void
  onCancel: () => void
}

interface CreateProps extends CommonProps {
  mode: 'create'
  initial?: undefined
}

interface EditProps extends CommonProps {
  mode: 'edit'
  initial: { id: string; name: string; description: string | null }
}

type Props = CreateProps | EditProps

export function TaxonomyForm({
  workspaceId,
  adapter,
  mode,
  initial,
  onSuccess,
  onCancel,
}: Props) {
  const createMutation = useCreateTaxonomy(adapter.resource, workspaceId)
  const updateMutation = useUpdateTaxonomy(adapter.resource, workspaceId)

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: initial?.name ?? '',
      description: initial?.description ?? '',
    },
  })

  const watchedName = watch('name')
  const previewSlug = watchedName ? slugify(watchedName) : ''

  async function onSubmit(values: Values) {
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          slug: slugify(values.name),
          name: values.name,
          description: values.description?.length
            ? values.description
            : undefined,
        })
      } else {
        const patch: { name?: string; description?: string | null } = {}
        if (values.name !== initial.name) patch.name = values.name
        const desc = values.description?.length ? values.description : null
        if ((initial.description ?? null) !== desc) patch.description = desc
        if (Object.keys(patch).length === 0) {
          onCancel()
          return
        }
        await updateMutation.mutateAsync({ id: initial.id, ...patch })
      }
      onSuccess()
    } catch (err) {
      const code = err instanceof ApiError ? err.code : null
      if (code === 'ALREADY_EXISTS') {
        setError('name', {
          message: adapter.errorMap.ALREADY_EXISTS,
        })
        return
      }
      if (code === 'PLAN_LIMIT_REACHED') {
        handlePlanLimitError(err, {
          onSimpleOrBoolean: (msg) => setError('root', { message: msg }),
        })
        return
      }
      const msg =
        (code && adapter.errorMap[code]) ??
        'Não foi possível salvar. Tente novamente.'
      setError('root', { message: msg })
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-border bg-muted/40 flex flex-col gap-4 rounded-[12px] border p-4"
      noValidate
    >
      <h3 className="text-foreground text-[16px] font-semibold">
        {mode === 'create'
          ? adapter.copy.addingTitle
          : adapter.copy.editingTitle}
      </h3>

      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Nome
        </span>
        <Input
          {...register('name')}
          autoFocus
          placeholder="Ex.: UTI"
          aria-invalid={errors.name ? true : undefined}
        />
        {errors.name ? (
          <span className="text-destructive text-[13px] font-medium">
            {errors.name.message}
          </span>
        ) : (
          <span className="text-muted-foreground text-[12px]">
            URL:{' '}
            <code className="bg-background rounded px-1 py-0.5">
              {previewSlug || 'item'}
            </code>
          </span>
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-foreground text-[14px] leading-[20px] font-medium">
          Descrição (opcional)
        </span>
        <Textarea
          {...register('description')}
          rows={3}
          placeholder="Detalhes que ajudam a equipe a identificar"
          aria-invalid={errors.description ? true : undefined}
        />
        {errors.description && (
          <span className="text-destructive text-[13px] font-medium">
            {errors.description.message}
          </span>
        )}
      </label>

      {errors.root && <Type variant="danger">{errors.root.message}</Type>}

      <div className="flex flex-row gap-2">
        <Button
          type="submit"
          variant="solid"
          size="sm"
          disabled={!isValid || isSubmitting || (mode === 'edit' && !isDirty)}
          className={cn(isSubmitting && 'opacity-60')}
        >
          {isSubmitting
            ? 'Salvando…'
            : mode === 'create'
              ? 'Adicionar'
              : 'Salvar'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
