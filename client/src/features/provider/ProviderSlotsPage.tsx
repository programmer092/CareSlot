import { useState } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { DateRangeFields } from '../../components/ui/DateRangeFields'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import { Spinner } from '../../components/ui/Spinner'
import { getErrorMessage } from '../../lib/api'
import { dateInputToIso, defaultDateRange, groupByDay } from '../../lib/format'
import type { SlotTimesInput } from '../../types/api'
import { useCreateSlot, useDeleteSlot, useMySlots, useUpdateSlot } from './hooks'
import { ProviderSlotCard } from './ProviderSlotCard'
import { SlotForm } from './SlotForm'

export function ProviderSlotsPage() {
  const [range, setRange] = useState(defaultDateRange)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const slots = useMySlots(dateInputToIso(range.from), dateInputToIso(range.to, true))
  const create = useCreateSlot()
  const update = useUpdateSlot()
  const remove = useDeleteSlot()

  const createSlot = (times: SlotTimesInput) =>
    create.mutate(times, {
      onSuccess: () => {
        setCreating(false)
        setMessage('Slot published.')
      },
    })

  const updateSlot = (id: string, times: SlotTimesInput) =>
    update.mutate(
      { id, ...times },
      {
        onSuccess: () => {
          setEditingId(null)
          setMessage('Slot updated.')
        },
      },
    )

  const deleteSlot = (id: string) =>
    remove.mutate(id, { onSuccess: () => setMessage('Slot deleted.') })

  return (
    <div className="space-y-6">
      <PageHeader
        title="My slots"
        description="Publish 30–60 minute windows clients can book. Booked slots can't be changed."
        action={
          !creating && (
            <Button onClick={() => setCreating(true)}>+ New slot</Button>
          )
        }
      />

      {creating && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-800">New slot</h2>
          <SlotForm
            submitLabel="Publish"
            isPending={create.isPending}
            error={create.error}
            onSubmit={createSlot}
            onCancel={() => {
              setCreating(false)
              create.reset()
            }}
          />
        </section>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <DateRangeFields value={range} onChange={setRange} />
      </div>

      {message && (
        <Alert variant="success" onDismiss={() => setMessage(null)}>
          {message}
        </Alert>
      )}
      {remove.isError && (
        <Alert variant="error" onDismiss={() => remove.reset()}>
          {getErrorMessage(remove.error)}
        </Alert>
      )}

      {slots.isPending && <Spinner className="text-indigo-600" />}
      {slots.isError && <Alert variant="error">{getErrorMessage(slots.error)}</Alert>}
      {slots.data && slots.data.length === 0 && (
        <EmptyState
          title="No slots in this range"
          description="Publish a slot to let clients book you."
          action={<Button onClick={() => setCreating(true)}>+ New slot</Button>}
        />
      )}

      {slots.data && slots.data.length > 0 && (
        <div className="space-y-6">
          {groupByDay(slots.data).map(([day, daySlots]) => (
            <section key={day}>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">{day}</h3>
              <ul className="space-y-2">
                {daySlots.map((slot) =>
                  editingId === slot.id ? (
                    <li key={slot.id} className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                      <SlotForm
                        initial={slot}
                        submitLabel="Save"
                        isPending={update.isPending}
                        error={update.error}
                        onSubmit={(times) => updateSlot(slot.id, times)}
                        onCancel={() => {
                          setEditingId(null)
                          update.reset()
                        }}
                      />
                    </li>
                  ) : (
                    <ProviderSlotCard
                      key={slot.id}
                      slot={slot}
                      onEdit={() => setEditingId(slot.id)}
                      onDelete={() => deleteSlot(slot.id)}
                      isDeleting={remove.isPending && remove.variables === slot.id}
                    />
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
