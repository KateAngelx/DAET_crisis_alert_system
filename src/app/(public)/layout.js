// src/app/(public)/layout.js
import { PublicHeader } from "@/app/components/PublicHeader"; 
import { PublicFooter } from "@/app/components/PublicFooter";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Lalabas ito sa itaas ng bawat page sa loob ng (public) group */}
      <PublicHeader /> 
      
      <main className="flex-1">
        {children} {/* Dito lalabas ang content ng page.js */}
      </main>

      {/* Lalabas ito sa ibaba ng bawat page */}
      <PublicFooter /> 
    </div>
  );
}