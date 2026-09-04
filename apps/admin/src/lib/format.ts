import { formatMoney as formatMoneyBase, type Money } from '@ptg/types';

export function formatMoney(money: Money): string {
  return formatMoneyBase(money, 'en');
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat('en', options).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return formatDate(iso, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
