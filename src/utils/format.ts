import { DateFilterPreset, UnitType } from '../types/pos';

export function formatPKR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}PKR ${Math.abs(safe).toLocaleString('en-PK')}`;
}

export function formatPKRCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}${Math.abs(safe).toLocaleString('en-PK')}`;
}

export function formatQty(qty: number, unitType: UnitType): string {
  if (unitType === 'meter') {
    const clean = Number(qty.toFixed(2));
    return `${clean} m`;
  }
  const clean = Math.round(qty);
  return `${clean} ${clean === 1 ? 'pc' : 'pcs'}`;
}

export function formatUnitLabel(unitType: UnitType): string {
  return unitType === 'meter' ? 'Per Meter' : 'Per Suit / Piece';
}

export function formatUnitShort(unitType: UnitType): string {
  return unitType === 'meter' ? '/m' : '/pc';
}

export function toLocalDateKey(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(): string {
  return toLocalDateKey(new Date());
}

export function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
}

export function matchesDatePreset(
  isoOrDateString: string,
  preset: DateFilterPreset,
  customDate: string
): boolean {
  if (preset === 'all') return true;
  const targetKey = isoOrDateString.length === 10 ? isoOrDateString : toLocalDateKey(isoOrDateString);
  const now = new Date();
  if (preset === 'today') {
    return targetKey === toLocalDateKey(now);
  }
  if (preset === 'yesterday') {
    return targetKey === getYesterdayDateKey();
  }
  if (preset === 'month') {
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return targetKey.startsWith(monthPrefix);
  }
  if (preset === 'custom') {
    return customDate ? targetKey === customDate : true;
  }
  return true;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function roundQty(val: number, unitType: UnitType): number {
  if (!Number.isFinite(val) || val < 0) return 0;
  return unitType === 'meter' ? Math.round(val * 100) / 100 : Math.round(val);
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
