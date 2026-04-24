const BASE_LOCALE = 'en-US'
const BASE_CURRENCY = 'USD'

type CurrencyValue = number | string | null | undefined
type CurrencyFormatOptions = Omit<Intl.NumberFormatOptions, 'style' | 'currency'>

export function formatCurrency(
  value: CurrencyValue,
  options: CurrencyFormatOptions = {}
) {
  const parsedValue = typeof value === 'string' ? Number(value) : value
  const amount =
    typeof parsedValue === 'number' && Number.isFinite(parsedValue) ? parsedValue : 0

  return new Intl.NumberFormat(BASE_LOCALE, {
    style: 'currency',
    currency: BASE_CURRENCY,
    ...options,
  }).format(amount)
}
