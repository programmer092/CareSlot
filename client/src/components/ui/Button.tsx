import type { ButtonHTMLAttributes } from 'react'
import { Spinner } from './Spinner'

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-white text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  danger: 'bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
