import Link from "next/link";
import { lookupResetToken } from "@/lib/passwordReset";
import ResetPasswordForm from "./ResetPasswordForm";
import { markedTitle } from "@/components/markedTitle";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  // Проверяем ссылку ДО показа формы — иначе человек придумает пароль и
  // только потом узнает, что ссылка протухла.
  const found = await lookupResetToken(token);

  if (!found.ok) {
    return (
      <div>
        <h1 className="auth-title">{markedTitle("Ссылка недействительна")}</h1>
        <p className="auth-sub">
          {found.reason === "expired"
            ? "Срок действия ссылки истёк — она живёт один час."
            : found.reason === "used"
              ? "По этой ссылке пароль уже меняли. Запросите новую."
              : "Ссылка неверна. Возможно, письмо открылось не полностью."}
        </p>
        <Link href="/forgot-password" className="btn-y mt-6">Запросить новую ссылку</Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
