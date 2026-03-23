import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'

export default function AdminLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
