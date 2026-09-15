const styles: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  BOOKED: 'bg-green-100 text-green-800',
  AVAILABLE: 'bg-indigo-100 text-indigo-800',
  PAST: 'bg-gray-100 text-gray-500',
  CLIENT: 'bg-indigo-100 text-indigo-800',
  PROVIDER: 'bg-amber-100 text-amber-800',
}

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[value] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {value.toLowerCase()}
    </span>
  )
}
