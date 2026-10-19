"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { WorkshopCycle } from "@/lib/workshopCycles";

function storyCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} рассказ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} рассказа`;
  return `${count} рассказов`;
}

export default function WorkshopCycleCard({ cycles, basePath }: { cycles: WorkshopCycle[]; basePath: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  if (cycles.length === 0) {
    return (
      <div className="side-card !p-2.5">
        <div className="relative h-[108px] overflow-hidden rounded-[14px]" style={{ background: "var(--deep)" }}>
          <span aria-hidden="true" className="absolute -bottom-7 -right-3 h-20 w-20 rounded-full" style={{ background: "var(--y)" }} />
          <span aria-hidden="true" className="absolute right-8 top-3 h-7 w-7 rounded-full" style={{ background: "var(--vi)" }} />
          <div className="relative max-w-[78%] p-3 text-[15px] font-semibold leading-tight text-white">Цикл ещё не заведён</div>
        </div>
        <p className="mt-2 px-0.5 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
          Обложка и рассказы появятся здесь, когда цикл будет создан.
        </p>
      </div>
    );
  }

  const requested = searchParams.get("cycle");
  const found = cycles.findIndex((cycle) => cycle.id === requested);
  const index = found >= 0 ? found : 0;
  const cycle = cycles[index];

  function openCycle(cycleId: string) {
    setOpen(false);
    const target = pathname.includes("/stories") ? `${basePath}/cycles` : pathname;
    router.push(`${target}?cycle=${cycleId}`);
  }

  return (
    <div className="side-card !p-2.5">
      <div className="relative h-[108px] overflow-hidden rounded-[14px]" style={{ background: "#241848" }}>
        {cycle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cycle.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <span aria-hidden="true" className="absolute -bottom-8 -right-4 h-[92px] w-[92px] rounded-full" style={{ background: "var(--y)" }} />
            <span aria-hidden="true" className="absolute right-7 top-3.5 h-8 w-8 rounded-full" style={{ background: "#7c6cf0" }} />
          </>
        )}
        {cycle.imageUrl ? <span className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(20,16,40,.15), rgba(20,16,40,.55))" }} /> : null}
        <div className="relative max-w-[78%] p-3 text-[15px] font-semibold leading-tight text-white">
          {cycle.title.trim() || "Без названия"}
        </div>
      </div>

      <div className="relative mt-2.5 flex items-start justify-between gap-2 px-0.5" ref={menuRef}>
        <div className="min-w-0 text-[12px] leading-snug" style={{ color: "var(--muted)" }}>
          {cycle.genre.trim() || "Жанр не указан"}
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-0.5 text-[12.5px] font-semibold"
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          {index + 1} из {cycles.length}
          <ChevronDown size={14} />
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute right-0 top-6 z-10 m-0 min-w-[180px] list-none rounded-[14px] p-1"
            style={{ background: "#fff", border: "1px solid var(--border)", boxShadow: "0 10px 28px rgba(32,32,32,.12)" }}
          >
            {cycles.map((item, itemIndex) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={item.id === cycle.id}
                  className="w-full rounded-[10px] px-2.5 py-1.5 text-left text-[13px]"
                  style={{ background: item.id === cycle.id ? "var(--soft)" : "transparent", fontWeight: item.id === cycle.id ? 650 : 500 }}
                  onClick={() => openCycle(item.id)}
                >
                  {itemIndex + 1}. {item.title.trim() || "Без названия"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-1.5 px-0.5 text-[12px]" style={{ color: "var(--muted)" }}>
        {cycle.storyCount > 0 ? `${storyCountLabel(cycle.storyCount)} в цикле` : "Рассказов в цикле пока нет"}
      </div>
    </div>
  );
}
