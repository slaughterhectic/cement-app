import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CreditCard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';

function useCountUp(target: number, durationMs = 1600) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.floor(t * target));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function AnimatedStat({
  value,
  before = '',
  after,
}: {
  value: number;
  before?: string;
  after: string;
}) {
  const n = useCountUp(value);
  return (
    <div className="text-center">
      <p className="text-xl font-bold tabular-nums text-heading md:text-2xl">
        {before}
        {n}
        {after}
      </p>
    </div>
  );
}

const features = [
  {
    icon: ShoppingCart,
    title: 'Purchase Tracking',
    description: 'Record bags, rates, and freight for every inward load.',
  },
  {
    icon: TrendingUp,
    title: 'Sales Management',
    description: 'Issue sales with pricing, parties, and delivery in one place.',
  },
  {
    icon: Users,
    title: 'Party Ledgers',
    description: 'Running balances and credit limits for dealers and sites.',
  },
  {
    icon: Package,
    title: 'Stock Control',
    description: 'Brand-wise godown stock with low-stock visibility.',
  },
  {
    icon: CreditCard,
    title: 'Payment Collection',
    description: 'Track receipts, dues, and ageing without spreadsheets.',
  },
  {
    icon: BarChart3,
    title: 'Reports & P&L',
    description: 'Margins, outstanding, and period summaries at a glance.',
  },
] as const;

const howSteps = [
  { n: 1, icon: ShoppingCart, title: 'Record Purchases' },
  { n: 2, icon: TrendingUp, title: 'Manage Sales' },
  { n: 3, icon: CreditCard, title: 'Track Collections' },
] as const;

export default function Landing() {
  return (
    <div className="min-h-screen bg-card text-heading">
      <header className="border-b border-card-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
          <span className="text-xl font-bold text-heading">
            <span className="text-brand-500">arm</span>tech
          </span>
          <Link to="/login" className="btn-primary">
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-heading md:text-6xl">
              <span className="text-brand-500">arm</span>tech
            </h1>
            <p className="mt-1 text-sm font-medium uppercase tracking-widest text-heading/50">
              Innovation and Excellence
            </p>
            <p className="mt-4 text-lg text-heading/70">
              Complete business management for cement traders.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <AnimatedStat value={50} before="₹" after="+ Crore Tracked" />
              <AnimatedStat value={100} after="+ Parties Managed" />
              <AnimatedStat value={500} after="+ Trucks Dispatched" />
            </div>
            <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link to="/login" className="btn-primary min-w-[160px] justify-center px-6 py-3">
                Get started
              </Link>
              <Link to="/login" className="btn-secondary min-w-[160px] justify-center px-6 py-3">
                View demo
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-card-border bg-card py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-center text-2xl font-bold text-heading md:text-3xl">
              Everything you need
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-center text-heading/70">
              Built around how cement yards and distributors actually work.
            </p>
            <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl border border-card-border bg-card p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500">
                    <Icon className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-semibold text-heading">{title}</h3>
                  <p className="mt-2 text-sm text-heading/60">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-card-border py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <h2 className="text-center text-2xl font-bold text-heading md:text-3xl">
              How it works
            </h2>
            <div className="mx-auto mt-12 flex max-w-4xl flex-col items-center md:flex-row md:items-start md:justify-center">
              {howSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <Fragment key={step.n}>
                    <div className="flex w-full max-w-[220px] flex-col items-center px-2 text-center">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
                        {step.n}
                      </div>
                      <Icon className="mt-4 h-8 w-8 text-brand-500" aria-hidden />
                      <p className="mt-3 font-semibold text-heading">{step.title}</p>
                    </div>
                    {i < howSteps.length - 1 && (
                      <>
                        <div
                          className="my-4 h-10 w-0 shrink-0 border-l-2 border-dashed border-gray-300 md:hidden"
                          aria-hidden
                        />
                        <div
                          className="mx-2 mt-6 hidden h-0 min-w-[2rem] flex-1 border-t-2 border-dashed border-gray-300 md:block"
                          aria-hidden
                        />
                      </>
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-heading py-8 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 text-center md:grid-cols-3 md:items-center md:px-6 md:text-left">
          <span className="font-semibold"><span className="text-brand-400">arm</span>tech</span>
          <span className="text-sm text-white/80 md:text-center">Built for cement traders of UP</span>
          <span className="text-sm text-white/80 md:text-right">© 2026</span>
        </div>
      </footer>
    </div>
  );
}
