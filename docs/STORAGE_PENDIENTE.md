# Storage de fotos — pendiente de configurar en Supabase

> Documento para el equipo de backend/infra. Explica qué necesita el front, por qué, qué se verificó, y qué falta del lado de Supabase para poder construir `PhotoUploader`. No es una propuesta de cambio de arquitectura — la arquitectura (Supabase Storage, buckets privados, URLs firmadas) ya está decidida en `CLAUDE.md` y `docs/ARCHITECTURE.md` desde el paso 1 del proyecto; esto documenta que **la infraestructura todavía no existe**, bloqueando el paso 7 (inventory + sales) del front. Última actualización: 17/08/2026.

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
