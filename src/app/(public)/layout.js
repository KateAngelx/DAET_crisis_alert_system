// src/app/(public)/layout.js
import { PublicHeader } from "@/app/components/PublicHeader";
import { PublicFooter } from "@/app/components/PublicFooter";
import { FloatingFaqButton } from "@/app/components/FloatingFaqButton";
import { PublicPageTracker } from "@/app/components/analytics/PublicPageTracker";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground scrollbar-none">
      <PublicPageTracker />
      <PublicHeader />

      <main className="flex-1 scrollbar-none pb-20 sm:pb-24">
        {children}
      </main>

      <PublicFooter />
      <FloatingFaqButton />
    </div>
  );
}