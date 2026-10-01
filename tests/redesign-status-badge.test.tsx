import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { CONTRACT_STATUS_URGENCY, StatusBadge, statusLabel } from '@/components/shared/StatusBadge'
import { UserStatusBadge } from '@/features/identity/components/UserStatusBadge'

/**
 * Rediseño P1, §3 «Estados de contrato: tono, ícono y palabra». Ningún estado
 * depende solo del color: cada pastilla lleva un ícono Lucide y la palabra. La
 * mora pasa a rojo, la prórroga a ámbar, y «Listo para remate» es el único
 * estado relleno.
 */

afterEach(cleanup)

// [estado, palabra, clases de tono, ícono Lucide] en el orden de urgencia de la propuesta.
const TABLA: [string, string, string[], string][] = [
  ['ready_for_auction', 'Listo para remate', ['bg-danger-solid', 'text-on-danger-solid'], 'flag'],
  ['in_arrears', 'En mora', ['bg-danger-soft', 'text-danger'], 'triangle-alert'],
  ['in_extension', 'Prórroga', ['bg-warning-soft', 'text-warning'], 'hourglass'],
  ['active', 'Vigente', ['bg-success-soft', 'text-success'], 'circle-check'],
  ['paid', 'Pagado', ['bg-info-soft', 'text-info'], 'check'],
  ['auctioned', 'Rematado', ['bg-neutral-soft', 'text-body'], 'archive'],
]

describe('StatusBadge del rediseño P1', () => {
  it('el orden de urgencia es el de la propuesta', () => {
    expect([...CONTRACT_STATUS_URGENCY]).toEqual(TABLA.map(([s]) => s))
  })

  it.each(TABLA)('%s: «%s», su tono y su ícono', (status, palabra, tono, icono) => {
    const { container } = render(<StatusBadge status={status} />)
    const badge = screen.getByText(palabra)
    expect(badge).toHaveClass('rounded-pill', 'h-6', 'font-semibold', ...tono)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('class')).toContain(`lucide-${icono}`)
    expect(svg!.getAttribute('aria-hidden')).toBe('true')
  })

  it('solo «Listo para remate» va relleno', () => {
    for (const [status] of TABLA.slice(1)) {
      const { unmount } = render(<StatusBadge status={status} />)
      expect(document.querySelector('[data-tone]')!.getAttribute('data-tone')).not.toBe('danger-solid')
      unmount()
    }
  })

  it('todo estado conocido lleva ícono, y uno desconocido cae a neutro con su valor', () => {
    const { container } = render(<StatusBadge status="algo_nuevo" />)
    expect(screen.getByText('algo_nuevo')).toHaveAttribute('data-tone', 'neutral')
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('un reintento de correo es ámbar, no rojo: rojo solo lo que se perdió', () => {
    render(
      <>
        <StatusBadge status="failed" />
        <StatusBadge status="dead" />
      </>,
    )
    expect(screen.getByText('Falló, se reintenta')).toHaveAttribute('data-tone', 'warning')
    expect(screen.getByText('No se pudo enviar')).toHaveAttribute('data-tone', 'danger')
  })

  it('F9-42: un cliente activo dice «Activo», no «Vigente»', () => {
    render(<StatusBadge kind="customer" status="active" />)
    expect(screen.getByText('Activo')).toHaveClass('bg-success-soft')
    expect(screen.queryByText('Vigente')).toBeNull()
    expect(statusLabel('active', 'customer')).toBe('Activo')
    expect(statusLabel('active')).toBe('Vigente')
    expect(statusLabel('alert', 'customer')).toBe('En alerta')
  })

  it('un usuario inactivo va neutro con ícono, no en rojo', () => {
    const { container } = render(<UserStatusBadge status="inactive" />)
    expect(screen.getByText('Inactivo')).toHaveClass('bg-neutral-soft')
    expect(container.querySelector('svg')).not.toBeNull()
  })
})
