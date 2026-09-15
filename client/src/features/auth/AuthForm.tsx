import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { getErrorMessage } from '../../lib/api'
import type { RegisterInput } from './api'

interface AuthFormProps {
  mode: 'login' | 'register'
  isPending: boolean
  error: unknown
  onSubmit: (values: RegisterInput) => void
}

export function AuthForm({ mode, isPending, error, onSubmit }: AuthFormProps) {
  const [values, setValues] = useState<RegisterInput>({ name: '', email: '', password: '' })

  const update = (e: ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(values)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {mode === 'register' && (
        <Input label="Name" name="name" value={values.name} onChange={update} required autoComplete="name" />
      )}
      <Input
        label="Email"
        name="email"
        type="email"
        value={values.email}
        onChange={update}
        required
        autoComplete="email"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        value={values.password}
        onChange={update}
        required
        minLength={8}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
      />
      {error != null && <Alert variant="error">{getErrorMessage(error)}</Alert>}
      <Button type="submit" className="w-full" isLoading={isPending}>
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </Button>
    </form>
  )
}
