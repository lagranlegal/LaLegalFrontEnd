# Prendo — frontend

La SPA de **Prendo**, el SaaS para compraventas colombianas (empeño + tienda): React 19 + Vite + TypeScript,
desplegada en Vercel (`dev.prendo.com.co`). Consume la API del backend (`backend-starter`) y usa Supabase solo para
Auth y Storage; no calcula ninguna regla de negocio.

**Empieza por el mapa del proyecto:** [`../backend-starter/docs/README.md`](../backend-starter/docs/README.md).
Aquí: [`CLAUDE.md`](CLAUDE.md) (reglas obligatorias), [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y
[`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).

```bash
npm install --legacy-peer-deps
cp .env.example .env      # completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (la anon)
npm run gen:api           # tipos desde el /openapi.json del backend
npm run dev
npm run lint && npm run typecheck && npm run test && npm run build
```

Ramas: se trabaja en `dev`, que es la rama que Vercel publica. Cómo desplegar:
`../backend-starter/docs/OPERACION.md` §2.
