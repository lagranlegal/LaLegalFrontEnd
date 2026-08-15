# Frontend Starter — Plataforma SaaS para Compraventas

Paquete inicial para arrancar el **frontend** en VS Code con Claude Code. Es el espejo del starter del backend (ya terminado y desplegado en dev: `https://compraventa-backend-dev.fly.dev`).

## Contenido

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Guía que Claude Code lee automáticamente: stack, reglas obligatorias del front, estructura, orden de implementación y DoD. |
| `docs/ARCHITECTURE.md` | Cómo está armado el front: capas, auth con Supabase, permisos, mapa de errores por código, dinero/fechas/paginación, seguridad, despliegue en Vercel. |
| `docs/DESIGN_SYSTEM.md` | La referencia visual aprobada: tokens centralizados, inventario de componentes compartidos (modal único, calendario único, tabla única), protocolos de UX, gráficas. |
| `docs/RECOMENDACIONES.md` | Cambios sugeridos al backend (`GET /me`, CORS…), decisiones tomadas y sugerencias de producto pendientes de validar con el cliente. |
| `docs/API_GUIDE.md` | **Copiarlo del repo backend** (misma versión) — contrato e intención de cada endpoint. El shape exacto siempre sale de `/openapi.json`. |
| `docs/IMPLEMENTATION.md` | Registro vivo de qué existe en el código, cómo está armado y por qué — se actualiza en cada paso del orden de implementación. Léelo antes de tocar algo que ya existe. |

## Cómo empezar

```bash
git init compraventa-frontend && cd compraventa-frontend
# copiar el contenido de este paquete en la raíz
# copiar docs/API_GUIDE.md desde el repo backend
code .
claude        # leerá CLAUDE.md automáticamente
```

Primer prompt sugerido para Claude Code:

> Lee CLAUDE.md, docs/ARCHITECTURE.md y docs/DESIGN_SYSTEM.md completos. Implementa el paso 1 del orden de implementación: scaffold Vite + React + TypeScript estricto, Tailwind con styles/tokens.css como única fuente de diseño, shadcn/ui themeado contra esos tokens, generación de tipos desde el OpenAPI del backend dev (npm run gen:api), lib/api/client.ts con manejo central de auth/errores/paginación, lib/money.ts y lib/dates.ts con sus tests, y CI. No avances a pantallas todavía.

## Reglas de oro (resumen — detalle en CLAUDE.md)

- El front no calcula negocio: intereses, estados, stock y caja son del backend; la UI guía (abonos SOLO desde `payment-options`).
- Todo diseño sale de `tokens.css`; un solo modal (`AppDialog`), un solo calendario (`DatePicker`), una sola tabla (`DataTable`).
- Dinero: strings decimales de la API, `formatCOP` con **puntos de miles** (`$ 2.664.500`), jamás `parseFloat` para aritmética.
- Fechas: **America/Bogota siempre**, vía `lib/dates.ts` — nunca `new Date()` pelado para lógica de "hoy".
- Permisos: la UI oculta, el backend decide. Mutaciones de dinero: `Idempotency-Key` por acción de usuario + botón deshabilitado en vuelo.

## Ramas y despliegue

Igual que el backend: `dev` = trabajo en curso (preview de Vercel contra backend dev); `main` = solo lo probado (producción, contra backend prod cuando exista). Nunca directo a `main`.
