import { Outlet } from '@tanstack/react-router'
import { TopBar } from '../components/top-bar.tsx'

export function RootLayout() {
  return (
    <div className="app">
      <TopBar />
      <Outlet />
    </div>
  )
}
