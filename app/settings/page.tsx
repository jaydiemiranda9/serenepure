'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-client';

type Settings = {
  default_price_round: number;
  default_price_slim: number;
  default_price_dispenser: number;
  default_deposit: number;
  price_min_warn: number;
  price_max_warn: number;
};

export default function SettingsPage() {
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) setS(data);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('settings')
      .update({
        default_price_round: s.default_price_round,
        default_price_slim: s.default_price_slim,
        default_price_dispenser: s.default_price_dispenser,
        default_deposit: s.default_deposit,
        price_min_warn: s.price_min_warn,
        price_max_warn: s.price_max_warn,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);
    setSaving(false);
    if (error) toast.show(error.message, 'error');
    else toast.show('Settings saved');
  }

  if (!s) return <AppShell><div className="font-mono text-xs text-muted text-center py-12">Loading…</div></AppShell>;

  return (
    <AppShell>
      <form onSubmit={save} className="max-w-xl space-y-6">
        <div className="fade-up">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">Configuration</div>
          <h1 className="font-display italic font-extrabold text-4xl tracking-tight mt-1">Settings</h1>
        </div>

        <section className="fade-up border-2 border-ink bg-paper" style={{ animationDelay: '0.05s' }}>
          <div className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase">Default Prices</div>
          <div className="p-4 space-y-3">
            <p className="font-mono text-[10px] text-muted leading-relaxed">
              These are just defaults that appear in the sale screen. You can always override per sale.
              Update these when the gas situation stabilizes.
            </p>
            <PriceField
              label="Round gallon"
              value={s.default_price_round}
              onChange={(v) => setS({ ...s, default_price_round: v })}
            />
            <PriceField
              label="Slim gallon"
              value={s.default_price_slim}
              onChange={(v) => setS({ ...s, default_price_slim: v })}
            />
            <PriceField
              label="Dispenser gallon"
              value={s.default_price_dispenser}
              onChange={(v) => setS({ ...s, default_price_dispenser: v })}
            />
          </div>
        </section>

        <section className="fade-up border-2 border-ink bg-paper" style={{ animationDelay: '0.1s' }}>
          <div className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase">Container Deposit</div>
          <div className="p-4 space-y-3">
            <p className="font-mono text-[10px] text-muted">
              Charged when a customer takes one of your gallons for the first time. Refunded when returned.
            </p>
            <PriceField
              label="Deposit per container"
              value={s.default_deposit}
              onChange={(v) => setS({ ...s, default_deposit: v })}
            />
          </div>
        </section>

        <section className="fade-up border-2 border-ink bg-paper" style={{ animationDelay: '0.15s' }}>
          <div className="bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase">Sanity Checks</div>
          <div className="p-4 space-y-3">
            <p className="font-mono text-[10px] text-muted leading-relaxed">
              Warn when a sale price falls outside this range. Prevents typos like ₱3 instead of ₱30.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <PriceField
                label="Minimum warn"
                value={s.price_min_warn}
                onChange={(v) => setS({ ...s, price_min_warn: v })}
              />
              <PriceField
                label="Maximum warn"
                value={s.price_max_warn}
                onChange={(v) => setS({ ...s, price_max_warn: v })}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-ink text-paper py-3 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </AppShell>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted mb-1">{label}</div>
      <div className="flex items-center border-2 border-ink">
        <span className="px-3 font-mono text-sm text-muted">₱</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 py-2 pr-3 font-mono text-lg tabular-nums font-bold bg-paper focus:bg-white focus:outline-none"
        />
      </div>
    </label>
  );
}
