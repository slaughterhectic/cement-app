import type { LucideIcon } from 'lucide-react';

export type KPIColor = 'purchase' | 'sale' | 'outstanding' | 'profit';

const accentByColor: Record<KPIColor, string> = {
  purchase: 'bg-purchase/15 text-purchase',
  sale: 'bg-sale/15 text-sale',
  outstanding: 'bg-outstanding/15 text-outstanding',
  profit: 'bg-profit/15 text-profit',
};

export interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  color: KPIColor;
}

export function KPICard({ title, value, subtitle, icon: Icon, color }: KPICardProps) {
  return (
    <div className="card flex flex-col gap-4">
      <p className="text-sm font-medium text-heading/60">{title}</p>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tracking-tight text-heading sm:text-3xl">{value}</p>
          <p className="mt-1 text-sm text-heading/50">{subtitle}</p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${accentByColor[color]}`}
        >
          <Icon className="h-6 w-6" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
