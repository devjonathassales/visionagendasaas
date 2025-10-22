import Header from '@/components/Header'
import { Outlet } from 'react-router-dom'

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
