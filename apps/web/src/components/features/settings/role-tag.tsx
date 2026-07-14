import { Tag, type TagProps } from '~/components/ui/tag'

interface RoleMeta {
  label: string
  category: TagProps['category']
}

const ROLE_MAP: Record<string, RoleMeta> = {
  ADMIN: { label: 'Admin', category: 'green' },
  COORDENADOR: { label: 'Coordenador', category: 'blue' },
  COLABORADOR: { label: 'Colaborador', category: 'gray' },
}

export function RoleTag({ role }: { role: string }) {
  const meta = ROLE_MAP[role] ?? { label: role, category: 'gray' as const }
  return <Tag category={meta.category}>{meta.label}</Tag>
}
