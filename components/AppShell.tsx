import TopHeader from './TopHeader';
import BottomNav from './BottomNav';
import { ToastProvider } from './Toast';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TopHeader />
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 pb-28 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </ToastProvider>
  );
}
