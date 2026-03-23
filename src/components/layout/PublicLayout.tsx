import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'

export default function PublicLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
