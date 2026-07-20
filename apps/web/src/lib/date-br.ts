import { formatInTimeZone } from 'date-fns-tz'

const BR_TIMEZONE = 'America/Sao_Paulo'

// Roda tanto no server (fuso do processo, geralmente UTC) quanto no client
// (fuso do navegador) — precisa do mesmo resultado nos dois lados, fixo no
// fuso do produto (Movux é só Brasil), não no fuso ambiente de cada lado.
export function todayInBrazil(): string {
  return formatInTimeZone(new Date(), BR_TIMEZONE, 'yyyy-MM-dd')
}

export function currentHourInBrazil(): number {
  return Number(formatInTimeZone(new Date(), BR_TIMEZONE, 'H'))
}

// Turno da manhã não pode mais ser escolhido depois do meio-dia, no dia atual.
export function isMorningWindowBlocked(scheduledDate: string): boolean {
  return scheduledDate === todayInBrazil() && currentHourInBrazil() >= 12
}
