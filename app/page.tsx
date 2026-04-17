'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-client';

type DayStats = {
  gross: number;
  cash: number;
  gcash: number;
  walkin: number;
  delivery: number;
  txCount: number;
  gallons: { round: number; slim: number; dispenser: number };
  expenses: number;
};

type RecentSale = {
  id: string;
  created_at: string;
  channel: string;
  payment_method: string;
  total: number;
  customer_name: string | null;
  gallons: string;
};

function peso(n: number) {
  return '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayPHRange() {
  // Asia/Manila is UTC+8, no DST
  const now = new Date();
  const phOffset = 8 * 60 * 60 * 1000;
  const phNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000) + phOffset);
  const startPH = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate(), 0, 0, 0);
  const endPH = new Date(phNow.getFullYear(), phNow.getMonth(), phNow.getDate(), 23, 59, 59);
  // Convert back to UTC for query
  const startUTC = new Date(startPH.getTime() - phOffset + (now.getTimezoneOffset() * 60 * 1000));
  const endUTC = new Date(endPH.getTime() - phOffset + (now.getTimezoneOffset() * 60 * 1000));
  return { start: startUTC.toISOString(), end: endUTC.toISOString(), label: phNow };
}

export default function HomePage() {
  const [stats, setStats] = useState<DayStats | null>(null);
  const [recent, setRecent] = useState<RecentSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateLabel, setDateLabel] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { start, end, label } = todayPHRange();
    setDateLabel(
      label.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    );

    // Sales today with items
    const { data: sales } = await supabase
      .from('sales')
      .select('id, created_at, channel, payment_method, total, subtotal, customer_id, customers(name), sale_items(gallon_type, quantity)')
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    // Expenses today (PH date)
    const phDate = label.toISOString().slice(0, 10);
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount')
      .eq('expense_date', phDate);

    const s: DayStats = {
      gross: 0, cash: 0, gcash: 0, walkin: 0, delivery: 0, txCount: 0,
      gallons: { round: 0, slim: 0, dispenser: 0 },
      expenses: (expenses || []).reduce((sum, e: any) => sum + Number(e.amount), 0),
    };
    const recentList: RecentSale[] = [];

    (sales || []).forEach((sale: any) => {
      s.gross += Number(sale.subtotal);
      if (sale.payment_method === 'cash') s.cash += Number(sale.total);
      else s.gcash += Number(sale.total);
      if (sale.channel === 'walk-in') s.walkin += Number(sale.subtotal);
      else s.delivery += Number(sale.subtotal);
      s.txCount++;

      const items = sale.sale_items || [];
      items.forEach((it: any) => {
        if (it.gallon_type === 'round') s.gallons.round += it.quantity;
        else if (it.gallon_type === 'slim') s.gallons.slim += it.quantity;
        else if (it.gallon_type === 'dispenser') s.gallons.dispenser += it.quantity;
      });

      const gallonSummary = items
        .map((it: any) => `${it.quantity}× ${it.gallon_type}`)
        .join(', ');

      recentList.push({
        id: sale.id,
        created_at: sale.created_at,
        channel: sale.channel,
        payment_method: sale.payment_method,
        total: Number(sale.total),
        customer_name: sale.customers?.name || null,
        gallons: gallonSummary,
      });
    });

    setStats(s);
    setRecent(recentList.slice(0, 8));
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Hero */}
        <div className="fade-up">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">
            {dateLabel}
          </div>
          <h1 className="font-display italic font-extrabold text-4xl md:text-5xl tracking-tight mt-1">
            Today at a glance.
          </h1>
        </div>

        {/* Big sale CTA — most-used action */}
        <Link
          href="/sales"
          className="fade-up block bg-gradient-to-br from-water to-ink text-paper border-2 border-ink p-6 md:p-8 hover:shadow-[4px_4px_0_#0a1628] transition-all group"
          style={{ animationDelay: '0.05s' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-water-mist">
                Tap to log
              </div>
              <div className="font-display italic font-extrabold text-3xl md:text-4xl mt-1">
                New Sale →
              </div>
            </div>
            <div className="text-5xl md:text-6xl opacity-20 group-hover:opacity-40 transition-opacity">
              ₱
            </div>
          </div>
        </Link>

        {/* Stats grid */}
        {loading ? (
          <div className="font-mono text-xs tracking-wider text-muted text-center py-12">
            Loading…
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink bg-paper-dark fade-up" style={{ animationDelay: '0.1s' }}>
              <Stat label="Gross Today" value={peso(stats.gross)} sub={`${stats.txCount} ${stats.txCount === 1 ? 'sale' : 'sales'}`} />
              <Stat label="Cash Collected" value={peso(stats.cash)} sub="includes deposits" border />
              <Stat label="GCash" value={peso(stats.gcash)} sub="includes deposits" border />
              <Stat label="Expenses" value={peso(stats.expenses)} sub="today" border />
            </div>

            {/* Gallon breakdown */}
            <div className="grid grid-cols-3 gap-3 fade-up" style={{ animationDelay: '0.15s' }}>
              <GallonCard type="Round" count={stats.gallons.round} color="bg-water" />
              <GallonCard type="Slim" count={stats.gallons.slim} color="bg-water-light" />
              <GallonCard type="Dispenser" count={stats.gallons.dispenser} color="bg-drop" />
            </div>

            {/* Channel split */}
            <div className="fade-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2 mb-4">
                <h2 className="font-display italic font-extrabold text-2xl">Channel split</h2>
                <span className="font-mono text-[10px] tracking-widest uppercase text-muted">Today</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ChannelRow label="Walk-in" value={stats.walkin} total={stats.gross} />
                <ChannelRow label="Delivery" value={stats.delivery} total={stats.gross} />
              </div>
            </div>

            {/* Recent sales */}
            <div className="fade-up" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2 mb-0">
                <h2 className="font-display italic font-extrabold text-2xl">Recent sales</h2>
                <Link href="/reports" className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-ink">
                  View all →
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs tracking-wider text-muted italic">
                  No sales yet today. Tap "New Sale" to log the first one.
                </div>
              ) : (
                <ul>
                  {recent.map((r) => {
                    const t = new Date(r.created_at);
                    const time = t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <li key={r.id} className="border-b border-dashed border-ink/20 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs text-muted">{time} · {r.channel}{r.customer_name ? ` · ${r.customer_name}` : ''}</div>
                          <div className="font-display text-base truncate">{r.gallons}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono text-[9px] tracking-widest uppercase text-muted">{r.payment_method}</div>
                          <div className="font-mono font-bold text-base tabular-nums">{peso(r.total)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub, border }: { label: string; value: string; sub: string; border?: boolean }) {
  return (
    <div className={`p-4 md:p-5 ${border ? 'border-l-2 border-ink' : ''}`}>
      <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mb-2">{label}</div>
      <div className="font-display font-semibold text-xl md:text-2xl tabular-nums leading-none">{value}</div>
      <div className="font-mono text-[10px] text-muted mt-2">{sub}</div>
    </div>
  );
}

function GallonCard({ type, count, color }: { type: string; count: number; color: string }) {
  return (
    <div className="border-2 border-ink bg-paper p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${color}`} />
      <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mt-1">{type}</div>
      <div className="font-display font-bold text-4xl tabular-nums mt-1 leading-none">{count}</div>
      <div className="font-mono text-[10px] text-muted mt-1">sold today</div>
    </div>
  );
}

function ChannelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="border-2 border-ink p-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-display font-semibold">{label}</span>
        <span className="font-mono text-xs tabular-nums">{pct}%</span>
      </div>
      <div className="font-mono text-lg font-bold tabular-nums">{peso(value)}</div>
      <div className="w-full h-1 bg-water-mist mt-2 relative overflow-hidden">
        <div className="h-full bg-water absolute left-0 top-0" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
