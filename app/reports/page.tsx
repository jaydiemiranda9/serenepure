'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-client';

type DaySummary = {
  day: string;
  sale_count: number;
  gross_sales: number;
  cash_total: number;
  gcash_total: number;
  walkin_sales: number;
  delivery_sales: number;
  deposits_collected: number;
  deposits_refunded: number;
};

function peso(n: number) {
  return '₱' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function ReportsPage() {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState<DaySummary[]>([]);
  const [expenses, setExpenses] = useState<{ category: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [month]);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const start = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const nextMonth = new Date(y, m, 1).toISOString().slice(0, 10);

    const { data: summary } = await supabase
      .from('v_daily_summary')
      .select('*')
      .gte('day', start)
      .lt('day', nextMonth)
      .order('day', { ascending: false });

    const { data: exp } = await supabase
      .from('expenses')
      .select('category, amount')
      .gte('expense_date', start)
      .lt('expense_date', nextMonth);

    setDays(summary || []);
    setExpenses(exp || []);
    setLoading(false);
  }

  const monthGross = days.reduce((s, d) => s + Number(d.gross_sales), 0);
  const monthCash = days.reduce((s, d) => s + Number(d.cash_total), 0);
  const monthGcash = days.reduce((s, d) => s + Number(d.gcash_total), 0);
  const monthExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const monthNet = monthGross - monthExpenses;
  const totalSales = days.reduce((s, d) => s + Number(d.sale_count), 0);
  const avgSale = totalSales > 0 ? monthGross / totalSales : 0;

  async function exportCSV() {
    const supabase = createClient();
    const [y, m] = month.split('-').map(Number);
    // Manila = UTC+8. Compute month bounds as UTC equivalents of Manila midnight
    const phOffsetMs = 8 * 60 * 60 * 1000;
    const startUTC = new Date(Date.UTC(y, m - 1, 1) - phOffsetMs).toISOString();
    const endUTC = new Date(Date.UTC(y, m, 1) - phOffsetMs).toISOString();

    const { data: sales } = await supabase
      .from('sales')
      .select('*, customers(name), sale_items(gallon_type, quantity, unit_price, line_total)')
      .gte('created_at', startUTC)
      .lt('created_at', endUTC)
      .order('created_at', { ascending: true });

    if (!sales || sales.length === 0) {
      toast.show('Nothing to export for this month', 'error');
      return;
    }

    const headers = ['Date', 'Time', 'Customer', 'Channel', 'Payment', 'Gallons', 'Subtotal', 'Deposit+', 'Refund-', 'Total', 'Notes'];
    const rows = sales.map((s: any) => {
      const d = new Date(s.created_at);
      const items = (s.sale_items || []).map((it: any) => `${it.quantity}×${it.gallon_type}@${it.unit_price}`).join(' | ');
      return [
        d.toISOString().slice(0, 10),
        d.toTimeString().slice(0, 5),
        s.customers?.name || 'Walk-in',
        s.channel,
        s.payment_method,
        csv(items),
        Number(s.subtotal).toFixed(2),
        Number(s.deposit_amount).toFixed(2),
        Number(s.deposit_refund).toFixed(2),
        Number(s.total).toFixed(2),
        csv(s.notes || ''),
      ].join(',');
    });

    const csvText = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `serenepure-sales-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.show('CSV downloaded');
  }

  function csv(s: string) {
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="fade-up flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">Monthly Performance</div>
            <h1 className="font-display italic font-extrabold text-4xl tracking-tight mt-1">Reports</h1>
          </div>
          <div className="flex gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm"
            />
            <button
              onClick={exportCSV}
              className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water transition-colors"
            >
              ↓ CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted text-center py-12">Loading…</div>
        ) : (
          <>
            <div className="fade-up grid grid-cols-2 md:grid-cols-4 border-2 border-ink bg-paper-dark" style={{ animationDelay: '0.05s' }}>
              <Stat label="Gross Revenue" value={peso(monthGross)} />
              <Stat label="Expenses" value={peso(monthExpenses)} border />
              <Stat label="Net" value={peso(monthNet)} border tone={monthNet >= 0 ? 'positive' : 'negative'} />
              <Stat label="Avg Sale" value={peso(avgSale)} sub={`${totalSales} sales`} border />
            </div>

            <div className="fade-up grid grid-cols-2 gap-3" style={{ animationDelay: '0.1s' }}>
              <div className="border-2 border-ink p-4">
                <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted">Cash</div>
                <div className="font-display font-bold text-2xl tabular-nums mt-1">{peso(monthCash)}</div>
              </div>
              <div className="border-2 border-ink p-4">
                <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted">GCash</div>
                <div className="font-display font-bold text-2xl tabular-nums mt-1">{peso(monthGcash)}</div>
              </div>
            </div>

            <div className="fade-up" style={{ animationDelay: '0.15s' }}>
              <div className="border-b-2 border-ink pb-2 mb-0">
                <h2 className="font-display italic font-extrabold text-2xl">Daily breakdown</h2>
              </div>
              {days.length === 0 ? (
                <div className="font-mono text-xs text-muted italic text-center py-8">No sales this month</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs">
                    <thead>
                      <tr className="border-b border-ink">
                        <th className="text-left py-2 pr-3 tracking-widest uppercase text-[9px] text-muted">Date</th>
                        <th className="text-right py-2 px-3 tracking-widest uppercase text-[9px] text-muted">Sales</th>
                        <th className="text-right py-2 px-3 tracking-widest uppercase text-[9px] text-muted">Gross</th>
                        <th className="text-right py-2 px-3 tracking-widest uppercase text-[9px] text-muted">Cash</th>
                        <th className="text-right py-2 px-3 tracking-widest uppercase text-[9px] text-muted">GCash</th>
                        <th className="text-right py-2 pl-3 tracking-widest uppercase text-[9px] text-muted">Walk/Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((d) => (
                        <tr key={d.day} className="border-b border-dashed border-ink/20">
                          <td className="py-2 pr-3">{new Date(d.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{d.sale_count}</td>
                          <td className="py-2 px-3 text-right tabular-nums font-bold">{peso(Number(d.gross_sales))}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{peso(Number(d.cash_total))}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{peso(Number(d.gcash_total))}</td>
                          <td className="py-2 pl-3 text-right tabular-nums text-[10px]">
                            {peso(Number(d.walkin_sales))}<br/>
                            <span className="text-muted">{peso(Number(d.delivery_sales))}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub, border, tone }: { label: string; value: string; sub?: string; border?: boolean; tone?: 'positive' | 'negative' }) {
  const color = tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-danger' : '';
  return (
    <div className={`p-4 ${border ? 'md:border-l-2 md:border-ink' : ''}`}>
      <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mb-2">{label}</div>
      <div className={`font-display font-semibold text-xl md:text-2xl tabular-nums leading-none ${color}`}>{value}</div>
      {sub && <div className="font-mono text-[10px] text-muted mt-2">{sub}</div>}
    </div>
  );
}
