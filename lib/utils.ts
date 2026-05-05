import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: Date | number | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', opts ?? { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateShort(d: Date | number | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
