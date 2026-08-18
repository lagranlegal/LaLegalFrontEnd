# Storage de fotos — ✅ resuelto (18/08/2026)

> Backend/infra creó y configuró el bucket el 18/08/2026 — verificado de forma independiente por el front (no solo confirmado de palabra) antes de construir `PhotoUploader` encima. Este documento se deja completo, histórico primero (qué faltaba y por qué) y la resolución al final (§6) — mismo criterio que el resto de `docs/IMPLEMENTATION.md`: no se borra el rastro de un bloqueo real ya resuelto.
>
> Todo lo de abajo (§1-5) es el estado tal como se documentó el 17/08/2026, sin editar — sigue siendo la explicación correcta de POR QUÉ se necesitaba esto y qué se le pidió a backend. La resolución real está en §6.

## 1. Qué ya está decidido (no es una pregunta abierta)

`CLAUDE.md` y `docs/ARCHITECTURE.md` especifican Supabase Storage desde el arranque del proyecto, no Cloudinary ni otro servicio:

- `CLAUDE.md`: *"`supabase-js` (SOLO auth y storage)"*; *"Fotos (cédulas, prendas, contratos firmados) SIEMPRE a buckets privados de Supabase Storage con URLs firmadas — nunca públicas (Habeas Data, Ley 1581)."*
- `docs/ARCHITECTURE.md` §8: *"buckets **privados** por empresa en Storage, paths con `company_id`, acceso por **URLs firmadas de vida corta** pedidas al momento de mostrar; nunca URLs públicas ni copias en cache del front."*

La razón de fondo es legal, no de preferencia técnica: cédulas, contratos firmados y comprobantes son datos personales sensibles bajo la Ley 1581 (Habeas Data) — necesitan estar detrás de acceso controlado (bucket privado + URL firmada de vida corta), no en una URL pública indexable. Cualquier alternativa (ej. un servicio de imágenes con URLs públicas) reabriría ese problema de cumplimiento, así que no se evaluó como opción.

## 2. Qué se verificó (17/08/2026, contra el proyecto de Supabase real de dev)

```
GET {SUPABASE_URL}/storage/v1/bucket
Authorization: Bearer <token de un usuario real autenticado, Admin de Empresa Demo Front>

→ 200 OK
→ []
```

Cero buckets configurados. El request en sí funciona (200, no 401/403) — no es un problema de permisos del token ni del anon key, es que **no hay ningún bucket creado todavía** en el proyecto de Supabase (`driyubkodnsqxbtxcmaz`, el mismo de dev que usa el front hoy). Confirmado autenticado como usuario real, no solo con el anon key pelado.

Este repo del front no tiene ninguna carpeta `supabase/migrations/` (a diferencia del repo de backend, que sí la tiene — referenciada en la nota técnica del paso 5b, `supabase/migrations/00012_contract_import.sql`) — la creación de buckets, políticas RLS de Storage y su configuración vive del lado del backend/infra, no del front.

## 3. Qué necesita configurarse

1. **Bucket(s) privados** (`public: false`) en el proyecto de Supabase de cada ambiente (dev, y luego prod). Nombre(s) a definir por el equipo de backend — el front puede adaptarse a cualquier convención, pero necesita saber cuál es antes de escribir `PhotoUploader`. Dos formas razonables, cualquiera sirve:
   - **Un solo bucket** (ej. `company-files`) con subcarpetas por tipo de documento (`{company_id}/items/...`, `{company_id}/contracts/...`, `{company_id}/customers/...`, `{company_id}/expenses/...`).
   - **Buckets separados por tipo** (ej. `item-photos`, `contract-photos`, `customer-docs`, `expense-receipts`), cada uno con `{company_id}/...` como prefijo de path.
2. **Política RLS de Storage** que limite lectura/escritura al `company_id` del usuario autenticado (vía JWT claims, igual que el resto de RLS del backend) — nadie de la Empresa A debería poder leer ni listar archivos de la Empresa B, ni siquiera con una URL adivinada (por eso las URLs firmadas de vida corta, no público).
3. **Confirmar quién genera la URL firmada:** ¿el front la pide directo a Supabase Storage con la sesión del usuario (`supabase.storage.from(bucket).createSignedUrl(path, expiresIn)`, lo más simple, ya contemplado en `ARCHITECTURE.md`), o el backend expone un endpoint propio que la genera? Si es lo primero (asunción actual del front, no confirmada), la política RLS del punto 2 es lo único que protege el acceso — hay que tenerla lista antes de subir el primer archivo real.
4. **Confirmar el límite de tamaño/tipo de archivo** aceptado por bucket (Supabase lo configura por bucket) — el front comprime client-side antes de subir (`PhotoUploader`, ver `docs/DESIGN_SYSTEM.md` §3), pero necesita saber el techo real para ajustar la compresión.

## 4. Qué hace el front con esto una vez exista

`PhotoUploader` (documentado desde el paso 1 en `docs/DESIGN_SYSTEM.md` §3, sin construir hasta ahora por esto): comprime la imagen client-side (ahorra datos y limpia EXIF/GPS de paso), sube al bucket con el path `{company_id}/...` que corresponda, guarda en el campo `photos: string[]` de la entidad (contrato, artículo, cliente, gasto) **el path del archivo, no una URL** — la URL firmada se pide al momento de mostrar la foto (nunca se cachea ni se guarda una URL pública). El backend no valida ni conoce el contenido de esos strings — solo los guarda (`docs/ARCHITECTURE.md` §1: *"Storage (subir fotos; el backend guarda solo las URLs)"*).

## 5. Dónde bloquea al front HOY

**Paso 7 (inventory + sales), acción "Publicar" de un artículo en borrador** (`CLAUDE.md`: *"publicar (precio + ≥1 foto, muestra el código emitido)"*) — un artículo no puede pasar de `draft` a `available` sin al menos una foto. Sin `PhotoUploader`, esa acción queda visible en la pantalla (para no ocultar la regla de negocio) pero deshabilitada, con el motivo explicado en pantalla, hasta que este documento se resuelva. El resto del paso 7 (ingresos, editar borrador sin fotos, egresos, ventas, anulación) no depende de esto y se construye completo igual.

Uso futuro ya previsto en el diseño (`docs/DESIGN_SYSTEM.md` §3): cédula del cliente, contrato firmado, comprobante de gasto — ninguno construido todavía, todos esperan lo mismo.

## 6. Resolución (18/08/2026)

Backend/infra reportó: bucket `company-files` creado, privado, 8 MB máx, solo `image/jpeg|png|webp`; RLS reutiliza el mismo `current_company_id()` del resto del esquema; probado con un archivo real (subida, URL firmada, descarga con bytes idénticos, intento cruzado a otra empresa rechazado por RLS, archivo de prueba borrado); confirmado que el front pide la URL firmada directo con `supabase-js` y su propia sesión, sin endpoint nuevo del backend (resuelve la pregunta abierta del punto 3 de §3); `ARCHITECTURE.md` del backend actualizado.

**Antes de construir nada, el front repitió la verificación de forma independiente** (mismo criterio que el resto de esta sesión: un reporte de que algo "ya está resuelto" se confirma con una llamada real, no se da por hecho):

```
POST {SUPABASE_URL}/storage/v1/object/company-files/{company_id}/_verify-pixel.png   → 200, subida ok
POST {SUPABASE_URL}/storage/v1/object/sign/company-files/{company_id}/_verify-pixel.png  → 200, URL firmada
GET  <URL firmada>                                                                    → bytes idénticos al original (md5 comparado)
DELETE {SUPABASE_URL}/storage/v1/object/company-files/{company_id}/_verify-pixel.png  → 200, limpiado
POST {SUPABASE_URL}/storage/v1/object/company-files/00000000-.../_intruso.png         → 403 AccessDenied explícito (RLS)
POST ...texto plano en vez de imagen                                                  → 400 InvalidMimeType (confirma el límite de tipo)
```

Con esto verificado, se construyó `PhotoUploader` (`components/shared/PhotoUploader.tsx`, `lib/storage/`) y se desbloqueó "Publicar" en `ItemEditDialog` — probado en navegador de punta a punta: subir 2 fotos → guardar → publicar (código real emitido) → el artículo aparece en `/ventas/nueva` y se pudo agregar al carrito y completar una venta real, y también se probó un egreso real con el mismo artículo — los dos flujos que habían quedado sin poder probarse en el paso 7 por este mismo bloqueo. Detalle completo de decisiones (compresión, convención de paths, orden guardar→publicar) en `docs/IMPLEMENTATION.md`, sección "Paso 7b".
