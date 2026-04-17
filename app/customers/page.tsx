'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { useToast } from '@/components/Toast';
import { createClient } from '@/lib/supabase-client';

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  containers_out: number;
  deposit_paid: number;
  created_at: string;
  archived: boolean;
};

function peso(n: number) {
  return '₱' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CustomersPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('archived', false)
      .order('name');
    setCustomers(data || []);
    setLoading(false);
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const totalOut = customers.reduce((s, c) => s + c.containers_out, 0);
  const totalDeposit = customers.reduce((s, c) => s + Number(c.deposit_paid || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="fade-up flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-muted">Customer Registry</div>
            <h1 className="font-display italic font-extrabold text-4xl tracking-tight mt-1">Regulars</h1>
          </div>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="bg-ink text-paper px-5 py-3 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water transition-colors"
          >
            + Add Regular
          </button>
        </div>

        <div className="fade-up grid grid-cols-3 border-2 border-ink bg-paper-dark" style={{ animationDelay: '0.05s' }}>
          <Stat label="Total regulars" value={customers.length.toString()} />
          <Stat label="Containers out" value={totalOut.toString()} border />
          <Stat label="Deposits held" value={peso(totalDeposit)} border />
        </div>

        <div className="fade-up" style={{ animationDelay: '0.1s' }}>
          <input
            type="text"
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-2 border-ink bg-paper px-4 py-3 font-mono text-sm focus:bg-white focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="font-mono text-xs text-muted text-center py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="fade-up text-center py-16 border-2 border-dashed border-ink/30">
            <div className="text-4xl mb-3">💧</div>
            <div className="font-display italic text-lg">
              {customers.length === 0 ? 'No regulars yet' : 'No matches'}
            </div>
            <div className="font-mono text-xs text-muted mt-2">
              {customers.length === 0 ? 'Tap "Add Regular" to start the list' : 'Try a different search'}
            </div>
          </div>
        ) : (
          <ul className="fade-up space-y-2" style={{ animationDelay: '0.15s' }}>
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => { setEditing(c); setShowForm(true); }}
                  className="w-full border-2 border-ink bg-paper p-4 text-left hover:bg-water-mist transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold text-lg">{c.name}</div>
                      <div className="font-mono text-xs text-muted mt-1 space-y-0.5">
                        {c.phone && <div>{c.phone}</div>}
                        {c.address && <div className="truncate">{c.address}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[9px] tracking-widest uppercase text-muted">Out</div>
                      <div className="font-display font-bold text-2xl tabular-nums">{c.containers_out}</div>
                      {Number(c.deposit_paid) > 0 && (
                        <div className="font-mono text-[10px] text-muted mt-1">{peso(Number(c.deposit_paid))}</div>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showForm && (
        <CustomerForm
          customer={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); toast.show('Customer saved'); }}
          onDeleted={() => { setShowForm(false); load(); toast.show('Customer removed'); }}
        />
      )}
    </AppShell>
  );
}

function Stat({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`p-4 ${border ? 'border-l-2 border-ink' : ''}`}>
      <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mb-2">{label}</div>
      <div className="font-display font-semibold text-xl tabular-nums leading-none">{value}</div>
    </div>
  );
}

function CustomerForm({ customer, onClose, onSaved, onDeleted }: {
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [notes, setNotes] = useState(customer?.notes || '');
  const [containersOut, setContainersOut] = useState(customer?.containers_out || 0);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.show('Name required', 'error');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
      notes: notes.trim() || null,
      containers_out: containersOut,
    };
    const { error } = customer
      ? await supabase.from('customers').update(payload).eq('id', customer.id)
      : await supabase.from('customers').insert(payload);
    setSaving(false);
    if (error) toast.show(error.message, 'error');
    else onSaved();
  }

  async function remove() {
    if (!customer) return;
    if (!confirm(`Remove ${customer.name} from regulars? Their past sales stay in the records.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('customers').update({ archived: true }).eq('id', customer.id);
    if (error) toast.show(error.message, 'error');
    else onDeleted();
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-paper border-2 border-ink w-full md:max-w-lg max-h-[90vh] overflow-auto">
        <div className="bg-ink text-paper px-5 py-3 flex justify-between items-center">
          <div className="font-mono text-xs tracking-[0.2em] uppercase">
            {customer ? 'Edit Regular' : 'New Regular'}
          </div>
          <button onClick={onClose} className="text-xl leading-none">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Name *">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09XX XXX XXXX"
              className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm"
            />
          </Field>
          <Field label="Delivery Address">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm resize-none"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Gate code, preferred time, usual order…"
              className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-sm resize-none"
            />
          </Field>
          <Field label="Containers currently out">
            <input
              type="number"
              min="0"
              value={containersOut}
              onChange={(e) => setContainersOut(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full border-2 border-ink bg-paper px-3 py-2 font-mono text-lg tabular-nums"
            />
          </Field>
        </div>
        <div className="border-t-2 border-ink p-5 flex gap-3">
          {customer && (
            <button
              onClick={remove}
              className="border-2 border-danger text-danger px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase hover:bg-danger hover:text-paper transition-colors"
            >
              Remove
            </button>
          )}
          <button onClick={onClose} className="flex-1 border-2 border-ink px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase hover:bg-ink hover:text-paper transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-ink text-paper px-4 py-2 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="font-mono text-[10px] tracking-widest uppercase text-muted mb-2">{label}</div>
      {children}
    </label>
  );
}
