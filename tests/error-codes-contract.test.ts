import { describe, expect, it } from 'vitest'
import { API_ERROR_CODES, parseApiError, userMessage } from '@/lib/api/errors'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { openSessionErrorMessage, reopenSessionErrorMessage } from '@/features/cashbox/api'
import { applyServerErrors } from '@/lib/forms/applyServerErrors'

/**
 * Un código de error es un contrato entre dos capas y **nadie lo compila**:
 * el backend escribe un string, el front escucha otro, y nada falla hasta que
 * alguien en un mostrador se queda mirando "ocurrió un error inesperado". Ya
 * costó once días de operación (`CASH_SESSION_NOT_OPEN` vs `NOT_FOUND`), y
 * F20-01 era exactamente el mismo bug esperando turno.
 *
 * Por eso estos tests miran el **código**, no el status: un test que afirma
 * "responde 409" no cubre nada de lo que aquí se puede romper.
 *
 * LOS SOBRES SON REALES. Cada uno está copiado literal de la línea del
 * backend que lo emite (`_error_response(status, code, message, details)` en
 * `app/core/errors.py`), no escrito de memoria — un fixture inventado
 * confirma el bug en vez de encontrarlo. La cita va junto a cada uno.
 */

/** `app/modules/cashbox/service.py::open_session` (ConflictError → 409). */
const YA_CERRADA_HOY = {
  status: 409,
  body: {
    code: 'CASH_SESSION_ALREADY_CLOSED_TODAY',
    message: 'La caja de hoy ya se cerró; no se puede abrir otra el mismo día.',
    details: {},
  },
}

/** `app/modules/cashbox/service.py::open_session` (ConflictError → 409). */
const YA_ABIERTA = {
  status: 409,
  body: { code: 'CASH_SESSION_ALREADY_OPEN', message: 'Ya hay una sesión de caja abierta.', details: {} },
}

/**
 * `app/modules/cashbox/service.py::reopen_session`, rama `status != 'closed'`
 * (ConflictError → 409). Copiado de la respuesta REAL del test
 * `test_reabrir_una_sesion_que_ya_esta_abierta_tiene_codigo_propio` del
 * backend (25/09/2026), no de memoria; solo el `session_id` es otro.
 */
const REABRIR_YA_ABIERTA = {
  status: 409,
  body: {
    code: 'CASH_SESSION_NOT_CLOSED',
    message: 'Esta sesión de caja ya está abierta: no hay nada que reabrir. Registra lo que falte directamente en el turno abierto.',
    details: { session_id: 'fc6c083a-17d0-4d8d-ae39-46eb2f38a3e2', status: 'open' },
  },
}

/** `app/modules/cashbox/service.py::reopen_session`, rama «hay OTRA abierta». */
const REABRIR_CON_OTRA_ABIERTA = {
  status: 409,
  body: {
    code: 'CASH_SESSION_ALREADY_OPEN',
    message: 'Ya hay otra sesión abierta para esta caja; ciérrala antes de reabrir esta.',
    details: {},
  },
}

/** `app/core/errors.py::handle_integrity_error`, rama `idempotency_key`. */
const IDEMPOTENCIA_EN_VUELO = {
  status: 409,
  body: {
    code: 'IDEMPOTENCY_IN_PROGRESS',
    message: 'Esta misma operación ya se está registrando. No la repitas: consulta el resultado en unos segundos.',
    details: {},
  },
}

/** `app/modules/cashbox/service.py::_resolve_active_register`. */
const VARIAS_CAJAS = {
  status: 409,
  body: {
    code: 'MULTIPLE_REGISTERS_NOT_SUPPORTED',
    message:
      'La empresa tiene más de una caja registradora activa y todavía no se puede operar con varias. Deja una sola activa.',
    details: { active_registers: 2 },
  },
}

/** `app/modules/sales/service.py::void_sale` (CashSessionNotOpenError → 409). */
const ANULAR_SIN_CAJA = {
  status: 409,
  body: {
    code: 'CASH_SESSION_NOT_OPEN',
    message: 'No hay una sesión de caja abierta para anular la venta.',
    details: {},
  },
}

/**
 * `app/modules/sales/service.py::void_sale`, guarda de F21-36 (ConflictError →
 * 409). Copiado de la respuesta del backend local a la venta del hallazgo
 * ($800.000 = $500.000 de nota + $300.000 en efectivo).
 */
const ANULAR_PAGADA_CON_NOTA = {
  status: 409,
  body: {
    code: 'SALE_PAID_WITH_CREDIT_NOTE',
    message:
      'Esta venta se pagó (toda o en parte) con la nota crédito Nº 1 y por eso no se puede anular: anularla le devolvería en plata lo que se pagó con la nota, que nunca entró a la caja. Para revertirla, registra una devolución liquidada en nota crédito.',
    details: { credit_note_id: '8c4896cf-a809-4332-8fc2-6394feca3a60', credit_note_number: 1, redeemed_amount: '500000.00' },
  },
}

/** `app/modules/identity/auth_admin.py::invite_user`, rama `status_code == 429`. */
const CUOTA_DE_CORREOS = {
  status: 429,
  body: {
    code: 'INVITE_RATE_LIMITED',
    message: 'Supabase limitó el envío de correos. Espera unos minutos e invita de nuevo.',
    details: { body: '{"code":429,"error_code":"over_email_send_rate_limit","msg":"email rate limit exceeded"}' },
  },
}

describe('el catálogo de códigos coincide con lo que el backend emite', () => {
  it('F20-01: `CASH_SESSION_ALREADY_CLOSED_TODAY` se tipa en vez de caer a UNKNOWN', () => {
    const error = parseApiError(YA_CERRADA_HOY.status, YA_CERRADA_HOY.body)
    expect(error.code).toBe('CASH_SESSION_ALREADY_CLOSED_TODAY')
    expect(error.code).not.toBe('UNKNOWN')
  })

  it('F20-01: `ALREADY_CLOSED_TODAY` ya no está — es un nombre que el backend nunca emitió', () => {
    // El catálogo no es una lista de deseos: cada entrada tiene que existir
    // del otro lado. Una que no existe es peor que faltar, porque se ve como
    // cobertura.
    expect(API_ERROR_CODES).not.toContain('ALREADY_CLOSED_TODAY')
  })

  it('F20-02: `IDEMPOTENCY_IN_PROGRESS` (doble clic en Vender) se tipa y conserva el texto de mostrador', () => {
    const error = parseApiError(IDEMPOTENCIA_EN_VUELO.status, IDEMPOTENCIA_EN_VUELO.body)
    expect(error.code).toBe('IDEMPOTENCY_IN_PROGRESS')
    expect(userMessage(error)).toContain('No la repitas')
  })

  it('F20-03: `MULTIPLE_REGISTERS_NOT_SUPPORTED` se tipa y su `details` sobrevive', () => {
    const error = parseApiError(VARIAS_CAJAS.status, VARIAS_CAJAS.body)
    expect(error.code).toBe('MULTIPLE_REGISTERS_NOT_SUPPORTED')
    expect(error.details?.active_registers).toBe(2)
  })

  it('un código que de verdad no conocemos sigue cayendo a UNKNOWN con su mensaje', () => {
    const error = parseApiError(409, { code: 'ALGO_QUE_NO_EXISTE', message: 'texto del backend' })
    expect(error.code).toBe('UNKNOWN')
    expect(error.message).toBe('texto del backend')
  })
})

describe('F21-36: anular una venta pagada con nota crédito dice por qué y qué hacer', () => {
  it('`SALE_PAID_WITH_CREDIT_NOTE` se tipa en vez de caer a UNKNOWN, y su `details` sobrevive', () => {
    const error = parseApiError(ANULAR_PAGADA_CON_NOTA.status, ANULAR_PAGADA_CON_NOTA.body)
    expect(error.code).toBe('SALE_PAID_WITH_CREDIT_NOTE')
    expect(error.details?.credit_note_number).toBe(1)
    expect(error.details?.redeemed_amount).toBe('500000.00')
  })

  it('el cajero ve el mensaje del backend TAL CUAL: nombra la nota y la salida', () => {
    const msg = userMessage(parseApiError(ANULAR_PAGADA_CON_NOTA.status, ANULAR_PAGADA_CON_NOTA.body))
    expect(msg).toBe(ANULAR_PAGADA_CON_NOTA.body.message)
    expect(msg).toContain('Nº 1')
    expect(msg).toContain('devolución liquidada en nota crédito')
  })
})

describe('F21-03: abrir caja no reintenta lo imposible', () => {
  it('«ya hay una abierta» conserva el texto del backend y dice que puede seguir operando', () => {
    const msg = openSessionErrorMessage(parseApiError(YA_ABIERTA.status, YA_ABIERTA.body))
    expect(msg).toContain('Ya hay una sesión de caja abierta.')
    expect(msg).toContain('sigue')
    expect(msg).not.toContain('Intenta de nuevo')
  })

  it('«la de hoy ya se cerró» nombra dónde está la acción que queda (reabrir) y a quién pedírsela', () => {
    const msg = openSessionErrorMessage(parseApiError(YA_CERRADA_HOY.status, YA_CERRADA_HOY.body))
    expect(msg).toContain('La caja de hoy ya se cerró')
    expect(msg).toContain('Reabrir caja')
    expect(msg).toContain('responsable')
    expect(msg).not.toContain('Intenta de nuevo')
  })

  it('lo que no es de negocio sí puede reintentarse', () => {
    expect(openSessionErrorMessage(new Error('sin conexión'))).toBe('No se pudo abrir la caja. Intenta de nuevo.')
  })
})

describe('F21-34: reabrir una caja que ya está abierta dice qué pasó', () => {
  it('`CASH_SESSION_NOT_CLOSED` se tipa en vez de caer a UNKNOWN, y trae la sesión', () => {
    const error = parseApiError(REABRIR_YA_ABIERTA.status, REABRIR_YA_ABIERTA.body)
    expect(error.code).toBe('CASH_SESSION_NOT_CLOSED')
    expect(error.details?.status).toBe('open')
  })

  it('muestra el texto del backend, no «intenta de nuevo»: reintentar no cambia nada', () => {
    const msg = reopenSessionErrorMessage(parseApiError(REABRIR_YA_ABIERTA.status, REABRIR_YA_ABIERTA.body))
    expect(msg).toContain('Esta sesión de caja ya está abierta')
    expect(msg).toContain('turno abierto')
    expect(msg).not.toContain('Intenta de nuevo')
  })

  it('«hay OTRA abierta» es otro caso y también conserva el texto del backend', () => {
    const msg = reopenSessionErrorMessage(parseApiError(REABRIR_CON_OTRA_ABIERTA.status, REABRIR_CON_OTRA_ABIERTA.body))
    expect(msg).toContain('ciérrala antes de reabrir esta')
    expect(msg).not.toContain('Intenta de nuevo')
  })

  it('lo que no es de negocio sí puede reintentarse', () => {
    expect(reopenSessionErrorMessage(new Error('sin conexión'))).toBe('No se pudo reabrir la caja. Intenta de nuevo.')
  })

  it('la pantalla de Caja usa esa función en vez de su texto fijo', () => {
    // Lee el código de verdad, como `cash-session-dialog.test.ts`: la función
    // puede estar perfecta y la pantalla seguir tapándola con un texto fijo,
    // que es exactamente como estaba (`CashboxPage.tsx`, «No se pudo reabrir
    // la caja. Intenta de nuevo.» para todo).
    const page = readFileSync(resolve(__dirname, '../src/features/cashbox/pages/CashboxPage.tsx'), 'utf8')
    expect(page).toContain('toast.error(reopenSessionErrorMessage(')
    expect(page).not.toContain("toast.error('No se pudo reabrir la caja")
  })
})

describe('F21-06: el nombre del proveedor no sale a pantalla', () => {
  it('`INVITE_RATE_LIMITED` no menciona Supabase y nombra la salida que existe en el mismo diálogo', () => {
    const error = parseApiError(CUOTA_DE_CORREOS.status, CUOTA_DE_CORREOS.body)
    const msg = userMessage(error)
    expect(msg).not.toMatch(/supabase/i)
    expect(msg).toContain('Generar enlace')
    expect(msg).toMatch(/minutos/)
  })

  it('el banner del formulario de invitación tampoco lo filtra', () => {
    // `InviteUserDialog` pinta lo que devuelve `applyServerErrors`.
    const banner = applyServerErrors(parseApiError(CUOTA_DE_CORREOS.status, CUOTA_DE_CORREOS.body), () => {})
    expect(banner).not.toMatch(/supabase/i)
    expect(banner).toContain('Generar enlace')
  })

  it('los demás códigos siguen mostrando el mensaje del backend TAL CUAL', () => {
    // La regla del proyecto no cambia: el texto lo escribe quien conoce la
    // regla de negocio. `FRONT_MESSAGES` es la excepción, no una capa de
    // traducción paralela.
    const sinCaja = parseApiError(ANULAR_SIN_CAJA.status, ANULAR_SIN_CAJA.body)
    expect(userMessage(sinCaja)).toBe('No hay una sesión de caja abierta para anular la venta.')
    const variasCajas = parseApiError(VARIAS_CAJAS.status, VARIAS_CAJAS.body)
    expect(applyServerErrors(variasCajas, () => {})).toBe(VARIAS_CAJAS.body.message)
  })
})

/**
 * `app/modules/notifications/router.py::_rate_limit` (RateLimitedError → 429).
 * Copiado de la respuesta REAL del backend (TestClient, 61 pedidos desde la
 * misma IP, 25/09/2026), no de memoria. Además viene la cabecera
 * `Retry-After: 60`, que el front no necesita leer.
 */
const BAJA_LIMITADA = {
  status: 429,
  body: {
    code: 'RATE_LIMITED',
    message: 'Demasiados intentos seguidos. Espere un momento y vuelva a intentarlo.',
    details: { retry_after_seconds: 60 },
  },
}

describe('límite de tasa del enlace de baja (NOTIFICACIONES §17-bis)', () => {
  it('`RATE_LIMITED` se tipa en vez de caer a UNKNOWN, con su espera', () => {
    const error = parseApiError(BAJA_LIMITADA.status, BAJA_LIMITADA.body)
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.details?.retry_after_seconds).toBe(60)
  })

  it('la página de baja muestra el texto del backend, de usted como los correos', () => {
    expect(userMessage(parseApiError(BAJA_LIMITADA.status, BAJA_LIMITADA.body))).toBe(BAJA_LIMITADA.body.message)
  })
})
