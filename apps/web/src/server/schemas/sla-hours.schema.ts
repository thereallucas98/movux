import { z } from 'zod'

const SLA_HOURS_VALUES = [4, 6, 8, 12, 24] as const

// z.union([z.literal(4), ...], { error }) parece a escolha óbvia, mas o
// zodResolver (@hookform/resolvers/zod) ignora a mensagem customizada de
// nível superior de invalid_union e usa a do primeiro branch que falhou
// (ex.: "Invalid input: expected 4") — só não aparecia porque os forms que
// usavam esse padrão sempre tinham um valor default, nunca disparando o
// caminho de campo vazio. `.refine()` sobre um número simples não tem esse
// problema: uma única issue, uma única mensagem.
export function slaHoursSchema(message: string) {
  return z
    .number({ error: message })
    .refine(
      (value) => (SLA_HOURS_VALUES as readonly number[]).includes(value),
      {
        error: message,
      },
    )
}
