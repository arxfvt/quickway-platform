import { Outlet } from 'react-router-dom'
import AppShell from './AppShell'

export default function BidderLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
