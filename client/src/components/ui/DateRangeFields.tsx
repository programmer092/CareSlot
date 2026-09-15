import type { DateRange } from '../../lib/format'
import { Input } from './Input'

interface DateRangeFieldsProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

export function DateRangeFields({ value, onChange }: DateRangeFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Input
        label="From"
        type="date"
        value={value.from}
        max={value.to}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
      />
      <Input
        label="To"
        type="date"
        value={value.to}
        min={value.from}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
      />
    </div>
  )
}
