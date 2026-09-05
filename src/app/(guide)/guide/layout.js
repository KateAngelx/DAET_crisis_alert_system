import { GuideSidebar, GuideHeader } from "@/app/components/GuideShell";
import { AuthGuard } from "@/app/components/AuthGuard";

export default function GuideLayout({ children }) {
  return (
    <AuthGuard requiredRole="guide">
      <div className="flex h-screen bg-zinc-50 overflow-hidden dashboard-shell scrollbar-none">
        <GuideSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <GuideHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-none">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
