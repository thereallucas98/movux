const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatPriceInCents(cents: number): string {
  return currencyFormatter.format(cents / 100)
}
