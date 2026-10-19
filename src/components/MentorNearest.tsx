import Link from "next/link";
import type { NearestDeadlineView, NearestPaymentView } from "@/lib/studentFocus";

export default function MentorNearest({
  deadlines,
  payments,
}: {
  deadlines: NearestDeadlineView[];
  payments: NearestPaymentView[];
}) {
  return (
    <section className="side-card mentor-nearest" aria-label="Ближайшее">
      <h2>Ближайшее</h2>
      <h3>Задания</h3>
      {deadlines.length === 0 ? (
        <p className="mentor-nearest-empty">Ближайших дедлайнов нет.</p>
      ) : (
        <ul>
          {deadlines.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="mentor-nearest-row">
                <span className={item.hot ? "mentor-nearest-when is-hot" : "mentor-nearest-when"}>{item.when}</span>
                <span className="min-w-0">
                  <span className="mentor-nearest-name">{item.student}</span>
                  <span className="mentor-nearest-detail">{item.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h3>Оплаты</h3>
      {payments.length === 0 ? (
        <p className="mentor-nearest-empty">Ближайших оплат нет.</p>
      ) : (
        <ul>
          {payments.map((item) => (
            <li key={item.id} className="mentor-nearest-row">
              <span className="mentor-nearest-when">{item.when}</span>
              <span className="min-w-0">
                <span className="mentor-nearest-name">{item.student}</span>
                {item.amount ? <span className="mentor-nearest-detail">{item.amount}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
