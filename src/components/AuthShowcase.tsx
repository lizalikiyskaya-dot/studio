import Wordmark from "@/components/Wordmark";
import AuthQuote from "@/components/AuthQuote";

export default function AuthShowcase() {
  return (
    <aside className="auth-hero">
      <span className="auth-ribbon" aria-hidden="true" />
      <div className="relative z-10">
        <Wordmark size="lg" />
      </div>
      <div className="auth-hero-copy">
        <div className="auth-kicker">Студия художественной прозы</div>
        <AuthQuote />
        <div className="auth-attrib">
          <span className="auth-attrib-rule" />
          Стивен Кинг
        </div>
      </div>
      <div className="auth-hero-foot">
        <span>Мастерская книги</span>
        <span className="auth-hero-slash">/</span>
        <span>Рассказы</span>
        <span className="auth-hero-slash">/</span>
        <span>Разборы и правки</span>
      </div>
    </aside>
  );
}
