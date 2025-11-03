import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  if (Number.isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return (value / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString();
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: value < 1 ? 8 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}