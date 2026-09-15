import type { ReactNode } from 'react'

const variants = {
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
  info: 'border-blue-200 bg-blue-50 text-blue-800',
}

interface AlertProps {
  variant: keyof typeof variants
  children: ReactNode
  onDismiss?: () => void
}

export function Alert({ variant, children, onDismiss }: AlertProps) {
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${variants[variant]}`}
    >
      <div>{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-lg leading-none opacity-60 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}
