import { AdminSidebar } from "@/app/components/AdminSidebar";
import { AdminHeader } from "@/app/components/AdminHeader";
import { AdminPageShell } from "@/app/components/admin/AdminPageShell";
import { AuthGuard } from "@/app/components/AuthGuard";
import { adminShell } from "@/lib/designSystem";
import { DashboardNavCountsProvider } from "@/app/components/dashboard/DashboardNavCountsProvider";

export default function CrisisAdminLayout({ children }) {
  return (
    <AuthGuard requiredRole="admin">
      <DashboardNavCountsProvider>
        <div className="flex h-dvh min-h-0 bg-zinc-50 overflow-hidden dashboard-shell scrollbar-none">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <AdminHeader />
            <main className={`${adminShell.main} installed-app-main scrollbar-none`}>
              <AdminPageShell>{children}</AdminPageShell>
            </main>
          </div>
        </div>
      </DashboardNavCountsProvider>
    </AuthGuard>
  );
}
