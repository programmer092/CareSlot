import { Link } from 'react-router-dom'
import { AuthLayout } from '../../components/layout/AuthLayout'
import { AuthForm } from './AuthForm'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { login } = useAuth()

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          No account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <AuthForm
        mode="login"
        isPending={login.isPending}
        error={login.error}
        onSubmit={({ email, password }) => login.mutate({ email, password })}
      />
      <div className="mt-4 space-y-1 rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
        <p>
          Demo client: <code>client@gmail.com</code> / <code>password</code>
        </p>
        <p>
          Demo provider: <code>provider@gmail.com</code> / <code>password</code>
        </p>
      </div>
    </AuthLayout>
  )
}
