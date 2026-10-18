export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`wordmark${size === "lg" ? " lg" : ""}`}>
      <span className="wordmark-name">
        Андреенко
        <span className="wordmark-ribbon" aria-hidden="true" />
      </span>
    </span>
  );
}
