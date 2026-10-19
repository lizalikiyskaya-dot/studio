import Link from "next/link";
import EmptyState from "@/components/EmptyState";

export default function NoBookRedirect({ aboutHref }: { aboutHref: string }) {
  return (
    <EmptyState
      cue="Самое время завести книгу"
      detail="Создайте её в разделе «О книге» — и этот раздел откроется."
      action={
        <Link href={aboutHref} className="btn-y px-5 text-[14.5px]" style={{ height: 44, width: "auto" }}>
          Открыть «О книге»
        </Link>
      }
    />
  );
}
