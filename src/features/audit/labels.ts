/**
 * `AuditLogOut.action`/`entity_type` — el backend no expone un enum para
 * esto (`string` pelado en el schema), así que el mapa se mantiene a mano y
 * una acción no mapeada se muestra tal cual, sin romper ni inventar.
 *
 * SE COMPLETÓ EL 08/09/2026 contra la lista real de `action=` del backend.
 * Estaba poblado solo "con los valores vistos en el audit log de dev el
 * 18/08", así que **doce acciones que el backend sí escribe salían en crudo**
 * en pantalla: un dueño leía `auction_contract` o `generate_recovery_link` en
 * la columna donde esperaba una frase. Y al revés: `open_session` llevaba
 * meses acá con su etiqueta para una acción que el backend nunca escribía
 * (ahora sí la escribe).
 *
 * Al agregar un `insert_audit_log` nuevo en el backend, agregar su etiqueta
 * acá — si no, se ve el código.
 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // Caja
  open_session: 'Abrió la caja',
  close_session: 'Cerró la caja',
  reopen_session: 'Reabrió la caja',
  create_expense: 'Registró un gasto',
  // Contratos
  create_contract: 'Creó un contrato',
  import_contract: 'Registró un contrato existente',
  create_payment: 'Registró un abono',
  apply_payment_discount: 'Aplicó un descuento a un abono',
  auction_contract: 'Remató un contrato',
  // Ventas
  create_sale: 'Registró una venta',
  apply_sale_discount: 'Aplicó un descuento a una venta',
  void_sale: 'Anuló una venta',
  create_return: 'Registró una devolución',
  // Inventario
  create_entry: 'Registró un ingreso',
  create_exit: 'Registró un egreso',
  create_transformation: 'Registró una transformación',
  // Clientes
  create_customer: 'Registró un cliente',
  // Identidad
  invite_user: 'Invitó a un usuario',
  update_user_role: 'Cambió el rol de un usuario',
  deactivate_user: 'Desactivó un usuario',
  reactivate_user: 'Reactivó un usuario',
  generate_recovery_link: 'Generó un enlace de acceso',
  create_role: 'Creó un rol',
  rename_role: 'Renombró un rol',
  update_role_permissions: 'Cambió los permisos de un rol',
  // Empresa
  update_settings: 'Cambió la configuración',
  create_document_template: 'Creó una plantilla de documento',
  update_document_template: 'Editó una plantilla de documento',
  activate_document_template: 'Activó una plantilla de documento',
  delete_document_template: 'Eliminó una plantilla de documento',
  // Cuentas
  account_transfer: 'Trasladó dinero entre cuentas',
  settle_account: 'Liquidó una cuenta por cobrar',
  // Plataforma (super-admin)
  create_company: 'Creó la empresa',
  extend_subscription: 'Extendió la suscripción',
  set_company_status: 'Cambió el estado de la empresa',
  expire_subscription: 'Venció la suscripción',
}

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action
}

export const AUDIT_ENTITY_TYPE_LABELS: Record<string, string> = {
  app_user: 'Usuario',
  cash_session: 'Sesión de caja',
  company: 'Empresa',
  contract: 'Contrato',
  contract_payment: 'Abono',
  customer: 'Cliente',
  document_template: 'Plantilla de documento',
  expense: 'Gasto',
  inventory_entry: 'Ingreso de inventario',
  inventory_exit: 'Egreso de inventario',
  inventory_transformation: 'Transformación',
  role: 'Rol',
  sale: 'Venta',
  sale_return: 'Devolución',
  subscription: 'Suscripción',
  account: 'Cuenta',
  account_transfer: 'Traslado entre cuentas',
}

export function auditEntityTypeLabel(entityType: string): string {
  return AUDIT_ENTITY_TYPE_LABELS[entityType] ?? entityType
}
