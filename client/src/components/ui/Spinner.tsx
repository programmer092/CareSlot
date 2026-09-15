const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
}

export function Spinner({
  size = 'md',
  className = '',
}: {
  size?: keyof typeof sizes
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${sizes[size]} ${className}`}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-indigo-600">
      <Spinner size="lg" />
    </div>
  )
}
