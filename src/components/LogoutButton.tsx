"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="btn-pill text-[12.5px] px-3.5 py-1.5"
      style={{ color: "var(--faded)", background: "var(--paper-light)", border: "1px solid var(--rule)" }}
    >
      Выйти
    </button>
  );
}
