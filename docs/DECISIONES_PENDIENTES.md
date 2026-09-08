# Decisiones de negocio pendientes

> Cosas que la auditoría de QA encontró **a medio camino**: el backend las soporta, están decididas en algún documento, o el permiso existe — pero no hay pantalla, y completarlas exige una definición de negocio que no es técnica. No son bugs: son preguntas para Mateo.
>
> Cada entrada dice qué hay hoy, qué falta, y las opciones con su consecuencia. Cuando una se decide, se implementa o se retira del catálogo — dejarla a medias es la peor de las tres.

---

## 1. Descuento sobre intereses en un abono

**Estado: sin decidir (08/09/2026).** Reportado por la auditoría de QA de la Fase 1 (H-04).

### Qué existe hoy

Todo, menos la pantalla:

| Pieza | Estado |
|---|---|
| `POST /contracts/{id}/payments` acepta `discount_amount` + `discount_reason` | ✅ implementado |
| Permiso propio `payments.apply_discount` (`is_special = true`) | ✅ en el catálogo, en el seed y en la matriz de roles |
| Auditoría de la acción (`apply_payment_discount`) | ✅ registra quién, cuánto y el motivo |
| Rol Admin lo tiene; Moderador y Asesor no | ✅ decidido en `platform/service.py` |
| Pantalla que lo use | ❌ **no existe** |

`PaymentOptionsPanel.tsx` —el único sitio desde el que se registra un abono— envía `months_covered`, `capital_amount`, `payment_method` y `account_id`. Nunca `discount_amount`. En todo `features/contracts/` la palabra `discount` aparece una sola vez, y es de lectura: `metrics.ts` suma los descuentos ya aplicados para mostrarlos.

O sea: **el módulo puede mostrar descuentos que ninguna pantalla puede crear.**

### Por qué importa

1. **Es una regla cerrada con el cliente, no una idea.** `backend-starter/docs/CONTEXTO.md` §3: *«Descuento sobre intereses: SOLO admin (permiso especial), motivo obligatorio, auditado»*. El backend la cumple entera.

2. **La migración de contratos depende de ella.** `docs/MIGRACION_CONTRATOS.md` §5 define qué hacer cuando un contrato del sistema viejo traía interés parcial ya pagado: el excedente *«se le reconoce en su primer abono en la app usando el descuento existente (`discount_amount` + `discount_reason = "saldo a favor migración"`)»*. Ese paso hoy no se puede dar por pantalla — habría que llamar la API a mano. Es una política operativa escrita contra una función que no está.

3. **Lo que no se puede registrar se hace por fuera.** Un asesor que negocia con un cliente («págame los tres meses y te perdono medio») no tiene dónde anotarlo. La rebaja ocurre igual, pero fuera del sistema: sin auditoría, sin cuadrar la caja y sin aparecer en la rentabilidad del empeño. Es exactamente lo que la auditoría existe para evitar.

### Las preguntas de negocio

Ninguna es técnica. Sin respuesta a la primera, las demás no aplican.

1. **¿La compraventa perdona intereses en la práctica?** Si nunca ocurre, esto no se construye: se retira `payments.apply_discount` del catálogo y se documenta por qué. Un permiso que no gatea nada ensucia la matriz de roles de toda empresa nueva.

2. **¿Quién puede?** Hoy el permiso solo lo trae el rol Admin de fábrica. ¿Debería poder un Moderador? ¿Un Asesor con autorización?

3. **¿Con techo o sin techo?** ¿Se puede perdonar cualquier monto, o hasta un % del interés del mes / un tope en pesos? El backend hoy no valida ningún límite: acepta el monto que se le mande.

4. **¿El motivo es libre o de una lista?** Libre deja escribir «acuerdo» y no explica nada tres meses después; una lista corta (*cliente frecuente · error de cálculo · acuerdo de pago · saldo a favor de migración*) hace el reporte legible y de paso cubre el caso de la migración.

5. **¿Y el descuento sobre el capital?** Hoy el descuento aplica solo a intereses, que es coherente con «el interés es ingreso, el capital recuperado no». Conviene confirmarlo explícitamente para que nadie lo «arregle» después.

### Opciones

| | Qué implica | Costo |
|---|---|---|
| **A. Construirlo** | Campo de descuento en el paso de confirmación del abono, gateado con `<Can permission="payments.apply_discount">`, motivo obligatorio, y el total del CTA recalculado. El backend no cambia. | Bajo — una pantalla, sin migración ni endpoint nuevo |
| **B. Retirarlo** | Quitar `payments.apply_discount` del seed, decidir qué hacer con los roles que ya lo tienen, y reescribir §5 de `MIGRACION_CONTRATOS.md` con otra política para el interés parcial migrado | Bajo, pero hay que resolver la migración de otra forma |
| **C. Dejarlo como está** | El permiso sigue en la matriz sin gatear nada; la política de migración sigue apuntando a una función inalcanzable | Cero hoy, y confusión cada vez que alguien configure un rol |

**Recomendación de QA: A o B, no C.** El costo de A es bajo y ya está decidido con el cliente; el de B es aceptable si en la práctica no se perdonan intereses. Lo que no conviene sostener es el estado actual, en el que el sistema promete una capacidad que no tiene.

---

## 2. `sales.return_override_time_limit` — mismo patrón, menor alcance

**Estado: sin decidir (08/09/2026).** Encontrado en el mismo cruce que el punto 1.

El otro permiso especial que ninguna pantalla menciona. Permite registrar una devolución **pasado** el plazo que la empresa configuró (`company.settings.return_window_days`, default 30 días). El backend lo implementa completo: sin el permiso responde `400 RETURN_TIME_LIMIT_EXCEEDED`; con él deja pasar la devolución y marca `time_limit_warning: true` en la respuesta.

Como la UI no consulta el permiso, hoy pasan dos cosas: quien **no** lo tiene se topa con el error solo después de llenar el formulario, en vez de saberlo antes; y quien **sí** lo tiene no recibe ninguna advertencia de que está saltándose la política — el `time_limit_warning` que el backend devuelve no se muestra en ninguna parte.

**Pregunta de negocio:** ¿el plazo de devolución es una política real de la compraventa o quedó en su valor por defecto sin pensarlo? De la respuesta depende si vale la pena mostrar el aviso o si conviene poner `return_window_days = 0` (sin límite) y olvidarse.

**Costo de construirlo:** muy bajo — un aviso en `ReturnFormDialog` cuando la venta ya pasó el plazo, con texto distinto según el permiso.
