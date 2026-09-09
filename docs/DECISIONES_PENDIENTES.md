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

---

## 3. ¿Debe el sistema impedir un desembolso sin efectivo en el cajón?

**Estado: sin decidir (08/09/2026).** Reportado por la auditoría de QA de la Fase 3 (F3-01).

### Qué pasa hoy

Solo los **traslados** comprueban que haya efectivo disponible. El gasto en efectivo y el desembolso de un préstamo —las dos operaciones que más plata sacan del cajón— no lo comprueban. Reproducido con la caja abierta y 240.000 esperados:

```
préstamo de 1.000.000 × 2  → 201   (esperado: -1.760.000)
traslado de 10.000         → 400   "No se puede trasladar más de lo que hay en la cuenta de origen"
gasto en efectivo 10.000   → 201   (esperado: -2.270.000)
préstamo de 5.000.000      → 201   (esperado: -7.270.000)
```

**La misma app dice «no puedes mover 10.000 porque no hay» y a la vez «sí puedes prestar 5.000.000».**

### Por qué importa

`expected_cash` queda **negativo**, que es un imposible físico: el sistema espera que en el cajón haya menos siete millones. Y como el cierre no tiene tolerancia —*«todo descuadre exige justificación»*— el cajero termina justificando a mano un descuadre **que el propio sistema fabricó**. Es el mismo problema del punto 21 de `PENDIENTES_BACKEND_INFRA.md` (las compras que no generaban movimiento y obligaban a justificar un descuadre inventado), visto desde el otro lado.

### Por qué no es obvio que deba bloquearse

Hay un argumento real para **no** validar: durante el día entra efectivo por ventas y abonos, y si el registro no es cronológico —el asesor registra el préstamo de las 9am a las 11, después de una venta de las 10— validar estricto bloquearía una operación legítima. En un mostrador eso es peor que un arqueo raro.

Pero entonces el traslado tampoco debería validar. **La inconsistencia es el hallazgo, más que la decisión.**

### Las preguntas de negocio

1. **¿Puede la compraventa desembolsar más efectivo del que registra tener?** En la práctica sí ocurre: el dueño trae plata de su bolsillo o del banco sin registrarlo como traslado. Si eso es normal, bloquear sería estorbar.
2. **¿Qué debería pasar entonces con el arqueo?** Un esperado negativo no se puede contar. ¿Se asume que el cajero justifica, o el sistema debería empujar a registrar de dónde salió esa plata (un traslado de entrada)?
3. **¿Y quién decide?** Si se advierte en vez de bloquear, ¿la advertencia basta para un asesor, o el desembolso por encima del efectivo disponible debería pedir un permiso especial, como el descuento?

### Opciones

| | Qué implica | Consecuencia |
|---|---|---|
| **A. Advertir sin bloquear** *(recomendada)* | Mismo criterio que ya se tomó para el LTV: el backend devuelve una marca (`cash_warning`) y la UI avisa antes de confirmar. | Coherente con un precedente del propio proyecto; no estorba en el mostrador; el operador se entera **en el momento**, no al cerrar |
| **B. Validar en las tres operaciones** | El desembolso y el gasto se rechazan igual que el traslado. | El arqueo nunca queda en negativo, pero bloquea registros fuera de orden — que es el caso más común del mostrador |
| **C. No validar en ninguna** | Quitar la validación del traslado, y que el arqueo revele el descuadre. | La más simple y consistente, pero pierde una red que ya funciona |

**Recomendación de QA: A.** Es la única que resuelve la inconsistencia sin quitarle al operador la posibilidad de registrar lo que de verdad pasó. Sea cual sea la elegida, **las tres operaciones deberían comportarse igual**: hoy dos dicen una cosa y una dice la contraria.

---

## 4. El teal de la marca no cumple contraste en el botón primario

**Qué hay hoy.** Tras la corrección de tokens del 09/09 (F6-02), las 12 combinaciones que incumplían WCAG AA se redujeron a **3**, y las tres son la misma: **texto blanco sobre `--brand-500` relleno**, el botón primario de toda la app.

```
blanco sobre --brand-500  #00b19e   2.70   ✗   (mínimo 4.5)
blanco sobre --brand-600  #009c8b   3.19   ✗
blanco sobre --brand-700  #00806f   4.53   ✓
```

Para **texto** teal sobre fondo claro el problema ya está resuelto: `DESIGN_SYSTEM` §4.10 pedía usar `--brand-600`+ y los números confirman que `--brand-700` cumple. Lo que queda es el **relleno**: el color que la gente identifica como la marca.

**Qué falta.** Decidir si el botón primario pasa a un teal más oscuro.

| Opción | Qué implica | Consecuencia |
|---|---|---|
| **A. Dejarlo como está** | Se documenta como excepción consciente y el test de contraste la exceptúa por nombre. | La identidad visual no cambia; la app no cumple AA en su control más frecuente. Aceptable si nadie va a auditarla formalmente |
| **B. Oscurecer el relleno a `--brand-700`** | Un solo token; el resto de la paleta no se toca. | Cumple AA. El botón se ve **notablemente más oscuro** — es el color que el dueño reconoce como "el de la marca" |
| **C. Mantener el tono y subir el texto** | Texto en un teal muy oscuro o negro sobre el relleno claro, en vez de blanco. | Cumple sin cambiar el color de marca, pero rompe la convención de botón primario oscuro con texto claro |

**Esto no es una decisión de QA.** Cambiar el color que identifica a la marca es de producto. Lo que sí corresponde decir es el dato: es el control más usado de la aplicación, y hoy es lo único que separa a la app del cumplimiento AA completo.
