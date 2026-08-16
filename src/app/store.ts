import { create } from 'zustand'

/**
 * Estado de UI global mínimo (docs/ARCHITECTURE.md §3: "Zustand mínimo —
 * sidebar abierta, modal manager"). Nada de datos de servidor aquí — eso es
 * TanStack Query.
 */
interface AppUiState {
  /** Desktop: sidebar colapsada a solo íconos. */
  sidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void
  /** Mobile: sidebar como drawer con overlay. */
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (open: boolean) => void
}

export const useAppStore = create<AppUiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  mobileDrawerOpen: false,
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
}))
