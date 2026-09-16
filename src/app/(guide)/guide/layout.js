import { GuideSidebar, GuideHeader } from "@/app/components/GuideShell";
import { GuidePageShell } from "@/app/components/guide/GuidePageShell";
import { AuthGuard } from "@/app/components/AuthGuard";
import { guideShell } from "@/lib/designSystem";

export default function GuideLayout({ children }) {
  return (
    <AuthGuard requiredRole="guide">
      <div className="flex h-screen bg-zinc-50 overflow-hidden dashboard-shell scrollbar-none">
        <GuideSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <GuideHeader />
          <main className={`${guideShell.main} scrollbar-none`}>
            <GuidePageShell>{children}</GuidePageShell>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
