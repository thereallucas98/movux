import { categoryVisual } from '~/lib/format/category-visual'

import type { TaxonomyAdapter } from './types'

export const specialtiesAdapter: TaxonomyAdapter = {
  resource: 'specialties',
  copy: {
    pageTitle: 'Profissões',
    pageDescription:
      'Profissões são os papéis profissionais (Enfermeiro, Instrutor, Recepcionista…) atribuídos aos membros e exigidos por turnos.',
    addCta: 'Adicionar profissão',
    addingTitle: 'Nova profissão',
    editingTitle: 'Editar profissão',
    emptyTitle: 'Nenhuma profissão neste workspace',
    emptyBody:
      'Crie sua primeira profissão pra atribuir papéis aos membros e turnos.',
    emptyCta: 'Criar primeira profissão',
    inheritedHeader: 'Herdadas',
    rowSubject: 'profissão',
    deleteBody:
      'A profissão poderá ser recriada depois. Isso falha se algum membro ou turno ainda usa esta profissão.',
  },
  errorMap: {
    CANNOT_DELETE_IN_USE:
      'Não é possível remover: a profissão ainda está em uso por turnos ou membros.',
    ALREADY_EXISTS: 'Já existe uma profissão com esse nome neste workspace.',
    PLAN_LIMIT_REACHED: 'Limite do plano atingido.',
    VALIDATION_ERROR: 'Dados inválidos.',
    FORBIDDEN: 'Sem permissão.',
    NOT_FOUND: 'Profissão não encontrada.',
  },
  iconResolver: (id) => {
    const visual = categoryVisual(id)
    return { Icon: visual.Icon, blockClass: visual.blockClass }
  },
}
