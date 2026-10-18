import Link from "next/link";

import type { ReaderGuide } from "./types";

export default function GuideReader({ guide, backHref, backLabel }: { guide: ReaderGuide; backHref: string; backLabel: string }) {
  return (
    <div style={{ maxWidth: 960 }}>
      <Link href={backHref} className="lnk text-[14.5px]">
        {backLabel}
      </Link>
      <h1 className="page-title mt-3 mb-3">{guide.title || "Методичка"}</h1>
      {guide.description ? (
        <p className="text-[15.5px] mb-6 whitespace-pre-wrap" style={{ color: "var(--ink2)", maxWidth: 640 }}>
          {guide.description}
        </p>
      ) : null}

      {guide.hasFile ? (
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <a
            href={`/api/guides/${guide.id}/file`}
            className="rounded-full inline-flex items-center h-11 px-5 text-[14.5px] font-semibold"
            style={{ background: "var(--y)", color: "var(--ink)" }}
          >
            Скачать
          </a>
          {guide.fileName ? (
            <span className="text-[13.5px]" style={{ color: "var(--muted)" }}>
              {guide.fileName}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="text-[14.5px] mb-5" style={{ color: "var(--muted)" }}>
          Файл ещё не загружен.
        </p>
      )}

      {guide.isPdf && guide.hasFile ? (
        <iframe
          title={guide.title || "Методичка"}
          src={`/api/guides/${guide.id}/file?inline=1`}
          className="w-full rounded-[24px] bg-white"
          style={{ height: "min(78vh, 900px)", border: "1px solid var(--border)" }}
        />
      ) : null}
    </div>
  );
}
