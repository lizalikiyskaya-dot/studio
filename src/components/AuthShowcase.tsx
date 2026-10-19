import Wordmark from "@/components/Wordmark";
import Mark from "@/components/Mark";

export default function AuthShowcase() {
  return (
    <aside className="auth-hero">
      <span className="auth-ribbon" aria-hidden="true" />
      <div className="relative z-10">
        <Wordmark size="lg" />
      </div>
      <div className="auth-hero-copy">
        <div className="auth-kicker">Студия художественной прозы</div>
        <div className="auth-quote-main">
          <span className="auth-quote-line">«Главные правила</span><br />
          <span className="auth-quote-line">для писателя:</span><br />
          <span className="auth-quote-line"><Mark><i>много читать</i></Mark></span><br />
          <span className="auth-quote-line"><Mark><i>и писать»</i></Mark></span>
        </div>
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
