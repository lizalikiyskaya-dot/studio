export default function Loading() {
  return (
    <div>
      <div
        className="rounded-md mb-4"
        style={{ height: 28, width: 220, background: "var(--rule)", opacity: 0.6, animation: "pulse 1.1s ease-in-out infinite" }}
      />
      <div
        className="rounded-md"
        style={{ height: 160, background: "var(--rule)", opacity: 0.35, animation: "pulse 1.1s ease-in-out infinite" }}
      />
    </div>
  );
}
