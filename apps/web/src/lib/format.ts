import i18n from '@/i18n';
import { formatMoney as formatMoneyBase, type Money } from '@ptg/types';

export function formatMoney(money: Money): string {
  return formatMoneyBase(money, i18n.language);
}

export function formatDate(iso: string, options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat(i18n.language, options).format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return formatDate(iso, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language).format(value);
}
