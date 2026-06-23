export default function SectionPlaceholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-[24px] font-semibold mb-2">{title}</h1>
      <p className="text-[14px] mb-8" style={{ color: "var(--faded)" }}>
        Раздел появится на следующем этапе разработки.
      </p>

      <div
        className="rounded-md flex items-center justify-center min-h-[160px]"
        style={{ border: "1px dashed var(--rule)" }}
      >
        <span className="text-[13px]" style={{ color: "var(--faded)" }}>
          здесь будет содержимое раздела
        </span>
      </div>
    </div>
  );
}
