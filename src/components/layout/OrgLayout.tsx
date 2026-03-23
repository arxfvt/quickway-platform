import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'

export default function OrgLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
