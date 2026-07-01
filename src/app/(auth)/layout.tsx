export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-8">
          <div className="masthead-title font-semibold text-[19px] leading-tight">
            Студия художественной прозы
          </div>
          <span className="text-[13px] block mt-0.5" style={{ color: "var(--gold)", fontWeight: 500 }}>
            Лизы Ликийской
          </span>
          <div className="masthead-rule">
            <div className="masthead-rule-line" />
            <div className="masthead-rule-line" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
