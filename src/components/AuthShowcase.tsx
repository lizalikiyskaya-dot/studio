import { BookOpen, MessageSquareText, ScrollText } from "lucide-react";
import Wordmark from "@/components/Wordmark";

export default function AuthShowcase() {
  return (
    <aside className="auth-hero">
      <div className="auth-blob-y" />
      <div className="auth-blob-v" />
      <div className="relative z-10">
        <Wordmark size="lg" />
      </div>
      <div className="auth-quote">
        <div className="text-[12px]" style={{ color: "var(--muted)" }}>Комментарий наставника</div>
        <div className="serif italic text-[15px] leading-snug mt-1.5">«Добавьте звук — и сцена оживёт».</div>
      </div>
      <div className="mt-auto relative z-10">
        <div className="auth-hero-title">Студия художественной прозы</div>
        <div className="mt-4 text-[17px] max-w-[420px]" style={{ color: "var(--ink2)" }}>
          Мастерская книги и рассказов с личным наставником
        </div>
      </div>
      <div className="auth-hero-foot mt-10 relative z-10 flex flex-wrap gap-x-6 gap-y-2 text-[14px]" style={{ color: "var(--ink2)" }}>
        <span className="inline-flex items-center gap-2"><BookOpen size={16} /> Мастерская книги</span>
        <span className="inline-flex items-center gap-2"><ScrollText size={16} /> Рассказы</span>
        <span className="inline-flex items-center gap-2"><MessageSquareText size={16} /> Разборы и правки</span>
      </div>
    </aside>
  );
}
