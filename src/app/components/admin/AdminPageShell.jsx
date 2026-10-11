import { adminShell } from "@/lib/designSystem";

export function AdminPageShell({ children, className = "" }) {
  return (
    <div className={`${adminShell.page} ${className}`}>
      {children}
    </div>
  );
}
