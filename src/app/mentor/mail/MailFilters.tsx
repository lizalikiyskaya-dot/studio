"use client";

import PillSelect from "@/components/PillSelect";

export default function MailFilters({
  type,
  student,
  types,
  students,
}: {
  type: string;
  student: string;
  types: { value: string; label: string }[];
  students: { id: string; name: string }[];
}) {
  function go(nextType: string, nextStudent: string) {
    const params = new URLSearchParams();
    if (nextType) params.set("type", nextType);
    if (nextStudent) params.set("student", nextStudent);
    const query = params.toString();
    window.location.href = query ? `/mentor/mail?${query}` : "/mentor/mail";
  }

  return (
    <div className="mail-filters mb-4">
      <label className="mail-filter text-[13px]" style={{ color: "var(--faded)" }}>
        Тип
        <PillSelect aria-label="Тип письма" value={type} onChange={(event) => go(event.target.value, student)}>
          <option value="">Все</option>
          {types.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </PillSelect>
      </label>
      <label className="mail-filter text-[13px]" style={{ color: "var(--faded)" }}>
        Ученик
        <PillSelect aria-label="Ученик" value={student} onChange={(event) => go(type, event.target.value)}>
          <option value="">Все</option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </PillSelect>
      </label>
    </div>
  );
}
