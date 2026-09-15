import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { FullPageSpinner } from './components/ui/Spinner'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { useAuth } from './features/auth/useAuth'
import { BookingsPage } from './features/bookings/BookingsPage'
import { ProviderBookingsPage } from './features/provider/ProviderBookingsPage'
import { ProviderSlotsPage } from './features/provider/ProviderSlotsPage'
import { SlotsPage } from './features/slots/SlotsPage'

export default function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <FullPageSpinner />

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        {user.role === 'PROVIDER' ? (
          <>
            <Route index element={<Navigate to="/provider/slots" replace />} />
            <Route path="provider/slots" element={<ProviderSlotsPage />} />
            <Route path="provider/bookings" element={<ProviderBookingsPage />} />
          </>
        ) : (
          <>
            <Route index element={<SlotsPage />} />
            <Route path="bookings" element={<BookingsPage />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
