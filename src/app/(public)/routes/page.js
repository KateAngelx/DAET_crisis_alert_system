import { Suspense } from "react";
import { PublicPageShell, PublicPageContent } from "@/app/components/InfoPageHero";
import { AlertCardSkeletonList, MapSkeleton } from "@/app/components/ui/Skeletons";
import RoutesPageContent from "./RoutesPageContent";

export default function RoutesPage() {
  return (
    <Suspense
      fallback={
        <PublicPageShell>
          <PublicPageContent>
            <AlertCardSkeletonList count={3} />
            <MapSkeleton height="h-[min(560px,70vh)] sm:h-[560px]" />
          </PublicPageContent>
        </PublicPageShell>
      }
    >
      <RoutesPageContent />
    </Suspense>
  );
}
