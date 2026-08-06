import Link from "next/link";
import { lookupResetToken } from "@/lib/passwordReset";
import ResetPasswordForm from "./ResetPasswordForm";

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
        <h1 className="text-[22px] font-semibold mb-3">Ссылка недействительна</h1>
        <p className="text-[13.5px] mb-6" style={{ color: "var(--faded)" }}>
          {found.reason === "expired"
            ? "Срок действия ссылки истёк — она живёт один час."
            : found.reason === "used"
              ? "По этой ссылке пароль уже меняли. Запросите новую."
              : "Ссылка неверна. Возможно, письмо открылось не полностью."}
        </p>
        <Link
          href="/forgot-password"
          className="block w-full py-2.5 rounded-full text-white text-[15px] text-center"
          style={{ background: "var(--wine)" }}
        >
          Запросить новую ссылку
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}
