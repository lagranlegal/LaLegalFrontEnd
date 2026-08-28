import type { JSONContent } from '@tiptap/core'

function field(key: string): JSONContent {
  return { type: 'mergeField', attrs: { key } }
}

function text(value: string): JSONContent {
  return { type: 'text', text: value }
}

/**
 * Punto de partida para la primera plantilla de Contrato — replica el
 * `ContractPrintView.tsx` de siempre (contenido, no lógica: se arma a mano
 * una vez, no se deriva de nada). El botón "Empezar desde la plantilla
 * actual" la precarga en el editor; de ahí en adelante el usuario edita
 * libremente.
 */
export const STARTING_CONTRACT_TEMPLATE: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [text('Contrato de empeño '), field('contrato.numero')] },
    { type: 'paragraph', content: [text('Cliente: '), field('cliente.nombre'), text(' — '), field('cliente.documento')] },
    { type: 'paragraph', content: [text('Dirección: '), field('cliente.direccion'), text('   Teléfono: '), field('cliente.telefono')] },
    { type: 'paragraph', content: [text('Fecha: '), field('contrato.fecha_inicio'), text('   Vencimiento: '), field('contrato.vencimiento')] },
    {
      type: 'paragraph',
      content: [
        text('Capital prestado: '),
        field('contrato.capital'),
        text('   Tasa de interés mensual: '),
        field('contrato.tasa'),
        text('   Plazo: '),
        field('contrato.plazo'),
        text('   Ventana de mora: '),
        field('contrato.ventana_mora'),
      ],
    },
    { type: 'itemsTableBlock' },
    { type: 'paragraph', content: [text('Notas: '), field('contrato.notas')] },
    {
      type: 'paragraph',
      content: [
        text(
          'El cliente entrega en prenda los artículos descritos arriba como garantía del préstamo recibido, y se compromete a pagar los intereses mensuales y a recuperar la prenda dentro del plazo pactado.',
        ),
      ],
    },
    { type: 'signatureBlock', attrs: { variant: 'cliente' } },
    { type: 'signatureBlock', attrs: { variant: 'empresa' } },
  ],
}

/** Igual criterio para Paz y salvo — documento nuevo, no tenía JSX previo que replicar. */
export const STARTING_SETTLEMENT_TEMPLATE: JSONContent = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [text('Paz y salvo — Contrato '), field('contrato.numero')] },
    {
      type: 'paragraph',
      content: [
        text('La empresa '),
        field('empresa.razon_social'),
        text(' hace constar que el cliente '),
        field('cliente.nombre'),
        text(' ('),
        field('cliente.documento'),
        text(') canceló en su totalidad el contrato de empeño '),
        field('contrato.numero'),
        text(', suscrito el '),
        field('contrato.fecha_inicio'),
        text(' por un capital de '),
        field('contrato.capital'),
        text('.'),
      ],
    },
    { type: 'paragraph', content: [text('Cancelado el: '), field('paz_y_salvo.fecha_cancelacion'), text('   Recibo No. '), field('paz_y_salvo.numero_recibo')] },
    { type: 'paragraph', content: [text('Se expide el presente paz y salvo el '), field('fecha_hoy'), text(' para los fines que el cliente estime convenientes.')] },
    { type: 'signatureBlock', attrs: { variant: 'empresa' } },
  ],
}

export const STARTING_TEMPLATES = {
  contract: STARTING_CONTRACT_TEMPLATE,
  settlement: STARTING_SETTLEMENT_TEMPLATE,
} as const
