'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-client';

type GallonType = 'round' | 'slim' | 'dispenser';
type Channel = 'walk-in' | 'delivery';
type Payment = 'cash' | 'gcash';

type LineItem = {
  id: string;
  gallon: GallonType;
  qty: number;
  price: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  containers_out: number;
  deposit_paid: number;
};

type Settings = {
  default_price_round: number;
  default_price_slim: number;
  default_price_dispenser: number;
  default_deposit: number;
  price_min_warn: number;
  price_max_warn: number;
};

function peso(n: number) {
  return '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function SalesPage() {
  const router = useRouter();
  const toast = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [channel, setChannel] = useState<Channel>('walk-in');
  const [payment, setPayment] = useState<Payment>('cash');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [depositCount, setDepositCount] = useState(0);
  const [refundCount, setRefundCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const supabase = createClient();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) setSettings(data);
  }

  function defaultPrice(g: GallonType): number {
    if (!settings) return 30;
    if (g === 'round') return Number(settings.default_price_round);
    if (g === 'slim') return Number(settings.default_price_slim);
    return Number(settings.default_price_dispenser);
  }

  function addItem(g: GallonType) {
    setItems((prev) => {
      const existing = prev.find((it) => it.gallon === g);
      if (existing) {
        return prev.map((it) => (it.id === existing.id ? { ...it, qty: it.qty + 1 } : it));
      }
      return [...prev, { id: uid(), gallon: g, qty: 1, price: defaultPrice(g) }];
    });
  }

  function updateItem(id: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const deposit = depositCount * (settings?.default_deposit || 200);
  const refund = refundCount * (settings?.default_deposit || 200);
  const total = subtotal + deposit - refund;

  async function searchCustomers(q: string) {
    setCustomerSearch(q);
    if (q.length < 1) {
      setCustomerResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, address, containers_out, deposit_paid')
      .ilike('name', `%${q}%`)
      .eq('archived', false)
      .limit(8);
    setCustomerResults(data || []);
  }

  const selectedCustomer = customerResults.find((c) => c.id === customerId);

  function pickCustomer(c: Customer) {
    setCustomerId(c.id);
    setCustomerSearch(c.name);
    setCustomerResults([]);
    setShowCustomerPicker(false);
  }

  function clearCustomer() {
    setCustomerId(null);
    setCustomerSearch('');
    setCustomerResults([]);
  }

  function validate(): string | null {
    if (items.length === 0) return 'Add at least one gallon';
    for (const it of items) {
      if (!settings) continue;
      if (it.price < settings.price_min_warn) return `Price ${peso(it.price)} looks too low. Double-check.`;
      if (it.price > settings.price_max_warn) return `Price ${peso(it.price)} looks too high. Double-check.`;
      if (it.qty < 1) return 'Quantity must be at least 1';
    }
    if (channel === 'delivery' && !customerId) {
      // Delivery without a customer is allowed (one-off delivery) but warn
      const ok = confirm('Delivery without selecting a regular customer. Continue?');
      if (!ok) return 'Cancelled';
    }
    return null;
  }

  async function handleSubmit() {
    const err = validate();
    if (err) {
      toast.show(err, 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();

    const { data: sale, error: saleErr } = await supabase
      .from('sales')
      .insert({
        customer_id: customerId,
        channel,
        payment_method: payment,
        subtotal,
        deposit_amount: deposit,
        deposit_refund: refund,
        total,
        notes: notes || null,
      })
      .select()
      .single();

    if (saleErr || !sale) {
      toast.show('Save failed: ' + (saleErr?.message || 'unknown'), 'error');
      setSaving(false);
      return;
    }

    const itemRows = items.map((it) => ({
      sale_id: sale.id,
      gallon_type: it.gallon,
      quantity: it.qty,
      unit_price: it.price,
      line_total: it.qty * it.price,
    }));
    const { error: itemErr } = await supabase.from('sale_items').insert(itemRows);

    if (itemErr) {
      toast.show('Items failed: ' + itemErr.message, 'error');
      setSaving(false);
      return;
    }

    // Update customer container count if a customer was selected
    if (customerId && (depositCount > 0 || refundCount > 0)) {
      const net = depositCount - refundCount;
      const cust = customerResults.find((c) => c.id === customerId);
      if (cust) {
        await supabase
          .from('customers')
          .update({
            containers_out: Math.max(0, cust.containers_out + net),
            deposit_paid: Math.max(0, Number(cust.deposit_paid || 0) + deposit - refund),
          })
          .eq('id', customerId);
      }
    }

    toast.show(`Sale logged · ${peso(total)}`);
    setSaving(false);
    router.push('/');
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="fade-up">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">New Entry</div>
          <h1 className="font-display italic font-extrabold text-4xl tracking-tight mt-1">Log a sale</h1>
        </div>

        {/* Gallon picker */}
        <section className="fade-up" style={{ animationDelay: '0.05s' }}>
          <SectionLabel>1 · Gallons</SectionLabel>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <GallonButton type="round" label="Round" onAdd={() => addItem('round')} price={defaultPrice('round')} />
            <GallonButton type="slim" label="Slim" onAdd={() => addItem('slim')} price={defaultPrice('slim')} />
            <GallonButton type="dispenser" label="Dispenser" onAdd={() => addItem('dispenser')} price={defaultPrice('dispenser')} />
          </div>

          {items.length > 0 && (
            <div className="mt-4 border-2 border-ink">
              {items.map((it, idx) => (
                <div key={it.id} className={`p-3 flex items-center gap-2 ${idx > 0 ? 'border-t border-ink/20' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold capitalize">{it.gallon}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="1"
                        value={it.qty}
                        onChange={(e) => updateItem(it.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-14 border border-ink px-2 py-1 font-mono text-sm tabular-nums text-center"
                      />
                      <span className="font-mono text-xs text-muted">×</span>
                      <div className="flex items-center border border-ink">
                        <span className="px-2 font-mono text-xs text-muted">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.price}
                          onChange={(e) => updateItem(it.id, { price: parseFloat(e.target.value) || 0 })}
                          className="w-20 px-1 py-1 font-mono text-sm tabular-nums text-right"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[9px] tracking-widest uppercase text-muted">Total</div>
                    <div className="font-display font-bold tabular-nums">{peso(it.qty * it.price)}</div>
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    className="w-8 h-8 border border-ink hover:bg-danger hover:text-paper hover:border-danger transition-colors"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Channel & payment */}
        <section className="fade-up grid grid-cols-2 gap-4" style={{ animationDelay: '0.1s' }}>
          <div>
            <SectionLabel>2 · Channel</SectionLabel>
            <ToggleGroup
              value={channel}
              options={[{ v: 'walk-in', label: 'Walk-in' }, { v: 'delivery', label: 'Delivery' }]}
              onChange={(v) => setChannel(v as Channel)}
            />
          </div>
          <div>
            <SectionLabel>3 · Payment</SectionLabel>
            <ToggleGroup
              value={payment}
              options={[{ v: 'cash', label: 'Cash' }, { v: 'gcash', label: 'GCash' }]}
              onChange={(v) => setPayment(v as Payment)}
            />
          </div>
        </section>

        {/* Customer picker — only meaningful for delivery, but available for walk-in regulars too */}
        <section className="fade-up" style={{ animationDelay: '0.15s' }}>
          <SectionLabel>4 · Customer {channel === 'walk-in' && <span className="normal-case text-muted">(optional)</span>}</SectionLabel>
          {selectedCustomer ? (
            <div className="mt-3 border-2 border-ink p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-display font-semibold">{selectedCustomer.name}</div>
                <div className="font-mono text-xs text-muted truncate">
                  {selectedCustomer.phone && `${selectedCustomer.phone} · `}
                  {selectedCustomer.containers_out} container{selectedCustomer.containers_out !== 1 ? 's' : ''} out
                </div>
              </div>
              <button onClick={clearCustomer} className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-danger">
                Clear
              </button>
            </div>
          ) : (
            <div className="mt-3 relative">
              <input
                type="text"
                placeholder={channel === 'delivery' ? 'Search customer name…' : 'Walk-in (leave blank) or search regular'}
                value={customerSearch}
                onChange={(e) => searchCustomers(e.target.value)}
                className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:bg-white focus:outline-none"
              />
              {customerResults.length > 0 && (
                <ul className="absolute top-full left-0 right-0 mt-1 bg-paper border-2 border-ink z-10 max-h-60 overflow-auto">
                  {customerResults.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => pickCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-water-mist border-b border-ink/10 last:border-0"
                      >
                        <div className="font-display font-semibold text-sm">{c.name}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {c.phone || 'No phone'} · {c.containers_out} out
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Deposits — only show when customer selected */}
        {selectedCustomer && (
          <section className="fade-up" style={{ animationDelay: '0.2s' }}>
            <SectionLabel>5 · Containers</SectionLabel>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Stepper
                label="Deposits taken"
                sublabel={`+${peso(settings?.default_deposit || 200)} each`}
                value={depositCount}
                onChange={setDepositCount}
              />
              <Stepper
                label="Containers returned"
                sublabel={`−${peso(settings?.default_deposit || 200)} refund`}
                value={refundCount}
                onChange={setRefundCount}
              />
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="fade-up" style={{ animationDelay: '0.25s' }}>
          <SectionLabel>Notes (optional)</SectionLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. extra gallon for Lola's birthday"
            rows={2}
            className="w-full mt-3 border-2 border-ink bg-paper px-3 py-2 font-mono text-sm focus:bg-white focus:outline-none resize-none"
          />
        </section>

        {/* Total + submit */}
        <section className="fade-up sticky bottom-20 md:bottom-6 bg-paper pt-4 border-t-2 border-ink" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <div className="font-mono text-[10px] tracking-widest uppercase text-muted">Total</div>
              {(deposit > 0 || refund > 0) && (
                <div className="font-mono text-[10px] text-muted mt-0.5">
                  gallons {peso(subtotal)}
                  {deposit > 0 && ` + deposit ${peso(deposit)}`}
                  {refund > 0 && ` − refund ${peso(refund)}`}
                </div>
              )}
            </div>
            <div className="font-display font-extrabold text-3xl tabular-nums">{peso(total)}</div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="w-full bg-ink text-paper py-4 font-mono text-sm tracking-[0.2em] uppercase font-bold hover:bg-water transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Log Sale →'}
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted border-b border-ink/20 pb-1">
      {children}
    </h2>
  );
}

function GallonButton({ type, label, onAdd, price }: { type: GallonType; label: string; onAdd: () => void; price: number }) {
  const gradient =
    type === 'round' ? 'from-water to-ink' :
    type === 'slim' ? 'from-water-light to-water' :
    'from-drop to-water';
  return (
    <button
      onClick={onAdd}
      className={`bg-gradient-to-br ${gradient} text-paper border-2 border-ink p-4 hover:shadow-[3px_3px_0_#0a1628] transition-all active:translate-y-0.5`}
    >
      <div className="font-display font-bold text-lg leading-none">{label}</div>
      <div className="font-mono text-[10px] mt-2 opacity-80">Default ₱{price}</div>
      <div className="font-mono text-[10px] tracking-widest uppercase mt-3 opacity-60">+ Add</div>
    </button>
  );
}

function ToggleGroup({ value, options, onChange }: { value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 border-2 border-ink overflow-hidden">
      {options.map((opt, i) => (
        <button
          key={opt.v}
          onClick={() => onChange(opt.v)}
          className={`py-3 font-mono text-xs tracking-widest uppercase font-bold transition-colors ${
            value === opt.v ? 'bg-ink text-paper' : 'bg-paper text-ink'
          } ${i > 0 ? 'border-l-2 border-ink' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Stepper({ label, sublabel, value, onChange }: { label: string; sublabel: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="border-2 border-ink p-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted">{label}</div>
      <div className="font-mono text-[9px] text-muted mt-0.5">{sublabel}</div>
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 border border-ink hover:bg-ink hover:text-paper font-bold"
        >−</button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="flex-1 border border-ink px-2 py-1 font-mono text-lg tabular-nums text-center font-bold"
        />
        <button
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 border border-ink hover:bg-ink hover:text-paper font-bold"
        >+</button>
      </div>
    </div>
  );
}
