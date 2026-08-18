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
 */
export const BUSINESS_MODULE_LABELS: Record<string, string> = {
  audit: 'Auditoría',
  cashbox: 'Caja',
  catalogs: 'Catálogos',
  company: 'Empresa',
  contracts: 'Contratos',
  customers: 'Clientes',
  identity: 'Identidad',
  inventory: 'Inventario',
  payments: 'Pagos',
  platform: 'Plataforma',
  reports: 'Reportes',
  sales: 'Ventas',
}

export function businessModuleLabel(module: string): string {
  return BUSINESS_MODULE_LABELS[module] ?? module
}
