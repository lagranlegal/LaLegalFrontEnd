import { describe, expect, it, vi } from 'vitest'
import { parseApiError, userMessage } from '@/lib/api/errors'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'

/**
 * Códigos nuevos del backend (auditoría 27/09/2026, commits e030188..5bef3ce).
 * Mismo criterio que `error-codes-contract.test.ts`: se mira el CÓDIGO, no el
 * status, y los sobres son REALES — copiados de las respuestas del backend
 * local (TestClient) en los tests que se citan junto a cada uno, no escritos
 * de memoria. Solo se recortó la lista de `missing_permissions`.
 */

/** `test_identity.py::test_editar_un_rol_no_agrega_permisos_que_el_actor_no_tiene`. */
const ROL_EXCEDE_UNO = {
  status: 403,
  body: {
    code: 'ROLE_EXCEEDS_ACTOR_PERMISSIONS',
    message: 'No puedes darle a un rol un permiso que tú no tienes.',
    details: { missing_permissions: ['cashbox.reopen'] },
  },
}

/** `test_identity.py::test_solo_se_asigna_un_rol_contenido_en_los_permisos_del_actor` (lista recortada a 8). */
const ROL_EXCEDE_MUCHOS = {
  status: 403,
  body: {
    code: 'ROLE_EXCEEDS_ACTOR_PERMISSIONS',
    message: 'No puedes asignar un rol que tiene permisos que tú no tienes.',
    details: {
      missing_permissions: ['accounts.manage', 'accounts.settle', 'accounts.transfer', 'accounts.view', 'audit.view', 'capital.contribute', 'capital.view', 'capital.withdraw'],
    },
  },
}

/** `test_identity.py::test_nadie_cambia_su_propio_rol`. */
const PROPIO_ROL = {
  status: 403,
  body: { code: 'CANNOT_CHANGE_OWN_ROLE', message: 'No puedes cambiar tu propio rol. Pídeselo a otra persona que gestione usuarios.', details: {} },
}

/** `test_contracts.py::test_con_ltv_en_la_categoria_el_avaluo_es_obligatorio_sin_override`. */
const AVALUO_OBLIGATORIO = {
  status: 422,
  body: {
    code: 'CONTRACT_APPRAISAL_REQUIRED',
    message:
      'La categoría de la prenda tiene un préstamo máximo sobre el avalúo (70.00 %): registra el avalúo para poder calcular el cupo, o pide a un responsable con el permiso para autorizarlo que lo registre.',
    details: { max_ltv_pct: '70.00', permission: 'contracts.override_ltv' },
  },
}

/** `test_contracts.py::test_saldar_dentro_del_primer_mes_cobra_un_mes`. */
const MINIMO_UN_MES = {
  status: 422,
  body: {
    code: 'PAYMENT_MINIMUM_INTEREST_REQUIRED',
    message: 'Saldar el contrato causa como mínimo un mes de interés.',
    details: { months_required: 1, payoff_interest: '50000.00', payoff_total: '1050000.00' },
  },
}

/** `inventory/service.py::pay_entry` (ConflictError con code; el test de carrera llama al servicio, no al endpoint). */
const COMPRA_YA_PAGADA = { status: 409, body: { code: 'PURCHASE_ALREADY_PAID', message: 'Esta compra ya fue pagada.', details: {} } }

/** `test_validacion_entrada.py::test_nombre_de_rol_repetido_es_409`. */
const ROL_REPETIDO = {
  status: 409,
  body: { code: 'ROLE_NAME_TAKEN', message: 'Ya existe un rol con ese nombre.', details: { constraint: 'role_company_id_name_key' } },
}

/** `test_validacion_entrada.py::test_nombre_de_cuenta_repetido_es_409`. */
const CUENTA_REPETIDA = {
  status: 409,
  body: { code: 'ACCOUNT_NAME_TAKEN', message: 'Ya existe una cuenta con ese nombre.', details: { constraint: 'account_company_id_name_key' } },
}

/** `app/core/errors.py::_UNIQUE_CODES` — misma forma que los dos de arriba. */
const CATEGORIA_GASTO_REPETIDA = {
  status: 409,
  body: {
    code: 'EXPENSE_CATEGORY_NAME_TAKEN',
    message: 'Ya existe una categoría de gasto con ese nombre.',
    details: { constraint: 'expense_category_company_id_name_key' },
  },
}
const CATEGORIA_REPETIDA = {
  status: 409,
  body: {
    code: 'CATEGORY_NAME_TAKEN',
    message: 'Ya existe una categoría con ese nombre en ese nivel.',
    details: { constraint: 'category_company_id_parent_id_name_key' },
  },
}

/** `test_validacion_entrada.py::test_el_handler_traduce_check_not_null_unique_y_fuera_de_rango`: 422 que viene de la BASE. */
const BASE_NOT_NULL = {
  status: 422,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos.',
    details: { errors: [{ loc: ['body', 'nombre'], msg: 'Este campo no puede quedar vacío.', type: 'not_null', ctx: { column: 'nombre' } }] },
  },
}
const BASE_CHECK = {
  status: 422,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos.',
    details: { errors: [{ loc: ['body'], msg: 'Un valor está fuera de lo permitido.', type: 'check', ctx: { constraint: 't_chk_monto_check' } }] },
  },
}
const BASE_DATA = {
  status: 422,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos.',
    details: { errors: [{ loc: ['body'], msg: 'Un valor no cabe en el formato permitido.', type: 'data', ctx: { sqlstate: '22003' } }] },
  },
}

/** `test_validacion_entrada.py::test_montos_que_mueven_plata_exigen_positivo_con_centavos[10.555]` (gasto). */
const MONTO_TRES_DECIMALES = {
  status: 422,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos.',
    details: {
      errors: [
        { type: 'decimal_max_places', loc: ['body', 'amount'], msg: 'Decimal input should have no more than 2 decimal places', input: '10.555', ctx: { decimal_places: 2 } },
      ],
    },
  },
}

/** `test_validacion_entrada.py::test_null_explicito_en_un_campo_obligatorio_es_422` (cliente). */
const NULL_EXPLICITO = {
  status: 422,
  body: {
    code: 'VALIDATION_ERROR',
    message: 'Los datos enviados no son válidos.',
    details: {
      errors: [
        { type: 'value_error', loc: ['body', 'full_name'], msg: 'Value error, No puede ser null. Para no cambiarlo, omite el campo.', input: null, ctx: { error: {} } },
      ],
    },
  },
}

describe('los códigos nuevos se tipan en vez de caer a UNKNOWN', () => {
  it.each([
    ROL_EXCEDE_UNO,
    PROPIO_ROL,
    AVALUO_OBLIGATORIO,
    MINIMO_UN_MES,
    COMPRA_YA_PAGADA,
    ROL_REPETIDO,
    CUENTA_REPETIDA,
    CATEGORIA_GASTO_REPETIDA,
    CATEGORIA_REPETIDA,
  ])('$body.code', ({ status, body }) => {
    expect(parseApiError(status, body).code).toBe(body.code)
  })
})

describe('ROLE_EXCEEDS_ACTOR_PERMISSIONS dice CUÁLES permisos faltan', () => {
  it('con uno, lo nombra', () => {
    const msg = userMessage(parseApiError(ROL_EXCEDE_UNO.status, ROL_EXCEDE_UNO.body))
    expect(msg).toContain('No puedes darle a un rol un permiso que tú no tienes.')
    expect(msg).toContain('cashbox.reopen')
  })

  it('con muchos, nombra los primeros y cuenta el resto — no un párrafo de cuarenta códigos', () => {
    const msg = userMessage(parseApiError(ROL_EXCEDE_MUCHOS.status, ROL_EXCEDE_MUCHOS.body))
    expect(msg).toContain('accounts.manage')
    expect(msg).toContain('y 3 más')
    expect(msg).not.toContain('capital.withdraw')
  })

  it('el banner de un formulario (invitar) también lo dice', () => {
    const banner = applyServerErrors(parseApiError(ROL_EXCEDE_UNO.status, ROL_EXCEDE_UNO.body), () => {}, { fields: [] })
    expect(banner).toContain('cashbox.reopen')
  })
})

describe('PAYMENT_MINIMUM_INTEREST_REQUIRED dice cuánto cuesta saldar', () => {
  it('muestra el total real con el interés mínimo, en pesos', () => {
    const msg = userMessage(parseApiError(MINIMO_UN_MES.status, MINIMO_UN_MES.body))
    expect(msg).toContain('como mínimo un mes de interés')
    expect(msg).toMatch(/1\.050\.000/)
    expect(msg).toMatch(/50\.000/)
  })
})

describe('un nombre repetido se señala en el campo «nombre»', () => {
  it.each([ROL_REPETIDO, CUENTA_REPETIDA, CATEGORIA_GASTO_REPETIDA, CATEGORIA_REPETIDA])('$body.code → name', ({ status, body }) => {
    const setError = vi.fn()
    const banner = applyServerErrors(parseApiError(status, body), setError, { fields: ['name', 'code_letter'], conflictField: 'code_letter' })
    expect(banner).toBeNull()
    // En el campo del NOMBRE, no en el `conflictField` del formulario (en
    // categorías es la letra de código: marcarla ahí mandaría a cambiar la
    // letra cuando lo repetido es el nombre).
    expect(setError).toHaveBeenCalledWith('name', { message: body.message })
  })

  it('si el formulario no pinta «name», el mensaje del backend va al banner', () => {
    const banner = applyServerErrors(parseApiError(CUENTA_REPETIDA.status, CUENTA_REPETIDA.body), () => {}, { fields: [] })
    expect(banner).toBe('Ya existe una cuenta con ese nombre.')
  })
})

describe('VALIDATION_ERROR que viene de la base tiene la misma forma y se lee en español', () => {
  it.each([
    [BASE_NOT_NULL, 'Este campo no puede quedar vacío.'],
    [BASE_CHECK, 'Un valor está fuera de lo permitido.'],
    [BASE_DATA, 'Un valor no cabe en el formato permitido.'],
  ])('%#', (fixture, esperado) => {
    const banner = applyServerErrors(parseApiError(fixture.status, fixture.body), () => {}, { fields: [] })
    expect(banner).toContain(esperado)
  })

  it('not_null sobre un campo que el formulario pinta se marca en el campo', () => {
    const setError = vi.fn()
    expect(applyServerErrors(parseApiError(BASE_NOT_NULL.status, BASE_NOT_NULL.body), setError, { fields: ['nombre'] })).toBeNull()
    expect(setError).toHaveBeenCalledWith('nombre', { message: 'Este campo no puede quedar vacío.' })
  })

  it('más de dos decimales en un monto se explica en español', () => {
    const setError = vi.fn()
    applyServerErrors(parseApiError(MONTO_TRES_DECIMALES.status, MONTO_TRES_DECIMALES.body), setError, { fields: ['amount'] })
    expect(setError).toHaveBeenCalledWith('amount', { message: 'Máximo 2 decimales.' })
  })

  it('el null explícito de un PATCH no arrastra el «Value error,» de Pydantic', () => {
    const setError = vi.fn()
    applyServerErrors(parseApiError(NULL_EXPLICITO.status, NULL_EXPLICITO.body), setError, { fields: ['full_name'] })
    expect(setError).toHaveBeenCalledWith('full_name', { message: 'No puede ser null. Para no cambiarlo, omite el campo.' })
  })
})
