'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-client';

const CATEGORIES = [
  'Electricity',
  'Filter / Membrane',
  'Salt / Resin',
  'Delivery Fuel',
  'Maintenance',
  'Supplies',
  'Rent',
  'Staff',
  'Other',
];

type Expense = {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  created_at: string;
};

function peso(n: number) {
  return '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function manilaDateToday() {
  // Asia/Manila is UTC+8, no DST
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export default function ExpensesPage() {
  const toast = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(manilaDateToday());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    setExpenses(data || []);
    setLoading(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.show('Enter a valid amount', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from('expenses').insert({
      category,
      amount: amt,
      description: description.trim() || null,
      expense_date: date,
    });
    setSaving(false);
    if (error) {
      toast.show(error.message, 'error');
      return;
    }
    toast.show(`Expense logged · ${peso(amt)}`);
    setAmount('');
    setDescription('');
    load();
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    const supabase = createClient();
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) toast.show(error.message, 'error');
    else { toast.show('Deleted'); load(); }
  }

  // Monthly total (Manila month)
  const thisMonth = manilaDateToday().slice(0, 7);
  const monthTotal = expenses
    .filter((e) => e.expense_date.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0);

  // By category this month
  const byCategory: Record<string, number> = {};
  expenses
    .filter((e) => e.expense_date.startsWith(thisMonth))
    .forEach((e) => {
      byCategory[e.category] = (byCategory[e.category] || 0) + Number(e.amount);
    });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="fade-up">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">Operating Costs</div>
          <h1 className="font-display italic font-extrabold text-4xl tracking-tight mt-1">Expenses</h1>
        </div>

        <div className="fade-up grid grid-cols-1 md:grid-cols-4 gap-3" style={{ animationDelay: '0.05s' }}>
          <div className="border-2 border-ink bg-paper-dark p-4 md:col-span-1">
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted">This Month</div>
            <div className="font-display font-extrabold text-3xl tabular-nums mt-1">{peso(monthTotal)}</div>
          </div>
          <div className="border-2 border-ink bg-paper p-4 md:col-span-3">
            <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mb-3">Top Categories</div>
            {topCategories.length === 0 ? (
              <div className="font-mono text-xs text-muted italic">Nothing logged this month</div>
            ) : (
              <div className="space-y-2">
                {topCategories.map(([cat, amt]) => {
                  const pct = monthTotal > 0 ? (amt / monthTotal) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span>{cat}</span>
                        <span className="tabular-nums">{peso(amt)}</span>
                      </div>
                      <div className="h-1 bg-water-mist">
                        <div className="h-full bg-water" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={save} className="fade-up border-2 border-ink bg-paper" style={{ animationDelay: '0.1s' }}>
          <div className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase">Log Expense</div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm md:col-span-1"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              required
              className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm tabular-nums md:col-span-1"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm md:col-span-1"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-2 border-ink bg-paper px-3 py-2 font-mono text-sm md:col-span-1"
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water disabled:opacity-50 md:col-span-1"
            >
              {saving ? '…' : 'Log →'}
            </button>
          </div>
        </form>

        <div className="fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="border-b-2 border-ink pb-2 mb-4">
            <h2 className="font-display italic font-extrabold text-2xl">Recent</h2>
          </div>
          {loading ? (
            <div className="font-mono text-xs text-muted text-center py-8">Loading…</div>
          ) : expenses.length === 0 ? (
            <div className="font-mono text-xs text-muted italic text-center py-8">No expenses yet</div>
          ) : (
            <ul>
              {expenses.map((e) => (
                <li key={e.id} className="border-b border-dashed border-ink/20 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] px-2 py-0.5 border border-ink uppercase tracking-wider">
                        {e.category}
                      </span>
                      <span className="font-mono text-[10px] text-muted">{e.expense_date}</span>
                    </div>
                    {e.description && <div className="font-display text-sm mt-1 truncate">{e.description}</div>}
                  </div>
                  <div className="font-mono font-bold text-lg tabular-nums text-danger">−{peso(Number(e.amount))}</div>
                  <button onClick={() => deleteExpense(e.id)} className="w-8 h-8 border border-ink/30 hover:bg-danger hover:text-paper hover:border-danger text-xs">✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
