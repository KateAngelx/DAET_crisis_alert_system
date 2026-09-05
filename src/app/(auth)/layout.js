import { AuthShell } from "@/app/components/AuthShell";

export default function AuthLayout({ children }) {
  return (
    <div className="h-dvh overflow-hidden">
      <AuthShell>{children}</AuthShell>
    </div>
  );
}
