import { Suspense } from "react";
import GuideActiveTouristsPage from "./GuideActiveTouristsContent";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading active tourists...</div>}>
      <GuideActiveTouristsPage />
    </Suspense>
  );
}
