/**
 * Módulo de negocio (`contracts`, `cashbox`, `identity`…) — la MISMA
 * taxonomía que usa `PermissionOut.module` (paso 8) y `AuditLogOut.module`
 * (paso 9, confirmado contra datos reales: los códigos de módulo del audit
 * log coinciden exactamente con los de `GET /identity/permissions`, más
 * `platform` que no aparece en el catálogo de permisos de una empresa
 * normal — es el dominio del panel super-admin, paso 10). Promovido a
 * `lib/` cuando `features/audit` se volvió el segundo consumidor real
 * (antes vivía solo en `PermissionsMatrixDialog`).
 *
 * Dominio DISTINTO de `lib/modules.ts` (`MODULE_LABELS: pawn|store|general`
 * — el módulo de negocio de gastos/cierre de caja) — mismo nombre de
 * concepto, dos catálogos del backend sin relación, mapas separados a
 * propósito (ver `docs/IMPLEMENTATION.md` paso 8).
 *
 * `accounts` (00029) y `capital` (00054) llegaron después y nadie los agregó
 * acá: la matriz de permisos titulaba dos bloques `accounts` y `capital`, y
 * en Auditoría la columna "Módulo" salía en inglés **y el filtro ni siquiera
 * ofrecía esos módulos** — el desplegable de `AuditPage` se arma con las
 * claves de este mapa, así que una etiqueta que falta también esconde el
 * filtro (QA F21-08). `tests/label-catalogs.test.ts` ahora lo vigila.
 */
export const BUSINESS_MODULE_LABELS: Record<string, string> = {
  accounts: 'Cuentas',
  audit: 'Auditoría',
  capital: 'Capital',
  cashbox: 'Caja',
  catalogs: 'Catálogos',
  company: 'Empresa',
  contracts: 'Contratos',
  customers: 'Clientes',
  identity: 'Identidad',
  inventory: 'Inventario',
  // 00058. Solo aparece en Auditoría (`update_settings`): no tiene permisos
  // propios, se configura con `company.configure`.
  notifications: 'Notificaciones',
  payments: 'Pagos',
  platform: 'Plataforma',
  reports: 'Reportes',
  sales: 'Ventas',
}

export function businessModuleLabel(module: string): string {
  return BUSINESS_MODULE_LABELS[module] ?? module
}
