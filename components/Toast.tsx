'use client';

import { createContext, useCallback, useContext, useState, useEffect } from 'react';

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' };
type Ctx = { show: (message: string, tone?: Toast['tone']) => void };

const ToastCtx = createContext<Ctx>({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-5 py-3 font-mono text-[11px] tracking-widest uppercase border-2 shadow-lg animate-[fadeUp_0.25s_ease] ${
              t.tone === 'success'
                ? 'bg-success text-paper border-success'
                : t.tone === 'error'
                ? 'bg-danger text-paper border-danger'
                : 'bg-ink text-paper border-ink'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
