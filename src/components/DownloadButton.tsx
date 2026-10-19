import { Download } from "lucide-react";
import { fileKindLabel, formatFileSize } from "@/lib/fileMeta";

export default function DownloadButton({
  href,
  fileName,
  mime,
  bytes,
}: {
  href: string;
  fileName?: string | null;
  mime?: string | null;
  bytes?: number | null;
}) {
  const kind = fileKindLabel(fileName, mime);
  const size = formatFileSize(bytes);
  const meta = [kind, size].filter(Boolean).join(" · ");

  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <a
        href={href}
        download={fileName ?? undefined}
        className="inline-flex items-center gap-1.5 rounded-full px-3.5 h-8 text-[13px] font-semibold shrink-0"
        style={{ background: "var(--y)", color: "var(--ink)" }}
      >
        <Download size={14} strokeWidth={2.25} />
        Скачать
      </a>
      {meta ? (
        <span className="text-[12px] truncate" style={{ color: "var(--muted)" }}>
          {meta}
        </span>
      ) : null}
    </span>
  );
}
