/**
 * Format a number as a currency string.
 * @example formatCurrency(1500) → "£1,500.00"
 */
export function formatCurrency(amount: number, currency = 'GBP', locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
