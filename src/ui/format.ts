import type { Amount } from '../game/amount'

const currency = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  currencyDisplay: 'narrowSymbol',
})
const quantity = new Intl.NumberFormat('es-ES')

export function formatMoney(cents: Amount): string {
  return currency.format(cents / 100)
}

export function formatAmount(amount: Amount): string {
  return quantity.format(amount)
}
