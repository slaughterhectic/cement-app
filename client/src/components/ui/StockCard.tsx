import { formatDate, formatINR } from '../../lib/format';

export type StockType = 'OPC' | 'PPC' | 'DAMAGE';

export interface StockCardProps {
  name: string;
  type: StockType;
  stock: number;
  value: number;
  lastPurchase: string;
}

function borderClass(stock: number): string {
  if (stock > 500) return 'border-emerald-500';
  if (stock >= 100) return 'border-amber-500';
  return 'border-red-500';
}

function typeBadgeClass(type: StockType): string {
  if (type === 'DAMAGE') return 'bg-outstanding/10 text-outstanding';
  if (type === 'PPC') return 'bg-brand-500/10 text-brand-600';
  return 'bg-purchase/10 text-purchase';
}

export function StockCard({ name, type, stock, value, lastPurchase }: StockCardProps) {
  return (
    <div
      className={`rounded-xl border-2 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${borderClass(
        stock
      )}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-heading">{name}</h3>
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${typeBadgeClass(
            type
          )}`}
        >
          {type}
        </span>
      </div>
      <p className="mt-4 text-3xl font-bold tabular-nums text-heading">{stock}</p>
      <p className="text-sm text-heading/50">bags in stock</p>
      <div className="mt-4 flex flex-col gap-1 border-t border-card-border pt-4 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-heading/50">Value</span>
          <span className="font-medium text-heading">{formatINR(value)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-heading/50">Last purchase</span>
          <span className="font-medium text-heading">{formatDate(lastPurchase) || '—'}</span>
        </div>
      </div>
    </div>
  );
}

export default StockCard;
