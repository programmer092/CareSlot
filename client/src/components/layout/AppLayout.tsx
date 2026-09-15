import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { localTimeZone } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

const clientLinks = [
  { to: '/', label: 'Book a slot' },
  { to: '/bookings', label: 'My bookings' },
]
const providerLinks = [
  { to: '/provider/slots', label: 'My slots' },
  { to: '/provider/bookings', label: 'Bookings' },
]

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
  }`

export function AppLayout() {
  const { user, logout } = useAuth()
  const links = user?.role === 'PROVIDER' ? providerLinks : clientLinks

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <span className="mr-2 text-lg font-bold text-indigo-600">CareSlot</span>
          <nav className="flex gap-1">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
            <span className="hidden sm:inline">{user?.name}</span>
            {user && <Badge value={user.role} />}
            <Button variant="ghost" isLoading={logout.isPending} onClick={() => logout.mutate()}>
              Log out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        Times are shown in your local time zone ({localTimeZone}).
      </footer>
    </div>
  )
}
