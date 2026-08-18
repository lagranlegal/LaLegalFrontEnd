/**
 * `AuditLogOut.action`/`entity_type` — igual que `CONCEPT_LABELS`
 * (lib/modules.ts, paso 6): el backend no expone un enum para esto
 * (`string` pelado en el schema), así que el mapa es parcial, poblado solo
 * con los valores vistos en el audit log real de dev (18/08/2026) — uno no
 * mapeado se muestra tal cual en vez de romper o inventar una traducción.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create_company: 'Creó la empresa',
  create_contract: 'Creó un contrato',
  import_contract: 'Importó un contrato',
  open_session: 'Abrió la caja',
  close_session: 'Cerró la caja',
  reopen_session: 'Reabrió la caja',
  create_expense: 'Registró un gasto',
  create_exit: 'Registró un egreso',
  create_role: 'Creó un rol',
  rename_role: 'Renombró un rol',
  update_role_permissions: 'Cambió los permisos de un rol',
  invite_user: 'Invitó a un usuario',
  update_user_role: 'Cambió el rol de un usuario',
  deactivate_user: 'Desactivó un usuario',
  reactivate_user: 'Reactivó un usuario',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export const AUDIT_ENTITY_TYPE_LABELS: Record<string, string> = {
  app_user: 'Usuario',
  cash_session: 'Sesión de caja',
  company: 'Empresa',
  contract: 'Contrato',
  expense: 'Gasto',
  inventory_exit: 'Egreso de inventario',
  role: 'Rol',
}

export function auditEntityTypeLabel(entityType: string): string {
  return AUDIT_ENTITY_TYPE_LABELS[entityType] ?? entityType
}
