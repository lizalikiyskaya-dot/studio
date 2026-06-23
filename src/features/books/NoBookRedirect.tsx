import Link from "next/link";

export default function NoBookRedirect({ aboutHref }: { aboutHref: string }) {
  return (
    <p className="text-[14px]" style={{ color: "var(--faded)" }}>
      У ученика пока нет ни одной книги. Создайте книгу в разделе{" "}
      <Link href={aboutHref} className="underline" style={{ color: "var(--wine)" }}>
        «О книге»
      </Link>
      .
    </p>
  );
}
