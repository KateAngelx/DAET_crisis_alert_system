// src/app/(public)/layout.js
import { PublicPageTracker } from "@/app/components/analytics/PublicPageTracker";
import { PublicMain } from "@/app/components/shell/PublicMain";

export default function PublicLayout({ children }) {
  return (
    <>
      <PublicPageTracker />
      <PublicMain>{children}</PublicMain>
    </>
  );
}