import { Check, Milk, ShieldAlert, Truck, Wallet } from 'lucide-react';

// A picture of the Home screen with made-up numbers. Nothing here is live data, and it says so.
export function PhoneMock() {
  return (
    <div className="relative mx-auto w-[272px] sm:w-[300px]">
      {/* soft halo */}
      <div aria-hidden className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-sage-200/70 via-transparent to-gold-200/60 blur-2xl" />

      {/* Floating notes sit beside the phone on wide screens only, so nothing overflows on small ones. */}
      <div aria-hidden className="absolute -left-[150px] top-24 z-10 hidden animate-float items-center gap-2 whitespace-nowrap rounded-2xl border border-ivory-border bg-white px-3 py-2 shadow-lift xl:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage/10 text-sage"><Check className="h-4 w-4" /></span>
        <span className="text-sm font-semibold text-charcoal">Co-op matched</span>
      </div>
      <div aria-hidden className="absolute -right-[150px] bottom-28 z-10 hidden animate-float items-center gap-2 whitespace-nowrap rounded-2xl border border-ivory-border bg-white px-3 py-2 shadow-lift [animation-delay:-3s] xl:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold/15 text-gold-600"><ShieldAlert className="h-4 w-4" /></span>
        <span className="text-sm font-semibold text-charcoal">Withdrawal alert</span>
      </div>

      {/* device */}
      <div className="relative rounded-[2.6rem] bg-charcoal p-2.5 shadow-lift ring-1 ring-black/10">
        <div className="overflow-hidden rounded-[2.1rem] bg-ivory">
          <div className="mx-auto mt-2 h-1.5 w-20 rounded-full bg-charcoal/15" />
          <div className="space-y-3 px-4 pb-5 pt-3">
            <div>
              <p className="text-xs font-medium text-charcoal-muted">Green Hills Dairy • Nakuru</p>
              <p className="font-display text-xl font-medium text-charcoal">Hello, Amina</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col items-center gap-1 rounded-2xl bg-sage px-2 py-3 text-white shadow-soft">
                <Milk className="h-5 w-5" />
                <span className="text-sm font-semibold">Record milk</span>
              </div>
              <div className="flex flex-col items-center gap-1 rounded-2xl border border-ivory-border bg-white px-2 py-3 text-charcoal">
                <Truck className="h-5 w-5 text-sage" />
                <span className="text-sm font-semibold">Log delivery</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-ivory-border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Today</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-charcoal">64.5<span className="text-sm font-medium text-charcoal-muted"> L</span></p>
                <p className="text-xs font-medium text-sage">AM + PM recorded</p>
              </div>
              <div className="rounded-2xl border border-ivory-border bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">Owed</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-gold-600">KSh 46,990</p>
                <p className="text-xs font-medium text-charcoal-muted">3 buyers</p>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-bold text-rose-900"><ShieldAlert className="h-4 w-4 shrink-0" />Do not sell Amani&apos;s milk yet</p>
              <p className="mt-0.5 text-xs text-rose-800">Treatment withdrawal until 26 Oct</p>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-charcoal px-3 py-2.5 text-white">
              <span className="flex items-center gap-2 text-sm font-semibold"><Wallet className="h-4 w-4 text-gold" />Month so far</span>
              <span className="text-sm font-bold text-gold">KSh 38,500</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-charcoal-muted">Sample farm data, for illustration</p>
    </div>
  );
}
