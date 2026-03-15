import { SessionProvider } from '@/features/auth/components/session-provider';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { DemoBanner } from '@/components/shared/demo-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar — desktop only */}
        <Sidebar />

        {/* Mobile navigation drawer */}
        <MobileNav />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <DemoBanner />
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
