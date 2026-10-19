"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Mark from "@/components/Mark";

/** Same quote everywhere. Only /login draws the marker; other auth screens stay still. */
export default function AuthQuote() {
  const pathname = usePathname();
  const animate = pathname === "/login";
  const [play, setPlay] = useState(false);

  useLayoutEffect(() => {
    if (!animate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let alive = true;
    void document.fonts.ready.then(() => {
      if (alive) setPlay(true);
    });
    return () => {
      alive = false;
    };
  }, [animate]);

  const className = [
    "auth-quote-main",
    animate ? "auth-quote-animate" : "",
    play ? "auth-quote-play" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={className}>
      <span className="auth-quote-line">«Главные правила</span><br />
      <span className="auth-quote-line">для писателя:</span><br />
      <span className="auth-quote-line"><Mark><i>много читать</i></Mark></span><br />
      <span className="auth-quote-line"><Mark><i>и писать»</i></Mark></span>
    </div>
  );
}
