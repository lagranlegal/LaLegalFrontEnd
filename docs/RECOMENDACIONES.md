# Recomendaciones y análisis — Frontend

> Resultado del análisis del backend terminado + los requisitos del front. Tres partes: (1) estado de los cambios pedidos al backend, (2) decisiones ya tomadas en estos documentos y su porqué, (3) sugerencias de producto que no estaban en los requisitos. Última actualización: 15/08/2026 (tercera revisión — backend con cambios prioritarios aplicados + las 5 preguntas al cliente cerradas, ver §3).

## 1. Cambios pedidos al BACKEND — estado

Los 3 de prioridad alta ya están **RESUELTOS** en el backend (verificado en API_GUIDE/ARCHITECTURE actualizados el 15/08/2026); quedan 2 en backlog aceptado, sin bloqueo para el front.

1. ✅ **`GET /api/v1/me` — implementado** (API_GUIDE §2.6): `{user, company{timezone, logo_url}, role, permissions[], subscription, plan}`, accesible a cualquier autenticado, con `permissions` = exactamente el set que `require_permission` acepta (mismo cache TTL 60s). El front lo adopta como bootstrap de sesión y única fuente de permisos y timezone — ver ARCHITECTURE §4.5 y §5 (la estrategia transitoria de "degradar en 403" quedó eliminada del diseño). De paso el backend documentó un gotcha de RLS que encontró al construirlo (tabla `plan` sin policy de SELECT devolvía 0 filas en silencio) — sin efecto en el front, pero explica el porqué de la migración `00010`.
2. ✅ **CORS — implementado** (`app/common/cors.py`, backend ARCHITECTURE §8): dev acepta `localhost:5173`/`3000` y todo preview `*.vercel.app` sin configurar nada; prod es lista explícita vía secret `CORS_ALLOW_ORIGINS`. **Pendiente operativo al lanzar prod:** registrar el dominio definitivo de Vercel en ese secret.
3. ✅ **Idempotencia durable en `POST /contracts` — cerrada** (API_GUIDE §7): `contract` ahora tiene `UNIQUE(company_id, idempotency_key)` igual que abonos y ventas (nullable por las filas históricas — irrelevante para el front). Un reintento de red ya no puede duplicar un contrato ni su desembolso; `useMoneyMutation` puede reintentar `POST /contracts` con la misma key con total seguridad, sin tratamiento especial.
4. ⏳ **Serie histórica para la gráfica principal** — en backlog aceptado del backend (API_GUIDE §15: `GET /reports/series?months=12`, ingresos por mes con toggle "Empeño/Tienda" en la gráfica). Mientras tanto el dashboard va con KPIs + contratos por estado, que ya son accionables — el card de la gráfica se agrega cuando exista el endpoint, sin rediseño.
5. ⏳ **`GET`/`PATCH /company/settings`** — en backlog aceptado del backend (API_GUIDE §15). Hasta entonces, la pantalla "Configuración" del front se limita a lo que sí tiene API (categorías de gasto, roles/usuarios viven en su propio menú); logo/firma/datos legales quedan pendientes de ese endpoint. Nota: el logo ya LLEGA vía `/me.company.logo_url` para mostrarlo en la topbar — lo que falta es editarlo.

## 2. Decisiones tomadas (y por qué)

- **Vite + React SPA, no Next.js** — panel 100% tras login, sin SEO; el servidor de reglas ya existe (FastAPI). Confirmado contigo el 15/08/2026 y alineado con ARCHITECTURE §8 del backend.
- **Tailwind + shadcn/ui, no una librería cerrada** — los componentes viven en el repo: control total para clavar la referencia visual y tokens 100% centralizados (requisitos 1, 3 y 4). Confirmado contigo el 15/08/2026.
- **TanStack Query + openapi-fetch + tipos generados** — el backend mantiene OpenAPI siempre sincronizado; generar tipos elimina toda una clase de bugs de integración y el CI detecta breaking changes (ARCHITECTURE §10).
- **TanStack Router** — type-safety de rutas/params de punta a punta, consistente con la apuesta por tipos generados. Si el equipo prefiere React Router v7, es un cambio de bajo costo si se decide ANTES del paso 2 del orden de implementación.
- **Zustand solo para UI** — el 95% del estado es de servidor y vive en Query; meter Redux sería sobre-arquitectura.
- **Print CSS antes que PDFs** — el backend pospuso PDFs (contrato, acta) a propósito; `PrintLayout` imprime ambos desde el navegador con los datos que la API ya expone. Cuando lleguen los PDFs del backend, el botón cambia de "Imprimir" a "Descargar PDF" sin rediseño.
- **Sin modo offline** — caja, idempotencia y estados server-side hacen peligroso operar dinero sin conexión. Si un día se quiere, es un proyecto en sí (colas + reconciliación), no un flag.

## 3. Sugerencias de producto (no estaban en los requisitos)

### Operación diaria
- **Banner de caja permanente** (`CashSessionBanner`): el estado de la sesión es EL contexto operativo — visible siempre, con CTA de abrir/cerrar según permiso. Evita el ciclo frustrante "lleno el formulario de venta → 409 caja cerrada".
- **Venta tipo POS** (espejo de la captura de referencia): búsqueda incremental de artículos por código/nombre (el código `JOC0001I` se puede teclear rápido), carrito con steppers, cliente opcional con "Consumidor final" por defecto (decidido 15/08/2026), total EN el botón de vender. Preparada para lector de código de barras USB (los lectores emulan teclado: input siempre enfocado + Enter agrega — costo casi cero ahora, muy caro después).
- **Wizard de abono a prueba de errores:** pantalla de contrato → "Registrar abono" → botones de `payment-options` → resumen → confirmar. El usuario JAMÁS digita un monto de interés (regla "meses completos" del negocio garantizada por diseño).
- **Búsqueda global (Ctrl+K / buscador de la topbar):** clientes por nombre/cédula, contratos por código, artículos por código. En un mostrador con el cliente esperando, es la función más usada del día. Fase 1: 3 búsquedas en paralelo con `?q=`; ideal futuro: endpoint unificado.
- **Recibo imprimible de abono/venta** para entregar al cliente en mano: formato carta (o media carta) vía `PrintLayout`, en la impresora estándar del local — decidido 15/08/2026.

### Confianza y control (dueño/admin)
- **Historial cruzado en la ficha del cliente:** contratos + compras + abonos en una línea de tiempo — ya lo contempla CONTEXTO §4, dale prioridad: es la pantalla que más consulta el dueño ("¿este cliente es bueno?").
- **Auditoría legible:** renderizar `before/after` como frases ("María aplicó descuento de $20.000 en abono del contrato E-0012 — motivo: cliente frecuente"), no JSON crudo. El log inmutable ya existe; hacerlo legible lo convierte en herramienta de confianza.
- **Descuadres de caja con memoria:** en el histórico de cierres, resaltar diferencias ≠ 0 y su justificación, filtrable por responsable (el backend ya lo da en `/reports/closings`).

### Técnica
- **Sentry en el front desde el día 1** (`VITE_SENTRY_DSN` opcional): errores de usuarios reales en producción + trazas correlacionables con el backend.
- **MSW como contrato vivo:** los mismos mocks sirven para desarrollar sin backend, para tests y para demos comerciales de la plataforma (una "empresa demo" sin tocar datos reales — útil para vender el SaaS).
- **PWA instalable (solo shell):** ícono en el escritorio/celular del mostrador, pantalla completa. Sin cache de datos (ver §2 — sin offline). Costo: un manifest + service worker mínimo.
- **Logout por inactividad:** 6 horas (decidido 15/08/2026), configurable por constante central.
- **i18n-light:** textos de UI centralizados por feature (`strings.ts`) — no instalar i18next hoy (solo español), pero no incrustar textos en JSX profundo: si el SaaS crece a otro idioma/país, el costo de migrar será bajo.

### Decisiones cerradas con el cliente (15/08/2026)
1. **Venta sin cliente: SÍ** — cliente opcional, "Consumidor final" por defecto en el POS (delegado por el cliente al criterio técnico; coincide con la recomendación previa de CONTEXTO §6).
2. **Logout por inactividad: 6 horas** (constante central `INACTIVITY_LOGOUT_MS`, ajustable).
3. **Impresión: impresora estándar del local, formato carta** — recibos, comprobantes y actas vía `PrintLayout`. La variante térmica de 80mm queda descartada por ahora (retomar solo si algún día hay impresora de tirilla).
4. **Menú lateral: aprobado como se propuso** en DESIGN_SYSTEM §3 (orden y nombres ajustables después sin costo).
5. **Marca visual: aún no existe.** La paleta actual es un placeholder derivado de la referencia visual aprobada (y el resultado final probablemente será similar); todo el color vive en `tokens.css` para que el rebranding sea editar un archivo. Los documentos ya no nombran al software de referencia — solo se toma su diseño visual y de colores.
