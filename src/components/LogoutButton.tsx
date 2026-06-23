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
      className="font-mono-label text-[10.5px] tracking-wide rounded-sm px-3 py-1.5"
      style={{ color: "var(--faded)", border: "1px solid var(--rule)" }}
    >
      Выйти
    </button>
  );
}
