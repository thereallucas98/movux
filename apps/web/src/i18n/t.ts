import { dict } from './pt'

export function t(key: string, vars?: Record<string, string | number>): string {
  const template = dict[key] ?? key
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = vars[name]
    return value === undefined ? `{{${name}}}` : String(value)
  })
}
