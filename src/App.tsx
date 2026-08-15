import { Button } from '@/components/ui/button'

/**
 * Placeholder de fundaciones (paso 1): confirma que Tailwind, tokens.css y
 * shadcn/ui están themeados correctamente. Se reemplaza en el paso 2
 * (Auth + shell) por el bootstrap real de la app.
 */
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-page">
      <div className="rounded-card border border-border bg-card p-card shadow-card">
        <p className="text-sm text-muted-foreground">Fundaciones</p>
        <h1 className="tnum text-2xl font-semibold text-foreground">Compraventa</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tailwind + tokens.css + shadcn/ui listos.
        </p>
        <Button className="mt-4">Botón primario</Button>
      </div>
    </div>
  )
}

export default App
