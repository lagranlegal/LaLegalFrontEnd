import type { Account } from '@/lib/accounts/list'

/**
 * Las cuentas que sirven para un aporte o un retiro del dueño.
 *
 * Las mismas que acepta el backend (`capital/service.py::_registrar`):
 *  · una cuenta POR COBRAR (`settlement`) no: es plata que un convenio
 *    todavía te debe, no un saldo del que se pueda meter o sacar dinero
 *    (`ACCOUNT_CANNOT_FUND_PAYMENT`);
 *  · una CAJA FUERTE (`vault`) tampoco, en ninguna dirección: no es un punto
 *    de cobro, a ella solo se entra y se sale por traslado
 *    (`ACCOUNT_NOT_OPERATIONAL`). Se ofrecía y el backend la rechazaba al
 *    final (G-02).
 */
export function capitalEligibleAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.active && a.type !== 'settlement' && a.type !== 'vault')
}
