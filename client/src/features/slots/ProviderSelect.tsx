import type { Provider } from '../../types/api'

interface ProviderSelectProps {
  providers: Provider[]
  value: string
  onChange: (providerId: string) => void
}

export function ProviderSelect({ providers, value, onChange }: ProviderSelectProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">Provider</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.name}
          </option>
        ))}
      </select>
    </label>
  )
}
