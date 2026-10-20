import { markedTitle } from "@/components/markedTitle";
import { optOutLabel, optOutSecret, readOptOut } from "@/lib/mailOptOut";
import { setContentSubscription } from "@/lib/contentSubscription";
import RestoreButton from "./RestoreButton";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; restored?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = params.token;
  const token = typeof raw === "string" ? raw : "";
  const restored = params.restored === "1" || (Array.isArray(params.restored) && params.restored[0] === "1");
  const secret = optOutSecret();
  const parsed = secret ? readOptOut(token, secret) : null;

  if (!parsed) {
    return (
      <div>
        <h1 className="auth-title">{markedTitle("Ссылка недействительна")}</h1>
      </div>
    );
  }

  if (!restored) {
    const ok = await setContentSubscription(parsed.userId, parsed.kind, false);
    if (!ok) {
      return (
        <div>
          <h1 className="auth-title">{markedTitle("Ссылка недействительна")}</h1>
        </div>
      );
    }
  }

  return (
    <div data-unsub-kind={parsed.kind} data-unsub-state={restored ? "restored" : "off"}>
      <h1 className="auth-title">{markedTitle(restored ? "Снова включено" : "Готово")}</h1>
      <p className="auth-sub">
        {restored ? `Снова будете получать ${optOutLabel(parsed.kind)}.` : `Вы отписались от ${optOutLabel(parsed.kind)}.`}
      </p>
      {restored ? null : <RestoreButton token={token} />}
    </div>
  );
}
