import { useState, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { getErrorMessage } from '../../lib/api'
import { addDays, minutesBetween, toDateInputValue, toTimeInputValue } from '../../lib/format'
import type { SlotTimesInput } from '../../types/api'

const DURATIONS = [30, 45, 60]

interface SlotFormProps {
  initial?: SlotTimesInput
  submitLabel: string
  isPending: boolean
  error: unknown
  onSubmit: (times: SlotTimesInput) => void
  onCancel?: () => void
}

function defaultStart(): Date {
  const date = addDays(new Date(), 1)
  date.setHours(9, 0, 0, 0)
  return date
}

export function SlotForm({ initial, submitLabel, isPending, error, onSubmit, onCancel }: SlotFormProps) {
  const start = initial ? new Date(initial.startAt) : defaultStart()
  const [date, setDate] = useState(toDateInputValue(start))
  const [time, setTime] = useState(toTimeInputValue(start))
  const [duration, setDuration] = useState(
    initial ? minutesBetween(initial.startAt, initial.endAt) : 60,
  )
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration]

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const startAt = new Date(`${date}T${time}:00`) // local -> instant
    const endAt = new Date(startAt.getTime() + duration * 60_000)
    onSubmit({ startAt: startAt.toISOString(), endAt: endAt.toISOString() })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label="Date"
          type="date"
          value={date}
          min={toDateInputValue(new Date())}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <Input
          label="Start time"
          type="time"
          step={900}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
        <Select label="Length" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          {durations.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} minutes
            </option>
          ))}
        </Select>
      </div>
      {error != null && <Alert variant="error">{getErrorMessage(error)}</Alert>}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
