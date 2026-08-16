import { Outlet } from '@tanstack/react-router'

/** `/auth/*` — sin sidebar (docs/ARCHITECTURE.md §9). */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <Outlet />
    </div>
  )
}
