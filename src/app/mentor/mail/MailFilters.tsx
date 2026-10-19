"use client";

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

  const selectClass = "ml-2 h-10 rounded-full bg-white px-4 text-[14px]";
  const selectStyle = { border: "1px solid var(--border)", color: "var(--ink)" } as const;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Тип
        <select
          aria-label="Тип письма"
          value={type}
          onChange={(event) => go(event.target.value, student)}
          className={selectClass}
          style={selectStyle}
        >
          <option value="">Все</option>
          {types.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-[13px]" style={{ color: "var(--muted)" }}>
        Ученик
        <select
          aria-label="Ученик"
          value={student}
          onChange={(event) => go(type, event.target.value)}
          className={selectClass}
          style={{ ...selectStyle, maxWidth: 280 }}
        >
          <option value="">Все</option>
          {students.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
