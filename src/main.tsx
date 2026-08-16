import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import './styles/globals.css'
import { queryClient } from '@/app/query-client'
import { createAppRouter } from '@/app/router'
import { useInactivityLogout } from '@/lib/auth/inactivity'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmDialogHost } from '@/components/shared/ConfirmDialog'

const router = createAppRouter(queryClient)

function Root() {
  useInactivityLogout()
  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
      <Toaster position="top-center" richColors />
      <ConfirmDialogHost />
    </QueryClientProvider>
  </StrictMode>,
)
