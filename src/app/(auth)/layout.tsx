import AuthShowcase from "@/components/AuthShowcase";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell">
      <AuthShowcase />
      <div className="auth-panel">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}
