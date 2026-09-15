import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  children: ReactNode
  footer: ReactNode
}

export function AuthLayout({ title, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-indigo-600">CareSlot</span>
          <h1 className="mt-2 text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">{children}</div>
        <p className="mt-4 text-center text-sm text-gray-500">{footer}</p>
      </div>
    </div>
  )
}
