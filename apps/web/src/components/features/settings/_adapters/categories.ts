import { categoryVisual } from '~/lib/format/category-visual'

import type { TaxonomyAdapter } from './types'

export const categoriesAdapter: TaxonomyAdapter = {
  resource: 'categories',
  copy: {
    pageTitle: 'Setores',
    pageDescription:
      'Setores são os agrupamentos operacionais (UTI, Centro Cirúrgico, Recepção…) usados em escalas e turnos.',
    addCta: 'Adicionar setor',
    addingTitle: 'Novo setor',
    editingTitle: 'Editar setor',
    emptyTitle: 'Nenhum setor neste workspace',
    emptyBody:
      'Crie o primeiro setor pra começar a organizar seus turnos por área.',
    emptyCta: 'Criar primeiro setor',
    inheritedHeader: 'Herdados',
    rowSubject: 'setor',
    deleteBody: 'O setor poderá ser recriado depois.',
  },
  errorMap: {
    CANNOT_DELETE_GERAL: "Não é possível remover o setor 'Geral'.",
    ALREADY_EXISTS: 'Já existe um setor com esse nome neste workspace.',
    PLAN_LIMIT_REACHED: 'Limite do plano atingido.',
    VALIDATION_ERROR: 'Dados inválidos.',
    FORBIDDEN: 'Sem permissão.',
    NOT_FOUND: 'Setor não encontrado.',
  },
  iconResolver: (id) => {
    const visual = categoryVisual(id)
    return { Icon: visual.Icon, blockClass: visual.blockClass }
  },
}
