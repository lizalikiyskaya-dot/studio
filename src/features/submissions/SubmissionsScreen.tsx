"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import type { Submission, SubmissionType } from "@/generated/prisma/client";
import PageHeader from "@/components/PageHeader";
import SubmissionsTable from "./SubmissionsTable";

export default function SubmissionsScreen({
  studentId,
  contest,
  publisher,
}: {
  studentId: string;
  contest: Submission[];
  publisher: Submission[];
}) {
  const [tab, setTab] = useState(0);
  const addRef = useRef<() => void>(() => {});
  const tabs: { label: string; type: SubmissionType; rows: Submission[] }[] = [
    { label: "На конкурс", type: "CONTEST", rows: contest },
    { label: "В издательство", type: "PUBLISHER", rows: publisher },
  ];
  const active = tabs[tab];

  return (
    <div>
      <PageHeader
        title="Трекер заявок"
        description="Куда и что отправлено, когда и чем закончилось."
        actions={
          <button type="button" className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }} onClick={() => addRef.current()}>
            <Plus size={16} /> Новая заявка
          </button>
        }
      />
      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((item, index) => (
          <button
            key={item.type}
            type="button"
            onClick={() => setTab(index)}
            className="text-[14px] px-4 py-2 rounded-full"
            style={{
              background: tab === index ? "var(--ink)" : "#fff",
              color: tab === index ? "#fff" : "var(--ink)",
              border: tab === index ? "none" : "1px solid var(--border)",
              fontWeight: tab === index ? 600 : 500,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <SubmissionsTable
        key={active.type}
        studentId={studentId}
        type={active.type}
        initial={active.rows}
        registerAdd={(fn) => {
          addRef.current = fn;
        }}
      />
    </div>
  );
}
