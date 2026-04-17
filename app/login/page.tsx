'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { DropMark } from '@/components/DropMark';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="border-2 border-ink bg-paper p-8 md:p-10">
          <div className="flex items-center gap-3 mb-8">
            <DropMark size={48} />
            <div>
              <h1 className="font-display italic font-extrabold text-3xl leading-none tracking-tight">
                SerenePure
              </h1>
              <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-muted mt-1">
                Mabalacat City · Sign In
              </div>
            </div>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] tracking-widest uppercase text-muted mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border-2 border-ink bg-paper px-4 py-3 font-mono text-sm focus:bg-white focus:outline-none focus:shadow-[3px_3px_0_#0a1628] transition-all"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-ink text-paper py-3 font-mono text-xs tracking-[0.2em] uppercase font-bold hover:bg-water transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending…' : 'Send Magic Link →'}
              </button>
              {error && (
                <div className="font-mono text-xs text-danger text-center pt-2">{error}</div>
              )}
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="text-5xl">✉</div>
              <div className="font-display text-xl">Check your email</div>
              <p className="font-mono text-xs tracking-wider text-muted leading-relaxed">
                A sign-in link was sent to<br />
                <strong className="text-ink">{email}</strong>
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="font-mono text-[10px] tracking-widest uppercase text-muted hover:text-ink underline underline-offset-4"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
        <p className="text-center font-mono text-[10px] tracking-widest uppercase text-muted mt-6">
          No password needed · Signs family members in via email
        </p>
      </div>
    </div>
  );
}
