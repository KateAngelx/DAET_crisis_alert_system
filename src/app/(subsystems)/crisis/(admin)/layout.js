import { AdminSidebar } from "@/app/components/AdminSidebar";
import { AdminHeader } from "@/app/components/AdminHeader";
import { AdminPageShell } from "@/app/components/admin/AdminPageShell";
import { AuthGuard } from "@/app/components/AuthGuard";
import { adminShell } from "@/lib/designSystem";

export default function CrisisAdminLayout({ children }) {
  return (
    <AuthGuard requiredRole="admin">
      <div className="flex h-screen bg-zinc-50 overflow-hidden dashboard-shell scrollbar-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader />
          <main className={`${adminShell.main} scrollbar-none`}>
            <AdminPageShell>{children}</AdminPageShell>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
