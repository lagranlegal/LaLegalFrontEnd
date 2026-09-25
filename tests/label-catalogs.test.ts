import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_TYPE_LABELS } from '@/features/audit/labels'
import { BUSINESS_MODULE_LABELS } from '@/lib/businessModules'
import { CONCEPT_LABELS } from '@/lib/modules'

/**
 * Los mapas de etiquetas, fijados contra lo que el backend escribe de verdad.
 *
 * POR QUÉ EXISTE. Es la tercera vez que el proyecto paga lo mismo: un catálogo
 * del backend crece, nadie agrega la etiqueta acá, y la pantalla que un dueño
 * de compraventa colombiano abre todos los días muestra el código en inglés.
 *
 *  - 08/09/2026: `AUDIT_ACTION_LABELS` estaba poblado "con los valores vistos
 *    el 18/08" y **doce acciones salían en crudo** (`auction_contract`…).
 *  - 00042: una devolución salía como `sale_return` en el acta de cierre —
 *    un documento que se imprime, se firma y se archiva (QA F9-03).
 *  - 00054 (QA F21-08): `accounts` y `capital` nunca llegaron a
 *    `BUSINESS_MODULE_LABELS`, y `contribution`/`withdrawal` tampoco a las
 *    acciones. Un aporte del dueño se leía `contribution · capital`.
 *
 * Es el molde de `backend-starter/tests/unit/test_audit_actions.py`, del otro
 * lado del contrato: leer lo que el código hace de verdad y compararlo con lo
 * que decimos que hace. Con una diferencia obligada — el front se despliega
 * desde su propio repo y en CI **no existe** `../backend-starter`. Por eso el
 * catálogo va congelado acá (y eso es lo que corre siempre), y cuando el
 * backend SÍ está al lado se verifica que el congelado siga siendo el suyo.
 *
 * Si un test de acá falla: la etiqueta que falta se agrega, no se borra el
 * valor del catálogo. Lo que el backend escribe no es opinable.
 */

/** `insert_audit_log(action=…)`. Ver `_auditoriaDelBackend` para cómo salen. */
const ACCIONES_AUDITADAS = [
  'account_transfer',
  'activate_document_template',
  'apply_payment_discount',
  'apply_sale_discount',
  'auction_contract',
  'close_session',
  'contribution',
  'create_account',
  'create_category',
  'create_company',
  'create_contract',
  'create_customer',
  'create_document_template',
  'create_entry',
  'create_exit',
  'create_expense',
  'create_expense_category',
  'create_payment',
  'create_return',
  'create_role',
  'create_sale',
  'create_supplier',
  'create_transformation',
  'deactivate_document_template',
  'deactivate_user',
  'delete_document_template',
  'email_opt_out',
  'expire_subscription',
  'extend_loan',
  'extend_subscription',
  'generate_recovery_link',
  'import_contract',
  'invite_user',
  'open_session',
  'pay_entry',
  'publish_item',
  'reactivate_user',
  'rename_role',
  'reopen_session',
  'set_company_status',
  'settle_account',
  'update_account',
  'update_category',
  'update_contract',
  'update_customer',
  'update_document_template',
  'update_product',
  'update_role_permissions',
  'update_settings',
  'update_supplier',
  'update_user_role',
  'void_sale',
  'withdrawal',
]

/** `insert_audit_log(entity_type=…)`. */
const ENTIDADES_AUDITADAS = [
  'account',
  'account_transfer',
  'app_user',
  'capital_movement',
  'cash_session',
  'category',
  'company',
  'contract',
  'contract_payment',
  'customer',
  'document_template',
  'expense',
  'expense_category',
  'inventory_entry',
  'inventory_exit',
  'inventory_item',
  'inventory_transformation',
  'product',
  'role',
  'sale',
  'sale_return',
  'subscription',
  'supplier',
]

/**
 * `AuditLogOut.module` ∪ `PermissionOut.module` — la misma taxonomía, y las
 * dos pantallas (Auditoría y la matriz de permisos) leen el mismo mapa.
 * `payments`, `reports` y `audit` solo existen como permiso; `platform` solo
 * como módulo auditado.
 */
const MODULOS_DE_NEGOCIO = [
  'accounts',
  'audit',
  'capital',
  'cashbox',
  'catalogs',
  'company',
  'contracts',
  'customers',
  'identity',
  'inventory',
  'notifications',
  'payments',
  'platform',
  'reports',
  'sales',
]

/** El enum `cash_concept` de Postgres, que es lo que imprime el acta de cierre. */
const CONCEPTOS_DE_CAJA = [
  'adjustment',
  'capital_payment',
  'expense',
  'interest_payment',
  'loan_disbursed',
  'other',
  'owner_contribution',
  'owner_withdrawal',
  'purchase',
  'sale',
  'sale_return',
  'settlement_in',
  'settlement_out',
  'transfer_in',
  'transfer_out',
]

function sinEtiqueta(valores: string[], mapa: Record<string, string>): string[] {
  return valores.filter((v) => !(v in mapa)).sort()
}

describe('todo valor del backend tiene etiqueta en español', () => {
  it('acciones de auditoría', () => {
    expect(sinEtiqueta(ACCIONES_AUDITADAS, AUDIT_ACTION_LABELS)).toEqual([])
  })

  it('tipos de entidad de auditoría', () => {
    // No es solo la columna "Entidad": el filtro de `AuditPage` se arma con
    // las claves de este mapa, así que sin etiqueta el valor tampoco se puede
    // filtrar.
    expect(sinEtiqueta(ENTIDADES_AUDITADAS, AUDIT_ENTITY_TYPE_LABELS)).toEqual([])
  })

  it('módulos de negocio (auditoría + matriz de permisos)', () => {
    expect(sinEtiqueta(MODULOS_DE_NEGOCIO, BUSINESS_MODULE_LABELS)).toEqual([])
  })

  it('conceptos de caja (desglose y acta de cierre)', () => {
    expect(sinEtiqueta(CONCEPTOS_DE_CAJA, CONCEPT_LABELS)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Con el backend al lado (desarrollo local), el catálogo congelado se verifica
// contra el código de verdad. En CI del front `../backend-starter` no existe y
// esta parte no corre — el bloque de arriba sí, siempre.
// ---------------------------------------------------------------------------

const BACKEND = resolve(__dirname, '../../backend-starter')
const hayBackend = existsSync(join(BACKEND, 'app', 'modules'))

function archivosPy(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosPy(join(dir, e.name)) : e.name.endsWith('.py') ? [join(dir, e.name)] : [],
  )
}

/** Los `action=`, `module=` y `entity_type=` de cada llamada a `insert_audit_log`. */
function auditoriaDelBackend() {
  const acciones = new Set<string>()
  const modulos = new Set<string>()
  const entidades = new Set<string>()
  const dinamicas = new Set<string>()

  for (const archivo of archivosPy(join(BACKEND, 'app', 'modules'))) {
    const texto = readFileSync(archivo, 'utf8')
    if (!texto.includes('insert_audit_log(')) continue
    const lineas = texto.split('\n')
    for (let i = 0; i < lineas.length; i++) {
      if (!lineas[i].includes('insert_audit_log(')) continue
      // El bloque va hasta el paréntesis que cierra en la MISMA sangría de la
      // línea que abre: leer "las próximas N líneas" se comería el statement
      // siguiente (y ahí viven otros `module=`, los del movimiento de caja).
      const sangria = lineas[i].length - lineas[i].trimStart().length
      const cierre = ' '.repeat(sangria) + ')'
      let j = i + 1
      while (j < lineas.length && lineas[j] !== cierre) j++
      const bloque = lineas.slice(i, j + 1).join('\n')
      for (const m of bloque.matchAll(/action="([a-z_]+)"/g)) acciones.add(m[1])
      for (const m of bloque.matchAll(/action="[a-z_]+" if \w+ else "([a-z_]+)"/g)) acciones.add(m[1])
      // `action=direction` (capital): el valor NO es un literal, así que
      // ningún regex lo saca — y por eso vivió sin etiqueta. Se registra el
      // nombre de la variable para que el test de abajo lo cante si aparece
      // una nueva.
      for (const m of bloque.matchAll(/action=([a-z_]+)(?!["\w])/g)) dinamicas.add(m[1])
      for (const m of bloque.matchAll(/module="([a-z_]+)"/g)) modulos.add(m[1])
      for (const m of bloque.matchAll(/entity_type="([a-z_]+)"/g)) entidades.add(m[1])
    }
  }
  return { acciones, modulos, entidades, dinamicas }
}

/** Los módulos del catálogo de permisos, sembrado en SQL (`(code, module, action, …)`). */
function modulosDePermisos(): Set<string> {
  const dir = join(BACKEND, 'supabase', 'migrations')
  const archivos = [...readdirSync(dir).map((f) => join(dir, f)), join(BACKEND, 'supabase', 'seed.sql')]
  const modulos = new Set<string>()
  for (const archivo of archivos) {
    if (!archivo.endsWith('.sql') || !existsSync(archivo)) continue
    const texto = readFileSync(archivo, 'utf8')
    for (const m of texto.matchAll(/\(\s*'[a-z_]+\.[a-z_]+'\s*,\s*'([a-z_]+)'\s*,\s*'[a-z_]+'/g)) modulos.add(m[1])
  }
  return modulos
}

/** El enum `cash_concept`: su `create type` más cada `alter type … add value`. */
function conceptosDeCaja(): Set<string> {
  const dir = join(BACKEND, 'supabase', 'migrations')
  const conceptos = new Set<string>()
  for (const nombre of readdirSync(dir)) {
    if (!nombre.endsWith('.sql')) continue
    const texto = readFileSync(join(dir, nombre), 'utf8')
    const creacion = texto.match(/create type cash_concept as enum \(([^)]*)\)/)
    if (creacion) for (const m of creacion[1].matchAll(/'([a-z_]+)'/g)) conceptos.add(m[1])
    for (const m of texto.matchAll(/alter type cash_concept add value[^;]*?'([a-z_]+)'/g)) conceptos.add(m[1])
  }
  return conceptos
}

describe.runIf(hayBackend)('el catálogo congelado sigue siendo el del backend', () => {
  it('las acciones auditadas no cambiaron en silencio', () => {
    const { acciones } = auditoriaDelBackend()
    // `correct_contract_status` lo escribe un script de reparación
    // (`scripts/qa/reparar_f21_10.sql`), no un servicio: no aparece en el
    // código Python y por eso no se compara.
    const congeladas = new Set(ACCIONES_AUDITADAS)
    const nuevas = [...acciones].filter((a) => !congeladas.has(a)).sort()
    expect(nuevas, 'acciones nuevas en el backend: agrégalas acá Y a AUDIT_ACTION_LABELS').toEqual([])
  })

  it('no apareció otra acción dinámica sin revisar', () => {
    // `action=direction` de `capital/service.py` es el ÚNICO caso en que la
    // acción no es un literal, y fue justo el que se escapó de los dos
    // catálogos (el de este repo y el del backend, cuyo regex tampoco la ve).
    // Una variable nueva acá significa acciones que nadie está mirando.
    expect([...auditoriaDelBackend().dinamicas].sort()).toEqual(['direction'])
  })

  it('los tipos de entidad no cambiaron en silencio', () => {
    const congeladas = new Set(ENTIDADES_AUDITADAS)
    const nuevas = [...auditoriaDelBackend().entidades].filter((e) => !congeladas.has(e)).sort()
    expect(nuevas).toEqual([])
  })

  it('los módulos de negocio no cambiaron en silencio', () => {
    const congelados = new Set(MODULOS_DE_NEGOCIO)
    const delBackend = new Set([...auditoriaDelBackend().modulos, ...modulosDePermisos()])
    const nuevos = [...delBackend].filter((m) => !congelados.has(m)).sort()
    expect(nuevos).toEqual([])
  })

  it('los conceptos de caja no cambiaron en silencio', () => {
    const congelados = new Set(CONCEPTOS_DE_CAJA)
    const nuevos = [...conceptosDeCaja()].filter((c) => !congelados.has(c)).sort()
    expect(nuevos).toEqual([])
  })
})
