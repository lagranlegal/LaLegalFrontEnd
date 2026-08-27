import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'theme'

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

function prefersDarkSystem(): boolean {
  // jsdom (tests) no implementa matchMedia — sin este guard, cualquier test
  // que solo IMPORTE este módulo (sin renderizar nada) explota al cargar.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (prefersDarkSystem() ? 'dark' : 'light') : theme
}

/**
 * Mismo mecanismo que ya corre en `index.html` ANTES de que React monte
 * (evita el parpadeo de tema incorrecto en la primera pintura) — acá se
 * repite para cuando el usuario cambia el tema o el SO cambia de
 * preferencia con la app ya abierta. Solo el atributo `dark` importa:
 * `tokens.css` define TODO en `:root`, y `[data-theme='dark']` redefine
 * encima — ausencia de atributo ya es "claro", no hace falta un valor
 * `'light'` explícito.
 */
function applyThemeToDocument(theme: Theme) {
  if (resolveTheme(theme) === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

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
  /** Preferencia elegida, no el color resuelto — `resolveTheme()` para eso. */
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const useAppStore = create<AppUiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  mobileDrawerOpen: false,
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
  theme: readStoredTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Modo privado o cuota llena — el tema simplemente no persiste entre
      // sesiones, no rompe nada más.
    }
    applyThemeToDocument(theme)
    set({ theme })
  },
}))

// "Sistema" tiene que reaccionar en vivo a un cambio de preferencia del SO
// con la app ya abierta, no solo leerla una vez al arrancar. Mismo guard que
// `prefersDarkSystem`: jsdom no tiene matchMedia.
if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useAppStore.getState().theme === 'system') applyThemeToDocument('system')
  })
}
