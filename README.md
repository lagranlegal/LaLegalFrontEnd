# Frontend — Plataforma SaaS para Compraventas

Frontend (React SPA) de la plataforma SaaS **multi-tenant** para compraventas (casas de empeño + tienda). Consume la API del backend (FastAPI en Fly.io + Supabase, ya terminado y desplegado en dev: `https://compraventa-backend-dev.fly.dev`) — este repo no reimplementa ninguna regla de negocio, es capa de presentación + guía de usuario.

**Estado:** todos los módulos del plan original (auth, dashboard, clientes, catálogos, contratos + import de contratos preexistentes, caja, inventario, ventas, identidad, auditoría, reportes, panel de plataforma super-admin) están construidos y probados en vivo contra el backend dev. Detalle completo de qué existe y por qué en `docs/IMPLEMENTATION.md` (registro vivo, un bloque por sesión de trabajo).

## Documentación

| Archivo | Propósito |
|---|---|
| `CLAUDE.md` | Guía de arquitectura/reglas que Claude Code lee automáticamente: stack, reglas obligatorias, estructura, orden de implementación (histórico) y Definición de Hecho. |
| `docs/ARCHITECTURE.md` | Cómo está armado el front: capas, auth con Supabase, permisos, mapa de errores por código, dinero/fechas/paginación, seguridad, despliegue en Vercel. |
| `docs/DESIGN_SYSTEM.md` | Sistema de diseño: tokens centralizados, inventario de componentes compartidos, protocolos de UX, gráficas. |
| `docs/IMPLEMENTATION.md` | **Registro vivo** de qué existe en el código y por qué — léelo antes de tocar algo que ya existe. |
| `docs/PENDIENTES_BACKEND_INFRA.md` | Documento de traspaso con backend/arquitectura/infraestructura: huecos reales encontrados construyendo el front, qué se verificó y por qué importa para el negocio. |
| `docs/RECOMENDACIONES.md` | Decisiones tomadas y su porqué, más sugerencias de producto — con su estado real (✅ construido / ❌ no construido / 🚧 parcial). |
| `docs/pending/` | Copia de los docs del repo **backend** (`API_GUIDE.md`, `ARCHITECTURE.md`, `CONTEXTO.md`) usada como referencia — el shape exacto de cualquier endpoint siempre sale de `/openapi.json`, no de estos archivos. |

## Desarrollo

```bash
npm install --legacy-peer-deps   # ver docs/IMPLEMENTATION.md ("Paso 1") sobre por qué la flag
cp .env.example .env              # completar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY

npm run gen:api        # regenera src/types/api.ts desde $VITE_API_URL/openapi.json
npm run dev             # Vite dev server
npm run lint && npm run typecheck && npm run test   # antes de cualquier commit
npm run build            # tsc -b && vite build
```

## Reglas de oro (resumen — detalle en `CLAUDE.md`)

- El front no calcula negocio: intereses, estados, stock y caja son del backend; la UI guía (abonos SOLO desde `payment-options`).
- Todo diseño sale de `tokens.css`; un solo modal (`AppDialog`), un solo calendario (`DatePicker`), una sola tabla (`DataTable`).
- Dinero: strings decimales de la API, `formatCOP` con **puntos de miles** (`$ 2.664.500`), jamás `parseFloat` para aritmética.
- Fechas: **America/Bogota siempre**, vía `lib/dates.ts` — nunca `new Date()` pelado para lógica de "hoy".
- Permisos: la UI oculta, el backend decide. Mutaciones de dinero: `Idempotency-Key` por acción de usuario + botón deshabilitado en vuelo.

## Ramas y despliegue

Igual que el backend: `dev` = trabajo en curso (preview de Vercel contra backend dev); `main` = solo lo probado (producción, contra backend prod cuando exista). Nunca directo a `main`.
