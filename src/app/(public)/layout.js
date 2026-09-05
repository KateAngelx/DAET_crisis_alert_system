// src/app/(public)/layout.js
import { PublicHeader } from "@/app/components/PublicHeader"; 
import { PublicFooter } from "@/app/components/PublicFooter";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground scrollbar-none">
      <PublicHeader /> 
      
      <main className="flex-1 scrollbar-none">
        {children} {/* Dito lalabas ang content ng page.js */}
      </main>

      {/* Lalabas ito sa ibaba ng bawat page */}
      <PublicFooter /> 
    </div>
  );
}