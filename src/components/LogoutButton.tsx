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
      className="btn-pill text-[14px] px-5 h-11 font-medium"
      style={{ color: "var(--ink)", background: "var(--soft)", border: "none" }}
    >
      Выйти
    </button>
  );
}
