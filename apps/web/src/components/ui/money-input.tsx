import {
  forwardRef,
  type InputHTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react'

import { cn } from '~/lib/utils'

export type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'onBlur'
> & {
  loadedValue?: string | number
  onChange?: (value: number) => void
  onBlur?: (value: number) => void
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ className, onChange, onBlur, loadedValue, ...props }, ref) => {
    const [inputValue, setInputValue] = useState('0,00')

    const formatCurrency = useCallback((rawValue: string) => {
      const cleanedValue = rawValue.replace(/\D/g, '')

      if (!cleanedValue) return '0,00'

      const numericValue = parseFloat(cleanedValue) / 100
      return numericValue.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    }, [])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawInput = e.target.value
        const formattedValue = formatCurrency(rawInput)
        setInputValue(formattedValue)

        const cleanedValue = rawInput.replace(/\D/g, '')
        if (cleanedValue) {
          const numericValue = parseFloat(cleanedValue) / 100
          onChange?.(numericValue)
        } else {
          onChange?.(0)
        }
      },
      [formatCurrency, onChange],
    )

    const handleBlur = useCallback(() => {
      const numericValue = parseFloat(
        inputValue.replace(/\./g, '').replace(',', '.'),
      )
      onBlur?.(numericValue)
    }, [inputValue, onBlur])

    useEffect(() => {
      if (loadedValue !== undefined && loadedValue !== null) {
        let value: string
        if (typeof loadedValue === 'string') {
          value = loadedValue
        } else {
          value = Math.round(loadedValue * 100).toString()
        }
        setInputValue(formatCurrency(value))
      }
    }, [loadedValue, formatCurrency])

    return (
      <input
        type="text"
        inputMode="numeric"
        data-slot="money-input"
        className={cn(
          'rounded-input border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full border px-3 py-2 text-sm font-normal transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="0,00"
        {...props}
      />
    )
  },
)

MoneyInput.displayName = 'MoneyInput'

export { MoneyInput }
