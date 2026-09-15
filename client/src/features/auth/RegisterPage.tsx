import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { AuthForm } from './AuthForm'
import { useAuth } from './useAuth'

export function RegisterPage() {
  const { register } = useAuth()

  return (
    <AuthLayout
      title="Create your account"
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm
        mode="register"
        isPending={register.isPending}
        error={register.error}
        onSubmit={(values) => register.mutate(values)}
      />
    </AuthLayout>
  )
}
