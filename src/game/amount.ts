/** Integer quantities for this prototype; money is always expressed in cents. */
export type Amount = number

export function isAmount(value: unknown): value is Amount {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

// Reject overflow instead of silently losing precision. A future large-number
// implementation belongs here, together with a migration of the save format.
export function addAmounts(left: Amount, right: Amount): Amount | null {
  const result = left + right
  return isAmount(result) ? result : null
}

export function multiplyAmounts(left: Amount, right: Amount): Amount | null {
  const result = left * right
  return isAmount(result) ? result : null
}
