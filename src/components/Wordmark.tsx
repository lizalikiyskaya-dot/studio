export default function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className={`wordmark${size === "lg" ? " lg" : ""}`}>
      <span className="wordmark-mark" aria-hidden="true">А</span>
      <span className="wordmark-name">Андреенко</span>
    </span>
  );
}
